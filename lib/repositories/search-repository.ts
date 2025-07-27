import { supabase } from '@/lib/db/supabase';
import { retry } from '@/utils/retry';

export class SearchRepository {
  async insertSearch(search: {
    search_id: string;
    chat_id: string;
    query: string;
    answer: string;
    search_time: string;
    response_time: number;
    token_size: number;
  }) {
    return await retry(async () => {
      const { error } = await supabase.from('searches').insert(search);
      if (error) {
        throw new Error(`Failed to insert search: ${error.message}`);
      }
    });
  }
}