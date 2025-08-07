import { ChunkingStrategy, ChunkingOptions, ChunkInfo, DocumentInfo } from './ChunkingStrategy';
import { logger, LogCategory } from '../../logging/Logger';

export class StandardChunker implements ChunkingStrategy {
  name = 'standard_chunking';

  isApplicable(content: DocumentInfo): boolean {
    // Standard chunking is applicable when text has no meaning or no structure
    return !this.hasMeaningfulContent(content) && !this.hasStructuredContent(content);
  }

  async chunk(content: DocumentInfo, options: ChunkingOptions = {}): Promise<ChunkInfo[]> {
    const {
      maxTokens = 300,
      overlapPercentage = 10
    } = options;

    logger.info(LogCategory.SYSTEM, `Using standard chunking for document: ${content.docId}`);

    const chunks: ChunkInfo[] = [];
    let chunkIndex = 1;

    // Combine all body content
    const fullText = content.bodyContent.join('\n\n');
    const sentences = this.splitIntoSentences(fullText);
    
    let currentChunk = '';
    let currentTokens = 0;
    const maxTokensPerChunk = maxTokens;
    const overlapTokens = Math.floor(maxTokensPerChunk * (overlapPercentage / 100));

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunk.trim().length > 0) {
        // Create chunk
        chunks.push(this.createChunkInfo(content, currentChunk.trim(), chunkIndex, 'body'));
        chunkIndex++;
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlapTokens);
        currentChunk = overlapText + sentence;
        currentTokens = this.estimateTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunkInfo(content, currentChunk.trim(), chunkIndex, 'body'));
    }

    logger.info(LogCategory.SYSTEM, `Created ${chunks.length} standard chunks for ${content.docId}`);
    return chunks;
  }

  private hasMeaningfulContent(content: DocumentInfo): boolean {
    // Check if content has meaningful structure (headings, sections, etc.)
    const text = content.bodyContent.join(' ');
    const hasHeadings = /\b\d+\.\s|\b[A-Z][A-Z\s]{2,}\b|\b(Chapter|Section|Part)\b/i.test(text);
    const hasStructuredLists = /\b\d+\.\d+\.\d+|\b[a-z]\)\s|\b[A-Z]\)\s/.test(text);
    const hasMeaningfulLength = text.length > 1000;
    
    return hasHeadings || hasStructuredLists || hasMeaningfulLength;
  }

  private hasStructuredContent(content: DocumentInfo): boolean {
    // Check for hierarchical structure
    const text = content.bodyContent.join(' ');
    const hierarchicalPatterns = [
      /\b\d+\.\d+\.\d+\.\d+\b/, // 1.1.1.1
      /\b\d+\.\d+\.\d+\b/,      // 1.1.1
      /\b\d+\.\d+\b/,           // 1.1
      /\bChapter\s+\d+\b/i,     // Chapter 1
      /\bSection\s+\d+\b/i      // Section 1
    ];
    
    return hierarchicalPatterns.some(pattern => pattern.test(text));
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting that preserves sentence boundaries
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const overlapWords = Math.floor(overlapTokens * 4 / 5); // Rough conversion
    return words.slice(-overlapWords).join(' ');
  }

  private createChunkInfo(
    content: DocumentInfo, 
    chunkContent: string, 
    chunkIndex: number, 
    chunkType: 'header' | 'footer' | 'body' | 'mixed'
  ): ChunkInfo {
    return {
      chunkId: `${content.docId}_chunk_${chunkIndex}`,
      content: chunkContent,
      chunkType,
      pageNumber: 1, // Standard chunking doesn't preserve page numbers
      metadata: {
        startPage: 1,
        endPage: content.pageNumbers.length,
        wordCount: chunkContent.split(/\s+/).length,
        charCount: chunkContent.length,
        hasTables: false,
        hasImages: false,
        sectionType: 'main_content',
        chunkingStrategy: this.name
      }
    };
  }
}

