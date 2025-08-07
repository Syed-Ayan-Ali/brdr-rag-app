import { RetrievalStrategy, RetrievalResult, SearchResult } from '../interfaces/RetrievalStrategy';
import { generateEmbedding } from '../embeddings';
import { supabase } from '../supabase';
import { DatabaseManager } from '../etl/database/DatabaseManager';
import { KnowledgeGraphBuilder } from '../etl/knowledge_graph/KnowledgeGraphBuilder';

export class KnowledgeGraphSearchStrategy implements RetrievalStrategy {
  private databaseManager: DatabaseManager;
  private knowledgeGraphBuilder: KnowledgeGraphBuilder;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.knowledgeGraphBuilder = new KnowledgeGraphBuilder(this.databaseManager);
  }

  async search(query: string, limit: number = 5): Promise<RetrievalResult> {
    const startTime = Date.now();
    const toolsCalled = ['knowledge_graph_search'];

    try {
      // Step 1: Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Step 2: Perform vector search to get initial results
      const { data: vectorResults, error } = await supabase.rpc(
        'match_page_sections',
        {
          query_embedding: queryEmbedding,
          match_count: limit * 2, // Get more results for knowledge graph processing
          match_threshold: 0.3,
          min_content_length: 50
        }
      );

      if (error) {
        throw new Error(`Knowledge graph search error: ${error.message}`);
      }

      // Step 3: Enhance results with knowledge graph relationships
      const enhancedResults = await this.enhanceWithKnowledgeGraph(
        vectorResults || [],
        query,
        limit
      );

      // Step 4: Transform to SearchResult format
      const documents: SearchResult[] = enhancedResults.map((result: any) => ({
        doc_id: result.doc_id,
        content: result.content,
        metadata: result.metadata || {},
        similarity: result.similarity || 0,
        source: 'knowledge_graph',
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
          searchStrategy: 'knowledge_graph',
          retrievalAccuracy
        },
        context: this.assembleContext(documents, query)
      };

    } catch (error) {
      console.error('Knowledge graph search strategy error:', error);
      
      return {
        documents: [],
        metrics: {
          queryTime: Date.now() - startTime,
          toolsCalled,
          tokenCount: 0,
          documentsRetrieved: [],
          searchStrategy: 'knowledge_graph',
          retrievalAccuracy: 0
        },
        context: ''
      };
    }
  }

  getName(): string {
    return 'KnowledgeGraphSearchStrategy';
  }

  getDescription(): string {
    return 'Semantic search enhanced with knowledge graph relationships and concept mapping';
  }

  private async enhanceWithKnowledgeGraph(
    vectorResults: any[],
    query: string,
    limit: number
  ): Promise<any[]> {
    const enhancedResults = [];

    for (const result of vectorResults) {
      // Get related chunks through knowledge graph
      const relatedChunks = await this.getRelatedChunks(result.id, 3);
      
      // Get keywords and concepts for this chunk
      const keywords = await this.getKeywordsForChunk(result.id);
      
      // Calculate enhanced similarity score
      const enhancedSimilarity = this.calculateEnhancedSimilarity(
        result,
        relatedChunks,
        keywords,
        query
      );

      enhancedResults.push({
        ...result,
        similarity: enhancedSimilarity,
        relatedChunks,
        keywords,
        enhanced: true
      });
    }

    // Sort by enhanced similarity and return top results
    return enhancedResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private async getRelatedChunks(chunkId: string, limit: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('chunk_relationships')
        .select(`
          *,
          source_chunk:brdr_documents_data!source_chunk_id(*),
          target_chunk:brdr_documents_data!target_chunk_id(*)
        `)
        .or(`source_chunk_id.eq.${chunkId},target_chunk_id.eq.${chunkId}`)
        .gte('weight', 0.3)
        .order('weight', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting related chunks:', error);
      return [];
    }
  }

  private async getKeywordsForChunk(chunkId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('chunk_keywords')
        .select(`
          *,
          keywords!inner(*)
        `)
        .eq('chunk_id', chunkId)
        .order('weight', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting keywords for chunk:', error);
      return [];
    }
  }

  private calculateEnhancedSimilarity(
    result: any,
    relatedChunks: any[],
    keywords: any[],
    query: string
  ): number {
    let enhancedScore = result.similarity || 0;

    // Boost score based on keyword relevance
    const queryKeywords = this.extractKeywords(query);
    const resultKeywords = keywords.map((k: any) => k.keywords?.keyword).filter(Boolean);
    
    const keywordOverlap = this.calculateKeywordOverlap(queryKeywords, resultKeywords);
    enhancedScore += keywordOverlap * 0.2;

    // Boost score based on related chunks
    if (relatedChunks.length > 0) {
      const avgRelatedWeight = relatedChunks.reduce((sum, rel) => sum + rel.weight, 0) / relatedChunks.length;
      enhancedScore += avgRelatedWeight * 0.1;
    }

    // Boost score based on concept relevance
    const concepts = keywords
      .map((k: any) => k.keywords?.concept)
      .filter(Boolean);
    
    const conceptRelevance = this.calculateConceptRelevance(query, concepts);
    enhancedScore += conceptRelevance * 0.15;

    return Math.min(enhancedScore, 1.0);
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculateConceptRelevance(query: string, concepts: string[]): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;
    
    for (const concept of concepts) {
      if (queryLower.includes(concept.toLowerCase())) {
        relevance += 0.3;
      }
    }
    
    return Math.min(relevance, 1.0);
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

    // Boost relevance based on knowledge graph enhancements
    if (result.enhanced) {
      relevance += 0.1;
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

    // Boost accuracy based on knowledge graph usage
    const knowledgeGraphScore = documents.some(doc => doc.source === 'knowledge_graph') ? 0.2 : 0;

    return (avgSimilarity + coverageScore + knowledgeGraphScore) / 3;
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