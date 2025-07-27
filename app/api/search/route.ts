import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search-service';
import { z } from 'zod';

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).nonempty(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = requestSchema.parse(body);

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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}