import { SmartChunker } from '../chunkers/SmartChunker';
import { KnowledgeGraphBuilder } from '../knowledge_graph/KnowledgeGraphBuilder';
import { DatabaseManager } from '../database/DatabaseManager';
import { generateEmbedding } from '../../embeddings';
import { DocumentParser } from '../parsers/DocumentParser';

export interface ETLPipelineOptions {
  // Chunking options
  chunkingStrategy?: 'smart' | 'question_answer' | 'topic_based' | 'contextual';
  enableKnowledgeGraph?: boolean;
  enableContextExtension?: boolean;
  contextExtensionSize?: number;
  enableImageProcessing?: boolean;
  enableKeywordExtraction?: boolean;
  enableRelationshipMapping?: boolean;

  // Embedding options
  embeddingModel?: 'Xenova/all-MiniLM-L6-v2' | 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  enableContextualEmbeddings?: boolean;
  enableMultiModalEmbeddings?: boolean;

  // Knowledge graph options
  enableConceptMapping?: boolean;
  enableRelationshipScoring?: boolean;
  enableCoOccurrenceAnalysis?: boolean;
  minRelationshipWeight?: number;

  // Processing options
  batchSize?: number;
  enableParallelProcessing?: boolean;
  enableProgressTracking?: boolean;
}

export interface ETLProcessingResult {
  documentId: string;
  chunksProcessed: number;
  keywordsExtracted: number;
  relationshipsCreated: number;
  processingTime: number;
  errors: string[];
  metadata: any;
}

export class ETLPipeline {
  private smartChunker: SmartChunker;
  private knowledgeGraphBuilder: KnowledgeGraphBuilder;
  private databaseManager: DatabaseManager;
  private documentParser: DocumentParser;

  constructor() {
    this.smartChunker = new SmartChunker();
    this.databaseManager = new DatabaseManager();
    this.knowledgeGraphBuilder = new KnowledgeGraphBuilder(this.databaseManager);
    this.documentParser = new DocumentParser();
  }

  async processDocument(
    document: any,
    options: ETLPipelineOptions = {}
  ): Promise<ETLProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const metadata: any = {};

    console.log(`[AUDIT] Starting ETL processing for document: ${document.doc_id || document.id}`);
    console.log(`[AUDIT] Document source: ${document.source}`);
    console.log(`[AUDIT] Processing options: ${JSON.stringify(options)}`);

