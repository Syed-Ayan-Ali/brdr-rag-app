import { NextResponse } from 'next/server';
import { RagService } from '@/lib/services/rag-service';
import { VectorRepository } from '@/lib/repositories/vector-repository';
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
    // Validate request
    const body = await request.json();
    const { messages, chatId } = requestSchema.parse(body);

    // Initialize dependencies
    const ragService = new RagService();
    const vectorRepository = new VectorRepository();

    // Process query with RAG
    const query = messages[messages.length - 1].content;
    const responseStream = await ragService.processRagQuery(messages, vectorRepository, query);

    return responseStream.toDataStreamResponse();
  } catch (error) {
    console.error('RAG Search error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}