// Core interfaces for retrieval strategies

export interface SearchResult {
  doc_id: string;
  content: string;
  metadata: any;
  similarity: number;
  source: 'vector' | 'keyword' | 'hybrid' | 'semantic' | 'knowledge_graph';
  relevance: number;
}

export interface RetrievalResult {
  documents: SearchResult[];
  metrics: {
    queryTime: number;
    toolsCalled: string[];
    tokenCount: number;
    documentsRetrieved: string[];
    searchStrategy: string;
    retrievalAccuracy: number;
  };
  context: string;
}

// Strategy Pattern for different retrieval approaches
export interface RetrievalStrategy {
  search(query: string, limit: number): Promise<RetrievalResult>;
  getName(): string;
  getDescription(): string;
}

// Factory Pattern for creating retrieval strategies
export interface RetrievalStrategyFactory {
  createStrategy(strategyName: string): RetrievalStrategy;
  getAvailableStrategies(): string[];
}

// Re-ranking Interface
export interface ReRanker {
  reRank(results: SearchResult[], query: string): Promise<SearchResult[]>;
  getName(): string;
}

// Context Management Interface
export interface ContextManager {
  assembleContext(documents: SearchResult[], query: string, maxTokens: number): Promise<string>;
  calculateRelevanceScore(document: SearchResult, query: string): number;
}

// Performance Monitoring Interface
export interface PerformanceMonitor {
  recordQuery(query: string, latency: number, accuracy: number, contextUtilization: number, cacheHit: boolean): void;
  getAverageMetrics(): any;
  getMetrics(): any[];
}

// Caching Interface
export interface CacheManager {
  getCachedResults(query: string): Promise<any[] | null>;
  setCachedResults(query: string, results: any[]): Promise<void>;
  getCachedEmbedding(text: string): Promise<number[] | null>;
  setCachedEmbedding(text: string, embedding: number[]): Promise<void>;
  clear(): void;
} 