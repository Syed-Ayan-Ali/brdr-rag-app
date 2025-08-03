import { 
  QueryProcessingStrategy, 
  QueryProcessingResult, 
  QueryAnalysis,
  EntityExtractor,
  IntentClassifier,
  QueryExpander,
  StrategySelector
} from '../interfaces/QueryProcessor';

export class AdvancedQueryProcessor implements QueryProcessingStrategy {
  constructor(
    private entityExtractor: EntityExtractor,
    private intentClassifier: IntentClassifier,
    private queryExpander: QueryExpander,
    private strategySelector: StrategySelector
  ) {}

  async process(query: string): Promise<QueryProcessingResult> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    try {
      // Step 1: Entity extraction
      toolsUsed.push('entity_extraction');
      const entities = await this.entityExtractor.extractEntities(query);

      // Step 2: Intent classification
      toolsUsed.push('intent_classification');
      const intent = await this.intentClassifier.classifyIntent(query);

      // Step 3: Strategy selection
      toolsUsed.push('strategy_selection');
      const searchStrategy = this.strategySelector.selectStrategy(intent, entities);

      // Step 4: Query expansion
      toolsUsed.push('query_expansion');
      const expansion = await this.queryExpander.expandQuery(query);

      // Step 5: Calculate confidence
      const confidence = this.calculateConfidence(query, intent, entities, expansion);

      // Step 6: Create analysis
      const analysis: QueryAnalysis = {
        intent,
        entities,
        searchStrategy,
        confidence,
        originalQuery: query,
        processedQuery: this.createProcessedQuery(query, expansion)
      };

      const processingTime = Date.now() - startTime;

      return {
        analysis,
        expansion,
        processingTime,
        toolsUsed
      };

    } catch (error) {
      console.error('Query processing error:', error);
      
      // Return fallback result
      return {
        analysis: {
          intent: 'general_inquiry',
          entities: [],
          searchStrategy: 'vector',
          confidence: 0.5,
          originalQuery: query,
          processedQuery: query
        },
        expansion: {
          original: query,
          expanded: [query],
          synonyms: {},
          reformulations: [],
          confidence: 0.5
        },
        processingTime: Date.now() - startTime,
        toolsUsed: ['fallback']
      };
    }
  }

  getName(): string {
    return 'AdvancedQueryProcessor';
  }

  private calculateConfidence(
    query: string, 
    intent: QueryAnalysis['intent'], 
    entities: string[], 
    expansion: any
  ): number {
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

    // Boost confidence based on expansion quality
    confidence += expansion.confidence * 0.2;

    return Math.min(confidence, 1.0);
  }

  private createProcessedQuery(query: string, expansion: any): string {
    // Use the most relevant expansion or the original query
    if (expansion.expanded.length > 1) {
      // Find the expansion with the most domain-specific terms
      const domainTerms = ['basel', 'capital', 'tier', 'regulation', 'requirement'];
      const bestExpansion = expansion.expanded.find((exp: string) => 
        domainTerms.some(term => exp.toLowerCase().includes(term))
      );
      
      return bestExpansion || query;
    }

    return query;
  }
}

// Factory for creating query processors with different configurations
export class QueryProcessorFactory {
  static async createBasicProcessor(): Promise<QueryProcessingStrategy> {
    const entityExtractor = new (await import('./EntityExtractor')).BasicEntityExtractor();
    const intentClassifier = new (await import('./IntentClassifier')).BasicIntentClassifier();
    const queryExpander = new (await import('./QueryExpander')).BasicQueryExpander();
    const strategySelector = new (await import('./StrategySelector')).BasicStrategySelector();

    return new AdvancedQueryProcessor(
      entityExtractor,
      intentClassifier,
      queryExpander,
      strategySelector
    );
  }

  static async createAdvancedProcessor(): Promise<QueryProcessingStrategy> {
    const entityExtractor = new (await import('./EntityExtractor')).AdvancedEntityExtractor();
    const intentClassifier = new (await import('./IntentClassifier')).AdvancedIntentClassifier();
    const queryExpander = new (await import('./QueryExpander')).AdvancedQueryExpander();
    const strategySelector = new (await import('./StrategySelector')).AdvancedStrategySelector();

    return new AdvancedQueryProcessor(
      entityExtractor,
      intentClassifier,
      queryExpander,
      strategySelector
    );
  }
} 