import { ChunkingStrategy, ChunkingOptions, ChunkInfo, DocumentInfo } from './ChunkingStrategy';
import { logger, LogCategory } from '../../logging/Logger';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const model = google('gemini-2.0-flash');

export class SemanticChunker implements ChunkingStrategy {
  name = 'semantic_chunking';

  isApplicable(content: DocumentInfo): boolean {
    // Semantic chunking is applicable when text has meaning and order is important
    return this.hasMeaningfulContent(content) && this.isOrderImportant(content);
  }

  async chunk(content: DocumentInfo, options: ChunkingOptions = {}): Promise<ChunkInfo[]> {
    const {
      maxTokens = 1000,
      bufferSize = 1,
      breakpointPercentileThreshold = 75
    } = options;

    logger.info(LogCategory.SYSTEM, `Using semantic chunking for document: ${content.docId}`);

    // Choose semantic chunking strategy based on content analysis
    const strategy = this.chooseSemanticStrategy(content);
    
    switch (strategy) {
      case 'proposition_based':
        return this.propositionBasedChunking(content, options);
      case 'clustering':
        return this.clusteringBasedChunking(content, options);
      case 'double_pass':
        return this.doublePassChunking(content, options);
      case 'standard_deviation':
        return this.standardDeviationChunking(content, options);
      default:
        return this.standardDeviationChunking(content, options);
    }
  }

  private hasMeaningfulContent(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    const hasHeadings = /\b\d+\.\s|\b[A-Z][A-Z\s]{2,}\b|\b(Chapter|Section|Part)\b/i.test(text);
    const hasStructuredLists = /\b\d+\.\d+\.\d+|\b[a-z]\)\s|\b[A-Z]\)\s/.test(text);
    const hasMeaningfulLength = text.length > 1000;
    
    return hasHeadings || hasStructuredLists || hasMeaningfulLength;
  }

  private isOrderImportant(content: DocumentInfo): boolean {
    // Check if document has sequential information that needs to maintain order
    const text = content.bodyContent.join(' ');
    const hasSequentialPatterns = /\b(First|Second|Third|Finally|Next|Then|Therefore|However)\b/i.test(text);
    const hasNumberedLists = /\b\d+\.\s|\b[a-z]\)\s|\b[A-Z]\)\s/.test(text);
    const hasProceduralContent = /\b(Step|Procedure|Process|Method|Algorithm)\b/i.test(text);
    
    return hasSequentialPatterns || hasNumberedLists || hasProceduralContent;
  }

  private chooseSemanticStrategy(content: DocumentInfo): string {
    // Check if LLM is available
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return 'proposition_based';
    }
    
    // Check if order is important
    if (this.isOrderImportant(content)) {
      // Check if we need to consider sentences beyond adjacent ones
      if (this.needsNonAdjacentAnalysis(content)) {
        return 'double_pass';
      } else {
        return 'standard_deviation';
      }
    } else {
      return 'clustering';
    }
  }

  private needsNonAdjacentAnalysis(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    // Check for complex document structure that might have interruptions
    const hasQuotes = /"[^"]*"/.test(text);
    const hasFormulas = /\$[^$]*\$|\\\([^)]*\\\)/.test(text);
    const hasInterruptions = /\b(Note|Remark|Example|Case Study)\b/i.test(text);
    
    return hasQuotes || hasFormulas || hasInterruptions;
  }

  private async propositionBasedChunking(content: DocumentInfo, options: ChunkingOptions): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Using proposition-based chunking for ${content.docId}`);
    
    try {
      // Create propositions from text
      const propositions = await this.createPropositions(content);
      
      // Use LLM to group propositions
      const groupedPropositions = await this.groupPropositionsWithLLM(propositions, content);
      
      // Convert grouped propositions to chunks
      return this.convertPropositionsToChunks(content, groupedPropositions);
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error in proposition-based chunking:', error);
      return this.standardDeviationChunking(content, options);
    }
  }

  private async createPropositions(content: DocumentInfo): Promise<string[]> {
    const text = content.bodyContent.join('\n\n');
    const sentences = this.splitIntoSentences(text);
    
    const prompt = `
