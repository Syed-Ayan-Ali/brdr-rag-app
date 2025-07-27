/**
 * Utility function to retry an async operation with exponential backoff.
 * @param operation The async function to retry.
 * @param maxRetries Maximum number of retry attempts (default: 3).
 * @param baseDelay Base delay in milliseconds (default: 1000ms).
 * @returns The result of the operation or throws the final error.
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry for non-transient errors (e.g., invalid API key, bad request)
      if (error instanceof Error && error.message.includes('API key')) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff (1s, 2s, 4s, etc.)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Retry attempt ${attempt} failed: ${error}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError; // This line should never be reached due to the maxRetries check
}