import { supabase } from "@/lib/db/supabase";
import { Chat } from '@/types/search-types';

/**
 * Retrieves chat context by fetching the chat and its associated searches from Supabase.
 * @param chatId The ID of the chat to retrieve.
 * @returns The chat object with its searches.
 */
export async function retrieveChatContext(chatId: string): Promise<Chat> {
  

  try {
    // Fetch the chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (chatError || !chatData) {
      console.error('Chat fetch error:', chatError);
      throw new Error(`Failed to fetch chat: ${chatError?.message || 'Chat not found'}`);
    }

    // Fetch searches for the chat
    const { data: searches, error: searchesError } = await supabase
      .from('searches')
      .select('*')
      .eq('chat_id', chatId)
      .order('search_time', { ascending: false });

    if (searchesError) {
      console.error('Searches fetch error:', searchesError);
      throw new Error(`Failed to fetch searches: ${searchesError.message}`);
    }

    // Format the chat object
    const formattedChat: Chat = {
      chatId: chatData.chat_id,
      startTime: chatData.start_time,
      lastMessageTime: chatData.last_message_time,
      searches: searches.map((search) => ({
        searchId: search.search_id,
        query: search.query,
        llmResponse: search.answer,
        expandedQueries: [], // Not stored in DB
        results: [], // Not stored in DB
        timestamp: search.search_time,
        responseTime: search.response_time,
        tokenSize: search.token_size,
      })),
      title: chatData.title,
    };

    console.log(`Retrieved chat context for chatId: ${chatId}, search count: ${formattedChat.searches.length}`);

    return formattedChat;
  } catch (error) {
    console.error('Chat retrieval error:', error);
    throw new Error('Failed to retrieve chat context');
  }
}