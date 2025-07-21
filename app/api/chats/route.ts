import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Chat } from '@/lib/types/search-types';

export async function GET() {
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
    // Log Supabase configuration
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('Supabase Key:', process.env.SUPABASE_KEY ? 'Set' : 'Missing');

    // Fetch chats with search_count > 0, ordered by created_at descending
    const { data: chats, error: chatsError, status, statusText } = await supabase
      .from('chats')
      .select('*')
      .gt('search_count', 0)
      .order('created_at', { ascending: false });

    console.log('Chats fetch response:', { status, statusText, dataLength: chats?.length || 0, error: chatsError });

    if (chatsError) {
      console.error('Chats fetch error details:', chatsError);
      throw new Error(`Failed to fetch chats: ${chatsError.message}`);
    }

    // Log if no chats are found
    if (!chats || chats.length === 0) {
      console.log('No chats with searches found in the database.');
    }

    const chatIds = chats.map((chat) => chat.chat_id);
    console.log('Fetched chat IDs:', chatIds);

    // Fetch searches for all chats
    const { data: searches, error: searchesError } = await supabase
      .from('searches')
      .select('*')
      .in('chat_id', chatIds.length > 0 ? chatIds : [''])
      .order('search_time', { ascending: false });

    console.log('Searches fetch response:', { dataLength: searches?.length || 0, error: searchesError });

    if (searchesError) {
      console.error('Searches fetch error details:', searchesError);
      throw new Error(`Failed to fetch searches: ${searchesError.message}`);
    }

    const formattedChats: Chat[] = chats.map((chat) => ({
      chatId: chat.chat_id,
      startTime: chat.start_time,
      lastMessageTime: chat.last_message_time,
      searches: searches
        .filter((search) => search.chat_id === chat.chat_id)
        .map((search) => ({
          searchId: search.search_id,
          query: search.query,
          llmResponse: search.answer,
          expandedQueries: [], // Not stored in DB
          results: [], // Not stored in DB
          timestamp: search.search_time,
          responseTime: search.response_time,
          tokenSize: search.token_size,
        })),
      title: chat.title,
      createdAt: chat.created_at, // Include created_at for sidebar grouping
    }));

    console.log('Returning formatted chats:', formattedChats.map((chat) => ({ chatId: chat.chatId, title: chat.title, searchCount: chat.searches.length })));

    return NextResponse.json({ chats: formattedChats });
  } catch (error: any) {
    console.error('Error fetching chats:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { title } = await request.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const chatId = crypto.randomUUID();
    const now = new Date().toISOString();
    const chat = {
      chat_id: chatId,
      start_time: now,
      last_message_time: now,
      search_count: 0,
      title,
      created_at: now,
    };

    const { error: insertError } = await supabase.from('chats').insert(chat);
    if (insertError) {
      console.error('Chat insert error:', insertError);
      throw new Error('Failed to create chat');
    }

    return NextResponse.json({
      chat: {
        chatId: chat.chat_id,
        startTime: chat.start_time,
        lastMessageTime: chat.last_message_time,
        searches: [],
        title: chat.title,
        createdAt: chat.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating chat:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}