import { IntentClassifier, QueryAnalysis } from '../interfaces/QueryProcessor';

export class BasicIntentClassifier implements IntentClassifier {
  async classifyIntent(query: string): Promise<QueryAnalysis['intent']> {
    const lowerQuery = query.toLowerCase();
    
    // Regulatory inquiry patterns
    const regulatoryPatterns = [
      'regulation', 'rule', 'law', 'policy', 'guideline', 'standard',
      'basel', 'capital requirement', 'compliance'
    ];
    
    if (regulatoryPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'regulatory_inquiry';
    }
    
    // Risk assessment patterns
    const riskPatterns = [
      'risk', 'safety', 'hazard', 'danger', 'threat', 'vulnerability',
      'assessment', 'evaluation', 'analysis'
    ];
    
    if (riskPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'risk_assessment';
    }
    
    // Procedural inquiry patterns
    const proceduralPatterns = [
      'procedure', 'process', 'step', 'method', 'protocol', 'workflow',
      'how to', 'what is the process', 'steps to'
    ];
    
    if (proceduralPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return 'procedural_inquiry';
    }
    
    return 'general_inquiry';
  }
}

export class AdvancedIntentClassifier implements IntentClassifier {
  async classifyIntent(query: string): Promise<QueryAnalysis['intent']> {
    const lowerQuery = query.toLowerCase();
    
    // Use basic classifier as foundation
    const basicClassifier = new BasicIntentClassifier();
    const basicIntent = await basicClassifier.classifyIntent(query);
    
    // If basic classifier found a specific intent, use it
    if (basicIntent !== 'general_inquiry') {
      return basicIntent;
    }
    
    // Advanced classification logic
    // Check for compound patterns
    const compoundPatterns = {
      regulatory_inquiry: [
        'tier 1 capital requirement',
        'basel iii compliance',
        'capital adequacy ratio',
        'regulatory framework'
      ],
      risk_assessment: [
        'risk assessment',
        'safety evaluation',
        'threat analysis',
        'vulnerability assessment'
      ],
      procedural_inquiry: [
        'how to calculate',
        'process for determining',
        'steps to implement',
        'methodology for'
      ]
    };
    
    for (const [intent, patterns] of Object.entries(compoundPatterns)) {
      if (patterns.some(pattern => lowerQuery.includes(pattern))) {
        return intent as QueryAnalysis['intent'];
      }
    }
    
    // Check for question words that might indicate intent
    const questionWords = {
      what: 'general_inquiry',
      how: 'procedural_inquiry',
      why: 'general_inquiry',
      when: 'general_inquiry',
      where: 'general_inquiry'
    };
    
    const firstWord = lowerQuery.split(' ')[0];
    if (firstWord in questionWords) {
      return questionWords[firstWord as keyof typeof questionWords] as QueryAnalysis['intent'];
    }
    
    return 'general_inquiry';
  }
} 