import { ChunkingStrategy, ChunkingOptions, ChunkInfo, DocumentInfo } from './ChunkingStrategy';
import { logger, LogCategory } from '../../logging/Logger';

export class HierarchicalChunker implements ChunkingStrategy {
  name = 'hierarchical_chunking';

  isApplicable(content: DocumentInfo): boolean {
    // Hierarchical chunking is applicable when document has structure
    return this.hasStructuredContent(content);
  }

  async chunk(content: DocumentInfo, options: ChunkingOptions = {}): Promise<ChunkInfo[]> {
    const {
      parentChunkSize = 2000,
      childChunkSize = 500,
      overlapTokens = 50
    } = options;

    logger.info(LogCategory.SYSTEM, `Using hierarchical chunking for document: ${content.docId}`);

    const chunks: ChunkInfo[] = [];
    const parentChunks: ChunkInfo[] = [];
    const childChunks: ChunkInfo[] = [];

    // Parse document structure
    const sections = this.parseDocumentStructure(content);
    
    // Create parent chunks (larger chunks)
    let parentIndex = 1;
    for (const section of sections) {
      const parentChunk = this.createChunkInfo(
        content, 
        section.content, 
        parentIndex, 
        'body',
        section.title,
        section.level
      );
      parentChunk.metadata.parentChunkId = `${content.docId}_parent_${parentIndex}`;
      parentChunks.push(parentChunk);
      parentIndex++;
    }

    // Create child chunks (smaller chunks within parent chunks)
    let childIndex = 1;
    for (const section of sections) {
      const childSectionChunks = this.createChildChunks(content, section, childIndex, overlapTokens);
      childChunks.push(...childSectionChunks);
      childIndex += childSectionChunks.length;
    }

    // Link parent and child chunks with enhanced relationships
    for (const parentChunk of parentChunks) {
      const relatedChildChunks = childChunks.filter(child => 
        child.content.includes(parentChunk.content.substring(0, 100)) ||
        parentChunk.content.includes(child.content.substring(0, 100))
      );
      parentChunk.metadata.childChunkIds = relatedChildChunks.map(child => child.chunkId);
      
      // Add parent chunk to child chunks' related chunks
      for (const childChunk of relatedChildChunks) {
        if (!childChunk.metadata.relatedChunks) {
          childChunk.metadata.relatedChunks = [];
        }
        childChunk.metadata.relatedChunks.push(parentChunk.chunkId);
      }
    }

    // Link sibling chunks (chunks at the same hierarchical level)
    for (let i = 0; i < childChunks.length; i++) {
      for (let j = i + 1; j < childChunks.length; j++) {
        const chunk1 = childChunks[i];
        const chunk2 = childChunks[j];
        
        // Check if they are siblings (same parent or same level)
        if (this.areSiblingChunks(chunk1, chunk2)) {
          if (!chunk1.metadata.relatedChunks) {
            chunk1.metadata.relatedChunks = [];
          }
          if (!chunk2.metadata.relatedChunks) {
            chunk2.metadata.relatedChunks = [];
          }
          
          chunk1.metadata.relatedChunks.push(chunk2.chunkId);
          chunk2.metadata.relatedChunks.push(chunk1.chunkId);
        }
      }
    }

    // Combine all chunks
    chunks.push(...parentChunks, ...childChunks);

    logger.info(LogCategory.SYSTEM, `Created ${parentChunks.length} parent chunks and ${childChunks.length} child chunks for ${content.docId}`);
    return chunks;
  }

  private hasStructuredContent(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    
    // Check for hierarchical numbering patterns
    const hierarchicalPatterns = [
      /\b\d+\.\d+\.\d+\.\d+\b/, // 1.1.1.1
      /\b\d+\.\d+\.\d+\b/,      // 1.1.1
      /\b\d+\.\d+\b/,           // 1.1
      /\bChapter\s+\d+\b/i,     // Chapter 1
      /\bSection\s+\d+\b/i,     // Section 1
      /\bPart\s+\d+\b/i         // Part 1
    ];
    
    return hierarchicalPatterns.some(pattern => pattern.test(text));
  }

