# Chunking Strategies Guide

This document provides comprehensive information about the chunking strategies implemented in the RAG application, including parameters, return values, and expected document structures. This guide is intended for LLM developers who need to understand the chunking system to develop effective retrieval strategies.

## Overview

The chunking system processes documents and breaks them into smaller, semantically meaningful chunks that can be efficiently retrieved and processed by the RAG system. Each chunking strategy is designed for specific document types and structures.

## Core Interfaces

### ChunkInfo Interface
```typescript
interface ChunkInfo {
  chunkId: string;           // Unique identifier: "docId_chunk_index"
  content: string;           // The actual text content of the chunk
  chunkType: 'header' | 'footer' | 'body' | 'mixed';
  pageNumber: number;        // Page number where chunk appears
  sectionTitle?: string;     // Optional section title
  metadata: {
    startPage: number;
    endPage: number;
    wordCount: number;
    charCount: number;
    hasTables: boolean;
    hasImages: boolean;
    sectionType?: string;    // Hierarchical section type (e.g., "6.1.1")
    chunkingStrategy: string;
    parentChunkId?: string;  // For hierarchical chunks
    childChunkIds?: string[]; // For parent chunks
    relatedChunks?: string[]; // Related chunk IDs
    relationshipWeights?: Record<string, number>; // Relationship strength scores
    semanticScore?: number;  // Semantic relevance score
    groupIds?: string[];     // Document group associations
    isLatestInGroup?: boolean; // Whether this is the latest version in group
  };
}
```

### DocumentInfo Interface
```typescript
interface DocumentInfo {
  docId: string;             // Document identifier
  title: string;             // Document title
  docTypeCode: string;       // Document type code (e.g., "CIR", "SPM")
  docTypeDesc: string;       // Document type description
  version: string;           // Version information
  issueDate: string;         // Issue date
  content: string;           // Full document content
  headers: string[];         // Headers (only first page kept)
  footers: string[];         // Footers
  bodyContent: string[];     // Body content per page
  pageNumbers: number[];     // Page numbers
}
```

## Chunking Strategies

### 1. Standard Chunking

**Purpose**: Fixed-size chunking with overlap, honoring sentence boundaries.

**Applicability**: 
- Documents with consistent structure
- General-purpose chunking
- When semantic meaning is evenly distributed

**Parameters**:
```typescript
interface StandardChunkingOptions {
  maxTokens?: number;        // Default: 1000
  overlapPercentage?: number; // Default: 10%
  bufferSize?: number;       // Default: 100
}
```

**Return Value**: Array of `ChunkInfo` objects with:
- `chunkType`: 'body'
- `metadata.chunkingStrategy`: 'standard'
- `metadata.wordCount`: Number of words in chunk
- `metadata.charCount`: Number of characters in chunk

**Example Output**:
```typescript
[
  {
    chunkId: "20250226-3-EN_chunk_1",
    content: "The Hong Kong Monetary Authority (HKMA) today announced...",
    chunkType: "body",
    pageNumber: 1,
    metadata: {
      startPage: 1,
      endPage: 1,
      wordCount: 245,
      charCount: 1234,
      chunkingStrategy: "standard",
      hasTables: false,
      hasImages: false
    }
  }
]
```

### 2. Hierarchical Chunking

**Purpose**: Organizes information into nested parent and child chunks for structured documents.

**Applicability**:
- Documents with clear hierarchical structure (chapters, sections, subsections)
- Legal documents, manuals, technical specifications
- Documents with numbered sections (e.g., "6.1.1", "6.1.2")

**Parameters**:
```typescript
interface HierarchicalChunkingOptions {
  parentChunkSize?: number;  // Default: 2000
  childChunkSize?: number;   // Default: 500
  overlapTokens?: number;    // Default: 50
}
```

**Return Value**: Array of `ChunkInfo` objects with parent-child relationships:
- Parent chunks: Larger chunks containing entire sections
- Child chunks: Smaller chunks within sections
- `metadata.parentChunkId`: Links child to parent
- `metadata.childChunkIds`: Links parent to children
- `metadata.relatedChunks`: Sibling relationships

**Example Output**:
```typescript
[
  {
    chunkId: "20250226-3-EN_parent_1",
    content: "Chapter 6: Risk Management...",
    chunkType: "body",
    metadata: {
      chunkingStrategy: "hierarchical",
      childChunkIds: ["20250226-3-EN_chunk_1", "20250226-3-EN_chunk_2"],
      relatedChunks: ["20250226-3-EN_chunk_1", "20250226-3-EN_chunk_2"]
    }
  },
  {
    chunkId: "20250226-3-EN_chunk_1",
    content: "6.1.1 Credit Risk Assessment...",
    chunkType: "body",
    metadata: {
      chunkingStrategy: "hierarchical",
      parentChunkId: "20250226-3-EN_parent_1",
      sectionType: "6.1.1",
      relatedChunks: ["20250226-3-EN_parent_1", "20250226-3-EN_chunk_2"]
    }
  }
]
```

### 3. Semantic Chunking

**Purpose**: Divides text into semantically coherent segments using various AI-driven approaches.

**Applicability**:
- Documents requiring semantic understanding
- When LLM is available for processing
- Complex documents with varying content types

**Subtypes**:

#### 3.1 Proposition-based Chunking
**Purpose**: LLM-driven extraction and grouping of atomic factoids.

**Parameters**:
```typescript
interface PropositionChunkingOptions {
  maxTokens?: number;        // Default: 1000
  overlapPercentage?: number; // Default: 10%
}
```