Extract atomic propositions from the following regulatory document text. Each proposition should be a concise, self-contained fact or statement.

Document Information:
- Title: ${content.title}
- Document Type: ${content.docTypeCode} (${content.docTypeDesc})
- Version: ${content.version}

Text:
${text}

Please return the propositions as a JSON array of strings, each representing one atomic proposition.
`;

    try {
      const result = await generateText({
        model: model,
        prompt: prompt,
      });

      const propositions = JSON.parse(result.text);
      return Array.isArray(propositions) ? propositions : sentences;
    } catch (error) {
      logger.warn(LogCategory.SYSTEM, 'Failed to create propositions with LLM, using sentences');
      return sentences;
    }
  }

  private async groupPropositionsWithLLM(propositions: string[], content: DocumentInfo): Promise<string[][]> {
    const prompt = `
Group the following propositions into semantically coherent chunks. Each chunk should contain related propositions that form a meaningful unit.

Document: ${content.title}
Propositions:
${propositions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Please return the grouped propositions as a JSON array of arrays, where each inner array represents one chunk.
`;

    try {
      const result = await generateText({
        model: model,
        prompt: prompt,
      });

      const groupedPropositions = JSON.parse(result.text);
      return Array.isArray(groupedPropositions) ? groupedPropositions : [propositions];
    } catch (error) {
      logger.warn(LogCategory.SYSTEM, 'Failed to group propositions with LLM, using single group');
      return [propositions];
    }
  }

  private convertPropositionsToChunks(content: DocumentInfo, groupedPropositions: string[][]): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    
    for (let i = 0; i < groupedPropositions.length; i++) {
      const group = groupedPropositions[i];
      const chunkContent = group.join(' ');
      
      const chunk: ChunkInfo = {
        chunkId: `${content.docId}_chunk_${i + 1}`,
        content: chunkContent,
        chunkType: 'body',
        pageNumber: 1,
        metadata: {
          startPage: 1,
          endPage: content.pageNumbers.length,
          wordCount: chunkContent.split(/\s+/).length,
          charCount: chunkContent.length,
          hasTables: false,
          hasImages: false,
          sectionType: 'semantic_chunk',
          chunkingStrategy: 'proposition_based'
        }
      };
      
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private async clusteringBasedChunking(content: DocumentInfo, options: ChunkingOptions): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Using clustering-based chunking for ${content.docId}`);
    
    // Note: This is a simplified implementation
    // In a full implementation, you would use actual embedding models and k-means clustering
    const sentences = this.splitIntoSentences(content.bodyContent.join('\n\n'));
    
    // Simple clustering based on sentence length and content similarity
    const clusters = this.simpleClustering(sentences);
    
    return this.convertClustersToChunks(content, clusters);
  }

  private simpleClustering(sentences: string[]): string[][] {
    const clusters: string[][] = [];
    let currentCluster: string[] = [];
    
    for (const sentence of sentences) {
      if (currentCluster.length === 0) {
        currentCluster.push(sentence);
      } else {
        // Simple similarity check based on common words
        const similarity = this.calculateSimilarity(currentCluster[currentCluster.length - 1], sentence);
        if (similarity > 0.3) {
          currentCluster.push(sentence);
        } else {
          clusters.push([...currentCluster]);
          currentCluster = [sentence];
        }
      }
    }
    
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }
    
    return clusters;
  }

  private calculateSimilarity(sentence1: string, sentence2: string): number {
    const words1 = new Set(sentence1.toLowerCase().split(/\s+/));
    const words2 = new Set(sentence2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private convertClustersToChunks(content: DocumentInfo, clusters: string[][]): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const chunkContent = cluster.join(' ');
      
      const chunk: ChunkInfo = {
        chunkId: `${content.docId}_chunk_${i + 1}`,
        content: chunkContent,
        chunkType: 'body',
        pageNumber: 1,
        metadata: {
          startPage: 1,
          endPage: content.pageNumbers.length,
          wordCount: chunkContent.split(/\s+/).length,
          charCount: chunkContent.length,
          hasTables: false,
          hasImages: false,
          sectionType: 'semantic_cluster',
          chunkingStrategy: 'clustering'
        }
      };
      
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private async doublePassChunking(content: DocumentInfo, options: ChunkingOptions): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Using double-pass chunking for ${content.docId}`);
    
    const sentences = this.splitIntoSentences(content.bodyContent.join('\n\n'));
    
    // First pass: Create initial chunks based on similarity
    const initialChunks = this.createInitialChunks(sentences, options);
    
    // Second pass: Merge chunks based on broader similarity
    const finalChunks = this.mergeChunks(initialChunks, content);
    
    return this.convertMergedChunksToChunkInfo(content, finalChunks);
  }

  private createInitialChunks(sentences: string[], options: ChunkingOptions): string[][] {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      if (currentChunk.length === 0) {
        currentChunk.push(sentence);
      } else {
        // Check similarity with last sentence in current chunk
        const similarity = this.calculateSimilarity(currentChunk[currentChunk.length - 1], sentence);
        
        if (similarity > 0.4) {
          currentChunk.push(sentence);
        } else {
          chunks.push([...currentChunk]);
          currentChunk = [sentence];
        }
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private mergeChunks(initialChunks: string[][], content: DocumentInfo): string[][] {
    const mergedChunks: string[][] = [];
    
    for (let i = 0; i < initialChunks.length; i++) {
      const currentChunk = initialChunks[i];
      
      // Check if we can merge with next chunk
      if (i < initialChunks.length - 1) {
        const nextChunk = initialChunks[i + 1];
        const similarity = this.calculateChunkSimilarity(currentChunk, nextChunk);
        
        if (similarity > 0.3) {
          // Merge chunks
          mergedChunks.push([...currentChunk, ...nextChunk]);
          i++; // Skip next chunk as it's now merged
        } else {
          mergedChunks.push(currentChunk);
        }
      } else {
        mergedChunks.push(currentChunk);
      }
    }
    
    return mergedChunks;
  }

  private calculateChunkSimilarity(chunk1: string[], chunk2: string[]): number {
    const text1 = chunk1.join(' ');
    const text2 = chunk2.join(' ');
    return this.calculateSimilarity(text1, text2);
  }

  private convertMergedChunksToChunkInfo(content: DocumentInfo, mergedChunks: string[][]): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    
    for (let i = 0; i < mergedChunks.length; i++) {
      const chunk = mergedChunks[i];
      const chunkContent = chunk.join(' ');
      
      const chunkInfo: ChunkInfo = {
        chunkId: `${content.docId}_chunk_${i + 1}`,
        content: chunkContent,
        chunkType: 'body',
        pageNumber: 1,
        metadata: {
          startPage: 1,
          endPage: content.pageNumbers.length,
          wordCount: chunkContent.split(/\s+/).length,
          charCount: chunkContent.length,
          hasTables: false,
          hasImages: false,
          sectionType: 'semantic_merged',
          chunkingStrategy: 'double_pass'
        }
      };
      
      chunks.push(chunkInfo);
    }
    
    return chunks;
  }

  private async standardDeviationChunking(content: DocumentInfo, options: ChunkingOptions): Promise<ChunkInfo[]> {
    logger.info(LogCategory.SYSTEM, `Using standard deviation chunking for ${content.docId}`);
    
    const {
      maxTokens = 1000,
      breakpointPercentileThreshold = 75
    } = options;
    
    const sentences = this.splitIntoSentences(content.bodyContent.join('\n\n'));
    const chunks: ChunkInfo[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 1;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        // Create chunk
        const chunkContent = currentChunk.join(' ');
        chunks.push(this.createChunkInfo(content, chunkContent, chunkIndex, 'body'));
        chunkIndex++;
        
        // Start new chunk
        currentChunk = [sentence];
        currentTokens = sentenceTokens;
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }
    
    // Add remaining content as final chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      chunks.push(this.createChunkInfo(content, chunkContent, chunkIndex, 'body'));
    }
    
    return chunks;
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
      pageNumber: 1,
      metadata: {
        startPage: 1,
        endPage: content.pageNumbers.length,
        wordCount: chunkContent.split(/\s+/).length,
        charCount: chunkContent.length,
        hasTables: false,
        hasImages: false,
        sectionType: 'semantic_chunk',
        chunkingStrategy: this.name
      }
    };
  }
}

