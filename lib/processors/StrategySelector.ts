import { StrategySelector, QueryAnalysis } from '../interfaces/QueryProcessor';

export class BasicStrategySelector implements StrategySelector {
  selectStrategy(intent: QueryAnalysis['intent'], entities: string[]): QueryAnalysis['searchStrategy'] {
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
}

export class AdvancedStrategySelector implements StrategySelector {
  selectStrategy(intent: QueryAnalysis['intent'], entities: string[]): QueryAnalysis['searchStrategy'] {
    // Use basic selector as foundation
    const basicSelector = new BasicStrategySelector();
    const basicStrategy = basicSelector.selectStrategy(intent, entities);
    
    // Advanced strategy selection logic
    
    // 1. Check for specific entities that suggest different strategies
    const hasSpecificTerms = entities.some(entity => 
      ['basel iii', 'tier 1', 'capital requirement', 'ratio'].includes(entity.toLowerCase())
    );
    
    if (hasSpecificTerms) {
      return 'hybrid'; // Specific terms benefit from multiple search approaches
    }
    
    // 2. Check for procedural terms that suggest keyword search
    const proceduralTerms = ['procedure', 'process', 'step', 'method'];
    const hasProceduralTerms = entities.some(entity => 
      proceduralTerms.includes(entity.toLowerCase())
    );
    
    if (hasProceduralTerms) {
      return 'keyword';
    }
    
    // 3. Check for complex queries that benefit from semantic search
    const complexQueryIndicators = ['how', 'why', 'explain', 'describe'];
    const isComplexQuery = complexQueryIndicators.some(indicator => 
      intent === 'general_inquiry' && entities.length > 2
    );
    
    if (isComplexQuery) {
      return 'semantic';
    }
    
    // 4. Check for regulatory terms that suggest hybrid approach
    const regulatoryTerms = ['regulation', 'compliance', 'requirement', 'standard'];
    const hasRegulatoryTerms = entities.some(entity => 
      regulatoryTerms.includes(entity.toLowerCase())
    );
    
    if (hasRegulatoryTerms) {
      return 'hybrid';
    }
    
    return basicStrategy;
  }
} 