import { ChunkingStrategy, Chunk, ChunkingOptions } from '../interfaces/ChunkingStrategy';
import { QuestionAnswerChunker } from './strategies/QuestionAnswerChunker';
import { TopicBasedChunker } from './strategies/TopicBasedChunker';
import { ContextualChunker } from './strategies/ContextualChunker';
import { MultiModalChunker } from './strategies/MultiModalChunker';

export interface SmartChunkingOptions extends ChunkingOptions {
  enableKnowledgeGraph?: boolean;
  enableContextExtension?: boolean;
  contextExtensionSize?: number;
  enableImageProcessing?: boolean;
  enableKeywordExtraction?: boolean;
  enableRelationshipMapping?: boolean;
}

export class SmartChunker {
  private questionAnswerChunker: QuestionAnswerChunker;
  private topicBasedChunker: TopicBasedChunker;
  private contextualChunker: ContextualChunker;
  private multiModalChunker: MultiModalChunker;

  constructor() {
    this.questionAnswerChunker = new QuestionAnswerChunker();
    this.topicBasedChunker = new TopicBasedChunker();
    this.contextualChunker = new ContextualChunker();
    this.multiModalChunker = new MultiModalChunker();
  }

  async chunkDocument(
    content: string,
    metadata: any,
    options: SmartChunkingOptions = {}
  ): Promise<Chunk[]> {
    const {
      chunkingStrategy = 'smart',
      enableKnowledgeGraph = true,
      enableContextExtension = true,
      contextExtensionSize = 500,
      enableImageProcessing = true,
      enableKeywordExtraction = true,
      enableRelationshipMapping = true,
      ...otherOptions
    } = options;

    let chunks: Chunk[] = [];

    // Step 1: Detect content type and apply appropriate chunking strategy
    const contentType = this.detectContentType(content, metadata);
    
    switch (chunkingStrategy) {
      case 'question_answer':
        chunks = await this.questionAnswerChunker.chunk(content, metadata, otherOptions);
        break;
      case 'topic_based':
        chunks = await this.topicBasedChunker.chunk(content, metadata, otherOptions);
        break;
      case 'contextual':
        chunks = await this.contextualChunker.chunk(content, metadata, {
          ...otherOptions,
          contextExtensionSize
        });
        break;
      case 'smart':
      default:
        chunks = await this.applySmartChunking(content, metadata, contentType, options);
        break;
    }

    // Step 2: Process images if enabled
    if (enableImageProcessing) {
      const imageChunks = await this.multiModalChunker.extractImages(content, metadata);
      chunks = [...chunks, ...imageChunks];
    }

    // Step 3: Extract keywords if enabled
    if (enableKeywordExtraction) {
      chunks = await this.extractKeywords(chunks);
    }

    // Step 4: Apply context extension if enabled
    if (enableContextExtension) {
      chunks = await this.applyContextExtension(chunks, contextExtensionSize);
    }

    // Step 5: Map relationships if enabled
    if (enableRelationshipMapping) {
      chunks = await this.mapRelationships(chunks);
    }

    // Step 6: Generate knowledge graph data if enabled
    if (enableKnowledgeGraph) {
      chunks = await this.generateKnowledgeGraphData(chunks);
    }

    return chunks;
  }

  private detectContentType(content: string, metadata: any): string {
    // Detect if content contains Q&A patterns
    const qaPatterns = [
      /\b(question|q\.|q:)\s*\d+[\.:]?\s*\w+/gi,
      /\b(answer|a\.|a:)\s*\d+[\.:]?\s*\w+/gi,
      /\b(q&a|faq)\b/gi
    ];

    if (qaPatterns.some(pattern => pattern.test(content))) {
      return 'question_answer';
    }

    // Detect if content is topic-based
    const topicPatterns = [
      /\b(chapter|section|topic|subject)\s*\d+[\.:]?\s*\w+/gi,
      /\b(heading|title)\s*:\s*\w+/gi
    ];

    if (topicPatterns.some(pattern => pattern.test(content))) {
      return 'topic_based';
    }

    // Default to contextual chunking
    return 'contextual';
  }

  private async applySmartChunking(
    content: string,
    metadata: any,
    contentType: string,
    options: SmartChunkingOptions
  ): Promise<Chunk[]> {
    let chunks: Chunk[] = [];

    // Apply multiple chunking strategies based on content analysis
    if (contentType === 'question_answer') {
      const qaChunks = await this.questionAnswerChunker.chunk(content, metadata, options);
      chunks = [...chunks, ...qaChunks];
    }

    if (contentType === 'topic_based') {
      const topicChunks = await this.topicBasedChunker.chunk(content, metadata, options);
      chunks = [...chunks, ...topicChunks];
    }

    // Always apply contextual chunking as a fallback
    const contextualChunks = await this.contextualChunker.chunk(content, metadata, options);
    chunks = [...chunks, ...contextualChunks];

    // Remove duplicates and merge overlapping chunks
    chunks = this.mergeOverlappingChunks(chunks);

    return chunks;
  }

