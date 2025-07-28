import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search-service';
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
    const { messages, collection, chunk_collection } = await request.json();

    // const searchService = new SearchService();
    // const streamResult = await searchService.streamSearchResponse(messages);

    // Log stream chunks
    // for await (const chunk of streamResult) {
    //   console.log('Stream chunk:', chunk);
    // }

    // return streamResult.toDataStreamResponse();

    console.log('Starting search API with messages:', JSON.stringify(messages, null, 2));
    console.log('Using collection:', collection);
    console.log('Using chunk collection:', chunk_collection);

     const textStream = streamText({
      model: google('gemini-2.0-flash'),
      system: `You are an assistant that answers queries using financial document data from the Hong Kong Monetary Authority (HKMA) stored in a Supabase database.
          Your task is to:
          1. Use the user query as it is without any modifications.
          2. Use the getDocumentData tool to fetch relevant document chunks based on the user's query.
          3. Generate a concise, natural language summary of the retrieved chunks, citing document IDs

          4. You will receive a non natural language response from the tool and your job is to use the response to create a summary that directly addresses the query in simple, human-readable text.
          5. If no relevant data is found, respond with: "No relevant information found
          
    `,
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
                  match_count: 5,
                  match_threshold: 0.2,
                  filter_db_id: collection,
                  filter_chunk_db_id: chunk_collection,
                  min_content_length: 500,
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
      maxSteps: 5,
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