import { generateEmbedding } from '../../embeddings';

export interface EmbeddingOptions {
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions?: number;
  truncate?: 'NONE' | 'START' | 'END';
  encodingFormat?: 'float' | 'base64';
}

export class EnhancedEmbeddingGenerator {
  private defaultModel = 'text-embedding-3-small';
  private maxTokens = 8191; // OpenAI's limit for text-embedding-3 models

  async generateEmbedding(
    text: string,
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      const embeddingModel = model || this.defaultModel;
      
      // Truncate text if it exceeds token limit
      const truncatedText = this.truncateText(text, this.maxTokens);
      
      // Generate embedding using the existing function
      const embedding = await generateEmbedding(truncatedText);
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateContextualEmbedding(
    text: string,
    context: string,
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      // Combine text with context for contextual embedding
      const contextualText = `${context}\n\n${text}`;
      return await this.generateEmbedding(contextualText, model, options);
    } catch (error) {
      console.error('Error generating contextual embedding:', error);
      throw error;
    }
  }

  async generateMultiModalEmbedding(
    text: string,
    imageData?: string,
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      // For now, we'll use text-only embedding
      // In a real implementation, this would use a multi-modal model like CLIP
      let embeddingText = text;
      
      if (imageData) {
        // Add image description or OCR text to the embedding
        embeddingText = `${text}\n\n[Image content included]`;
      }
      
      return await this.generateEmbedding(embeddingText, model, options);
    } catch (error) {
      console.error('Error generating multi-modal embedding:', error);
      throw error;
    }
  }

  async generateImageEmbedding(
    imageData: string,
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      // This would integrate with a vision model like CLIP
      // For now, return a placeholder embedding
      console.log('Image embedding not implemented - using placeholder');
      return new Array(1536).fill(0); // OpenAI embedding dimensions
    } catch (error) {
      console.error('Error generating image embedding:', error);
      throw error;
    }
  }

  async generateChunkEmbedding(
    chunk: any,
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      let embeddingText = chunk.content;
      
      // Use context extension if available
      if (chunk.contextExtension) {
        embeddingText = chunk.contextExtension;
      }
      
      // Add keywords to the embedding text for better semantic matching
      if (chunk.keywords && chunk.keywords.length > 0) {
        const keywordsText = chunk.keywords.join(', ');
        embeddingText = `${embeddingText}\n\nKeywords: ${keywordsText}`;
      }
      
      return await this.generateEmbedding(embeddingText, model, options);
    } catch (error) {
      console.error('Error generating chunk embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(
    texts: string[],
    model?: string,
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
          batch.map(text => this.generateEmbedding(text, model, options))
        );
        embeddings.push(...batchEmbeddings);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  private truncateText(text: string, maxTokens: number): string {
    // Simple token estimation (1 token ≈ 4 characters)
    const estimatedTokens = text.length / 4;
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // Truncate to fit within token limit
    const maxChars = maxTokens * 4;
    return text.slice(0, maxChars);
  }

  async compareEmbeddings(
    embedding1: number[],
    embedding2: number[]
  ): Promise<number> {
    try {
      // Calculate cosine similarity
      const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
      const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
      
      return dotProduct / (magnitude1 * magnitude2);
    } catch (error) {
      console.error('Error comparing embeddings:', error);
      return 0;
    }
  }

  async findSimilarEmbeddings(
    queryEmbedding: number[],
    embeddings: number[][],
    threshold: number = 0.8
  ): Promise<{ index: number; similarity: number }[]> {
    try {
      const similarities = await Promise.all(
        embeddings.map(async (embedding, index) => ({
          index,
          similarity: await this.compareEmbeddings(queryEmbedding, embedding)
        }))
      );
      
      return similarities
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error finding similar embeddings:', error);
      return [];
    }
  }

  getSupportedModels(): string[] {
    return [
      'text-embedding-ada-002',
      'text-embedding-3-small',
      'text-embedding-3-large'
    ];
  }

  getModelDimensions(model: string): number {
    const dimensions: { [key: string]: number } = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072
    };
    
    return dimensions[model] || 1536;
  }
} 