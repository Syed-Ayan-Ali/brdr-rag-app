import { DocumentInfo, ChunkInfo } from '../chunkers/ChunkingStrategy';
import { PDFDocumentInfo } from './PDFScraper';
import { logger, LogCategory } from '../../logging/Logger';

export interface ProcessedDocument {
  docId: string;
  title: string;
  docTypeCode: string;
  docTypeDesc: string;
  version: string;
  issueDate: string;
  content: string;
  headers: string[];
  footers: string[];
  bodyContent: string[];
  pageNumbers: number[];
  cleanedContent: string;
  metadata: {
    wordCount: number;
    charCount: number;
    pageCount: number;
    hasTables: boolean;
    hasImages: boolean;
    hasFormulas: boolean;
    hasQuotes: boolean;
    language: string;
    documentType: string;
    processingDate: string;
  };
}

export class DataProcessor {
  
  async processDocument(pdfInfo: PDFDocumentInfo, rawContent: DocumentInfo): Promise<ProcessedDocument> {
    logger.info(LogCategory.SYSTEM, `Processing document: ${pdfInfo.docId}`);
    
    // Merge PDF info with extracted content
    const mergedContent = this.mergePDFInfoWithContent(pdfInfo, rawContent);
    
    // Clean and normalize content
    const cleanedContent = this.cleanContent(mergedContent);
    
    // Extract metadata
    const metadata = this.extractMetadata(cleanedContent);
    
    // Create processed document
    const processedDocument: ProcessedDocument = {
      ...cleanedContent,
      cleanedContent: cleanedContent.content,
      metadata
    };
    
    logger.info(LogCategory.SYSTEM, `Processed document ${pdfInfo.docId}: ${metadata.wordCount} words, ${metadata.pageCount} pages`);
    
    return processedDocument;
  }

  private mergePDFInfoWithContent(pdfInfo: PDFDocumentInfo, rawContent: DocumentInfo): DocumentInfo {
    return {
      ...rawContent,
      title: pdfInfo.title,
      docTypeCode: pdfInfo.docTypeCode,
      docTypeDesc: pdfInfo.docTypeDesc,
      version: pdfInfo.version,
      issueDate: pdfInfo.issueDate
    };
  }

