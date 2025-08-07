# Enhanced ETL Pipeline with Smart Chunking and Knowledge Graphs

This directory contains the enhanced ETL pipeline that implements smart chunking strategies, knowledge graphs, and contextual embeddings for improved document retrieval.

## Architecture Overview

### Core Components

1. **Smart Chunking Strategies**
   - Question/Answer chunking
   - Topic-based chunking with keyword extraction
   - Contextual chunking with overlap
   - Image/Text relationship mapping

2. **Knowledge Graph Integration**
   - Keyword-concept mapping
   - Chunk relationship tracking
   - Weighted relationship scoring

3. **Enhanced Embedding Models**
   - Contextual embeddings with chunk extension
   - Multi-modal embeddings for images
   - Relationship-aware embeddings

### Directory Structure

```
etl/
├── parsers/           # Document parsing strategies
├── chunkers/          # Smart chunking algorithms
├── embeddings/        # Enhanced embedding models
├── knowledge_graph/   # Knowledge graph components
├── database/          # Database operations and schema
├── processors/        # ETL pipeline processors
└── utils/            # Utility functions
```

## Smart Chunking Strategies

### 1. Question/Answer Chunking
- Separates questions and answers into distinct chunks
- Links related Q&A pairs with high-weight relationships
- Preserves context between questions and answers

### 2. Topic-Based Chunking
- Extracts keywords and concepts from documents
- Creates concept-to-chunk mappings
- Groups related information by topic
- Maintains paragraph boundaries for context

### 3. Contextual Chunking
- Implements chunk extension (500 chars before/after)
- Creates overlapping chunks for better context
- Links adjacent chunks with relationship weights

### 4. Multi-Modal Chunking
- Handles images, charts, and tables
- Links visual content to related text
- Uses OCR for image content extraction

## Knowledge Graph Features

### Keyword Extraction
- Extracts important keywords from each document
- Creates concept hierarchies
- Assigns weights based on co-occurrence

### Relationship Mapping
- Tracks chunk-to-chunk relationships
- Maintains document-level relationships
- Implements weighted relationship scoring

### Graph Traversal
- Enables graph-based search strategies
- Supports relationship-aware retrieval
- Provides context-aware recommendations

## Enhanced Database Schema

### New Tables
- `keywords`: Stores extracted keywords and concepts
- `chunk_relationships`: Tracks relationships between chunks
- `document_metadata`: Enhanced metadata storage
- `image_content`: Stores OCR results and image metadata

### Enhanced Columns
- `related_chunks`: Array of related chunk IDs
- `keywords`: Extracted keywords for each chunk
- `context_extension`: Extended context information
- `relationship_weights`: Weighted relationship scores

## Usage

```typescript
import { ETLPipeline } from './processors/ETLPipeline';
import { SmartChunker } from './chunkers/SmartChunker';
import { KnowledgeGraphBuilder } from './knowledge_graph/KnowledgeGraphBuilder';

// Initialize the pipeline
const pipeline = new ETLPipeline();
const chunker = new SmartChunker();
const graphBuilder = new KnowledgeGraphBuilder();

// Process documents
await pipeline.processDocument(document, {
  chunkingStrategy: 'smart',
  enableKnowledgeGraph: true,
  enableContextExtension: true
});
```

## Configuration

The pipeline can be configured with various options:

- **Chunking Strategy**: Choose between different chunking approaches
- **Knowledge Graph**: Enable/disable knowledge graph features
- **Context Extension**: Configure chunk extension parameters
- **Embedding Model**: Select embedding model for different content types
- **Relationship Weighting**: Configure relationship scoring algorithms 