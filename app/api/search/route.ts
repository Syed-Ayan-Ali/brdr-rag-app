import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search-service';
import { z } from 'zod';

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).nonempty(),
  chatId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, chatId } = requestSchema.parse(body);

    const searchService = new SearchService();
    const streamResult = await searchService.streamSearchResponse(messages);

    // Log stream chunks
    for await (const chunk of streamResult.textStream) {
      console.log('Stream chunk:', chunk);
    }

    return streamResult.toDataStreamResponse();
  } catch (error) {
    console.error('Search API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// import { NextResponse } from 'next/server';
// import { SearchService } from '@/lib/services/search-service';
// import { z } from 'zod';

// const requestSchema = z.object({
//   messages: z.array(z.object({
//     role: z.enum(['user', 'assistant']),
//     content: z.string(),
//   })).nonempty(),
//   chatId: z.string().uuid(),
// });

// export async function POST(request: Request) {
//   try {
//     // Validate request body
//     const body = await request.json();
//     const { messages, chatId } = requestSchema.parse(body);

//     // Initialize services
//     const searchService = new SearchService();

//     // Stream LLM response
//     const streamResult = await searchService.streamSearchResponse(messages);
//     console.log('Stream Result:', JSON.stringify(streamResult, null, 2)); // Detailed logging
//     return streamResult.toDataStreamResponse();
//   } catch (error) {
//     console.error('Search API error:', error);
//     if (error instanceof z.ZodError) {
//       return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
//     }
//     return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
//   }
// }

// import { NextResponse } from 'next/server';
// import { SearchService } from '@/lib/services/search-service';
// // import { SearchRepository } from  '@/lib/repositories/searchRepository';
// // import { ChatRepository } from '@/lib/repositories/chatRepository';
// // import { BackgroundTaskQueue } from   '@/lib/utils/backgroundTaskQueue';
// import { z } from 'zod';

// const requestSchema = z.object({
//   messages: z.array(z.object({
//     role: z.enum(['user', 'assistant']),
//     content: z.string(),
//   })).nonempty(),
//   chatId: z.string().uuid(),
// });

// export async function POST(request: Request) {
//   try {
//     // Validate request body
//     const body = await request.json();
//     const { messages, chatId } = requestSchema.parse(body);

//     // Initialize services and repositories
//     const searchService = new SearchService();
//     // const searchRepository = new SearchRepository();
//     // const chatRepository = new ChatRepository();
//     // const taskQueue = BackgroundTaskQueue.getInstance();

//     // Get the query from the last user message
//     const query = messages[messages.length - 1].content;

//     // Stream LLM response immediately
//     const streamResult = await searchService.streamSearchResponse(messages);
//     console.log(streamResult);
//     return streamResult.toDataStreamResponse();
    
//     // // Create search record for background processing
//     // const searchId = crypto.randomUUID();
//     // const timestamp = new Date().toISOString();
//     // let fullResponse = '';
//     // const startTime = Date.now();

//     // // Collect streamed response
//     // for await (const chunk of streamResult.textStream) {
//     //   fullResponse += chunk;
//     // }
//     // const responseTime = (Date.now() - startTime) / 1000;

//     // Enqueue database operations
//     // taskQueue.enqueue(async () => {
//     //   try {
//     //     // Insert search
//     //     await searchRepository.insertSearch({
//     //       search_id: searchId,
//     //       chat_id: chatId,
//     //       query,
//     //       answer: fullResponse,
//     //       search_time: timestamp,
//     //       response_time: responseTime,
//     //       token_size: fullResponse.length,
//     //     });

//     //     // Increment search count and update chat
//     //     const newSearchCount = await chatRepository.incrementSearchCount(chatId);
//     //     await chatRepository.updateChat(chatId, {
//     //       last_message_time: timestamp,
//     //       search_count: newSearchCount,
//     //     });
//     //   } catch (error) {
//     //     console.error('Background task error:', error);
//     //   }
//     // });

//     // Return streaming response
//   } catch (error) {
//     console.error('Search API error:', error);
//     if (error instanceof z.ZodError) {
//       return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
//     }
//     return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
//   }
// }