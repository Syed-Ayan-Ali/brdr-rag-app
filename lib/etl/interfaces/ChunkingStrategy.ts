export interface Chunk {
  id: string;
  content: string;
  chunkType?: string;
  keywords: string[];
  relatedChunks: string[];
  contextExtension?: string;
  relationshipWeights?: { [key: string]: number };
  metadata?: any;
}

export interface ChunkingOptions {
  chunkingStrategy?: 'question_answer' | 'topic_based' | 'contextual' | 'smart';
  chunkSize?: number;
  overlapSize?: number;
  contextExtensionSize?: number;
  enableKeywordExtraction?: boolean;
  enableRelationshipMapping?: boolean;
  enableKnowledgeGraph?: boolean;
}

export interface ChunkingStrategy {
  chunk(content: string, metadata: any, options: ChunkingOptions): Promise<Chunk[]>;
  getName(): string;
  getDescription(): string;
}

export interface QuestionAnswerPair {
  question: string;
  answer: string;
  questionChunkId?: string;
  answerChunkId?: string;
}

export interface TopicSection {
  topic: string;
  content: string;
  keywords: string[];
  subsections?: TopicSection[];
}

export interface ImageContent {
  id: string;
  imageUrl?: string;
  imageData?: string;
  ocrText?: string;
  imageType?: string;
  relatedText?: string;
  position?: any;
  metadata?: any;
}

export interface KeywordExtractionResult {
  keywords: string[];
  concepts: string[];
  weights: { [key: string]: number };
  frequency: { [key: string]: number };
}

export interface RelationshipMapping {
  sourceChunkId: string;
  targetChunkId: string;
  relationshipType: string;
  weight: number;
  metadata?: any;
}

export interface KnowledgeGraphNode {
  id: string;
  type: 'chunk' | 'keyword' | 'concept' | 'document';
  content?: string;
  keywords?: string[];
  relationships: KnowledgeGraphRelationship[];
  metadata?: any;
}

export interface KnowledgeGraphRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  metadata?: any;
} 