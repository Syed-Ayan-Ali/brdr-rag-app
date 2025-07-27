import { pipeline } from '@xenova/transformers';

let model: any = null;

async function initializeModel() {
  if (!model) {
    console.log('Initializing Xenova/all-MiniLM-L6-v2 model...');
    model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for performance
    });
  }
  return model;
}

export async function generateEmbedding(text: string, modelConfig: { model: string }): Promise<number[]> {
  try {
    const embedder = await initializeModel();
    console.log(`Generating embedding for text: ${text.slice(0, 50)}...`);
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    console.log('Embedding generated, length:', embedding.length);
    return Array.from(output.data);
  } catch (error) {
    console.error(`Error generating embedding for text: ${text.slice(0, 50)}...`, error);
    return new Array(384).fill(0); // Fallback zero vector
  }
}

// import { embed, embedMany } from 'ai';
// import { google } from '@/lib/ai/providers';
// import { embeddingModels } from '@/lib/ai/providers';
// import { AutoModel, AutoTokenizer, env, pipeline } from '@huggingface/transformers';
// import { ModelConfig } from '@/lib/ai/providers';

// // local model
// export const embeddingModel = embeddingModels['all-MiniLM-L6-v2'];

// // Function to generate a single embedding
// export async function generateEmbedding(text: string, modelConfig: ModelConfig): Promise<number[]> {
//   try {
//     const embedder = await pipeline('feature-extraction', modelConfig.model, {
//         local_files_only: false // Allow downloading from Hugging Face
//       });
//       const output = await embedder(text, { pooling: 'mean', normalize: true });
//     return Array.from(output.data) as number[];
//   } catch (error) {
//       console.error('Embedding generation error:', error);
//       throw error;
//     }
//   }

  
// google generative models
// const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
  
// export async function generateEmbedding(message: string) {
//   const { embedding, usage } = await embed({
//     model: embeddingModel,
//     value: message,
//   });

//   return embedding;
// }

// export async function generateMultipleEmbeddings(messages: string[]) {
//   const { embeddings, usage } = await embedMany({
//     model: embeddingModel,
//     values: messages,
//   });

//   return embeddings;
// }