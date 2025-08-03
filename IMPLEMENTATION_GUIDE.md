# 🛠️ Step-by-Step RAG Implementation Guide

## **Phase 1: Current Implementation (COMPLETED ✅)**

### **What's Already Implemented:**
- ✅ Enhanced chat route with RAG tools
- ✅ Supabase integration
- ✅ Basic vector search
- ✅ Query preprocessing
- ✅ Context management
- ✅ Multi-tool architecture

### **Current Tools:**
1. `searchDocuments` - Enhanced document search
2. `clarifyQuery` - Query clarification
3. `analyzeDocument` - Document analysis
4. `manageContext` - Context management
5. `refineQuery` - Query refinement

---

## **Phase 2: Advanced Query Processing**

### **Step 2.1: Enhanced Query Preprocessing**

Create `utils/queryProcessor.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export interface QueryAnalysis {
  intent: 'regulatory_inquiry' | 'risk_assessment' | 'procedural_inquiry' | 'general_inquiry';
  entities: string[];
  searchStrategy: 'vector' | 'keyword' | 'hybrid' | 'semantic';
  confidence: number;
}

export async function advancedQueryPreprocessing(query: string): Promise<QueryAnalysis> {
  // 1. Entity extraction
  const entities = await extractEntities(query);
  
  // 2. Intent classification
  const intent = await classifyIntent(query);
  
  // 3. Strategy selection
  const searchStrategy = selectSearchStrategy(intent, entities);
  
  // 4. Confidence scoring
  const confidence = calculateConfidence(query, intent, entities);
  
  return {
    intent,
    entities,
    searchStrategy,
    confidence
  };
}

async function extractEntities(query: string): Promise<string[]> {
  // Basic entity extraction - replace with NER model
  const entities: string[] = [];
  
  // Extract dates
  const datePattern = /\b\d{4}-\d{2}-\d{2}\b/g;
  const dates = query.match(datePattern);
  if (dates) entities.push(...dates);
  
  // Extract document types
  const docTypes = ['regulation', 'guideline', 'policy', 'procedure'];
  docTypes.forEach(type => {
    if (query.toLowerCase().includes(type)) {
      entities.push(type);
    }
  });
  
  return entities;
}

async function classifyIntent(query: string): Promise<QueryAnalysis['intent']> {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('regulation') || lowerQuery.includes('rule') || lowerQuery.includes('law')) {
    return 'regulatory_inquiry';
  }
  
  if (lowerQuery.includes('risk') || lowerQuery.includes('safety') || lowerQuery.includes('hazard')) {
    return 'risk_assessment';
  }
  
  if (lowerQuery.includes('procedure') || lowerQuery.includes('process') || lowerQuery.includes('step')) {
    return 'procedural_inquiry';
  }
  
  return 'general_inquiry';
}

function selectSearchStrategy(intent: QueryAnalysis['intent'], entities: string[]): QueryAnalysis['searchStrategy'] {
  switch (intent) {
    case 'regulatory_inquiry':
      return 'hybrid';
    case 'risk_assessment':
      return 'vector';
    case 'procedural_inquiry':
      return 'keyword';
    default:
      return 'vector';
  }
}

function calculateConfidence(query: string, intent: QueryAnalysis['intent'], entities: string[]): number {
  let confidence = 0.5;
  
  // Boost confidence based on entity presence
  confidence += entities.length * 0.1;
  
  // Boost confidence based on intent clarity
  if (intent !== 'general_inquiry') {
    confidence += 0.2;
  }
  
  // Boost confidence based on query length
  if (query.length > 20) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}
```

### **Step 2.2: Query Expansion**

