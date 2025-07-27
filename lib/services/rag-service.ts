import { streamText } from 'ai';
import { google } from '@/lib/ai/providers';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { VectorRepository } from '@/lib/repositories/vector-repository';

export class RagService {
  async processRagQuery(messages: [{ content: string; role: "user" | "assistant"; }, ...{ content: string; role: "user" | "assistant"; }[]], vectorRepository: VectorRepository, query: string) {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Retrieve top-k documents (k=3 for balance of context and performance)
    const documents = await vectorRepository.searchByCosineSimilarity(queryEmbedding, 3);

    // Format context for LLM
    const context = documents.map((doc: { content: any; }) => doc.content).join('\n\n');

    // Stream LLM response with RAG context
    return await streamText({
      model: google('gemini-1.5-pro'),
      system: `You are an enterprise chatbot assisting internal users. Answer queries accurately using the following context from internal documents. If the context is insufficient, state so clearly.

      Context:
      ${context}

      Instructions:
      - Provide concise, professional responses.
      - Cite document IDs if relevant (e.g., [DocID:123]).
      - Avoid speculation beyond the provided context.`,
      messages,
      maxSteps: 2,
    });
  }
}