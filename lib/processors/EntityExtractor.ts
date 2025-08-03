import { EntityExtractor } from '../interfaces/QueryProcessor';

export class BasicEntityExtractor implements EntityExtractor {
  async extractEntities(query: string): Promise<string[]> {
    const entities: string[] = [];
    
    // Extract dates
    const datePattern = /\b\d{4}-\d{2}-\d{2}\b/g;
    const dates = query.match(datePattern);
    if (dates) entities.push(...dates);
    
    // Extract document types
    const docTypes = ['regulation', 'guideline', 'policy', 'procedure', 'requirement', 'standard'];
    docTypes.forEach(type => {
      if (query.toLowerCase().includes(type)) {
        entities.push(type);
      }
    });
    
    // Extract financial terms
    const financialTerms = ['capital', 'tier', 'basel', 'risk', 'safety', 'compliance'];
    financialTerms.forEach(term => {
      if (query.toLowerCase().includes(term)) {
        entities.push(term);
      }
    });
    
    // Extract locations
    const locationPattern = /\b(Hong Kong|HK|China|Asia)\b/gi;
    const locations = query.match(locationPattern);
    if (locations) entities.push(...locations.map(loc => loc.toLowerCase()));
    
    // Extract numbers
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    const numbers = query.match(numberPattern);
    if (numbers) entities.push(...numbers);
    
    return [...new Set(entities)]; // Remove duplicates
  }
}

export class AdvancedEntityExtractor implements EntityExtractor {
  async extractEntities(query: string): Promise<string[]> {
    const entities: string[] = [];
    
    // Use the basic extractor as foundation
    const basicExtractor = new BasicEntityExtractor();
    const basicEntities = await basicExtractor.extractEntities(query);
    entities.push(...basicEntities);
    
    // Additional advanced extraction logic
    // Extract compound terms
    const compoundTerms = [
      'tier 1 capital',
      'common equity tier 1',
      'risk-weighted assets',
      'capital adequacy ratio',
      'liquidity coverage ratio'
    ];
    
    compoundTerms.forEach(term => {
      if (query.toLowerCase().includes(term)) {
        entities.push(term);
      }
    });
    
    // Extract regulatory frameworks
    const regulatoryFrameworks = ['basel iii', 'basel 3', 'basel ii', 'basel 2'];
    regulatoryFrameworks.forEach(framework => {
      if (query.toLowerCase().includes(framework)) {
        entities.push(framework);
      }
    });
    
    return [...new Set(entities)];
  }
} 