Create `utils/queryExpansion.ts`:
```typescript
export interface ExpandedQuery {
  original: string;
  expanded: string[];
  synonyms: Record<string, string[]>;
  reformulations: string[];
}

export async function expandQuery(query: string): Promise<ExpandedQuery> {
  const synonyms = {
    'regulation': ['rule', 'law', 'policy', 'guideline', 'standard'],
    'safety': ['security', 'protection', 'prevention', 'safeguard'],
    'risk': ['hazard', 'danger', 'threat', 'peril'],
    'assessment': ['evaluation', 'analysis', 'review', 'examination'],
    'procedure': ['process', 'method', 'protocol', 'workflow'],
    'document': ['report', 'paper', 'file', 'record'],
    'requirement': ['mandate', 'necessity', 'obligation', 'prerequisite']
  };
  
  const expanded: string[] = [query];
  const reformulations: string[] = [];
  
  // Generate synonym-based expansions
  for (const [term, related] of Object.entries(synonyms)) {
    if (query.toLowerCase().includes(term)) {
      for (const relatedTerm of related) {
        const expandedQuery = query.replace(new RegExp(term, 'gi'), relatedTerm);
        expanded.push(expandedQuery);
      }
    }
  }
  
  // Generate reformulations
  reformulations.push(
    `What are the ${query}?`,
    `Tell me about ${query}`,
    `Find information on ${query}`,
    `Search for ${query}`
  );
  
  return {
    original: query,
    expanded: [...new Set(expanded)],
    synonyms,
    reformulations
  };
}
```

---

## **Phase 3: Enhanced Retrieval Strategies**

### **Step 3.1: Hybrid Search Implementation**

Create `utils/hybridSearch.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export interface SearchResult {
  doc_id: string;
  content: string;
  metadata: any;
  similarity: number;
  source: 'vector' | 'keyword' | 'hybrid';
}

export async function hybridSearch(
  query: string, 
  limit: number = 5,
  supabase: any
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  // 1. Vector search
  try {
    const queryEmbedding = await generateEmbedding(query);
    const { data: vectorResults, error: vectorError } = await supabase.rpc(
      'match_page_sections',
      {
        query_embedding: queryEmbedding,
        match_count: limit,
        match_threshold: 0.7,
        min_content_length: 50
      }
    );
    
    if (!vectorError && vectorResults) {
      results.push(...vectorResults.map((r: any) => ({
        ...r,
        source: 'vector' as const
      })));
    }
  } catch (error) {
    console.error('Vector search error:', error);
  }
  
  // 2. Keyword search
  try {
    const { data: keywordResults, error: keywordError } = await supabase
      .from('brdr_documents_data')
      .select('doc_id, content, metadata')
      .textSearch('content', query)
      .limit(limit);
    
    if (!keywordError && keywordResults) {
      results.push(...keywordResults.map((r: any) => ({
        ...r,
        similarity: 0.5, // Default similarity for keyword search
        source: 'keyword' as const
      })));
    }
  } catch (error) {
    console.error('Keyword search error:', error);
  }
  
  // 3. Deduplicate and re-rank
  return reRankResults(results, query);
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Initialize the embedding pipeline
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    // Generate embedding
    const result = await embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert to array of numbers
    const embedding = Array.from(result.data).map(val => Number(val));
    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Failed to generate embedding');
  }
}

function reRankResults(results: SearchResult[], query: string): SearchResult[] {
  // Remove duplicates
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.doc_id === result.doc_id)
  );
  
  // Sort by similarity and source priority
  return uniqueResults.sort((a, b) => {
    // Priority: vector > hybrid > keyword
    const sourcePriority = { vector: 3, hybrid: 2, keyword: 1 };
    const aPriority = sourcePriority[a.source];
    const bPriority = sourcePriority[b.source];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.similarity - a.similarity;
  });
}
```

### **Step 3.2: Semantic Search**