    try {
      // Step 1: Parse document
      console.log('Step 1: Parsing document...');
      const parsedContent = await this.documentParser.parse(document);
      console.log(`[AUDIT] Document parsed successfully: ${document.doc_id || document.id}`);
      console.log(`[AUDIT] Parsed content length: ${parsedContent.content.length} characters`);
      console.log(`[AUDIT] Images found: ${parsedContent.images.length}`);
      console.log(`[AUDIT] Tables found: ${parsedContent.tables.length}`);
      
      metadata.parsingResult = {
        contentLength: parsedContent.content.length,
        hasImages: parsedContent.images.length > 0,
        hasTables: parsedContent.tables.length > 0
      };

      // Step 2: Generate document embedding
      console.log('Step 2: Generating document embedding...');
      const documentEmbedding = await generateEmbedding(parsedContent.content);
      console.log(`[AUDIT] Document embedding generated: ${documentEmbedding.length} dimensions`);
      console.log(`[AUDIT] Embedding model used: Xenova/all-MiniLM-L6-v2`);

      // Step 3: Smart chunking
      console.log('Step 3: Performing smart chunking...');
      const chunks = await this.smartChunker.chunkDocument(
        parsedContent.content,
        document,
        {
          chunkingStrategy: options.chunkingStrategy || 'smart',
          enableKnowledgeGraph: options.enableKnowledgeGraph !== false,
          enableContextExtension: options.enableContextExtension !== false,
          contextExtensionSize: options.contextExtensionSize || 500,
          enableImageProcessing: options.enableImageProcessing !== false,
          enableKeywordExtraction: options.enableKeywordExtraction !== false,
          enableRelationshipMapping: options.enableRelationshipMapping !== false
        }
      );

      console.log(`[AUDIT] Document chunked into ${chunks.length} chunks`);
      console.log(`[AUDIT] Chunking strategy: ${options.chunkingStrategy || 'smart'}`);
      console.log(`[AUDIT] Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length)} characters`);
      
      metadata.chunkingResult = {
        totalChunks: chunks.length,
        chunkTypes: [...new Set(chunks.map(c => c.chunkType))],
        averageChunkSize: chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length
      };

      // Step 4: Generate chunk embeddings
      console.log('Step 4: Generating chunk embeddings...');
      const chunksWithEmbeddings = await this.generateChunkEmbeddings(chunks, options);
      console.log(`[AUDIT] Chunk embeddings generated for ${chunksWithEmbeddings.length} chunks`);

      // Step 5: Store document
      console.log('Step 5: Storing document...');
      const documentId = await this.databaseManager.storeDocument({
        ...document,
        content: parsedContent.content,
        embedding: documentEmbedding,
        keywords: this.extractDocumentKeywords(chunks),
        topics: this.extractDocumentTopics(chunks),
        summary: await this.generateDocumentSummary(parsedContent.content)
      });
      console.log(`[AUDIT] Document stored with ID: ${documentId}`);
      console.log(`[AUDIT] Document metadata: ${JSON.stringify(document.metadata || {})}`);

      // Step 6: Store chunks
      console.log('Step 6: Storing chunks...');
      const storedChunkIds = [];
      for (let i = 0; i < chunksWithEmbeddings.length; i++) {
        const chunk = chunksWithEmbeddings[i];
        const chunkId = await this.databaseManager.storeChunk({
          ...chunk,
          doc_id: document.doc_id || document.id,
          chunk_id: i + 1
        }, documentId);
        storedChunkIds.push(chunkId);
        console.log(`[AUDIT] Chunk stored: ${chunkId} (${chunk.content.length} chars)`);
      }
      console.log(`[AUDIT] ${storedChunkIds.length} chunks stored successfully`);

      // Step 7: Build knowledge graph
      if (options.enableKnowledgeGraph !== false) {
        console.log('Step 7: Building knowledge graph...');
        const knowledgeGraphResult = await this.knowledgeGraphBuilder.buildKnowledgeGraph(
          chunksWithEmbeddings,
          {
            enableConceptMapping: options.enableConceptMapping !== false,
            enableRelationshipScoring: options.enableRelationshipScoring !== false,
            enableCoOccurrenceAnalysis: options.enableCoOccurrenceAnalysis !== false,
            minRelationshipWeight: options.minRelationshipWeight || 0.3,
            maxConceptsPerNode: 5
          }
        );

        console.log(`[AUDIT] Knowledge graph built: ${knowledgeGraphResult.nodes.length} nodes, ${knowledgeGraphResult.relationships.length} relationships`);
        console.log(`[AUDIT] Keywords extracted: ${knowledgeGraphResult.keywords.keywords.length}`);
        console.log(`[AUDIT] Concepts identified: ${knowledgeGraphResult.keywords.concepts.length}`);

        metadata.knowledgeGraphResult = {
          nodes: knowledgeGraphResult.nodes.length,
          relationships: knowledgeGraphResult.relationships.length,
          keywords: knowledgeGraphResult.keywords.keywords.length,
          concepts: knowledgeGraphResult.keywords.concepts.length
        };
      }

      // Step 8: Process images if enabled
      if (options.enableImageProcessing !== false && parsedContent.images.length > 0) {
        console.log('Step 8: Processing images...');
        const imageResults = await this.processImages(parsedContent.images, documentId, options);
        metadata.imageProcessingResult = imageResults;
      }

      const processingTime = Date.now() - startTime;
      console.log(`[AUDIT] ETL processing completed successfully in ${processingTime}ms`);

      return {
        documentId,
        chunksProcessed: chunks.length,
        keywordsExtracted: this.countTotalKeywords(chunks),
        relationshipsCreated: metadata.knowledgeGraphResult?.relationships || 0,
        processingTime,
        errors,
        metadata
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      console.error(`[AUDIT] ETL processing failed: ${errorMsg}`);
      console.error(`[AUDIT] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      
      return {
        documentId: '',
        chunksProcessed: 0,
        keywordsExtracted: 0,
        relationshipsCreated: 0,
        processingTime: Date.now() - startTime,
        errors,
        metadata
      };
    }
  }

  async processBatch(
    documents: any[],
    options: ETLPipelineOptions = {}
  ): Promise<ETLProcessingResult[]> {
    const results: ETLProcessingResult[] = [];
    const batchSize = options.batchSize || 10;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);

      if (options.enableParallelProcessing) {
        const batchResults = await Promise.all(
          batch.map(doc => this.processDocument(doc, options))
        );
        results.push(...batchResults);
      } else {
        for (const doc of batch) {
          const result = await this.processDocument(doc, options);
          results.push(result);
        }
      }
    }

    return results;
  }

  private async generateChunkEmbeddings(
    chunks: any[],
    options: ETLPipelineOptions
  ): Promise<any[]> {
    const chunksWithEmbeddings = [];

    for (const chunk of chunks) {
      try {
        let embeddingText = chunk.content;

        // Use context extension if available
        if (chunk.contextExtension && options.enableContextualEmbeddings !== false) {
          embeddingText = chunk.contextExtension;
        }

        const embedding = await generateEmbedding(embeddingText);

        chunksWithEmbeddings.push({
          ...chunk,
          embedding
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.id}:`, error);
        chunksWithEmbeddings.push(chunk);
      }
    }

