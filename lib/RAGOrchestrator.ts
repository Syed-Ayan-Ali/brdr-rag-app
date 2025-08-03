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

    try {
      // Log query start
      this.auditTrail.logQueryStart(request.query, this.currentSessionId);

      // Check cache first if enabled
      if (request.useCache !== false) {
        const cachedResults = await this.cacheManager.getCachedResults(request.query);
        if (cachedResults) {
          cacheHit = true;
          return this.createResponseFromCache(cachedResults, startTime);
        }
      }

      // Step 1: Process query using advanced processor
      const processingStartTime = Date.now();
      const processingResult = await this.queryProcessor.process(request.query);
      const processingTime = Date.now() - processingStartTime;
      
      // Log query processing
      this.auditTrail.logToolCall('query_processing', { query: request.query }, processingResult, processingTime, this.currentSessionId);

      // Step 2: Select retrieval strategy
      const strategyName = processingResult.analysis.searchStrategy || request.searchType || 'vector';
      const retrievalStrategy = this.retrievalStrategyFactory.createStrategy(strategyName);

      // Step 3: Perform retrieval
      const retrievalStartTime = Date.now();
      const retrievalResult = await retrievalStrategy.search(request.query, request.limit || 5);
      const retrievalTime = Date.now() - retrievalStartTime;
      
      // Log document retrieval
      this.auditTrail.logDocumentRetrieval(retrievalResult.documents, strategyName, cacheHit, this.currentSessionId);
      this.auditTrail.logToolCall('document_retrieval', { query: request.query, strategy: strategyName }, retrievalResult, retrievalTime, this.currentSessionId);

      // Step 4: Generate document links and metrics
      const documentLinks = formatDocumentLinks(retrievalResult.metrics.documentsRetrieved);
      const metricsText = formatMetrics(retrievalResult.metrics);
      const documentLinksText = this.formatDocumentLinksText(documentLinks);

      // Step 5: Cache results if enabled
      if (request.useCache !== false) {
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
      }

      // Step 6: Track performance if enabled
      if (request.trackPerformance !== false) {
        this.performanceMonitor.recordQuery(
          request.query,
          Date.now() - startTime,
          retrievalResult.metrics.retrievalAccuracy,
          this.calculateContextUtilization(retrievalResult.context),
          cacheHit,
          strategyName
        );
      }

      // Step 7: Log LLM response (simulated confidence based on processing quality)
      const totalProcessingTime = Date.now() - startTime;
      const confidence = this.calculateResponseConfidence(processingResult, retrievalResult);
      this.auditTrail.logLLMResponse(retrievalResult.context, confidence, totalProcessingTime, this.currentSessionId);

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
        cacheHit: false
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