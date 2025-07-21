import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Search } from '@/lib/types/search-types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Parse the request body once
    const body = await request.json();
    const search: Search = body;
    const { chatId } = body;

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