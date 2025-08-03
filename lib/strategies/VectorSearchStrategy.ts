import { RetrievalStrategy, RetrievalResult, SearchResult } from '../interfaces/RetrievalStrategy';
import { generateEmbedding } from '../embeddings';
import { supabase } from '../supabase';

export class VectorSearchStrategy implements RetrievalStrategy {
  async search(query: string, limit: number = 5): Promise<RetrievalResult> {
    const startTime = Date.now();
    const toolsCalled = ['vector_search'];

    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);

      // Perform vector search
      const { data: results, error } = await supabase.rpc(
        'match_page_sections',
        {
          query_embedding: queryEmbedding,
          match_count: limit,
          match_threshold: 0.3,
          min_content_length: 50
        }
      );

      if (error) {
        throw new Error(`Vector search error: ${error.message}`);
      }

      // Transform results to SearchResult format
      const documents: SearchResult[] = (results || []).map((result: any) => ({
        doc_id: result.doc_id,
        content: result.content,
        metadata: result.metadata || {},
        similarity: result.similarity || 0,
        source: 'vector' as const,
        relevance: this.calculateRelevance(result, query)
      }));

      const queryTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(query);
      const documentsRetrieved = documents.map(doc => doc.doc_id);
      const retrievalAccuracy = this.calculateRetrievalAccuracy(documents, query);

      return {
        documents,
        metrics: {
          queryTime,
          toolsCalled,
          tokenCount,
          documentsRetrieved,
          searchStrategy: 'vector',
          retrievalAccuracy
        },
        context: this.assembleContext(documents, query)
      };

    } catch (error) {
      console.error('Vector search strategy error:', error);
      
      // Return empty result on error
      return {
        documents: [],
        metrics: {
          queryTime: Date.now() - startTime,
          toolsCalled,
          tokenCount: 0,
          documentsRetrieved: [],
          searchStrategy: 'vector',
          retrievalAccuracy: 0
        },
        context: ''
      };
    }
  }

  getName(): string {
    return 'VectorSearchStrategy';
  }

  getDescription(): string {
    return 'Semantic search using vector embeddings for similarity matching';
  }

  private calculateRelevance(result: any, query: string): number {
    let relevance = result.similarity || 0;

    // Boost relevance based on query term presence
    const queryTerms = query.toLowerCase().split(' ');
    const content = result.content.toLowerCase();

    for (const term of queryTerms) {
      if (content.includes(term)) {
        relevance += 0.1;
      }
    }

    // Boost relevance based on content length (prefer longer, more detailed content)
    const lengthScore = Math.min(result.content.length / 1000, 0.2);
    relevance += lengthScore;

    return Math.min(relevance, 1.0);
  }

  private calculateRetrievalAccuracy(documents: SearchResult[], query: string): number {
    if (documents.length === 0) return 0;

    // Calculate average similarity
    const avgSimilarity = documents.reduce((sum, doc) => sum + doc.similarity, 0) / documents.length;

    // Boost accuracy based on query term coverage
    const queryTerms = query.toLowerCase().split(' ');
    let termCoverage = 0;

    for (const term of queryTerms) {
      const hasTerm = documents.some(doc => 
        doc.content.toLowerCase().includes(term)
      );
      if (hasTerm) termCoverage++;
    }

    const coverageScore = termCoverage / queryTerms.length;

    return (avgSimilarity + coverageScore) / 2;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private assembleContext(documents: SearchResult[], query: string): string {
    if (documents.length === 0) return '';

    // Sort by relevance and assemble context
    const sortedDocs = documents.sort((a, b) => b.relevance - a.relevance);
    
    let context = '';
    let tokenCount = 0;
    const maxTokens = 4000;

    for (const doc of sortedDocs) {
      const docText = `Document ID: ${doc.doc_id}\nContent: ${doc.content}\nRelevance: ${doc.relevance.toFixed(3)}\n\n`;
      const estimatedTokens = docText.length / 4;

      if (tokenCount + estimatedTokens > maxTokens) {
        break;
      }

      context += docText;
      tokenCount += estimatedTokens;
    }

    return context;
  }
} 