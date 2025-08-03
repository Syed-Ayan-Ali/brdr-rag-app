import { RetrievalStrategy, RetrievalResult, SearchResult } from '../interfaces/RetrievalStrategy';
import { supabase } from '../supabase';

export class KeywordSearchStrategy implements RetrievalStrategy {
  async search(query: string, limit: number = 5): Promise<RetrievalResult> {
    const startTime = Date.now();
    const toolsCalled = ['keyword_search'];

    try {
      // Perform keyword search using Supabase text search
      const { data: results, error } = await supabase
        .from('brdr_documents_data')
        .select('doc_id, content, metadata')
        .textSearch('content', query)
        .limit(limit);

      if (error) {
        throw new Error(`Keyword search error: ${error.message}`);
      }

      // Transform results to SearchResult format
      const documents: SearchResult[] = (results || []).map((result: any) => ({
        doc_id: result.doc_id,
        content: result.content,
        metadata: result.metadata || {},
        similarity: this.calculateKeywordSimilarity(result, query),
        source: 'keyword' as const,
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
          searchStrategy: 'keyword',
          retrievalAccuracy
        },
        context: this.assembleContext(documents, query)
      };

    } catch (error) {
      console.error('Keyword search strategy error:', error);
      
      // Return empty result on error
      return {
        documents: [],
        metrics: {
          queryTime: Date.now() - startTime,
          toolsCalled,
          tokenCount: 0,
          documentsRetrieved: [],
          searchStrategy: 'keyword',
          retrievalAccuracy: 0
        },
        context: ''
      };
    }
  }

  getName(): string {
    return 'KeywordSearchStrategy';
  }

  getDescription(): string {
    return 'Traditional keyword-based search using text matching';
  }

  private calculateKeywordSimilarity(result: any, query: string): number {
    const queryTerms = query.toLowerCase().split(' ');
    const content = result.content.toLowerCase();
    
    let matchCount = 0;
    let totalTerms = queryTerms.length;

    for (const term of queryTerms) {
      if (content.includes(term)) {
        matchCount++;
      }
    }

    return matchCount / totalTerms;
  }

  private calculateRelevance(result: any, query: string): number {
    let relevance = this.calculateKeywordSimilarity(result, query);

    // Boost relevance based on exact phrase matches
    const exactPhraseMatch = result.content.toLowerCase().includes(query.toLowerCase());
    if (exactPhraseMatch) {
      relevance += 0.3;
    }

    // Boost relevance based on content length (prefer longer, more detailed content)
    const lengthScore = Math.min(result.content.length / 1000, 0.2);
    relevance += lengthScore;

    // Boost relevance based on term frequency
    const queryTerms = query.toLowerCase().split(' ');
    let termFrequency = 0;

    for (const term of queryTerms) {
      const regex = new RegExp(term, 'gi');
      const matches = result.content.toLowerCase().match(regex);
      if (matches) {
        termFrequency += matches.length;
      }
    }

    const frequencyScore = Math.min(termFrequency / 10, 0.2);
    relevance += frequencyScore;

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