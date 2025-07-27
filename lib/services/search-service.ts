import { streamText } from 'ai';
import { google } from '@/lib/ai/providers';
import { supabase } from '@/lib/db/supabase';
import { generateEmbedding } from '@/lib/ai/embeddings';

export class SearchService {
  async streamSearchResponse(messages: [{ content: string; role: "user" | "assistant" }, ...{ content: string; role: "user" | "assistant" }[]]) {
    const query = messages[messages.length - 1].content;

    try {
      console.log(`Generating embedding for query: ${query}`);
      const embedding = await generateEmbedding(query, { model: 'Xenova/all-MiniLM-L6-v2' });
      console.log('Embedding sample:', embedding.slice(0, 5), 'Length:', embedding.length);

      console.log(`Calling Supabase RPC for query: ${query}`);
      const { data: results, error } = await supabase
        .rpc('match_page_sections', {
          query_embedding: embedding,
          match_count: 5,
          match_threshold: 0.1,
          min_content_length: 100,
        });

      if (error) {
        console.error(`Supabase RPC error: ${JSON.stringify(error, null, 2)}`);
        return streamText({
          model: google('gemini-1.5-flash'),
          messages: [
            ...messages,
            { role: 'assistant', content: `Error retrieving data from the database: ${error.message}` },
          ],
        });
      }

      if (!results || results.length === 0) {
        console.log(`No results found for query: ${query}`);
        return streamText({
          model: google('gemini-1.5-flash'),
          messages: [
            ...messages,
            { role: 'assistant', content: 'No relevant information found in the database for this query.' },
          ],
        });
      }

      console.log(`Found ${results.length} results for query: ${query}`);
      const responseContent = results
        .map((result: { doc_id: string; content: string; metadata: any; similarity: number }, index: number) => {
          return `Result ${index + 1} (Document ID: ${result.doc_id}, Similarity: ${result.similarity.toFixed(2)}):\n${result.content}\n`;
        })
        .join('\n');

      return streamText({
        model: google('gemini-1.5-flash'),
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: `Retrieved ${results.length} relevant document chunks:\n${responseContent}`,
          },
        ],
      });
    } catch (error) {
      console.error(`Search error for query: ${query}`, JSON.stringify(error, null, 2));
      return streamText({
        model: google('gemini-1.5-flash'),
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: `Error processing query: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      });
    }
  }
}