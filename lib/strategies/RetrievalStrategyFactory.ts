import { RetrievalStrategyFactory, RetrievalStrategy } from '../interfaces/RetrievalStrategy';
import { VectorSearchStrategy } from './VectorSearchStrategy';
import { KeywordSearchStrategy } from './KeywordSearchStrategy';
import { HybridSearchStrategy } from './HybridSearchStrategy';
import { KnowledgeGraphSearchStrategy } from './KnowledgeGraphSearchStrategy';

export class AdvancedRetrievalStrategyFactory implements RetrievalStrategyFactory {
  private strategies: Map<string, RetrievalStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    const vectorStrategy = new VectorSearchStrategy();
    const keywordStrategy = new KeywordSearchStrategy();
    const hybridStrategy = new HybridSearchStrategy(vectorStrategy, keywordStrategy);
    const knowledgeGraphStrategy = new KnowledgeGraphSearchStrategy();

    this.strategies.set('vector', vectorStrategy);
    this.strategies.set('keyword', keywordStrategy);
    this.strategies.set('hybrid', hybridStrategy);
    this.strategies.set('knowledge_graph', knowledgeGraphStrategy);
  }

  createStrategy(strategyName: string): RetrievalStrategy {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found. Available strategies: ${this.getAvailableStrategies().join(', ')}`);
    }
    return strategy;
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  // Method to register custom strategies
  registerStrategy(name: string, strategy: RetrievalStrategy): void {
    this.strategies.set(name, strategy);
  }

  // Method to get strategy description
  getStrategyDescription(strategyName: string): string {
    const strategy = this.strategies.get(strategyName);
    return strategy ? strategy.getDescription() : 'Strategy not found';
  }

  // Method to get all strategies with descriptions
  getAllStrategiesWithDescriptions(): Record<string, string> {
    const descriptions: Record<string, string> = {};
    for (const [name, strategy] of this.strategies) {
      descriptions[name] = strategy.getDescription();
    }
    return descriptions;
  }
} 