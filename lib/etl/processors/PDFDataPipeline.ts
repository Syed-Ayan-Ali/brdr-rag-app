import { PrismaClient } from '@prisma/client';
import { logger, LogCategory } from '../../logging/Logger';
import { PDFScraper, PDFDocumentInfo } from './PDFScraper';
import { DataProcessor, ProcessedDocument } from './DataProcessor';
import { ChunkingStrategyFactory } from '../chunkers/ChunkingStrategyFactory';
import { DocumentGroupingManager } from '../chunkers/DocumentGrouper';
import { ChunkInfo, DocumentInfo } from '../chunkers/ChunkingStrategy';

export interface PipelineResult {
  docId: string;
  success: boolean;
  chunksCreated: number;
  error?: string;
  processingTime: number;
}

export class PDFDataPipeline {
  private prisma: PrismaClient;
  private scraper: PDFScraper;
  private processor: DataProcessor;
  private chunkingFactory: ChunkingStrategyFactory;
  private groupingManager: DocumentGroupingManager;

  constructor() {
    this.prisma = new PrismaClient();
    this.scraper = new PDFScraper();
    this.processor = new DataProcessor();
    this.chunkingFactory = new ChunkingStrategyFactory();
    this.groupingManager = new DocumentGroupingManager();
  }

  async processDocument(docId: string): Promise<PipelineResult> {
    const startTime = Date.now();
    logger.info(LogCategory.SYSTEM, `Starting pipeline for document: ${docId}`);

    try {
      // Step 1: Scrape PDF information
      const pdfInfo = await this.scraper.scrapePDFDocument(docId);
      if (!pdfInfo) {
        throw new Error(`No PDF found for document: ${docId}`);
      }

      // Step 2: Download PDF
      const pdfPath = await this.scraper.downloadPDF(pdfInfo);
      if (!pdfPath) {
        throw new Error(`Failed to download PDF for document: ${docId}`);
      }

      try {
        // Step 3: Extract PDF content
        const rawContent = await this.scraper.extractPDFContent(pdfPath);
        
        // Step 4: Process and clean data
        const processedDocument = await this.processor.processDocument(pdfInfo, rawContent);
        
        // Step 5: Select and apply chunking strategy
        const chunks = await this.chunkingFactory.chunkDocument(processedDocument);
        
        // Step 6: Validate chunks
        const validChunks = await this.processor.validateChunks(chunks);
        
        // Step 7: Get document groups for relationship enrichment
        const allDocuments = await this.getAllDocuments();
        const documentGroups = await this.groupingManager.groupAllDocuments(allDocuments);
        
        // Step 8: Enrich chunks with relationships
        const enrichedChunks = await this.processor.enrichChunksWithRelationships(validChunks, documentGroups);
        
        // Step 9: Store chunks in database
        await this.storeChunks(enrichedChunks, processedDocument);
        
        const processingTime = Date.now() - startTime;
        
        logger.info(LogCategory.SYSTEM, `Pipeline completed for ${docId}: ${enrichedChunks.length} chunks created in ${processingTime}ms`);
        
        return {
          docId,
          success: true,
          chunksCreated: enrichedChunks.length,
          processingTime
        };

      } finally {
        // Cleanup temp file
        await this.scraper.cleanupTempFile(pdfPath);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(LogCategory.SYSTEM, `Pipeline failed for ${docId}:`, error);
      
      return {
        docId,
        success: false,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      };
    }
  }

  async processAllDocuments(): Promise<PipelineResult[]> {
    logger.info(LogCategory.SYSTEM, 'Starting pipeline for all documents');
    
    // Get all documents from database
    const documents = await this.prisma.brdr_documents.findMany({
      select: { doc_id: true }
    });

    logger.info(LogCategory.SYSTEM, `Found ${documents.length} documents to process`);

    const results: PipelineResult[] = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        processedCount++;
        logger.info(LogCategory.SYSTEM, `Processing document ${processedCount}/${documents.length}: ${doc.doc_id}`);

        // Check if chunks already exist
        const existingChunks = await this.prisma.brdr_documents_data.findMany({
          where: { doc_id: doc.doc_id || '' }
        });

        if (existingChunks.length > 0) {
          logger.info(LogCategory.SYSTEM, `Skipping ${doc.doc_id} - chunks already exist`);
          continue;
        }

        const result = await this.processDocument(doc.doc_id || '');
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Add delay to be respectful to the server
        await this.scraper.delay(2000);

      } catch (error) {
        errorCount++;
        logger.error(LogCategory.SYSTEM, `Error processing ${doc.doc_id}:`, error);
        results.push({
          docId: doc.doc_id || '',
          success: false,
          chunksCreated: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: 0
        });
      }
    }