  private async extractKeywords(chunks: Chunk[]): Promise<Chunk[]> {
    for (const chunk of chunks) {
      const keywords = await this.extractKeywordsFromText(chunk.content);
      chunk.keywords = keywords;
      chunk.metadata = {
        ...chunk.metadata,
        keywords,
        keywordCount: keywords.length
      };
    }
    return chunks;
  }

  private async extractKeywordsFromText(text: string): Promise<string[]> {
    // Simple keyword extraction - can be enhanced with NLP libraries
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Return top keywords (words that appear more than once)
    return Object.entries(wordCount)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([word, _]) => word);
  }

  private async applyContextExtension(chunks: Chunk[], extensionSize: number): Promise<Chunk[]> {
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
        contextExtensionSize: extensionSize
      };
    }

    return chunks;
  }

  private async mapRelationships(chunks: Chunk[]): Promise<Chunk[]> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const relationships: { [key: string]: number } = {};

      // Map relationships with adjacent chunks
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        relationships[prevChunk.id] = 0.8; // High weight for adjacent chunks
      }

      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        relationships[nextChunk.id] = 0.8; // High weight for adjacent chunks
      }

      // Map relationships based on keyword similarity
      for (let j = 0; j < chunks.length; j++) {
        if (i !== j) {
          const otherChunk = chunks[j];
          const similarity = this.calculateKeywordSimilarity(chunk.keywords, otherChunk.keywords);
          if (similarity > 0.3) {
            relationships[otherChunk.id] = similarity;
          }
        }
      }

      chunk.relatedChunks = Object.keys(relationships);
      chunk.relationshipWeights = relationships;
      chunk.metadata = {
        ...chunk.metadata,
        relationshipCount: Object.keys(relationships).length
      };
    }

    return chunks;
  }

  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async generateKnowledgeGraphData(chunks: Chunk[]): Promise<Chunk[]> {
    // Extract all unique keywords across chunks
    const allKeywords = new Set<string>();
    chunks.forEach(chunk => {
      chunk.keywords.forEach(keyword => allKeywords.add(keyword));
    });

    // Create concept mappings
    const conceptMap = await this.createConceptMap(Array.from(allKeywords));

    // Update chunks with concept information
    for (const chunk of chunks) {
      chunk.metadata = {
        ...chunk.metadata,
        concepts: chunk.keywords.map(keyword => conceptMap[keyword] || keyword),
        conceptCount: chunk.keywords.length
      };
    }

    return chunks;
  }

  private async createConceptMap(keywords: string[]): Promise<{ [key: string]: string }> {
    // Simple concept mapping - can be enhanced with external knowledge bases
    const conceptMap: { [key: string]: string } = {};

    // Group similar keywords into concepts
    const conceptGroups = [
      ['regulation', 'regulatory', 'compliance', 'legal'],
      ['financial', 'finance', 'economic', 'monetary'],
      ['policy', 'policies', 'guidelines', 'procedures'],
      ['report', 'reporting', 'documentation', 'records']
    ];

    for (const group of conceptGroups) {
      const concept = group[0];
      for (const keyword of group) {
        conceptMap[keyword] = concept;
      }
    }

    return conceptMap;
  }

  private mergeOverlappingChunks(chunks: Chunk[]): Chunk[] {
    const merged: Chunk[] = [];
    
    for (const chunk of chunks) {
      let shouldMerge = false;
      
      for (let i = 0; i < merged.length; i++) {
        const existingChunk = merged[i];
        
        // Check for overlap
        if (this.chunksOverlap(chunk, existingChunk)) {
          // Merge chunks
          merged[i] = this.mergeChunks(existingChunk, chunk);
          shouldMerge = true;
          break;
        }
      }
      
      if (!shouldMerge) {
        merged.push(chunk);
      }
    }
    
    return merged;
  }

  private chunksOverlap(chunk1: Chunk, chunk2: Chunk): boolean {
    // Simple overlap detection based on content similarity
    const similarity = this.calculateKeywordSimilarity(chunk1.keywords, chunk2.keywords);
    return similarity > 0.7;
  }

  private mergeChunks(chunk1: Chunk, chunk2: Chunk): Chunk {
    return {
      id: chunk1.id,
      content: chunk1.content + '\n\n' + chunk2.content,
      chunkType: chunk1.chunkType || chunk2.chunkType,
      keywords: [...new Set([...chunk1.keywords, ...chunk2.keywords])],
      metadata: {
        ...chunk1.metadata,
        ...chunk2.metadata,
        merged: true,
        originalChunks: [chunk1.id, chunk2.id]
      }
    };
  }
} 