import { generateText } from 'ai';
import { QUERY_EXPANSION_PROMPT } from '@/lib/prompts';
import { retry } from '@/utils/retry';
import { google } from '@/lib/ai/providers';

/**
 * Expands the user's query into a set of related queries using AI SDK with Azure.
 * @param query The original user query.
 * @returns A list of expanded queries.
 */
export async function expandUserQuery(query: string): Promise<string[]> {
  // Generate expanded queries with retry
  const result = await retry(async () => {
    const response = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: QUERY_EXPANSION_PROMPT(query),
    });
    return response;
  });

  // Extract and clean the generated queries
  const expandedQueries = result.text
    .split(';')
    .map((q: string) => q.trim())
    .filter(Boolean)
    .slice(0, 5); // Ensure no more than 5 queries

  return expandedQueries;
}