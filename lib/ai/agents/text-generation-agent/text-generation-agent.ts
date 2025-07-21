import { generateText } from 'ai';
import { TEXT_GENERATION_PROMPT } from '@/lib/prompts';
import { retry } from '@/lib/utils/retry';
import { myProvider } from '@/lib/ai/providers';

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
        model: myProvider.languageModel('azure-lm-model'),
        prompt: TEXT_GENERATION_PROMPT(query, documentContext, chatContext),
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