**Return Value**: Chunks based on semantic propositions with:
- `metadata.chunkingStrategy`: 'semantic_proposition'
- `metadata.semanticScore`: Relevance score

#### 3.2 Clustering-based Chunking
**Purpose**: Groups similar sentences using k-means clustering.

**Parameters**:
```typescript
interface ClusteringChunkingOptions {
  numClusters?: number;      // Default: 5
  maxTokens?: number;        // Default: 1000
}
```

**Return Value**: Clusters of semantically similar content with:
- `metadata.chunkingStrategy`: 'semantic_clustering'

#### 3.3 Standard Deviation Chunking
**Purpose**: Segments sentences based on embedding differences.

**Parameters**:
```typescript
interface StandardDeviationChunkingOptions {
  threshold?: number;        // Default: 0.5
  maxTokens?: number;        // Default: 1000
}
```

**Return Value**: Chunks based on semantic variance with:
- `metadata.chunkingStrategy`: 'semantic_std_dev'

#### 3.4 Double-pass Chunking
**Purpose**: Two-phase approach using cosine similarity for merging.

**Parameters**:
```typescript
interface DoublePassChunkingOptions {
  initialThreshold?: number; // Default: 0.7
  mergeThreshold?: number;   // Default: 0.8
  maxTokens?: number;        // Default: 1000
}
```

**Return Value**: Optimized chunks with:
- `metadata.chunkingStrategy`: 'semantic_double_pass'

## Document Structure Expectations

### Database Schema

The chunks are stored in the `brdr_documents_data` table with the following structure:

```sql
CREATE TABLE brdr_documents_data (
  id UUID PRIMARY KEY,
  doc_id VARCHAR NOT NULL,
  document_id UUID REFERENCES brdr_documents(id),
  chunk_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  chunk_type VARCHAR NOT NULL,
  metadata JSONB,
  related_chunks TEXT[],
  relationship_weights JSONB,
  semantic_score DECIMAL,
  keywords TEXT[],
  context_extension TEXT,
  UNIQUE(doc_id, chunk_id)
);
```

### Key Fields for Retrieval Strategies

1. **`doc_id`**: Document identifier (e.g., "20250226-3-EN")
2. **`chunk_id`**: Sequential chunk number within document
3. **`content`**: The actual text content
4. **`chunk_type`**: Type of chunk ('header', 'footer', 'body', 'mixed')
5. **`metadata`**: JSON object containing chunk information
6. **`related_chunks`**: Array of related chunk IDs
7. **`relationship_weights`**: JSON object with relationship strength scores
8. **`semantic_score`**: Relevance score (0.0 to 1.0)
9. **`keywords`**: Extracted keywords from content
10. **`context_extension`**: Additional context information

### Hierarchical Relationships

For hierarchical documents, the following relationships are established:

1. **Parent-Child**: Parent chunks contain child chunks
   - Parent: `metadata.childChunkIds` contains child chunk IDs
   - Child: `metadata.parentChunkId` contains parent chunk ID

2. **Sibling**: Chunks at the same hierarchical level
   - `metadata.relatedChunks` contains sibling chunk IDs
   - Example: "6.1.1" and "6.1.2" are siblings

3. **Semantic**: Chunks with similar content
   - `metadata.relatedChunks` contains semantically related chunk IDs
   - `metadata.relationshipWeights` contains similarity scores

### Document Groups

Documents are grouped based on:
- **Title Similarity**: Documents with similar titles
- **Date-based**: Documents from the same time period
- **Category-based**: Documents of the same type
- **Version-based**: Different versions of the same document

Group information is stored in:
- `metadata.groupIds`: Array of group IDs
- `metadata.isLatestInGroup`: Boolean indicating if this is the latest version

## Usage Examples

### Retrieving Related Chunks

```sql
-- Get all chunks related to a specific chunk
SELECT * FROM brdr_documents_data 
WHERE chunk_id = ANY(
  SELECT unnest(related_chunks) 
  FROM brdr_documents_data 
  WHERE doc_id = '20250226-3-EN' AND chunk_id = 1
);
```

### Retrieving Hierarchical Structure

```sql
-- Get parent and child chunks
SELECT * FROM brdr_documents_data 
WHERE doc_id = '20250226-3-EN' 
AND (chunk_id = 1 OR chunk_id = ANY(
  SELECT unnest(child_chunk_ids) 
  FROM brdr_documents_data 
  WHERE doc_id = '20250226-3-EN' AND chunk_id = 1
));
```

### Retrieving by Semantic Score

```sql
-- Get chunks with high semantic relevance
SELECT * FROM brdr_documents_data 
WHERE doc_id = '20250226-3-EN' 
AND semantic_score > 0.8
ORDER BY semantic_score DESC;
```

## Strategy Selection Logic

The system automatically selects the most appropriate chunking strategy based on:

1. **Document Structure**: Presence of hierarchical numbering
2. **Content Type**: Legal, technical, or general documents
3. **LLM Availability**: Whether AI processing is available
4. **Document Size**: Large documents may use different strategies
5. **Content Complexity**: Complex documents use semantic chunking

## Performance Considerations

- **Standard Chunking**: Fastest, suitable for most documents
- **Hierarchical Chunking**: Moderate performance, good for structured documents
- **Semantic Chunking**: Slower due to AI processing, best for complex documents

## Error Handling

All chunking strategies include:
- Fallback mechanisms for failed chunking
- Validation of chunk quality
- Error logging and reporting
- Graceful degradation to simpler strategies

This guide provides the foundation for developing effective retrieval strategies that can leverage the rich metadata and relationship information stored in the chunked documents.

