// v1: 20/7/2025 - Sunday

// import { NextRequest, NextResponse } from 'next/server';
// import { expandUserQuery } from '@/lib/ai/agents/query-expansion-agent';
// import { retreiveQueryMatches } from '@/lib/ai/retreival/chunk-retreival/country-data-retreival';
// import { generateAnswer } from '@/lib/ai/agents/text-generation-agent';
// import { Search } from '@/lib/types/search-types';

// export async function POST(request: NextRequest): Promise<NextResponse> {

//   try {
//     const { query, chatId } = await request.json();
//     if (!query || !chatId) {
//       return NextResponse.json({ error: 'Query and chatId are required' }, { status: 400 });
//     }

//     // Expand the query
//     const expandedQueries = await expandUserQuery(query);

//     // Retrieve query matches
//     const results = await retreiveQueryMatches(expandedQueries);

//     // Deduplicate and sort results by similarity score
//     const uniqueResults = Array.from(
//       new Map(results.results.map(item => [item.id, item])).values()
//     ).sort((a, b) => b.similarity - a.similarity);

//     // Generate the LLM response
//     const startTime = performance.now();
//     const context = uniqueResults.map(r => r.content).join('\n');
//     const llmResponse = await generateAnswer(query, context);
//     const responseTime = (performance.now() - startTime) / 1000;
//     const tokenSize = new TextEncoder().encode(llmResponse).length;

//     const search: Search = {
//       searchId: crypto.randomUUID(),
//       query,
//       results: uniqueResults,
//       llmResponse,
//       expandedQueries,
//       timestamp: new Date().toISOString(),
//       responseTime,
//       tokenSize,
//     };

//     return NextResponse.json({ search });
//   } catch (error) {
//     console.error('Search error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }


// v2: 22/7/2025 - Tuesday

// import { NextRequest, NextResponse } from 'next/server';
// import { supabase } from '@/lib/db/supabase';
// import { Search } from '@/lib/types/search-types';
// import { streamText, tool, smoothStream } from 'ai';
// import { google } from '@/lib/ai/providers';
// import { z } from 'zod';
// import { TEXT_GENERATION_PROMPT } from '@/lib/prompts';

// export async function POST(request: NextRequest): Promise<NextResponse> {
//   try {
//     const { messages, chatId } = await request.json();

//     if (!messages || !chatId) {
//       return NextResponse.json({ error: 'Query and chatId are required' }, { status: 400 });
//     }

//     const query = messages[messages.length - 1].content;

//     const result = streamText({
//       model: google('gemini-1.5-flash'),
//       system: '',
//       messages,
//       tools: {
//         getChatContext: tool({
//           description: 'Returns the chat context for the current conversation',
//           parameters: z.object({
            
//           }),
//           execute: async () => {
            
//           }
//         })
//       },

//     })

//     // // Fetch chat context to provide conversation history
//     // const chatContext = await retrieveChatContext(chatId);
//     // const chatContextString = chatContext.searches
//     //   .map((search: { query: any; llmResponse: any; }) => `Query: ${search.query}\nResponse: ${search.llmResponse}`)
//     //   .join('\n\n');

//     // // Expand the query
//     // const expandedQueries = await expandUserQuery(query);

//     // // Retrieve query matches
//     // const results = await retreiveQueryMatches(expandedQueries);

//     // // Deduplicate and sort results by similarity score
//     // const uniqueResults = Array.from(
//     //   new Map(results.results.map(item => [item.id, item])).values()
//     // ).sort((a, b) => b.similarity - a.similarity);

//     // // Generate the LLM response
//     // const startTime = performance.now();
//     // const documentContext = uniqueResults.map(r => r.content).join('\n');
//     // const llmResponse = await generateAnswer(query, documentContext, chatContextString);
//     // const responseTime = performance.now() - startTime;
//     // let tokenSize = 0;

//     // // Calculate token size of the LLM response
//     // if (llmResponse) {
//     //   tokenSize = new TextEncoder().encode(llmResponse).length;
//     // }

//     // const search: Search = {
//     //   searchId: crypto.randomUUID(),
//     //   query,
//     //   results: uniqueResults,
//     //   llmResponse,
//     //   expandedQueries,
//     //   timestamp: new Date().toISOString(),
//     //   responseTime: responseTime / 1000, // Convert to seconds
//     //   tokenSize
//     // };

//     // return NextResponse.json({
//     //   search
//     // });

//   } catch (error) {
//     console.error('Search error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }