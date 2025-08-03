import { QueryExpander, ExpandedQuery } from '../interfaces/QueryProcessor';

export class BasicQueryExpander implements QueryExpander {
  async expandQuery(query: string): Promise<ExpandedQuery> {
    const synonyms = {
      'regulation': ['rule', 'law', 'policy', 'guideline', 'standard'],
      'safety': ['security', 'protection', 'prevention', 'safeguard'],
      'risk': ['hazard', 'danger', 'threat', 'peril'],
      'assessment': ['evaluation', 'analysis', 'review', 'examination'],
      'procedure': ['process', 'method', 'protocol', 'workflow'],
      'document': ['report', 'paper', 'file', 'record'],
      'requirement': ['mandate', 'necessity', 'obligation', 'prerequisite'],
      'capital': ['equity', 'funds', 'assets', 'resources'],
      'tier': ['level', 'category', 'class', 'rank'],
      'basel': ['basel iii', 'basel 3', 'regulatory framework'],
      'compliance': ['adherence', 'conformity', 'observance'],
      'ratio': ['proportion', 'percentage', 'rate', 'measure']
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
      `Search for ${query}`,
      `Explain ${query}`,
      `Details about ${query}`
    );
    
    // Calculate confidence based on expansion quality
    const confidence = Math.min(0.5 + (expanded.length - 1) * 0.1, 1.0);
    
    return {
      original: query,
      expanded: [...new Set(expanded)],
      synonyms,
      reformulations,
      confidence
    };
  }
}

export class AdvancedQueryExpander implements QueryExpander {
  async expandQuery(query: string): Promise<ExpandedQuery> {
    // Use basic expander as foundation
    const basicExpander = new BasicQueryExpander();
    const basicExpansion = await basicExpander.expandQuery(query);
    
    const expanded: string[] = [...basicExpansion.expanded];
    const reformulations: string[] = [...basicExpansion.reformulations];
    
    // Advanced expansion techniques
    
    // 1. Add domain-specific expansions
    const domainExpansions = {
      'capital requirement': [
        'tier 1 capital requirement',
        'common equity tier 1',
        'capital adequacy ratio',
        'minimum capital requirement'
      ],
      'basel iii': [
        'basel 3 requirements',
        'basel iii framework',
        'basel iii compliance',
        'basel iii standards'
      ],
      'risk assessment': [
        'risk evaluation process',
        'risk analysis methodology',
        'risk assessment framework',
        'risk management assessment'
      ]
    };
    
    for (const [term, expansions] of Object.entries(domainExpansions)) {
      if (query.toLowerCase().includes(term)) {
        expanded.push(...expansions);
      }
    }
    
    // 2. Add contextual reformulations
    const contextualReformulations = [
      `What are the current ${query}?`,
      `How do ${query} work?`,
      `What is the process for ${query}?`,
      `Can you explain ${query} in detail?`,
      `What are the requirements for ${query}?`,
      `How to implement ${query}?`
    ];
    
    reformulations.push(...contextualReformulations);
    
    // 3. Add question variations
    const questionVariations = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'which'
    ];
    
    questionVariations.forEach(qWord => {
      reformulations.push(`${qWord} ${query}?`);
    });
    
    // Calculate enhanced confidence
    const baseConfidence = basicExpansion.confidence;
    const expansionBonus = Math.min((expanded.length - basicExpansion.expanded.length) * 0.05, 0.3);
    const confidence = Math.min(baseConfidence + expansionBonus, 1.0);
    
    return {
      original: query,
      expanded: [...new Set(expanded)],
      synonyms: basicExpansion.synonyms,
      reformulations: [...new Set(reformulations)],
      confidence
    };
  }
} 