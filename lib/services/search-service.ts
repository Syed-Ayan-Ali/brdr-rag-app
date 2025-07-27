import { streamText, tool } from 'ai';
import { google } from '@/lib/ai/providers';
import { z } from 'zod';
import { supabase } from '@/lib/db/supabase';
import { generateEmbedding } from '@/lib/ai/embeddings';

export class SearchService {
  async streamSearchResponse(messages: [{ content: string; role: "user" | "assistant" }, ...{ content: string; role: "user" | "assistant" }[]]) {
    return await streamText({
      model: google('gemini-2.0-flash'),
      system: `You are an assistant that answers queries using financial document data from the Hong Kong Monetary Authority (HKMA) stored in a Supabase database. Your task is to:
1. Use the getDocumentData tool to fetch relevant document chunks based on the user's query.
2. Generate a concise, natural language summary of the retrieved chunks, citing document IDs and similarity scores where relevant.
3. If no relevant data is found, respond with: "No relevant information found in the database for this query."
4. If the tool call fails, respond with: "Error retrieving data from the database."
5. Avoid including raw JSON or tool call metadata in the response. Focus on clear, human-readable text.

Important rules:
- Make a single tool call to getDocumentData with the user's query.
- Use the retrieved content to create a summary that directly addresses the query.
- Format the response naturally, e.g., "According to document [doc_id], [summary of content] (Similarity: [score])."`,
      messages,
      tools: {
        getDocumentData: tool({
          description: 'Fetches relevant document chunks from Supabase using the match_page_sections RPC function.',
          parameters: z.object({
            query: z.string().describe('The user query to fetch relevant document chunks for'),
          }),
          execute: async ({ query }) => {
            try {
              console.log(`Generating embedding for query: ${query}`);
              const embedding = await generateEmbedding(query, { model: 'Xenova/all-MiniLM-L6-v2' });
              console.log('Embedding sample:', embedding.slice(0, 5), 'Length:', embedding.length);

              console.log(`Calling Supabase RPC for query: ${query}`);
              const { data: results, error } = await supabase
                .rpc('match_page_sections', {
                  query_embedding: embedding,
                  match_count: 5,
                  match_threshold: 0.1,
                  min_content_length: 100,
                });

              if (error) {
                console.error(`Supabase RPC error: ${JSON.stringify(error, null, 2)}`);
                return { query, error: `Failed to fetch document data: ${error.message}`, data: [] };
              }

              if (!results || results.length === 0) {
                console.log(`No results found for query: ${query}`);
                return { query, data: [], resultsCount: 0 };
              }

              console.log(`Found ${results.length} results for query: ${query}`);
              return {
                query,
                data: results.map((result: { doc_id: string; content: string; metadata: any; similarity: number }) => ({
                  docId: result.doc_id,
                  content: result.content,
                  metadata: result.metadata,
                  similarity: result.similarity,
                })),
                resultsCount: results.length,
              };
            } catch (error) {
              console.error(`Error in getDocumentData for query: ${query}`, JSON.stringify(error, null, 2));
              return { query, error: `Failed to fetch document data: ${error instanceof Error ? error.message : 'Unknown error'}`, data: [] };
            }
          },
        }),
      },
      maxSteps: 1,
    });
  }
}