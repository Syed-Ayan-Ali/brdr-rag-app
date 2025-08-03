import { pipeline } from '@xenova/transformers';

// Enhanced embedding function using Xenova/all-MiniLM-L6-v2 model
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Initialize the embedding pipeline
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    // Generate embedding
    const result = await embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert to array of numbers
    const embedding = Array.from(result.data);
    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Failed to generate embedding');
  }
} 