Create `utils/semanticSearch.ts`:
```typescript
export async function semanticSearch(
  query: string,
  limit: number = 5,
  supabase: any
): Promise<SearchResult[]> {
  // 1. Query expansion for semantic search
  const expandedQueries = await expandQuery(query);
  
  // 2. Generate embeddings for all expanded queries
  const queryEmbeddings = await Promise.all(
    expandedQueries.expanded.map(q => generateEmbedding(q))
  );
  
  // 3. Search with multiple embeddings
  const allResults: SearchResult[] = [];
  
  for (const embedding of queryEmbeddings) {
    const { data: results, error } = await supabase.rpc(
      'match_page_sections',
      {
        query_embedding: embedding,
        match_count: limit,
        match_threshold: 0.6,
        min_content_length: 50
      }
    );
    
    if (!error && results) {
      allResults.push(...results.map((r: any) => ({
        ...r,
        source: 'semantic' as const
      })));
    }
  }
  
  // 4. Aggregate and re-rank
  return aggregateSemanticResults(allResults, query);
}

function aggregateSemanticResults(results: SearchResult[], query: string): SearchResult[] {
  // Group by document ID and calculate aggregate similarity
  const grouped = results.reduce((acc, result) => {
    if (!acc[result.doc_id]) {
      acc[result.doc_id] = [];
    }
    acc[result.doc_id].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);
  
  // Calculate aggregate similarity for each document
  const aggregated = Object.entries(grouped).map(([docId, docResults]) => {
    const avgSimilarity = docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length;
    const bestResult = docResults.reduce((best, current) => 
      current.similarity > best.similarity ? current : best
    );
    
    return {
      ...bestResult,
      similarity: avgSimilarity
    };
  });
  
  return aggregated.sort((a, b) => b.similarity - a.similarity);
}
```

---

## **Phase 4: Context Management**

### **Step 4.1: Smart Context Assembly**

Create `utils/contextManager.ts`:
```typescript
export interface ContextChunk {
  content: string;
  relevance: number;
  source: string;
  metadata: any;
}

export async function assembleContext(
  documents: SearchResult[],
  query: string,
  maxTokens: number = 4000
): Promise<string> {
  // 1. Score relevance for each document
  const scoredDocs = documents.map(doc => ({
    ...doc,
    relevance: calculateRelevanceScore(doc, query)
  }));
  
  // 2. Sort by relevance
  const sortedDocs = scoredDocs.sort((a, b) => b.relevance - a.relevance);
  
  // 3. Build context within token limit
  let context = '';
  let tokenCount = 0;
  
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

function calculateRelevanceScore(doc: SearchResult, query: string): number {
  let score = doc.similarity || 0;
  
  // Boost score based on query term presence
  const queryTerms = query.toLowerCase().split(' ');
  const content = doc.content.toLowerCase();
  
  for (const term of queryTerms) {
    if (content.includes(term)) {
      score += 0.1;
    }
  }
  
  // Boost score based on content length (prefer longer, more detailed content)
  const lengthScore = Math.min(doc.content.length / 1000, 0.2);
  score += lengthScore;
  
  return Math.min(score, 1.0);
}
```

---

## **Phase 5: Performance Optimization**

### **Step 5.1: Caching Implementation**

Create `utils/cache.ts`:
```typescript
export class SearchCache {
  private queryCache = new Map<string, { results: any[]; timestamp: number }>();
  private embeddingCache = new Map<string, number[]>();
  private contextCache = new Map<string, string>();
  
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async getCachedResults(query: string): Promise<any[] | null> {
    const cached = this.queryCache.get(query);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.results;
    }
    return null;
  }
  
  async setCachedResults(query: string, results: any[]): Promise<void> {
    this.queryCache.set(query, {
      results,
      timestamp: Date.now()
    });
  }
  
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    return this.embeddingCache.get(text) || null;
  }
  
  async setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    this.embeddingCache.set(text, embedding);
  }
  
  async getCachedContext(query: string): Promise<string | null> {
    return this.contextCache.get(query) || null;
  }
  
  async setCachedContext(query: string, context: string): Promise<void> {
    this.contextCache.set(query, context);
  }
  
  clear(): void {
    this.queryCache.clear();
    this.embeddingCache.clear();
    this.contextCache.clear();
  }
}
```

