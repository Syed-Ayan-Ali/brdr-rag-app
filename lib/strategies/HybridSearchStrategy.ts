import { RetrievalStrategy, RetrievalResult, SearchResult } from '../interfaces/RetrievalStrategy';
import { VectorSearchStrategy } from './VectorSearchStrategy';
import { KeywordSearchStrategy } from './KeywordSearchStrategy';

export class HybridSearchStrategy implements RetrievalStrategy {
  constructor(
    private vectorStrategy: VectorSearchStrategy,
    private keywordStrategy: KeywordSearchStrategy
  ) {}

  async search(query: string, limit: number = 5): Promise<RetrievalResult> {
    const startTime = Date.now();
    const toolsCalled = ['hybrid_search', 'vector_search', 'keyword_search'];

    try {
      // Perform both vector and keyword searches in parallel
      const [vectorResult, keywordResult] = await Promise.all([
        this.vectorStrategy.search(query, limit),
        this.keywordStrategy.search(query, limit)
      ]);

      // Combine and re-rank results
      const allDocuments = [...vectorResult.documents, ...keywordResult.documents];
      const reRankedDocuments = await this.reRankResults(allDocuments, query);

      // Calculate combined metrics
      const queryTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(query);
      const documentsRetrieved = reRankedDocuments.map(doc => doc.doc_id);
      const retrievalAccuracy = this.calculateCombinedAccuracy(vectorResult, keywordResult, query);

      return {
        documents: reRankedDocuments,
        metrics: {
          queryTime,
          toolsCalled,
          tokenCount,
          documentsRetrieved,
          searchStrategy: 'hybrid',
          retrievalAccuracy
        },
        context: this.assembleContext(reRankedDocuments, query)
      };

    } catch (error) {
      console.error('Hybrid search strategy error:', error);
      
      // Fallback to vector search only
      try {
        const fallbackResult = await this.vectorStrategy.search(query, limit);
        return {
          ...fallbackResult,
          metrics: {
            ...fallbackResult.metrics,
            searchStrategy: 'hybrid_fallback',
            toolsCalled: ['hybrid_search', 'vector_search']
          }
        };
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
        
        // Return empty result
        return {
          documents: [],
          metrics: {
            queryTime: Date.now() - startTime,
            toolsCalled,
            tokenCount: 0,
            documentsRetrieved: [],
            searchStrategy: 'hybrid',
            retrievalAccuracy: 0
          },
          context: ''
        };
      }
    }
  }

  getName(): string {
    return 'HybridSearchStrategy';
  }

  getDescription(): string {
    return 'Combines vector and keyword search for comprehensive results';
  }

  private async reRankResults(documents: SearchResult[], query: string): Promise<SearchResult[]> {
    // Remove duplicates based on doc_id
    const uniqueDocs = documents.filter((doc, index, self) => 
      index === self.findIndex(d => d.doc_id === doc.doc_id)
    );

    // Calculate combined relevance scores
    const scoredDocs = uniqueDocs.map(doc => ({
      ...doc,
      combinedRelevance: this.calculateCombinedRelevance(doc, query)
    }));

    // Sort by combined relevance
    return scoredDocs
      .sort((a, b) => b.combinedRelevance - a.combinedRelevance)
      .map(doc => ({
        ...doc,
        relevance: doc.combinedRelevance
      }));
  }

  private calculateCombinedRelevance(doc: SearchResult, query: string): number {
    let combinedScore = doc.relevance;

    // Boost score based on source diversity
    if (doc.source === 'vector') {
      // Vector results get a slight boost for semantic understanding
      combinedScore += 0.1;
    } else if (doc.source === 'keyword') {
      // Keyword results get a boost for exact matches
      const exactMatch = doc.content.toLowerCase().includes(query.toLowerCase());
      if (exactMatch) {
        combinedScore += 0.2;
      }
    }

    // Boost score based on content quality
    const contentQuality = Math.min(doc.content.length / 1000, 0.3);
    combinedScore += contentQuality;

    // Boost score based on query term coverage
    const queryTerms = query.toLowerCase().split(' ');
    const content = doc.content.toLowerCase();
    let termCoverage = 0;

    for (const term of queryTerms) {
      if (content.includes(term)) {
        termCoverage++;
      }
    }

    const coverageScore = (termCoverage / queryTerms.length) * 0.2;
    combinedScore += coverageScore;

    return Math.min(combinedScore, 1.0);
  }

  private calculateCombinedAccuracy(
    vectorResult: RetrievalResult, 
    keywordResult: RetrievalResult, 
    query: string
  ): number {
    const vectorAccuracy = vectorResult.metrics.retrievalAccuracy;
    const keywordAccuracy = keywordResult.metrics.retrievalAccuracy;

    // Weight vector accuracy higher for semantic understanding
    const weightedAccuracy = (vectorAccuracy * 0.7) + (keywordAccuracy * 0.3);

    // Boost accuracy if both strategies found results
    const hasVectorResults = vectorResult.documents.length > 0;
    const hasKeywordResults = keywordResult.documents.length > 0;

    if (hasVectorResults && hasKeywordResults) {
      return Math.min(weightedAccuracy + 0.1, 1.0);
    }

    return weightedAccuracy;
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
      const docText = `Document ID: ${doc.doc_id}\nContent: ${doc.content}\nRelevance: ${doc.relevance.toFixed(3)}\nSource: ${doc.source}\n\n`;
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