import { QueryProcessingStrategy, QueryProcessingResult } from './interfaces/QueryProcessor';
import { RetrievalStrategy, RetrievalResult } from './interfaces/RetrievalStrategy';
import { QueryProcessorFactory } from './processors/QueryProcessor';
import { AdvancedRetrievalStrategyFactory } from './strategies/RetrievalStrategyFactory';
import { AdvancedPerformanceMonitor } from './utils/PerformanceMonitor';
import { AdvancedCacheManager } from './utils/CacheManager';
import { AuditTrailManager } from './utils/AuditTrail';
import { formatMetrics, formatDocumentLinks } from './metrics';

export interface RAGRequest {
  query: string;
  searchType?: 'vector' | 'keyword' | 'hybrid';
  limit?: number;
  useCache?: boolean;
  trackPerformance?: boolean;
}

export interface RAGResponse {
  documents: any[];
  context: string;
  analysis: any;
  searchStrategy: string;
  metrics: any;
  documentLinks: any[];
  metricsText: string;
  documentLinksText: string;
  processingTime: number;
  toolsUsed: string[];
  cacheHit: boolean;
  performanceMetrics?: any;
  auditSessionId?: string;
}

export class RAGOrchestrator {
  private auditTrail: AuditTrailManager;
  private currentSessionId: string;

  constructor(
    private queryProcessor: QueryProcessingStrategy,
    private retrievalStrategyFactory: AdvancedRetrievalStrategyFactory,
    private performanceMonitor: AdvancedPerformanceMonitor,
    private cacheManager: AdvancedCacheManager
  ) {
    this.auditTrail = new AuditTrailManager();
    this.currentSessionId = this.auditTrail.startSession();
  }

