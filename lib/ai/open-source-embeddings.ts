import { AutoModel, AutoTokenizer, env, pipeline } from '@huggingface/transformers';
import { ModelConfig } from '@/lib/ai/providers';

export async function getEmbedding(text: string, modelConfig: ModelConfig): Promise<number[]> {
  try {
    // Load the model and tokenizer
    const model = await AutoModel.from_pretrained(modelConfig.model);
    const tokenizer = await AutoTokenizer.from_pretrained(modelConfig.model);

    // Tokenize input
    const inputs = await tokenizer(text, { padding: true, truncation: true, return_tensors: 'pt' });

    // Generate embeddings
    const outputs = await model(inputs);
    const embedding = outputs.last_hidden_state.mean(1).squeeze().toArray();

    return embedding;
  } catch (error) {
    console.error('Embedding Error:', error);
    throw new Error('Failed to generate embedding');
  }
}


// Function to generate a single embedding
export async function generateEmbedding(text: string, modelConfig: ModelConfig): Promise<number[]> {
  try {
    const embedder = await pipeline('feature-extraction', modelConfig.model, {
      local_files_only: false // Allow downloading from Hugging Face
    });
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}

// Function to generate embeddings for multiple texts
export async function generateEmbeddings(texts: string[], modelConfig: ModelConfig): Promise<number[][]> {
  try {
    const embedder = await pipeline('feature-extraction', modelConfig.model, {
      local_files_only: false // Allow downloading from Hugging Face
    });
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data) as number[];
      })
    );
    return embeddings;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}
