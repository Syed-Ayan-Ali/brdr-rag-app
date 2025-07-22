import { supabase } from '@/lib/db/supabase';
import { Search } from '@/lib/types/search-types';

/**
 * Retrieves search context by fetching a specific search from Supabase.
 * @param searchId The ID of the search to retrieve.
 * @returns The search object.
 */
export async function retrieveSearchContext(searchId: string): Promise<Search> {
  try {
    // Fetch the search
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .select('*')
      .eq('search_id', searchId)
      .single();

    if (searchError || !searchData) {
      console.error('Search fetch error:', searchError);
      throw new Error(`Failed to fetch search: ${searchError?.message || 'Search not found'}`);
    }

    // Format the search object
    const formattedSearch: Search = {
      searchId: searchData.search_id,
      query: searchData.query,
      llmResponse: searchData.answer,
      expandedQueries: [], // Not stored in DB
      results: [], // Not stored in DB
      timestamp: searchData.search_time,
      responseTime: searchData.response_time,
      tokenSize: searchData.token_size,
    };

    console.log(`Retrieved search context for searchId: ${searchId}`);

    return formattedSearch;
  } catch (error) {
    console.error('Search retrieval error:', error);
    throw new Error('Failed to retrieve search context');
  }
}