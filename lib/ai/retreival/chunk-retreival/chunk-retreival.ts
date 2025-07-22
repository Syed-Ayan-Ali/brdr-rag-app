import { supabase } from '@/lib/db/supabase';
import { generateEmbedding } from '@/lib/ai/open-source-embeddings';
import { embeddingModels } from '@/lib/ai/providers';
import { retry } from '@/lib/utils/retry';
import { SearchResult } from '@/lib/types/search-types';

export async function retreiveQueryMatches(expandedQueries: string[]): Promise<{ results: SearchResult[] }> {
  // Load model configuration
  const model = embeddingModels['all-MiniLM-L6-v2'];

  try {
    // Embed all queries and search Supabase
    const results = [];
    for (const q of expandedQueries) {
      console.log(`Processing query: ${q}`);
      const embedding = await generateEmbedding(q, model);
      
      try {
        // Wrap Supabase query in retry mechanism with timeout
        const { data, error } = await retry(async () => {
          // Set a 5-second timeout for the RPC call
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            const response = await supabase
              .rpc('match_page_sections', {
                embedding: embedding,
                match_count: 1, // Keep low to reduce query time
                match_threshold: 0.01, // Increase to reduce results
                min_content_length: 100,
              });
            clearTimeout(timeoutId);
            return response;
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        }, 3, 1000); // Retry up to 3 times with 1s, 2s, 4s delays

        if (error) {
          console.warn(`Failed to fetch results for query "${q}": ${error.message}`);
          continue; // Skip to next query
        }

        results.push(...data);
      } catch (retryError) {
        console.warn(`Retry failed for query "${q}": ${retryError}. Skipping to next query.`);
        continue; // Fallback: skip this query
      }
    }

    // Deduplicate and sort results by similarity score
    const uniqueResults = Array.from(
      new Map(results.map(item => [item.id, item])).values()
    ).sort((a, b) => b.score - a.score);

    console.log(`Retrieved ${uniqueResults.length} unique results for ${expandedQueries.length} queries`);

    return {
      results: uniqueResults.slice(0, 10)
    };
  } catch (error) {
    console.error('Chunk retrieval error:', error);
    return { results: [] }; // Fallback to empty results
  }
}