// Core interfaces for query processing with dependency injection

export interface QueryAnalysis {
  intent: 'regulatory_inquiry' | 'risk_assessment' | 'procedural_inquiry' | 'general_inquiry';
  entities: string[];
  searchStrategy: 'vector' | 'keyword' | 'hybrid' | 'semantic';
  confidence: number;
  originalQuery: string;
  processedQuery: string;
}

export interface ExpandedQuery {
  original: string;
  expanded: string[];
  synonyms: Record<string, string[]>;
  reformulations: string[];
  confidence: number;
}

export interface QueryProcessingResult {
  analysis: QueryAnalysis;
  expansion: ExpandedQuery;
  processingTime: number;
  toolsUsed: string[];
}

// Strategy Pattern for different query processing approaches
export interface QueryProcessingStrategy {
  process(query: string): Promise<QueryProcessingResult>;
  getName(): string;
}

// State Pattern for query processing states
export interface QueryProcessingState {
  process(query: string): Promise<QueryProcessingResult>;
  getStateName(): string;
}

// Dependency Injection Container
export interface QueryProcessorContainer {
  getStrategy(strategyName: string): QueryProcessingStrategy;
  getState(stateName: string): QueryProcessingState;
  registerStrategy(strategy: QueryProcessingStrategy): void;
  registerState(state: QueryProcessingState): void;
}

// Entity Extraction Interface
export interface EntityExtractor {
  extractEntities(query: string): Promise<string[]>;
}

// Intent Classification Interface
export interface IntentClassifier {
  classifyIntent(query: string): Promise<QueryAnalysis['intent']>;
}

// Query Expansion Interface
export interface QueryExpander {
  expandQuery(query: string): Promise<ExpandedQuery>;
}

// Strategy Selection Interface
export interface StrategySelector {
  selectStrategy(intent: QueryAnalysis['intent'], entities: string[]): QueryAnalysis['searchStrategy'];
} 