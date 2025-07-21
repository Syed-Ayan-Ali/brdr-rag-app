import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { expandUserQuery } from '@/lib/ai/agents/query-expansion-agent/query-expansion-agent';
import { retreiveQueryMatches } from '@/lib/ai/retreival/chunk-retreival/chunk-retreival';
import { retrieveChatContext } from '@/lib/ai/retreival/chat-retreival/chat-retreival';
import { streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { Search } from '@/lib/types/search-types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { query, chatId } = await request.json();
    if (!query || !chatId) {
      return NextResponse.json({ error: 'Query and chatId are required' }, { status: 400 });
    }

    // Fetch chat context to provide conversation history
    const chatContext = await retrieveChatContext(chatId);
    const chatContextString = chatContext.searches
      .map((search: { query: any; llmResponse: any; }) => `Query: ${search.query}\nResponse: ${search.llmResponse}`)
      .join('\n\n');

    // Expand the query
    const expandedQueries = await expandUserQuery(query);

    // Retrieve query matches
    const results = await retreiveQueryMatches(expandedQueries);

    // Deduplicate and sort results by similarity score
    const uniqueResults = Array.from(
      new Map(results.results.map(item => [item.id, item])).values()
    ).sort((a, b) => b.similarity - a.similarity);

    // Stream the LLM response
    const startTime = performance.now();
    const documentContext = uniqueResults.map(r => r.content).join('\n');
    const stream = await streamText({
      model: myProvider.languageModel('azure-lm-model'),
      prompt: `You are an assistant for high-net-worth clients, providing complete information on banking data regulations (BRDR). ${documentContext}\n\nChat Context (Previous Searches):\n${chatContextString || 'No previous searches.'}\n\nQuery: ${query}\n\nInstructions: Provide a concise, clear, and professional answer. Structure it with an introduction, main points, and a summary. Focus on key points relevant to the query, using appropriate terminology for a knowledgeable audience.`,
      onError: (error) => {
        console.error('Stream error:', error);
      },
    });

    let llmResponse = '';
    let tokenSize = 0;

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of stream as any) {
            if (chunk.type === 'text-delta') {
              const textChunk = chunk.textDelta;
              llmResponse += textChunk;
              const encoded = new TextEncoder().encode(textChunk);
              tokenSize += encoded.length;
              controller.enqueue(encoded);
            }
          }

          const responseTime = (performance.now() - startTime) / 1000;

          // Store search in Supabase
          const search: Search = {
            searchId: crypto.randomUUID(),
            query,
            results: uniqueResults,
            llmResponse,
            expandedQueries,
            timestamp: new Date().toISOString(),
            responseTime,
            tokenSize,
          };

          const { error: searchError } = await supabase.from('searches').insert({
            search_id: search.searchId,
            chat_id: chatId,
            search_time: search.timestamp,
            query: search.query,
            answer: search.llmResponse,
            response_time: search.responseTime,
            token_size: search.tokenSize,
            created_at: search.timestamp,
          });

          if (searchError) {
            throw new Error(searchError.message);
          }

          // Update chat's last_message_time and search_count
          const { error: chatError } = await supabase
            .from('chats')
            .update({
              last_message_time: new Date().toISOString(),
              search_count: supabase.rpc('increment_search_count', { chat_id: chatId }),
            })
            .eq('chat_id', chatId);

          if (chatError) {
            throw new Error(chatError.message);
          }

          controller.close();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}