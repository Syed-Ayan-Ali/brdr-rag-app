import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { preprocessQuery, analyzeQuery } from '@/lib/queryProcessing';
import { retrieveDocuments, formatContext } from '@/lib/documentRetrieval';
import { formatMetrics, formatDocumentLinks } from '@/lib/metrics';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Add system message with instructions for metrics and document links
  const systemMessage = {
    role: 'system' as const,
    content: `You are a helpful AI assistant for BRDR (Banking Returns Data Repository) documents. 

When responding to queries:
1. Provide accurate information based on the retrieved documents
2. Include the metrics information provided in your response when available
3. Mention the source documents and provide clickable links
4. Format your response clearly with proper sections

Always include the metrics and document links when they are provided in the tool results.`
  };

  const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: [systemMessage, ...convertToModelMessages(messages)],
    tools: {
      // Enhanced document search with multiple strategies
      searchDocuments: {
        description: 'Search for relevant documents in the BRDR database using advanced retrieval strategies',
        inputSchema: z.object({
          query: z.string().describe('The search query'),
          searchType: z.enum(['vector', 'keyword', 'hybrid']).optional().describe('Search strategy to use'),
          limit: z.number().optional().describe('Number of documents to retrieve (default: 5)'),
        }),
        execute: async ({ query, searchType = 'vector', limit = 5 }: { query: string; searchType?: string; limit?: number }) => {
          try {
            // Preprocess and expand query
            const expandedQueries = await preprocessQuery(query);
            
            // Analyze query intent
            const analysis = await analyzeQuery(query);
            
            // Retrieve documents using enhanced strategy
            const retrievalResult = await retrieveDocuments(query, limit);
            
            // Format context for the model
            const context = formatContext(retrievalResult.documents);
            
            // Generate document links
            const documentLinks = formatDocumentLinks(retrievalResult.metrics.documentsRetrieved);
            
            // Format metrics for display
            const metricsText = formatMetrics(retrievalResult.metrics);
            
            // Format document links for display
            const documentLinksText = documentLinks.length > 0 
              ? `\n\n📄 **Source Documents:**\n${documentLinks.map(link => 
                  `• [${link.docId}](${link.url})`
                ).join('\n')}`
              : '';

            return {
              documents: retrievalResult.documents.length,
              context: context,
              analysis: analysis,
              searchStrategy: searchType,
              expandedQueries: expandedQueries.length,
              metrics: retrievalResult.metrics,
              documentLinks: documentLinks,
              metricsText: metricsText,
              documentLinksText: documentLinksText
            };
          } catch (error) {
            console.error('Search error:', error);
            return { error: 'Failed to search documents' };
          }
        },
      },

      // Query clarification tool
      clarifyQuery: {
        description: 'Ask the user to clarify their query for better document retrieval',
        inputSchema: z.object({
          message: z.string().describe('The clarification message to show to the user'),
          options: z.array(z.string()).optional().describe('Optional choices for the user to select from'),
        }),
      },

      // Multi-step document analysis
      analyzeDocument: {
        description: 'Perform detailed analysis of retrieved documents to extract key information',
        inputSchema: z.object({
          documentIds: z.array(z.string()).describe('Array of document IDs to analyze'),
          analysisType: z.enum(['summary', 'extraction', 'comparison']).describe('Type of analysis to perform'),
        }),
        execute: async ({ documentIds, analysisType }: { documentIds: string[]; analysisType: string }) => {
          try {
            // Fetch documents by IDs
            const { data: documents, error } = await supabase
              .from('brdr_documents_data')
              .select('*')
              .in('doc_id', documentIds);

            if (error) throw error;

            // Perform analysis based on type
            let analysis = '';
            switch (analysisType) {
              case 'summary':
                analysis = `Analyzed ${documents.length} documents. Key themes: ${documents.map((d: any) => d.metadata?.topics?.join(', ') || 'N/A').join('; ')}`;
                break;
              case 'extraction':
                analysis = `Extracted key information from ${documents.length} documents. Content length: ${documents.reduce((sum: number, d: any) => sum + d.content.length, 0)} characters`;
                break;
              case 'comparison':
                analysis = `Compared ${documents.length} documents. Found ${new Set(documents.map((d: any) => d.doc_id)).size} unique documents`;
                break;
            }

            return { analysis, documentCount: documents.length };
          } catch (error) {
            console.error('Analysis error:', error);
            return { error: 'Failed to analyze documents' };
          }
        },
      },

      // Context window management
      manageContext: {
        description: 'Manage the context window by selecting the most relevant information',
        inputSchema: z.object({
          action: z.enum(['expand', 'reduce', 'focus']).describe('Action to perform on context'),
          criteria: z.string().optional().describe('Criteria for context management'),
        }),
        execute: async ({ action, criteria }: { action: string; criteria?: string }) => {
          return {
            action: action,
            criteria: criteria || 'relevance',
            message: `Context window ${action}ed based on ${criteria || 'relevance'} criteria`
          };
        },
      },

      // Query refinement
      refineQuery: {
        description: 'Refine the search query based on initial results to improve retrieval',
        inputSchema: z.object({
          originalQuery: z.string().describe('The original search query'),
          feedback: z.string().describe('Feedback about the search results'),
        }),
        execute: async ({ originalQuery, feedback }: { originalQuery: string; feedback: string }) => {
          // Generate refined query based on feedback
          const refinedQuery = `Refined query based on feedback: ${originalQuery} [${feedback}]`;
          return { refinedQuery, originalQuery, feedback };
        },
      },
    },
  });

  return result.toUIMessageStreamResponse({
    onError: errorHandler,
  });
}

export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}