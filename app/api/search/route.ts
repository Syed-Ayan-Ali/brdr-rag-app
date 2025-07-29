import { NextResponse } from 'next/server';
import { streamText, tool, smoothStream } from 'ai';
import { google } from '@/lib/ai/providers';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { supabase } from '@/lib/db/supabase';
import { z } from 'zod';

// const requestSchema = z.object({
//   messages: z.array(
//     z.object({
//       role: z.enum(['user', 'assistant']),
//       content: z.string(),
//     })
//   ).nonempty(),
// });

export async function POST(request: Request) {
  try {
    const { messages, system, collection, chunk_collection, match_count, match_threshold, min_content_length, maxSteps } = await request.json()

    console.log('Starting search API with messages:', JSON.stringify(messages, null, 2));
    console.log('Using collection:', collection);
    console.log('Using chunk collection:', chunk_collection);

     const textStream = streamText({
      model: google('gemini-2.0-flash'),
      system: system,
      messages,
      tools: {
        getDocumentData: tool({
          description: 'Fetches relevant document chunks from Supabase using the match_page_sections RPC function.',
          parameters: z.object({
            query: z.string().describe('The user query to fetch relevant document chunks for'),
            collection: z.string().describe('The collection to search in'),
            chunk_collection: z.string().describe('The chunk collection to search in'),
          }),
          execute: async ({ query }) => {
            try {
              console.log(`Generating embedding for query: ${query}`);
              const embedding = await generateEmbedding(query, { model: 'Xenova/all-MiniLM-L6-v2' });
              console.log('Embedding sample:', embedding.slice(0, 5), 'Length:', embedding.length);

              console.log(`Calling Supabase RPC for query: ${query}`);
              const { data: results, error } = await supabase
                .rpc('match_documents', {
                  query_embedding: embedding,
                  match_count: match_count,
                  match_threshold: match_threshold,
                  filter_db_id: collection,
                  filter_chunk_db_id: chunk_collection,
                  min_content_length: min_content_length,
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
      experimental_transform: smoothStream(),
      maxSteps: maxSteps,
    });

    // Return the streamed response
    return textStream.toDataStreamResponse();
  } catch (error) {
    console.error('Search API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}