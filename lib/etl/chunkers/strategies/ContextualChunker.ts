import { ChunkingStrategy, Chunk, ChunkingOptions } from '../../interfaces/ChunkingStrategy';

export class ContextualChunker implements ChunkingStrategy {
  async chunk(content: string, metadata: any, options: ChunkingOptions = {}): Promise<Chunk[]> {
    const {
      chunkSize = 2000,
      overlapSize = 200,
      contextExtensionSize = 500,
      ...otherOptions
    } = options;

    const chunks: Chunk[] = [];
    
    // Split content into paragraphs first
    const paragraphs = this.splitIntoParagraphs(content);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size, create a new chunk
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        const chunk = this.createChunk(currentChunk, chunkIndex, metadata, {
          ...otherOptions,
          contextExtensionSize
        });
        chunks.push(chunk);
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlapSize);
        currentChunk = overlapText + '\n\n' + paragraph;
        chunkIndex++;
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      const chunk = this.createChunk(currentChunk, chunkIndex, metadata, {
        ...otherOptions,
        contextExtensionSize
      });
      chunks.push(chunk);
    }
    
    // Apply context extension to all chunks
    return this.applyContextExtension(chunks, contextExtensionSize);
  }

  getName(): string {
    return 'ContextualChunker';
  }

  getDescription(): string {
    return 'Chunks content with overlapping context and paragraph-aware splitting';
  }

  private splitIntoParagraphs(content: string): string[] {
    // Split by double newlines (paragraphs)
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    
    // If no paragraphs found, split by single newlines
    if (paragraphs.length <= 1) {
      return content.split('\n').filter(line => line.trim());
    }
    
    return paragraphs;
  }

  private createChunk(content: string, index: number, metadata: any, options: any): Chunk {
    const keywords = this.extractKeywords(content);
    
    return {
      id: `contextual_${index}_${Date.now()}`,
      content: content.trim(),
      chunkType: 'contextual',
      keywords,
      relatedChunks: [],
      metadata: {
        ...metadata,
        chunkIndex: index,
        chunkSize: content.length,
        keywordCount: keywords.length,
        hasOverlap: index > 0
      }
    };
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Get the last part of the text as overlap
    return text.slice(-overlapSize);
  }

  private applyContextExtension(chunks: Chunk[], extensionSize: number): Chunk[] {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let extendedContent = chunk.content;
      
      // Add context from previous chunk
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const prevContext = prevChunk.content.slice(-extensionSize);
        extendedContent = prevContext + '\n\n' + extendedContent;
      }
      
      // Add context from next chunk
      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const nextContext = nextChunk.content.slice(0, extensionSize);
        extendedContent = extendedContent + '\n\n' + nextContext;
      }
      
      chunk.contextExtension = extendedContent;
      chunk.metadata = {
        ...chunk.metadata,
        hasContextExtension: true,
        contextExtensionSize: extensionSize,
        originalContentLength: chunk.content.length,
        extendedContentLength: extendedContent.length
      };
    }
    
    return chunks;
  }

  private extractKeywords(text: string): string[] {
    // Enhanced keyword extraction for contextual chunks
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    // Count frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([word, _]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'also', 'very', 'much', 'many', 'some', 'such', 'only', 'just', 'even', 'still', 'again',
      'however', 'therefore', 'furthermore', 'moreover', 'nevertheless', 'consequently'
    ]);
    
    return stopWords.has(word);
  }
} 