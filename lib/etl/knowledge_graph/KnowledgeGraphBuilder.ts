import { KnowledgeGraphNode, KnowledgeGraphRelationship, KeywordExtractionResult } from '../interfaces/ChunkingStrategy';
import { DatabaseManager } from '../database/DatabaseManager';

export interface KnowledgeGraphOptions {
  enableConceptMapping?: boolean;
  enableRelationshipScoring?: boolean;
  enableCoOccurrenceAnalysis?: boolean;
  minRelationshipWeight?: number;
  maxConceptsPerNode?: number;
}

export class KnowledgeGraphBuilder {
  private databaseManager: DatabaseManager;

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  async buildKnowledgeGraph(
    chunks: any[],
    options: KnowledgeGraphOptions = {}
  ): Promise<{
    nodes: KnowledgeGraphNode[];
    relationships: KnowledgeGraphRelationship[];
    keywords: KeywordExtractionResult;
  }> {
    const {
      enableConceptMapping = true,
      enableRelationshipScoring = true,
      enableCoOccurrenceAnalysis = true,
      minRelationshipWeight = 0.3,
      maxConceptsPerNode = 5
    } = options;

    // Step 1: Extract keywords and concepts
    const keywords = await this.extractKeywordsFromChunks(chunks);
    
    // Step 2: Create concept mappings
    const conceptMap = enableConceptMapping ? 
      await this.createConceptMappings(keywords.keywords) : 
      {};

    // Step 3: Build nodes
    const nodes = await this.buildNodes(chunks, keywords, conceptMap, maxConceptsPerNode);

    // Step 4: Build relationships
    const relationships = await this.buildRelationships(
      nodes, 
      keywords, 
      enableRelationshipScoring, 
      enableCoOccurrenceAnalysis,
      minRelationshipWeight
    );

    // Step 5: Store in database
    await this.storeKnowledgeGraph(nodes, relationships, keywords);

    return {
      nodes,
      relationships,
      keywords
    };
  }

  private async extractKeywordsFromChunks(chunks: any[]): Promise<KeywordExtractionResult> {
    const allKeywords = new Set<string>();
    const keywordFrequency: { [key: string]: number } = {};
    const keywordWeights: { [key: string]: number } = {};

    // Collect all keywords from chunks
    for (const chunk of chunks) {
      if (chunk.keywords) {
        for (const keyword of chunk.keywords) {
          allKeywords.add(keyword);
          keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
        }
      }
    }

    // Calculate weights based on frequency and importance
    const maxFreq = Math.max(...Object.values(keywordFrequency));
    for (const [keyword, freq] of Object.entries(keywordFrequency)) {
      keywordWeights[keyword] = freq / maxFreq;
    }

    // Extract concepts (higher-level keywords)
    const concepts = await this.extractConcepts(Array.from(allKeywords));

    return {
      keywords: Array.from(allKeywords),
      concepts,
      weights: keywordWeights,
      frequency: keywordFrequency
    };
  }

  private async extractConcepts(keywords: string[]): Promise<string[]> {
    const concepts: string[] = [];
    
    // Group keywords into concepts based on similarity
    const conceptGroups = [
      ['regulation', 'regulatory', 'compliance', 'legal', 'law', 'policy'],
      ['financial', 'finance', 'economic', 'monetary', 'banking', 'investment'],
      ['report', 'reporting', 'documentation', 'records', 'data', 'information'],
      ['analysis', 'analytical', 'assessment', 'evaluation', 'review', 'study'],
      ['management', 'administrative', 'operational', 'procedural', 'organizational']
    ];

    for (const group of conceptGroups) {
      const matchingKeywords = keywords.filter(keyword => 
        group.some(concept => keyword.toLowerCase().includes(concept))
      );
      
      if (matchingKeywords.length > 0) {
        concepts.push(group[0]); // Use first concept as representative
      }
    }

    return concepts;
  }

  private async createConceptMappings(keywords: string[]): Promise<{ [key: string]: string }> {
    const conceptMap: { [key: string]: string } = {};

    // Define concept mappings
    const conceptMappings = {
      'regulation': ['regulation', 'regulatory', 'compliance', 'legal', 'law'],
      'finance': ['financial', 'finance', 'economic', 'monetary', 'banking'],
      'reporting': ['report', 'reporting', 'documentation', 'records'],
      'analysis': ['analysis', 'analytical', 'assessment', 'evaluation'],
      'management': ['management', 'administrative', 'operational']
    };

    for (const [concept, relatedKeywords] of Object.entries(conceptMappings)) {
      for (const keyword of relatedKeywords) {
        conceptMap[keyword] = concept;
      }
    }

    return conceptMap;
  }

  private async buildNodes(
    chunks: any[],
    keywords: KeywordExtractionResult,
    conceptMap: { [key: string]: string },
    maxConceptsPerNode: number
  ): Promise<KnowledgeGraphNode[]> {
    const nodes: KnowledgeGraphNode[] = [];

    // Create chunk nodes
    for (const chunk of chunks) {
      const chunkNode: KnowledgeGraphNode = {
        id: chunk.id,
        type: 'chunk',
        content: chunk.content,
        keywords: chunk.keywords || [],
        relationships: [],
        metadata: {
          chunkType: chunk.chunkType,
          ...chunk.metadata
        }
      };
      nodes.push(chunkNode);
    }

    // Create keyword nodes
    for (const keyword of keywords.keywords) {
      const keywordNode: KnowledgeGraphNode = {
        id: `keyword_${keyword}`,
        type: 'keyword',
        keywords: [keyword],
        relationships: [],
        metadata: {
          weight: keywords.weights[keyword],
          frequency: keywords.frequency[keyword],
          concept: conceptMap[keyword] || keyword
        }
      };
      nodes.push(keywordNode);
    }

    // Create concept nodes
    for (const concept of keywords.concepts) {
      const conceptNode: KnowledgeGraphNode = {
        id: `concept_${concept}`,
        type: 'concept',
        keywords: [concept],
        relationships: [],
        metadata: {
          conceptType: 'high_level',
          relatedKeywords: keywords.keywords.filter(k => conceptMap[k] === concept)
        }
      };
      nodes.push(conceptNode);
    }

    return nodes;
  }

