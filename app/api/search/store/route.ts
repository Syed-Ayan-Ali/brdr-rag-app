import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body once
    const body = await request.json();
    const { search, chatId } = body;

    if (!search || !chatId) {
      return NextResponse.json({ error: 'Search and chatId are required' }, { status: 400 });
    }

    // Store search in Supabase
    const { error: searchError } = await supabase.from('searches').insert({
      search_id: search.searchId,
      chat_id: chatId,
      query: search.query,
      answer: search.llmResponse,
      search_time: search.timestamp,
      response_time: search.responseTime,
      token_size: search.tokenSize,

    });

    if (searchError) {
      console.error('Search storage error:', searchError);
      return NextResponse.json({ error: 'Failed to store search' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search storage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}