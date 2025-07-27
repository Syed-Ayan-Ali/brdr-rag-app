import { supabase } from '@/lib/db/supabase';
import { retry } from '@/utils/retry';

export class ChatRepository {
  async incrementSearchCount(chatId: string): Promise<number> {
    return await retry(async () => {
      const { data, error } = await supabase
        .rpc('increment_search_count', { p_chat_id: chatId })
        .single<{ count: number }>();
      if (error || data === null) {
        throw new Error(`Failed to increment search count: ${error?.message || 'No data returned'}`);
      }
      return data.count;
    });
  }

  async updateChat(chatId: string, updates: { last_message_time: string; search_count: number }) {
    return await retry(async () => {
      const { error } = await supabase
        .from('chats')
        .update(updates)
        .eq('chat_id', chatId);
      if (error) {
        throw new Error(`Failed to update chat: ${error.message}`);
      }
    });
  }
}