  private async buildRelationships(
    nodes: KnowledgeGraphNode[],
    keywords: KeywordExtractionResult,
    enableRelationshipScoring: boolean,
    enableCoOccurrenceAnalysis: boolean,
    minRelationshipWeight: number
  ): Promise<KnowledgeGraphRelationship[]> {
    const relationships: KnowledgeGraphRelationship[] = [];

    // Build chunk-to-chunk relationships only (skip keyword/concept relationships for now)
    const chunkNodes = nodes.filter(n => n.type === 'chunk');
    for (let i = 0; i < chunkNodes.length; i++) {
      for (let j = i + 1; j < chunkNodes.length; j++) {
        const sourceChunk = chunkNodes[i];
        const targetChunk = chunkNodes[j];
        
        // Only create relationships if both chunks have valid UUIDs
        if (this.isValidUUID(sourceChunk.id) && this.isValidUUID(targetChunk.id)) {
          const weight = this.calculateChunkRelationshipWeight(sourceChunk, targetChunk, keywords);
          
          if (weight >= minRelationshipWeight) {
            relationships.push({
              sourceId: sourceChunk.id,
              targetId: targetChunk.id,
              type: 'semantic_similarity',
              weight,
              metadata: {
                relationshipType: 'chunk_to_chunk',
                keywordOverlap: this.calculateKeywordOverlap(sourceChunk.keywords, targetChunk.keywords)
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private calculateChunkRelationshipWeight(
    chunk1: KnowledgeGraphNode,
    chunk2: KnowledgeGraphNode,
    keywords: KeywordExtractionResult
  ): number {
    // Calculate semantic similarity based on keyword overlap
    const overlap = this.calculateKeywordOverlap(chunk1.keywords, chunk2.keywords);
    
    // Calculate content similarity (simple Jaccard similarity)
    const content1 = chunk1.content?.toLowerCase() || '';
    const content2 = chunk2.content?.toLowerCase() || '';
    
    const words1 = new Set(content1.split(/\s+/));
    const words2 = new Set(content2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const contentSimilarity = intersection.size / union.size;
    
    // Combine keyword overlap and content similarity
    return (overlap + contentSimilarity) / 2;
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async storeKnowledgeGraph(
    nodes: KnowledgeGraphNode[],
    relationships: KnowledgeGraphRelationship[],
    keywords: KeywordExtractionResult
  ): Promise<void> {
    // Store keywords
    for (const keyword of keywords.keywords) {
      await this.databaseManager.storeKeyword({
        keyword,
        weight: keywords.weights[keyword],
        frequency: keywords.frequency[keyword]
      });
    }

    // Store relationships
    for (const relationship of relationships) {
      await this.databaseManager.storeRelationship(relationship);
    }

    // Store concept mappings
    for (const concept of keywords.concepts) {
      await this.databaseManager.storeConcept(concept, keywords.keywords);
    }
  }

  async queryKnowledgeGraph(
    query: string,
    options: {
      maxResults?: number;
      minWeight?: number;
      includeConcepts?: boolean;
    } = {}
  ): Promise<{
    nodes: KnowledgeGraphNode[];
    relationships: KnowledgeGraphRelationship[];
    paths: any[];
  }> {
    const {
      maxResults = 10,
      minWeight = 0.3,
      includeConcepts = true
    } = options;

    // Extract keywords from query
    const queryKeywords = await this.extractKeywordsFromText(query);
    
    // Find relevant nodes
    const relevantNodes = await this.findRelevantNodes(queryKeywords, maxResults, minWeight);
    
    // Find relationships between relevant nodes
    const relevantRelationships = await this.findRelevantRelationships(
      relevantNodes.map(n => n.id),
      minWeight
    );

    // Find paths between nodes
    const paths = await this.findPaths(relevantNodes, relevantRelationships);

    return {
      nodes: relevantNodes,
      relationships: relevantRelationships,
      paths
    };
  }

  private async extractKeywordsFromText(text: string): Promise<string[]> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)];
  }

  private async findRelevantNodes(
    queryKeywords: string[],
    maxResults: number,
    minWeight: number
  ): Promise<KnowledgeGraphNode[]> {
    // This would query the database for relevant nodes
    // For now, return empty array
    return [];
  }

  private async findRelevantRelationships(
    nodeIds: string[],
    minWeight: number
  ): Promise<KnowledgeGraphRelationship[]> {
    // This would query the database for relevant relationships
    // For now, return empty array
    return [];
  }

  private async findPaths(
    nodes: KnowledgeGraphNode[],
    relationships: KnowledgeGraphRelationship[]
  ): Promise<any[]> {
    // This would implement path finding algorithms
    // For now, return empty array
    return [];
  }
} 