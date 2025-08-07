export interface ChunkingOptions {
  maxTokens?: number;
  overlapPercentage?: number;
  bufferSize?: number;
  breakpointPercentileThreshold?: number;
  parentChunkSize?: number;
  childChunkSize?: number;
  overlapTokens?: number;
}

export interface ChunkInfo {
  chunkId: string;
  content: string;
  chunkType: 'header' | 'footer' | 'body' | 'mixed';
  pageNumber: number;
  sectionTitle?: string;
  metadata: {
    startPage: number;
    endPage: number;
    wordCount: number;
    charCount: number;
    hasTables: boolean;
    hasImages: boolean;
    sectionType?: string;
    chunkingStrategy: string;
    parentChunkId?: string;
    childChunkIds?: string[];
  };
}

export interface DocumentInfo {
  docId: string;
  title: string;
  docTypeCode: string;
  docTypeDesc: string;
  version: string;
  issueDate: string;
  content: string;
  headers: string[];
  footers: string[];
  bodyContent: string[];
  pageNumbers: number[];
}

export interface ChunkingStrategy {
  name: string;
  chunk(content: DocumentInfo, options?: ChunkingOptions): Promise<ChunkInfo[]>;
  isApplicable(content: DocumentInfo): boolean;
}

export interface DocumentGroup {
  groupId: string;
  groupType: 'title_similarity' | 'date_based' | 'category_based' | 'version_based';
  documents: string[];
  latestDocument: string;
  versionNumbers: Record<string, number>;
  groupMetadata: {
    baseTitle?: string;
    baseDate?: string;
    category?: string;
    description?: string;
  };
}

export interface GroupingStrategy {
  name: string;
  groupDocuments(documents: DocumentInfo[]): Promise<DocumentGroup[]>;
  findRelatedGroups(documentId: string, groups: DocumentGroup[]): DocumentGroup[];
}

