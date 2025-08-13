# Agentic Chunker Implementation

## Overview

The Agentic Chunker is an AI-powered text segmentation system that uses artificial intelligence to intelligently split documents into semantically coherent chunks. Unlike traditional fixed-size chunking, agentic chunking dynamically segments text based on context, meaning, and semantic relationships.

## Features

- **AI-Powered Segmentation**: Uses Google's Generative AI to determine optimal chunk boundaries
- **Rich Metadata Generation**: Automatically generates titles, summaries, keywords, concepts, and topics
- **Relationship Analysis**: Identifies related chunks and calculates relationship weights
- **NLP Query Generation**: Creates potential user queries that each chunk can answer
- **Semantic Coherence**: Maintains semantic meaning within chunks

## How It Works

The agentic chunker follows a 4-step process based on IBM's methodology:

### 1. Text Preparation
- Extracts and cleans text from source documents
- Removes superfluous elements like page numbers and footers
- Preserves meaningful content and structure

### 2. Intelligent Text Splitting
- Uses recursive splitting with AI-guided boundary detection
- Maintains semantic coherence within chunks
- Creates chunks between 300-800 words optimal for LLM processing

### 3. Chunk Labeling and Enrichment
- Generates descriptive titles and summaries for each chunk
- Extracts keywords, concepts, and topics
- Creates NLP queries for potential user questions
- Calculates complexity and importance scores

### 4. Relationship Analysis
- Identifies semantic relationships between chunks
- Calculates relationship weights (0.0-1.0)
- Creates bidirectional relationship mappings
- Groups related chunks together

## Usage Example

```typescript
import { AgenticChunker } from './AgenticChunker';
import { DocumentInfo } from './ChunkingStrategy';

// Create chunker instance
const chunker = new AgenticChunker();

// Prepare document info
const documentInfo: DocumentInfo = {
  docId: 'DOC_001',
  title: 'Banking Regulation Guidelines',
  docTypeCode: 'REG',
  docTypeDesc: 'Regulation',
  version: '1.0',
  issueDate: '2024-01-15',
  content: 'Full document content...',
  headers: ['Banking Regulations'],
  footers: ['Page footer'],
  bodyContent: ['Main regulation content...'],
  pageNumbers: [1, 2, 3]
};

// Check if agentic chunking is applicable
if (chunker.isApplicable(documentInfo)) {
  // Perform chunking
  const chunks = await chunker.chunk(documentInfo);
  
  // Access rich metadata
  chunks.forEach(chunk => {
    const agenticData = chunk.metadata?.agenticMetadata;
    console.log('Chunk Title:', agenticData?.chunk_title);
    console.log('Keywords:', agenticData?.keywords);
    console.log('Related Chunks:', agenticData?.related_chunks);
    console.log('NLP Queries:', agenticData?.nlp_chunk_description);
  });
}
```

## Integration with PDFDataPipeline

The agentic chunker is automatically integrated into the chunking factory and will be selected when:
- Google Generative AI API key is available
- Document has meaningful content (>500 characters)

The chunker is prioritized over other chunking strategies when applicable.

## Output Structure

Each chunk includes comprehensive metadata:

```typescript
interface AgenticChunkMetadata {
  // Content classification
  chunk_title: string;
  chunk_description: string;
  semantic_summary: string;
  content_type: 'introduction' | 'main_content' | 'conclusion' | 'definition' | 'procedure' | 'example' | 'reference';
  
  // Extracted information
  keywords: string[];
  concepts: string[];
  topics: string[];
  
  // Relationship data
  related_chunks: string[];
  relationship_weights: { [chunkId: string]: number };
  chunk_groups: string[];
  
  // AI-generated queries
  nlp_chunk_description: string[];
  
  // Quality metrics
  complexity_score: number;  // 0.0-1.0
  importance_score: number;  // 0.0-1.0
  
  // Context information
  context_extension: string;
}
```

## Database Storage

The agentic chunker results are stored in the `brdr_documents_data` table with enhanced metadata. Until the database schema is updated with dedicated columns, agentic-specific data is stored in the `metadata` field under `agentic_data`.

## Performance Considerations

- **API Calls**: Makes multiple API calls to Google Generative AI for analysis
- **Processing Time**: Slower than traditional chunking due to AI analysis
- **Token Usage**: Consumes AI tokens for metadata generation and relationship analysis
- **Quality**: Provides significantly higher quality chunks and metadata

## Error Handling

The chunker includes fallback mechanisms:
- If AI analysis fails, falls back to rule-based extraction
- Graceful degradation for network issues
- Comprehensive logging for debugging

## Requirements

- Google Generative AI API key (`GOOGLE_GENERATIVE_AI_API_KEY`)
- Minimum document length of 500 characters
- Internet connectivity for API access

## Configuration

The chunker automatically configures based on:
- Available API keys
- Document characteristics
- Content analysis results

No manual configuration is required for standard usage.