  async processQuery(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now();
    let cacheHit = false;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Log API request start
      this.auditTrail.logApiRequestStart(requestId, { query: request.query, searchType: request.searchType, limit: request.limit }, this.currentSessionId);
      
      // Log query start
      this.auditTrail.logQueryStart(request.query, this.currentSessionId);

      // Check cache first if enabled
      if (request.useCache !== false) {
        this.auditTrail.logToolCallStart('cache_check', { query: request.query }, this.currentSessionId);
        const cachedResults = await this.cacheManager.getCachedResults(request.query);
        this.auditTrail.logToolCallEnd('cache_check', { cacheHit: !!cachedResults }, this.currentSessionId);
        
        if (cachedResults) {
          cacheHit = true;
          this.auditTrail.logApiRequestEnd(requestId, { cacheHit: true, documents: cachedResults.length }, this.currentSessionId);
          return this.createResponseFromCache(cachedResults, startTime);
        }
      }

      // Step 1: Process query using advanced processor
      this.auditTrail.logToolCallStart('query_processing', { query: request.query }, this.currentSessionId);
      const processingResult = await this.queryProcessor.process(request.query);
      this.auditTrail.logToolCallEnd('query_processing', processingResult, this.currentSessionId);
      
      // Log query processing end
      this.auditTrail.logQueryProcessingEnd(request.query, processingResult, this.currentSessionId);

      // Step 2: Select retrieval strategy
      const strategyName = processingResult.analysis.searchStrategy || request.searchType || 'vector';
      this.auditTrail.logToolCallStart('strategy_selection', { strategy: strategyName }, this.currentSessionId);
      const retrievalStrategy = this.retrievalStrategyFactory.createStrategy(strategyName);
      this.auditTrail.logToolCallEnd('strategy_selection', { selectedStrategy: strategyName }, this.currentSessionId);

      // Step 3: Perform retrieval
      this.auditTrail.logToolCallStart('document_retrieval', { query: request.query, strategy: strategyName }, this.currentSessionId);
      const retrievalResult = await retrievalStrategy.search(request.query, request.limit || 5);
      this.auditTrail.logToolCallEnd('document_retrieval', { documents: retrievalResult.documents.length, strategy: strategyName }, this.currentSessionId);
      
      // Log document retrieval
      this.auditTrail.logDocumentRetrieval(retrievalResult.documents, strategyName, cacheHit, this.currentSessionId);

      // Step 4: Generate document links and metrics
      this.auditTrail.logToolCallStart('metrics_generation', { documents: retrievalResult.documents.length }, this.currentSessionId);
      const documentLinks = formatDocumentLinks(retrievalResult.metrics.documentsRetrieved);
      const metricsText = formatMetrics(retrievalResult.metrics);
      const documentLinksText = this.formatDocumentLinksText(documentLinks);
      this.auditTrail.logToolCallEnd('metrics_generation', { documentLinks: documentLinks.length, metricsText }, this.currentSessionId);

      // Step 5: Cache results if enabled
      if (request.useCache !== false) {
        this.auditTrail.logToolCallStart('cache_storage', { query: request.query }, this.currentSessionId);
        await this.cacheManager.setCachedResults(request.query, [
          {
            documents: retrievalResult.documents,
            context: retrievalResult.context,
            analysis: processingResult.analysis,
            searchStrategy: strategyName,
            metrics: retrievalResult.metrics,
            documentLinks,
            metricsText,
            documentLinksText,
            processingTime: Date.now() - startTime,
            toolsUsed: [...processingResult.toolsUsed, ...retrievalResult.metrics.toolsCalled]
          }
        ]);
        this.auditTrail.logToolCallEnd('cache_storage', { stored: true }, this.currentSessionId);
      }

      // Step 6: Track performance if enabled
      if (request.trackPerformance !== false) {
        this.auditTrail.logToolCallStart('performance_tracking', { query: request.query }, this.currentSessionId);
        this.performanceMonitor.recordQuery(
          request.query,
          Date.now() - startTime,
          retrievalResult.metrics.retrievalAccuracy,
          this.calculateContextUtilization(retrievalResult.context),
          cacheHit,
          strategyName
        );
        this.auditTrail.logToolCallEnd('performance_tracking', { tracked: true }, this.currentSessionId);
      }

      // Step 7: Log LLM response (simulated confidence based on processing quality)
      const totalProcessingTime = Date.now() - startTime;
      const confidence = this.calculateResponseConfidence(processingResult, retrievalResult);
      this.auditTrail.logLLMResponse(retrievalResult.context, confidence, totalProcessingTime, this.currentSessionId);

      // Log API request end
      this.auditTrail.logApiRequestEnd(requestId, { 
        documents: retrievalResult.documents.length,
        strategy: strategyName,
        processingTime: totalProcessingTime,
        confidence
      }, this.currentSessionId);

      // Step 8: Return response
      return {
        documents: retrievalResult.documents,
        context: retrievalResult.context,
        analysis: processingResult.analysis,
        searchStrategy: strategyName,
        metrics: retrievalResult.metrics,
        documentLinks,
        metricsText,
        documentLinksText,
        processingTime: totalProcessingTime,
        toolsUsed: [...processingResult.toolsUsed, ...retrievalResult.metrics.toolsCalled],
        cacheHit,
        performanceMetrics: request.trackPerformance !== false ? 
          this.performanceMonitor.getPerformanceSummary() : undefined,
        auditSessionId: this.currentSessionId
      };

    } catch (error) {
      console.error('RAG Orchestrator error:', error);
      
      // Log error
      this.auditTrail.logError(error instanceof Error ? error : new Error('Unknown error'), 'rag_orchestrator', this.currentSessionId);
      
      // Log API request failed
      this.auditTrail.logApiRequestFailed(requestId, error instanceof Error ? error : new Error('Unknown error'), this.currentSessionId);
      
      // Return error response
      return {
        documents: [],
        context: '',
        analysis: { intent: 'general_inquiry', entities: [], searchStrategy: 'vector', confidence: 0 },
        searchStrategy: request.searchType || 'vector',
        metrics: { queryTime: Date.now() - startTime, toolsCalled: ['error'], tokenCount: 0, documentsRetrieved: [], searchStrategy: 'error', retrievalAccuracy: 0 },
        documentLinks: [],
        metricsText: 'Error occurred during processing',
        documentLinksText: '',
        processingTime: Date.now() - startTime,
        toolsUsed: ['error'],
        cacheHit: false,
        auditSessionId: this.currentSessionId
      };
    }
  }

  // Get available strategies
  getAvailableStrategies(): string[] {
    return this.retrievalStrategyFactory.getAvailableStrategies();
  }

  // Get strategy descriptions
  getStrategyDescriptions(): Record<string, string> {
    return this.retrievalStrategyFactory.getAllStrategiesWithDescriptions();
  }

  // Get performance summary
  getPerformanceSummary(): any {
    return this.performanceMonitor.getPerformanceSummary();
  }

  // Get cache statistics
  getCacheStats(): any {
    return this.cacheManager.getCacheStats();
  }

  // Clear cache
  clearCache(): void {
    this.cacheManager.clear();
  }

  // Export performance metrics
  exportPerformanceMetrics(): string {
    return this.performanceMonitor.exportMetrics();
  }

  // Export cache data
  exportCacheData(): string {
    return this.cacheManager.exportCache();
  }

  private createResponseFromCache(cachedData: any, startTime: number): RAGResponse {
    return {
      documents: cachedData.documents || [],
      context: cachedData.context || '',
      analysis: cachedData.analysis || { intent: 'general_inquiry', entities: [], searchStrategy: 'vector', confidence: 0 },
      searchStrategy: cachedData.searchStrategy || 'vector',
      metrics: cachedData.metrics || { queryTime: 0, toolsCalled: ['cache'], tokenCount: 0, documentsRetrieved: [], searchStrategy: 'cache', retrievalAccuracy: 0 },
      documentLinks: cachedData.documentLinks || [],
      metricsText: cachedData.metricsText || 'Retrieved from cache',
      documentLinksText: cachedData.documentLinksText || '',
      processingTime: Date.now() - startTime,
      toolsUsed: cachedData.toolsUsed || ['cache'],
      cacheHit: true
    };
  }

  private formatDocumentLinksText(documentLinks: any[]): string {
    if (documentLinks.length === 0) return '';

    return `\n\n📄 **Source Documents:**\n${documentLinks.map(link => 
      `• [${link.docId}](${link.url})`
    ).join('\n')}`;
  }

  private calculateContextUtilization(context: string): number {
    if (!context) return 0;
    
    // Calculate utilization based on context length and content quality
    const length = context.length;
    const maxLength = 4000; // Maximum context length
    
    return Math.min(length / maxLength, 1.0);
  }

  private calculateResponseConfidence(processingResult: QueryProcessingResult, retrievalResult: RetrievalResult): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on processing quality
    confidence += processingResult.analysis.confidence * 0.2;

    // Boost confidence based on document retrieval quality
    if (retrievalResult.documents.length > 0) {
      confidence += 0.2;
    }

    // Boost confidence based on context quality
    if (retrievalResult.context && retrievalResult.context.length > 100) {
      confidence += 0.1;
    }

    // Reduce confidence if there were errors
    if (processingResult.toolsUsed.includes('fallback')) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

// Factory for creating RAG Orchestrator with default dependencies
export class RAGOrchestratorFactory {
  static async createDefaultOrchestrator(): Promise<RAGOrchestrator> {
    const queryProcessor = await QueryProcessorFactory.createAdvancedProcessor();
    const retrievalStrategyFactory = new AdvancedRetrievalStrategyFactory();
    const performanceMonitor = new AdvancedPerformanceMonitor();
    const cacheManager = new AdvancedCacheManager();

    return new RAGOrchestrator(
      queryProcessor,
      retrievalStrategyFactory,
      performanceMonitor,
      cacheManager
    );
  }

  static async createBasicOrchestrator(): Promise<RAGOrchestrator> {
    const queryProcessor = await QueryProcessorFactory.createBasicProcessor();
    const retrievalStrategyFactory = new AdvancedRetrievalStrategyFactory();
    const performanceMonitor = new AdvancedPerformanceMonitor();
    const cacheManager = new AdvancedCacheManager();

    return new RAGOrchestrator(
      queryProcessor,
      retrievalStrategyFactory,
      performanceMonitor,
      cacheManager
    );
  }
} 