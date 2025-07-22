import { supabase } from '@/lib/db/supabase';
import { Search } from '@/lib/types/search-types';
import { streamText, tool, smoothStream } from 'ai';
import { google } from '@/lib/ai/providers';
import { z } from 'zod';
import { generateEmbedding } from '@/lib/ai/embeddings';

export async function POST(request: Request) {
  try {
    const { messages, chatId } = await request.json();

    const query = messages[messages.length - 1].content;

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: `You are an assistant that processes queries about two countries. Your task is to:
1. Identify the two countries mentioned in the user's query.
2. Make two separate asynchronous tool calls to fetch relevant data for each country using the match_page_sections Supabase RPC function.
3. Combine the results into a coherent response.

Important rules:
- Expect the query to mention two countries explicitly (e.g., "Compare the economies of Japan and Germany").
- Use the getCountryData tool to fetch data for each country.
- Ensure both tool calls are made concurrently to optimize performance.
- If the query doesn't clearly specify two countries, return an error message asking for clarification.
- Format the response to clearly present data for both countries.`, 
      messages,
      tools: {
        getCountryData: tool({
          description: 'Fetches relevant data for a specified country from Supabase using the match_page_sections RPC function.',
          parameters: z.object({
            country: z.string().describe('The name of the country to fetch data for'),
          }),
          execute: async ({ country }) => {
            try {
              console.log(`Fetching data for country: ${country}`);

              // Generate embedding for the country name
              const embedding = await generateEmbedding(country);

              // Call Supabase RPC function match_page_sections
              const { data: results, error } = await supabase
                .rpc('match_page_sections', {
                  embedding: embedding,
                  match_count: 1,
                  match_threshold: 0.3,
                  min_content_length: 100,
                });

              if (error) {
                console.error(`Error fetching data for ${country}:`, error);
                return {
                  country,
                  error: `Failed to fetch data for ${country}`,
                  data: [],
                };
              }

              console.log(`Found ${results?.length || 0} results for ${country}`);

              return {
                country,
                data: results || [],
                resultsCount: results?.length || 0,
              };
            } catch (error) {
              console.error(`Error in getCountryData for ${country}:`, error);
              return {
                country,
                error: `Failed to fetch data for ${country}`,
                data: [],
              };
            }
          },
        }),
      },
      experimental_transform: smoothStream(),
      maxSteps: 5, // Allow multiple tool calls if needed
    });

    // Insert search into Supabase
    const searchId = crypto.randomUUID();
    const now = new Date().toISOString();
    const search: Search = {
      searchId,
      query,
      llmResponse: '', // Will be updated with streamed response
      expandedQueries: [],
      results: [],
      timestamp: now,
      responseTime: 0, // Will be updated
      tokenSize: 0, // Will be updated if needed
    };

    const { error: insertError } = await supabase.from('searches').insert({
      search_id: searchId,
      chat_id: chatId,
      query,
      answer: '', // Will be updated
      search_time: now,
      response_time: 0,
      token_size: 0,
    });

    if (insertError) {
      console.error('Search insert error:', insertError);
      throw new Error('Failed to save search');
    }

    // Stream the response and update the database with the final answer
    let fullResponse = '';
    const startTime = Date.now();

    for await (const chunk of result.textStream) {
      fullResponse += chunk;
    }

    const responseTime = (Date.now() - startTime) / 1000;

    // Update the search record with the final response and metrics
    const { error: updateError } = await supabase
      .from('searches')
      .update({
        answer: fullResponse,
        response_time: responseTime,
        token_size: fullResponse.length, // Approximate token size
      })
      .eq('search_id', searchId);

    if (updateError) {
      console.error('Search update error:', updateError);
      throw new Error('Failed to update search');
    }

    // Update chat's last_message_time and search_count
    // const { error: chatUpdateError } = await supabase
    //   .from('chats')
    //   .update({
    //     last_message_time: now,
    //     search_count: supabase.rpc('increment_search_count', { chat_id: chatId }),
    //   })
    //   .eq('chat_id', chatId);

    // if (chatUpdateError) {
    //   console.error('Chat update error:', chatUpdateError);
    //   throw new Error('Failed to update chat');
    // }

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Search error:', error);
  }
}