### **Step 5.2: Performance Monitoring**

Create `utils/performance.ts`:
```typescript
export interface PerformanceMetrics {
  queryLatency: number;
  retrievalAccuracy: number;
  contextUtilization: number;
  cacheHitRate: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  
  recordQuery(query: string, latency: number, accuracy: number, contextUtilization: number, cacheHit: boolean): void {
    this.metrics.push({
      queryLatency: latency,
      retrievalAccuracy: accuracy,
      contextUtilization: contextUtilization,
      cacheHitRate: cacheHit ? 1 : 0
    });
  }
  
  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        queryLatency: 0,
        retrievalAccuracy: 0,
        contextUtilization: 0,
        cacheHitRate: 0
      };
    }
    
    const sum = this.metrics.reduce((acc, metric) => ({
      queryLatency: acc.queryLatency + metric.queryLatency,
      retrievalAccuracy: acc.retrievalAccuracy + metric.retrievalAccuracy,
      contextUtilization: acc.contextUtilization + metric.contextUtilization,
      cacheHitRate: acc.cacheHitRate + metric.cacheHitRate
    }));
    
    const count = this.metrics.length;
    return {
      queryLatency: sum.queryLatency / count,
      retrievalAccuracy: sum.retrievalAccuracy / count,
      contextUtilization: sum.contextUtilization / count,
      cacheHitRate: sum.cacheHitRate / count
    };
  }
  
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}
```

---

## **Implementation Checklist**

### **Phase 1: Core Infrastructure ✅**
- [x] Enhanced chat route
- [x] Basic RAG tools
- [x] Supabase integration
- [x] Vector search

### **Phase 2: Query Processing**
- [ ] Create `utils/queryProcessor.ts`
- [ ] Create `utils/queryExpansion.ts`
- [ ] Integrate with chat route
- [ ] Test query preprocessing

### **Phase 3: Enhanced Retrieval**
- [ ] Create `utils/hybridSearch.ts`
- [ ] Create `utils/semanticSearch.ts`
- [ ] Update searchDocuments tool
- [ ] Test retrieval strategies

### **Phase 4: Context Management**
- [ ] Create `utils/contextManager.ts`
- [ ] Implement smart context assembly
- [ ] Test context optimization
- [ ] Monitor context utilization

### **Phase 5: Performance Optimization**
- [ ] Create `utils/cache.ts`
- [ ] Create `utils/performance.ts`
- [ ] Implement caching
- [ ] Add performance monitoring

### **Phase 6: Production Deployment**
- [ ] Environment variables setup
- [ ] Database schema updates
- [ ] Error handling
- [ ] Logging implementation
- [ ] Performance testing

---

## **Testing Strategy**

### **Unit Tests:**
```typescript
// Test query preprocessing
describe('Query Preprocessing', () => {
  it('should classify regulatory intent correctly', async () => {
    const result = await advancedQueryPreprocessing('Find regulations about safety');
    expect(result.intent).toBe('regulatory_inquiry');
  });
});

// Test hybrid search
describe('Hybrid Search', () => {
  it('should return results from multiple strategies', async () => {
    const results = await hybridSearch('safety regulations', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.source === 'vector')).toBe(true);
    expect(results.some(r => r.source === 'keyword')).toBe(true);
  });
});
```

### **Integration Tests:**
```typescript
// Test end-to-end RAG pipeline
describe('RAG Pipeline', () => {
  it('should process query and return relevant results', async () => {
    const query = 'What are the safety regulations?';
    const results = await processRAGQuery(query);
    expect(results.documents.length).toBeGreaterThan(0);
    expect(results.context).toBeTruthy();
  });
});
```

This implementation guide provides a modular approach where each step can be implemented independently and tested thoroughly before moving to the next phase. 

