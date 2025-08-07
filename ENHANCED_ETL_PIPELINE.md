# Enhanced ETL Pipeline with Smart Chunking and Knowledge Graphs

## Overview

This enhanced ETL pipeline implements advanced document processing capabilities with smart chunking strategies, knowledge graph integration, and contextual embeddings. The system is designed to provide superior document retrieval and search capabilities by understanding document structure, relationships, and semantic context.

## Architecture

### Core Components

1. **Smart Chunking Strategies**
   - Question/Answer chunking
   - Topic-based chunking
   - Contextual chunking with overlap
   - Multi-modal chunking for images

2. **Knowledge Graph Integration**
   - Keyword-concept mapping
   - Chunk relationship tracking
   - Weighted relationship scoring
   - Graph-based search

3. **Enhanced Embedding Models**
   - Contextual embeddings with chunk extension
   - Multi-modal embeddings for images
   - Relationship-aware embeddings

4. **Advanced Database Schema**
   - Enhanced tables with relationship support
   - Knowledge graph tables
   - Image content storage
   - Optimized indexes and functions

## Smart Chunking Strategies

### 1. Question/Answer Chunking
- **Purpose**: Separates questions and answers into distinct chunks
- **Features**:
  - Detects Q&A patterns in documents
  - Links related Q&A pairs with high-weight relationships
  - Preserves context between questions and answers
  - Supports multiple Q&A formats

```typescript
// Example usage
const options: ETLPipelineOptions = {
  chunkingStrategy: 'question_answer',
  enableKnowledgeGraph: true
};
```

### 2. Topic-Based Chunking
- **Purpose**: Groups content by topics and subsections
- **Features**:
  - Extracts keywords and concepts from documents
  - Creates concept-to-chunk mappings
  - Groups related information by topic
  - Maintains paragraph boundaries for context

```typescript
// Example usage
const options: ETLPipelineOptions = {
  chunkingStrategy: 'topic_based',
  enableConceptMapping: true
};
```

### 3. Contextual Chunking
- **Purpose**: Creates overlapping chunks for better context
- **Features**:
  - Implements chunk extension (500 chars before/after)
  - Creates overlapping chunks for better context
  - Links adjacent chunks with relationship weights
  - Paragraph-aware splitting

```typescript
// Example usage
const options: ETLPipelineOptions = {
  chunkingStrategy: 'contextual',
  contextExtensionSize: 500,
  enableContextExtension: true
};
```

### 4. Multi-Modal Chunking
- **Purpose**: Handles images, charts, and visual content
- **Features**:
  - Links visual content to related text
  - Uses OCR for image content extraction
  - Supports multiple image formats
  - Generates image embeddings

```typescript
// Example usage
const options: ETLPipelineOptions = {
  enableImageProcessing: true,
  enableMultiModalEmbeddings: true
};
```

## Knowledge Graph Features

### Keyword Extraction
- Extracts important keywords from each document
- Creates concept hierarchies
- Assigns weights based on co-occurrence
- Supports domain-specific keyword extraction

### Relationship Mapping
- Tracks chunk-to-chunk relationships
- Maintains document-level relationships
- Implements weighted relationship scoring
- Supports multiple relationship types

### Graph Traversal
- Enables graph-based search strategies
- Supports relationship-aware retrieval
- Provides context-aware recommendations
- Implements path finding algorithms

## Enhanced Database Schema

### New Tables

1. **keywords**: Stores extracted keywords and concepts
2. **chunk_relationships**: Tracks relationships between chunks
3. **keyword_relationships**: Stores relationships between keywords
4. **document_keywords**: Maps documents to keywords
5. **chunk_keywords**: Maps chunks to keywords
6. **document_metadata**: Enhanced metadata storage
7. **image_content**: Stores OCR results and image metadata

### Enhanced Columns

1. **brdr_documents**:
   - `keywords`: Extracted keywords array
   - `topics`: Document topics array
   - `summary`: Document summary
   - `document_type`: Type of document
   - `language`: Document language

2. **brdr_documents_data**:
   - `chunk_type`: Type of chunk (question, answer, paragraph, etc.)
   - `keywords`: Keywords in this chunk
   - `related_chunks`: IDs of related chunks
   - `context_extension`: Extended context (before/after)
   - `relationship_weights`: Weights for relationships with other chunks
   - `semantic_score`: Semantic relevance score

## Usage Examples

### Basic Document Processing

```typescript
import { ETLPipeline } from './lib/etl/processors/ETLPipeline';

const pipeline = new ETLPipeline();

const document = {
  doc_id: 'example_001',
  content: 'Your document content here...',
  source: 'BRDRAPI',
  metadata: { documentType: 'policy' }
};

const options: ETLPipelineOptions = {
  chunkingStrategy: 'smart',
  enableKnowledgeGraph: true,
  enableContextExtension: true,
  contextExtensionSize: 500,
  enableImageProcessing: true,
  enableKeywordExtraction: true,
  enableRelationshipMapping: true,
  embeddingModel: 'text-embedding-3-small',
  enableContextualEmbeddings: true,
  enableConceptMapping: true,
  enableRelationshipScoring: true,
  minRelationshipWeight: 0.3
};

const result = await pipeline.processDocument(document, options);
console.log(`Processed ${result.chunksProcessed} chunks`);
```

### Batch Processing

```typescript
const documents = [/* array of documents */];

const options: ETLPipelineOptions = {
  chunkingStrategy: 'smart',
  enableKnowledgeGraph: true,
  batchSize: 10,
  enableParallelProcessing: true,
  enableProgressTracking: true
};

const results = await pipeline.processBatch(documents, options);
```