    logger.info(LogCategory.SYSTEM, '=== PIPELINE SUMMARY ===');
    logger.info(LogCategory.SYSTEM, `Total documents processed: ${processedCount}`);
    logger.info(LogCategory.SYSTEM, `Successful: ${successCount}`);
    logger.info(LogCategory.SYSTEM, `Errors: ${errorCount}`);
    logger.info(LogCategory.SYSTEM, 'Pipeline completed!');

    return results;
  }

  private async getAllDocuments(): Promise<DocumentInfo[]> {
    const documents = await this.prisma.brdr_documents.findMany({
      select: {
        doc_id: true,
        doc_long_title: true,
        doc_type_code: true,
        doc_type_desc: true,
        version_code: true,
        issue_date: true
      }
    });

    return documents.map(doc => ({
      docId: doc.doc_id || '',
      title: doc.doc_long_title || '',
      docTypeCode: doc.doc_type_code || '',
      docTypeDesc: doc.doc_type_desc || '',
      version: doc.version_code || '',
      issueDate: doc.issue_date?.toISOString() || '',
      content: '',
      headers: [],
      footers: [],
      bodyContent: [],
      pageNumbers: []
    }));
  }

  private async storeChunks(chunks: ChunkInfo[], processedDocument: ProcessedDocument): Promise<void> {
    logger.info(LogCategory.SYSTEM, `Storing ${chunks.length} chunks for document: ${processedDocument.docId}`);
    
    try {
      // Get the document_id from the brdr_documents table
      const document = await this.prisma.brdr_documents.findFirst({
        where: { doc_id: processedDocument.docId },
        select: { id: true }
      });

      if (!document) {
        throw new Error(`Document not found for doc_id: ${processedDocument.docId}`);
      }

      for (const chunk of chunks) {
        // Extract docId and chunk number from chunkId (e.g., "20250226-3-EN_chunk_1" -> docId: "20250226-3-EN", chunkNumber: 1)
        const chunkIdParts = chunk.chunkId.split('_chunk_');
        const docId = chunkIdParts[0];
        const chunkNumber = parseInt(chunkIdParts[1]) || 1;
        
        await this.prisma.brdr_documents_data.upsert({
          where: {
            doc_id_chunk_id: {
              doc_id: docId,
              chunk_id: chunkNumber
            }
          },
          update: {
            content: chunk.content,
            chunk_type: chunk.chunkType,
            metadata: chunk.metadata as any,
            related_chunks: (chunk.metadata as any).relatedChunks || [],
            relationship_weights: (chunk.metadata as any).relationshipWeights || {},
            semantic_score: (chunk.metadata as any).semanticScore || 0.5,
            keywords: this.extractKeywords(chunk.content),
            context_extension: this.generateContextExtension(chunk, processedDocument)
          },
          create: {
            doc_id: docId,
            document_id: document.id,
            chunk_id: chunkNumber,
            content: chunk.content,
            chunk_type: chunk.chunkType,
            metadata: chunk.metadata as any,
            related_chunks: (chunk.metadata as any).relatedChunks || [],
            relationship_weights: (chunk.metadata as any).relationshipWeights || {},
            semantic_score: (chunk.metadata as any).semanticScore || 0.5,
            keywords: this.extractKeywords(chunk.content),
            context_extension: this.generateContextExtension(chunk, processedDocument)
          }
        });
      }
      
      logger.info(LogCategory.SYSTEM, `Successfully stored ${chunks.length} chunks for document: ${processedDocument.docId}`);
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error storing chunks:', error);
      throw error;
    }
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction based on frequency and importance
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    // Count word frequency
    for (const word of words) {
      if (word.length > 3) { // Only consider words longer than 3 characters
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }
    
    // Sort by frequency and take top 10
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return sortedWords;
  }

  private generateContextExtension(chunk: ChunkInfo, document: ProcessedDocument): string {
    return `Document: ${document.title} | Type: ${document.docTypeCode} | Version: ${document.version} | Issue Date: ${document.issueDate}`;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