### **Step 1: Enhanced Embedding Model**
```bash
# Install transformers.js for local embedding generation
npm install @xenova/transformers
# No API keys needed - uses local model
```

### **Step 2: Query Preprocessing Pipeline**
```typescript
// Implement in route.ts
const queryPipeline = {
  preprocessing: preprocessQuery,
  expansion: expandQuery,
  classification: classifyQuery,
  optimization: optimizeQuery
};
```

### **Step 3: Multi-Strategy Retrieval**
```typescript
// Enhanced retrieval strategies
const retrievalStrategies = {
  vector: vectorSearch,
  keyword: keywordSearch,
  hybrid: hybridSearch,
  semantic: semanticSearch
};
```

### **Step 4: Re-ranking System**
```typescript
// Implement re-ranking
async function reRankResults(results: any[], query: string) {
  // 1. Relevance scoring
  const scoredResults = await scoreRelevance(results, query);
  
  // 2. Diversity ranking
  const diverseResults = await ensureDiversity(scoredResults);
  
  // 3. Freshness ranking
  const freshResults = await rankByFreshness(diverseResults);
  
  return freshResults;
}
```

### **Step 5: Context Optimization**
```typescript
// Smart context assembly
async function assembleContext(documents: any[], query: string) {
  // 1. Extract key information
  const keyInfo = await extractKeyInformation(documents);
  
  // 2. Structure context
  const structuredContext = await structureContext(keyInfo);
  
  // 3. Optimize for LLM
  return optimizeForLLM(structuredContext, query);
}
```

## 📈 **Performance Improvements**

### **Expected Improvements:**
- **Retrieval Accuracy**: +40% with hybrid search
- **Response Quality**: +60% with re-ranking
- **Query Understanding**: +50% with preprocessing
- **Context Utilization**: +70% with smart management

### **Monitoring Metrics:**
- Query latency
- Retrieval precision/recall
- User satisfaction scores
- Context utilization rate
- Cache hit rates

## 🔧 **Configuration Requirements**

### **Environment Variables:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# No API keys needed for embeddings - uses local Xenova model
```

### **Database Schema Updates:**
```sql
-- Add performance tracking
CREATE TABLE search_metrics (
  id UUID PRIMARY KEY,
  query TEXT,
  latency FLOAT,
  accuracy FLOAT,
  created_at TIMESTAMP
);

-- Add query cache
CREATE TABLE query_cache (
  query_hash TEXT PRIMARY KEY,
  results JSONB,
  created_at TIMESTAMP
);
```

## 🎯 **Next Steps**

1. **Implement Phase 1** (Current - Basic RAG)
2. **Add Query Preprocessing** (Step 2)
3. **Implement Hybrid Search** (Step 3)
4. **Add Re-ranking** (Step 4)
5. **Optimize Context Management** (Step 5)
6. **Add Caching** (Step 6)
7. **Monitor Performance** (Step 7)

## 📚 **Additional Recommendations**

### **Advanced Embedding Models:**
- **Xenova/all-MiniLM-L6-v2**: Local, fast, good quality
- **Xenova/all-mpnet-base-v2**: Better quality, larger model
- **Xenova/paraphrase-multilingual-MiniLM-L12-v2**: Multilingual support

### **Vector Database Optimizations:**
- **HNSW Index**: Faster approximate search
- **IVFFlat Index**: Better accuracy for small datasets
- **Product Quantization**: Memory optimization

### **Query Processing:**
- **NER (Named Entity Recognition)**: Extract entities
- **Query Intent Classification**: Understand user intent
- **Query Reformulation**: Improve search queries

### **Re-ranking Strategies:**
- **Cross-Encoder Models**: Better relevance scoring
- **Diversity Ranking**: Ensure varied results
- **Freshness Ranking**: Prioritize recent documents

This architecture provides a solid foundation for a production-ready RAG system with room for continuous improvement and optimization. 