  private parseDocumentStructure(content: DocumentInfo): Array<{
    title: string;
    content: string;
    level: number;
    startPage: number;
    endPage: number;
  }> {
    const sections: Array<{
      title: string;
      content: string;
      level: number;
      startPage: number;
      endPage: number;
    }> = [];

    const fullText = content.bodyContent.join('\n\n');
    const lines = fullText.split('\n');
    
    let currentSection = {
      title: 'Introduction',
      content: '',
      level: 0,
      startPage: 1,
      endPage: 1
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers
      const chapterMatch = trimmedLine.match(/^Chapter\s+(\d+)/i);
      const sectionMatch = trimmedLine.match(/^(\d+\.\d+\.\d+\.\d+|\d+\.\d+\.\d+|\d+\.\d+|\d+\.)\s+(.+)$/);
      
      if (chapterMatch) {
        // Save previous section
        if (currentSection.content.trim().length > 0) {
          sections.push({ ...currentSection });
        }
        
        // Start new chapter
        currentSection = {
          title: `Chapter ${chapterMatch[1]}`,
          content: trimmedLine + '\n',
          level: 1,
          startPage: 1,
          endPage: 1
        };
      } else if (sectionMatch) {
        // Save previous section
        if (currentSection.content.trim().length > 0) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        const level = (sectionMatch[1].match(/\./g) || []).length;
        currentSection = {
          title: sectionMatch[2],
          content: trimmedLine + '\n',
          level,
          startPage: 1,
          endPage: 1
        };
      } else {
        // Add content to current section
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection.content.trim().length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  private createChildChunks(
    content: DocumentInfo, 
    section: { title: string; content: string; level: number; startPage: number; endPage: number },
    startIndex: number,
    overlapTokens: number
  ): ChunkInfo[] {
    const childChunks: ChunkInfo[] = [];
    const sentences = this.splitIntoSentences(section.content);
    
    let currentChunk = '';
    let currentTokens = 0;
    const maxTokensPerChunk = 500;
    let chunkIndex = startIndex;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunk.trim().length > 0) {
        // Create child chunk
        const childChunk = this.createChunkInfo(
          content,
          currentChunk.trim(),
          chunkIndex,
          'body',
          section.title,
          section.level
        );
        childChunk.metadata.parentChunkId = `${content.docId}_parent_${Math.floor(chunkIndex / 3) + 1}`;
        childChunks.push(childChunk);
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

    // Add remaining content as final child chunk
    if (currentChunk.trim().length > 0) {
      const childChunk = this.createChunkInfo(
        content,
        currentChunk.trim(),
        chunkIndex,
        'body',
        section.title,
        section.level
      );
      childChunk.metadata.parentChunkId = `${content.docId}_parent_${Math.floor(chunkIndex / 3) + 1}`;
      childChunks.push(childChunk);
    }

    return childChunks;
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private areSiblingChunks(chunk1: ChunkInfo, chunk2: ChunkInfo): boolean {
    // Check if chunks are at the same hierarchical level
    const level1 = chunk1.metadata.sectionType || '';
    const level2 = chunk2.metadata.sectionType || '';
    
    // Extract hierarchical numbers (e.g., "6.1.1", "6.1.2")
    const level1Match = level1.match(/(\d+\.\d+\.\d+)/);
    const level2Match = level2.match(/(\d+\.\d+\.\d+)/);
    
    if (level1Match && level2Match) {
      // Check if they share the same parent (e.g., "6.1.1" and "6.1.2" share "6.1")
      const parent1 = level1Match[1].split('.').slice(0, -1).join('.');
      const parent2 = level2Match[1].split('.').slice(0, -1).join('.');
      return parent1 === parent2;
    }
    
    // Fallback: check if they have similar section types
    return level1 === level2 && level1 !== '';
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const overlapWords = Math.floor(overlapTokens * 4 / 5);
    return words.slice(-overlapWords).join(' ');
  }

  private createChunkInfo(
    content: DocumentInfo,
    chunkContent: string,
    chunkIndex: number,
    chunkType: 'header' | 'footer' | 'body' | 'mixed',
    sectionTitle?: string,
    level?: number
  ): ChunkInfo {
    return {
      chunkId: `${content.docId}_chunk_${chunkIndex}`,
      content: chunkContent,
      chunkType,
      pageNumber: 1,
      sectionTitle,
      metadata: {
        startPage: 1,
        endPage: content.pageNumbers.length,
        wordCount: chunkContent.split(/\s+/).length,
        charCount: chunkContent.length,
        hasTables: false,
        hasImages: false,
        sectionType: level === 1 ? 'chapter' : level === 2 ? 'section' : 'subsection',
        chunkingStrategy: this.name,
        parentChunkId: undefined,
        childChunkIds: []
      }
    };
  }
}
