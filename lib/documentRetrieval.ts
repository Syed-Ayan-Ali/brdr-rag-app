import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import { QueryMetrics } from './metrics';

export interface RetrievalResult {
  documents: any[];
  metrics: QueryMetrics;
}

// Enhanced document retrieval with multiple strategies
export async function retrieveDocuments(query: string, limit: number = 5): Promise<RetrievalResult> {
  const startTime = Date.now();
  const toolsCalled: string[] = [];
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    toolsCalled.push('searchDocuments');
    
    
    // Strategy 1: Vector similarity search
    const { data: vectorResults, error: vectorError } = await supabase.rpc(
      'match_page_sections',
      {
        query_embedding: queryEmbedding,
        match_count: limit,
        match_threshold: 0.2,
        min_content_length: 50
      }
    );

    if (vectorError) {
      console.error('Vector search error:', vectorError);
      return {
        documents: [],
        metrics: {
          queryTime: Date.now() - startTime,
          toolsCalled,
          tokenCount: 0,
          documentsRetrieved: [],
          searchStrategy: 'vector'
        }
      };
    }

    // Strategy 2: Keyword search for hybrid approach
    const { data: keywordResults, error: keywordError } = await supabase
      .from('brdr_documents_data')
      .select('doc_id, content, metadata')
      .textSearch('content', query)
      .limit(limit);

    if (keywordError) {
      console.error('Keyword search error:', keywordError);
    }

    // Combine and deduplicate results
    const allResults = [...(vectorResults || []), ...(keywordResults || [])];
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.doc_id === result.doc_id)
    );

    // Sort by relevance (vector similarity first, then keyword relevance)
    const finalResults = uniqueResults.slice(0, limit);
    
    // Extract document IDs for metrics
    const documentIds = finalResults.map(doc => doc.doc_id);
    
    // Estimate token count (rough calculation)
    const totalContent = finalResults.map(doc => doc.content).join(' ');
    const estimatedTokens = Math.ceil(totalContent.length / 4); // Rough estimation

    const metrics: QueryMetrics = {
      queryTime: Date.now() - startTime,
      toolsCalled,
      tokenCount: estimatedTokens,
      documentsRetrieved: documentIds,
      searchStrategy: 'hybrid'
    };

    return {
      documents: finalResults,
      metrics
    };
  } catch (error) {
    console.error('Document retrieval error:', error);
    return {
      documents: [],
      metrics: {
        queryTime: Date.now() - startTime,
        toolsCalled,
        tokenCount: 0,
        documentsRetrieved: [],
        searchStrategy: 'error'
      }
    };
  }
}

// Context window management
export function formatContext(documents: any[], maxTokens: number = 4000): string {
  let context = '';
  let tokenCount = 0;

  for (const doc of documents) {
    const docText = `Document ID: ${doc.doc_id}\nContent: ${doc.content}\n\n`;
    const estimatedTokens = docText.length / 4; // Rough estimation

    if (tokenCount + estimatedTokens > maxTokens) {
      break;
    }

    context += docText;
    tokenCount += estimatedTokens;
  }

  return context;
} 