  private cleanContent(content: DocumentInfo): DocumentInfo {
    const cleanedContent = { ...content };
    
    // Clean headers - keep only the first page header
    if (content.headers.length > 0) {
      cleanedContent.headers = [this.cleanText(content.headers[0])];
    } else {
      cleanedContent.headers = [];
    }
    
    // Clean footers
    cleanedContent.footers = content.footers.map(footer => this.cleanText(footer));
    
    // Clean body content and remove headers from subsequent pages
    cleanedContent.bodyContent = content.bodyContent.map((body, index) => {
      let cleanedBody = this.cleanText(body);
      
      // Remove headers from all pages except the first
      if (index > 0) {
        // Remove common header patterns that might appear on subsequent pages
        cleanedBody = cleanedBody.replace(/^(.*?)(?=\n\n|\n[A-Z]|\n\d)/, '');
        cleanedBody = cleanedBody.replace(/^.*?(?=\n\n|\n[A-Z]|\n\d)/, '');
      }
      
      return cleanedBody;
    });
    
    // Update combined content
    cleanedContent.content = cleanedContent.bodyContent.join('\n\n');
    
    return cleanedContent;
  }

  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\"\']/g, '')
      // Normalize quotes
      .replace(/["""]/g, '"')
      .replace(/[''']/g, "'")
      // Normalize dashes
      .replace(/[–—]/g, '-')
      // Remove leading/trailing whitespace
      .trim();
  }

  private extractMetadata(content: DocumentInfo): ProcessedDocument['metadata'] {
    const fullText = content.content;
    const wordCount = fullText.split(/\s+/).length;
    const charCount = fullText.length;
    const pageCount = content.pageNumbers.length;
    
    // Detect content features
    const hasTables = /\|.*\|/.test(fullText) || /\bTable\s+\d+\b/i.test(fullText);
    const hasImages = /\bFigure\s+\d+\b/i.test(fullText) || /\bImage\b/i.test(fullText);
    const hasFormulas = /\$[^$]*\$|\\\([^)]*\\\)/.test(fullText);
    const hasQuotes = /"[^"]*"/.test(fullText);
    
    // Detect language (simplified)
    const language = this.detectLanguage(fullText);
    
    // Determine document type
    const documentType = this.determineDocumentType(content.docTypeCode, content.docTypeDesc);
    
    return {
      wordCount,
      charCount,
      pageCount,
      hasTables,
      hasImages,
      hasFormulas,
      hasQuotes,
      language,
      documentType,
      processingDate: new Date().toISOString()
    };
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const chineseChars = /[\u4e00-\u9fff]/;
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i;
    
    if (chineseChars.test(text)) {
      return 'zh';
    } else if (englishWords.test(text)) {
      return 'en';
    } else {
      return 'en'; // Default to English
    }
  }

  private determineDocumentType(docTypeCode: string, docTypeDesc: string): string {
    const typeMap: Record<string, string> = {
      'CIR': 'circular',
      'SPM-SGL': 'statutory_guideline',
      'GLI': 'guideline',
      'SPM-NGL': 'non_statutory_guideline',
      'COP': 'code_of_practice',
      'GTA': 'guide_to_authorization',
      'SPM': 'supervisory_policy_manual',
      'IGL': 'industry_guidance'
    };
    
    return typeMap[docTypeCode] || 'unknown';
  }

  async validateChunks(chunks: ChunkInfo[]): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Validating ${chunks.length} chunks`);
    
    const validChunks: ChunkInfo[] = [];
    
    for (const chunk of chunks) {
      if (this.isValidChunk(chunk)) {
        validChunks.push(chunk);
      } else {
        logger.warn(LogCategory.SYSTEM, `Invalid chunk detected: ${chunk.chunkId}`);
      }
    }
    
    logger.info(LogCategory.SYSTEM, `Validated ${validChunks.length} chunks out of ${chunks.length}`);
    return validChunks;
  }

  private isValidChunk(chunk: ChunkInfo): boolean {
    // Check if chunk has meaningful content
    if (!chunk.content || chunk.content.trim().length < 10) {
      return false;
    }
    
    // Check if chunk has reasonable word count
    const wordCount = chunk.content.split(/\s+/).length;
    if (wordCount < 5 || wordCount > 5000) {
      return false;
    }
    
    // Check if chunk has valid metadata
    if (!chunk.metadata || typeof chunk.metadata.wordCount !== 'number') {
      return false;
    }
    
    return true;
  }

  async enrichChunksWithRelationships(chunks: ChunkInfo[], documentGroups: any[]): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Enriching ${chunks.length} chunks with relationships`);
    
    const enrichedChunks = chunks.map(chunk => {
      const enrichedChunk = { ...chunk };
      
      // Extract docId from chunkId
      const docId = chunk.chunkId.split('_chunk_')[0];
      
      // Add group relationships
      const relatedGroups = this.findRelatedGroups(docId, documentGroups);
      if (relatedGroups.length > 0) {
        (enrichedChunk.metadata as any).groupIds = relatedGroups.map(group => group.groupId);
        (enrichedChunk.metadata as any).isLatestInGroup = relatedGroups.some(group => 
          group.latestDocument === docId
        );
      }
      
      // Add semantic relationships with other chunks
      (enrichedChunk.metadata as any).relatedChunks = this.findRelatedChunks(chunk, chunks);
      
      return enrichedChunk;
    });
    
    return enrichedChunks;
  }

  private findRelatedGroups(docId: string, documentGroups: any[]): any[] {
    return documentGroups.filter(group => group.documents.includes(docId));
  }

  private findRelatedChunks(chunk: ChunkInfo, allChunks: ChunkInfo[]): string[] {
    const relatedChunks: string[] = [];
    
    for (const otherChunk of allChunks) {
      if (otherChunk.chunkId === chunk.chunkId) continue;
      
      // Check if chunks are semantically related
      const similarity = this.calculateChunkSimilarity(chunk, otherChunk);
      if (similarity > 0.3) {
        relatedChunks.push(otherChunk.chunkId);
      }
    }
    
    return relatedChunks;
  }

  private calculateChunkSimilarity(chunk1: ChunkInfo, chunk2: ChunkInfo): number {
    const words1 = new Set(chunk1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(chunk2.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
