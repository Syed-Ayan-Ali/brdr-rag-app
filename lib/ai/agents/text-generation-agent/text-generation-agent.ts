import { generateText, tool } from 'ai';
import { TEXT_GENERATION_PROMPT } from '@/lib/prompts';
import { retry } from '@/lib/utils/retry';
import { google } from '@/lib/ai/providers';

/**
 * Generates a natural language answer using AI SDK based on the query, document context, and chat context.
 * @param query The original user query.
 * @param documentContext The context formed by joining content from search results.
 * @param chatContext The context from previous searches in the chat.
 * @returns A natural language answer as a string.
 */
export async function generateAnswer(query: string, documentContext: string, chatContext: string = ''): Promise<string> {
  try {
    const result = await retry(async () => {
      const response = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: TEXT_GENERATION_PROMPT(query, documentContext, chatContext),
        tools: {
          getChatContext: tool({            // Return chat context as a tool response
            description: 'Returns the chat context for the current conversation',
            execute: async () => {
              return chatContext;
            }
          })
        }
      });
      return response;
    });
    const text = result.text.trim();
    return text || 'No relevant answer could be generated from the provided context.';
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate answer from the LLM');
  }
}