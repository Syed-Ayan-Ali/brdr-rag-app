import { NextRequest, NextResponse } from 'next/server';
import { expandUserQuery } from '@/lib/ai/agents/query-expansion-agent/query-expansion-agent';
import { retreiveQueryMatches } from '@/lib/ai/retreival/chunk-retreival/chunk-retreival';
import { generateAnswer } from '@/lib/ai/agents/text-generation-agent/text-generation-agent';
import { Search } from '@/lib/types/search-types';

export async function POST(request: NextRequest): Promise<NextResponse> {

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
    const startTime = performance.now();
    const context = uniqueResults.map(r => r.content).join('\n');
    const llmResponse = await generateAnswer(query, context);
    const responseTime = (performance.now() - startTime) / 1000;
    const tokenSize = new TextEncoder().encode(llmResponse).length;

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

    return NextResponse.json({ search });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}