    return chunksWithEmbeddings;
  }

  private extractDocumentKeywords(chunks: any[]): string[] {
    const allKeywords = new Set<string>();
    
    for (const chunk of chunks) {
      if (chunk.keywords) {
        chunk.keywords.forEach((keyword: string) => allKeywords.add(keyword));
      }
    }

    return Array.from(allKeywords);
  }

  private extractDocumentTopics(chunks: any[]): string[] {
    const topics = new Set<string>();
    
    for (const chunk of chunks) {
      if (chunk.metadata?.topic) {
        topics.add(chunk.metadata.topic);
      }
    }

    return Array.from(topics);
  }

  private async generateDocumentSummary(content: string): Promise<string> {
    // Simple summary generation - can be enhanced with LLM
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary;
  }

  private countTotalKeywords(chunks: any[]): number {
    return chunks.reduce((total, chunk) => total + (chunk.keywords?.length || 0), 0);
  }

  private async processImages(
    images: any[],
    documentId: string,
    options: ETLPipelineOptions
  ): Promise<any> {
    const results = {
      processed: 0,
      errors: 0,
      totalImages: images.length
    };

    for (const image of images) {
      try {
        // Process OCR if available
        let ocrText = '';
        if (image.imageData) {
          ocrText = await this.documentParser.processOCR(image.imageData);
        }

        // Generate image embedding if enabled
        let imageEmbedding = null;
        if (options.enableMultiModalEmbeddings !== false && image.imageData) {
          // For now, use text embedding for images (OCR text)
          // TODO: Implement proper image embedding when needed
          imageEmbedding = await generateEmbedding(ocrText || image.imageData);
        }

        // Store image content
        await this.databaseManager.storeImageContent({
          document_id: documentId,
          image_url: image.imageUrl,
          image_data: image.imageData,
          ocr_text: ocrText,
          image_type: image.imageType,
          position: image.position,
          related_text: image.relatedText,
          embedding: imageEmbedding
        });

        results.processed++;
      } catch (error) {
        console.error('Error processing image:', error);
        results.errors++;
      }
    }

    return results;
  }

  // Check if document exists
  async checkDocumentExists(documentId: string): Promise<boolean> {
    return await this.databaseManager.checkDocumentExists(documentId);
  }

  // Get knowledge graph stats
  async getKnowledgeGraphStats(): Promise<any> {
    return await this.databaseManager.getKnowledgeGraphStats();
  }

  async getProcessingStats(): Promise<any> {
    try {
      const stats = await this.databaseManager.getKnowledgeGraphStats();
      return {
        ...stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        chunks: 0,
        keywords: 0,
        relationships: 0,
        concepts: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup any temporary resources
    console.log('ETL Pipeline cleanup completed');
  }
} 