import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { expandUserQuery } from '@/lib/ai/agents/query-expansion-agent/query-expansion-agent';
import { retreiveQueryMatches } from '@/lib/ai/retreival/retreival';
import { generateAnswer } from '@/lib/ai/agents/text-generation-agent/text-generation-agent';
import { Search } from '@/lib/types/search-types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  );

  try {
    const { query, chatId } = await request.json();
    if (!query || !chatId) {
      return NextResponse.json({ error: 'Query and chatId are required' }, { status: 400 });
    }

    // Expand the query
    const expandedQueries = await expandUserQuery(query);

    // Retrieve query matches
    const results = await retreiveQueryMatches(expandedQueries);

    // Deduplicate and sort results by similarity score
    const uniqueResults = Array.from(
      new Map(results.results.map(item => [item.id, item])).values()
    ).sort((a, b) => b.similarity - a.similarity);

    // Generate the LLM response
    const context = uniqueResults.map(r => r.content).join('\n');
    const llmResponse = await generateAnswer(query, context);

    // Stream the LLM response word by word
    const stream = new ReadableStream({
      async start(controller) {
        let tokenSize = 0;
        const startTime = performance.now();
        for (const word of llmResponse.split(/\s+/)) {
          const encoder = new TextEncoder();
          const encoded = encoder.encode(word + ' ');
          controller.enqueue(encoded);
          tokenSize += encoded.length;
          await new Promise(resolve => setTimeout(resolve, 20)); // Simulate streaming
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

        console.log('search:', search);

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
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}