### Enhanced Search

```typescript
import { DatabaseManager } from './lib/etl/database/DatabaseManager';

const dbManager = new DatabaseManager();

// Search with knowledge graph
const results = await dbManager.searchChunks('financial regulations', {
  limit: 10,
  includeRelationships: true,
  useKnowledgeGraph: true
});

// Get related chunks
const relatedChunks = await dbManager.getRelatedChunks(chunkId, 5);

// Get keywords for a chunk
const keywords = await dbManager.getKeywordsForChunk(chunkId);
```

## Database Migration

Run the migration script to update your database schema:

```sql
-- Execute the migration script
\i lib/etl/database/migration.sql
```

The migration script will:
1. Add new columns to existing tables
2. Create new tables for knowledge graph
3. Create indexes for better performance
4. Add RPC functions for enhanced search
5. Create triggers for data consistency
6. Insert sample data for testing

## Configuration Options

### Chunking Options
- `chunkingStrategy`: 'smart' | 'question_answer' | 'topic_based' | 'contextual'
- `enableKnowledgeGraph`: Enable/disable knowledge graph features
- `enableContextExtension`: Enable chunk extension
- `contextExtensionSize`: Size of context extension (default: 500)
- `enableImageProcessing`: Enable image processing
- `enableKeywordExtraction`: Enable keyword extraction
- `enableRelationshipMapping`: Enable relationship mapping

### Embedding Options
- `embeddingModel`: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large'
- `enableContextualEmbeddings`: Enable contextual embeddings
- `enableMultiModalEmbeddings`: Enable multi-modal embeddings

### Knowledge Graph Options
- `enableConceptMapping`: Enable concept mapping
- `enableRelationshipScoring`: Enable relationship scoring
- `enableCoOccurrenceAnalysis`: Enable co-occurrence analysis
- `minRelationshipWeight`: Minimum relationship weight (default: 0.3)

### Processing Options
- `batchSize`: Batch size for processing (default: 10)
- `enableParallelProcessing`: Enable parallel processing
- `enableProgressTracking`: Enable progress tracking

## Performance Considerations

### Optimization Tips

1. **Batch Processing**: Use batch processing for large datasets
2. **Parallel Processing**: Enable parallel processing for better performance
3. **Indexing**: Ensure proper database indexes are created
4. **Caching**: Implement caching for frequently accessed data
5. **Memory Management**: Monitor memory usage during processing

### Monitoring

```typescript
// Get processing statistics
const stats = await pipeline.getProcessingStats();
console.log('Knowledge Graph Stats:', stats);

// Get database statistics
const dbStats = await dbManager.getKnowledgeGraphStats();
console.log('Database Stats:', dbStats);
```

## Advanced Features

### Custom Chunking Strategies

You can implement custom chunking strategies by extending the `ChunkingStrategy` interface:

```typescript
import { ChunkingStrategy, Chunk, ChunkingOptions } from './interfaces/ChunkingStrategy';

export class CustomChunker implements ChunkingStrategy {
  async chunk(content: string, metadata: any, options: ChunkingOptions): Promise<Chunk[]> {
    // Your custom chunking logic here
    return [];
  }

  getName(): string {
    return 'CustomChunker';
  }

  getDescription(): string {
    return 'Custom chunking strategy description';
  }
}
```

### Custom Knowledge Graph Extensions

Extend the knowledge graph with custom relationship types:

```typescript
import { KnowledgeGraphBuilder } from './knowledge_graph/KnowledgeGraphBuilder';

class CustomKnowledgeGraphBuilder extends KnowledgeGraphBuilder {
  async buildCustomRelationships(chunks: any[]): Promise<any[]> {
    // Your custom relationship logic here
    return [];
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database connection string
   - Check database permissions
   - Ensure all required extensions are installed

2. **Memory Issues**
   - Reduce batch size
   - Enable garbage collection
   - Monitor memory usage

3. **Performance Issues**
   - Check database indexes
   - Optimize chunking strategy
   - Use appropriate embedding model

4. **Knowledge Graph Issues**
   - Verify relationship weights
   - Check concept mappings
   - Validate keyword extraction

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const options: ETLPipelineOptions = {
  // ... other options
  enableProgressTracking: true
};

// Check for errors in results
results.forEach(result => {
  if (result.errors.length > 0) {
    console.error('Processing errors:', result.errors);
  }
});
```

## Future Enhancements

### Planned Features

1. **Advanced NLP Integration**
   - Named Entity Recognition (NER)
   - Sentiment Analysis
   - Topic Modeling

2. **Enhanced Multi-Modal Support**
   - Video content processing
   - Audio transcription
   - Advanced OCR capabilities

3. **Real-time Processing**
   - Stream processing capabilities
   - Real-time knowledge graph updates
   - Live relationship discovery

4. **Advanced Search Features**
   - Semantic search improvements
   - Query expansion
   - Personalized search results

### Integration Opportunities

1. **External Knowledge Bases**
   - Wikidata integration
   - Domain-specific ontologies
   - Expert system integration

2. **Machine Learning Enhancements**
   - Custom embedding models
   - Relationship prediction
   - Content classification

3. **API Extensions**
   - RESTful API for ETL operations
   - GraphQL support
   - Webhook notifications

## Conclusion

The enhanced ETL pipeline provides a comprehensive solution for intelligent document processing with smart chunking strategies, knowledge graph integration, and contextual embeddings. This system significantly improves document retrieval accuracy and provides rich semantic understanding of document relationships.

For more information, refer to the individual component documentation and example files in the `lib/etl/` directory. 