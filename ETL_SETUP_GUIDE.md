# ETL Pipeline Setup Guide

This guide will help you set up and run the enhanced ETL pipeline for your RAG application.

## Prerequisites

1. **Database Setup**: You need a PostgreSQL database with Supabase (or any PostgreSQL instance)
2. **Environment Variables**: Make sure your `.env` file has the correct database URL
3. **Node.js**: Ensure you have Node.js installed

## Step 1: Database Migration

The enhanced ETL pipeline adds new tables and columns to your existing database. You don't need to remove your current setup - the migration will enhance it.

### Option A: Using the provided script (Recommended)

```bash
# Install dependencies
npm install

# Run the database migration
npm run db:migrate
```

### Option B: Manual migration

If you prefer to run the migration manually:

```bash
# Connect to your database and run the migration
psql $DATABASE_URL -f lib/etl/database/migration.sql
```

## Step 2: Test the ETL Pipeline

Run the example to test that everything is working:

```bash
# Run the ETL example
npm run etl:example
```

This will:
- Process sample documents
- Demonstrate different chunking strategies
- Show knowledge graph capabilities
- Test enhanced search features

## Step 3: Process Your Own Documents

### Option A: Use the provided script

```bash
# Process custom documents
npm run etl:process
```

Edit the `scripts/run-etl.ts` file to add your own documents.

### Option B: Create your own script

```typescript
import { ETLPipeline, ETLPipelineOptions } from './lib/etl/processors/ETLPipeline';

const pipeline = new ETLPipeline();

const documents = [
  {
    doc_id: 'your_document_001',
    content: 'Your document content here...',
    source: 'BRDRAPI',
    metadata: {
      documentType: 'your_type',
      language: 'en',
      topics: ['your_topic']
    }
  }
];

const options: ETLPipelineOptions = {
  chunkingStrategy: 'smart',
  enableKnowledgeGraph: true,
  enableContextExtension: true,
  enableKeywordExtraction: true,
  enableRelationshipMapping: true,
  embeddingModel: 'text-embedding-3-small',
  enableContextualEmbeddings: true,
  enableConceptMapping: true,
  enableRelationshipScoring: true,
  minRelationshipWeight: 0.3
};

// Process documents
const results = await pipeline.processBatch(documents, options);
console.log('Processing completed:', results);
```

## What the ETL Pipeline Does

### 1. Document Processing
- Parses documents (text, markdown, etc.)
- Extracts content, images, and tables
- Generates document-level embeddings

### 2. Smart Chunking
- **Smart Strategy**: Automatically detects the best chunking approach
- **Question-Answer**: Splits into Q&A pairs
- **Topic-Based**: Groups content by topics
- **Contextual**: Maintains context between chunks

### 3. Knowledge Graph Building
- Extracts keywords and concepts
- Creates relationships between chunks
- Maps keyword relationships
- Builds concept hierarchies

### 4. Enhanced Storage
- Stores documents with metadata
- Stores chunks with embeddings
- Stores relationships and keywords
- Stores image content with OCR

## Database Schema Changes

The migration adds these new tables:

- `keywords` - Stores extracted keywords and concepts
- `chunk_relationships` - Relationships between chunks
- `keyword_relationships` - Relationships between keywords
- `document_keywords` - Document-keyword mappings
- `chunk_keywords` - Chunk-keyword mappings
- `document_metadata` - Enhanced document metadata
- `image_content` - Image content with OCR and embeddings

And enhances existing tables:

- `brdr_documents` - Added keywords, topics, summary, document_type, language
- `brdr_documents_data` - Added chunk_type, keywords, related_chunks, context_extension, relationship_weights, semantic_score

## Configuration Options

### Chunking Options
- `chunkingStrategy`: 'smart' | 'question_answer' | 'topic_based' | 'contextual'
- `enableContextExtension`: Add context before/after chunks
- `contextExtensionSize`: Size of context extension (default: 500)

### Knowledge Graph Options
- `enableKnowledgeGraph`: Enable knowledge graph building
- `enableConceptMapping`: Map keywords to higher-level concepts
- `enableRelationshipScoring`: Score relationships between chunks
- `minRelationshipWeight`: Minimum weight for relationships (default: 0.3)

### Embedding Options
- `embeddingModel`: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large'
- `enableContextualEmbeddings`: Use context-extended embeddings
- `enableMultiModalEmbeddings`: Generate embeddings for images

### Processing Options
- `batchSize`: Number of documents to process in parallel (default: 10)
- `enableParallelProcessing`: Process documents in parallel
- `enableProgressTracking`: Show progress during processing

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `DATABASE_URL` in `.env`
   - Ensure your database is accessible

2. **Migration Errors**
   - Make sure you have write permissions to your database
   - Check if the tables already exist

3. **Embedding Generation Errors**
   - Ensure you have the correct OpenAI API key
   - Check your internet connection

4. **Memory Issues**
   - Reduce `batchSize` for large documents
   - Process documents one at a time

### Debug Mode

Add this to your script for more detailed logging:

```typescript
const options: ETLPipelineOptions = {
  // ... other options
  enableProgressTracking: true
};
```

## Next Steps

After running the ETL pipeline:

1. **Test the RAG System**: Your enhanced RAG system will now use the knowledge graph
2. **Monitor Performance**: Check the performance metrics in your RAG orchestrator
3. **Add More Documents**: Process additional documents as needed
4. **Fine-tune**: Adjust the chunking and embedding options based on your results

## Example Output

When you run the ETL pipeline, you'll see output like:

```
🚀 Starting Enhanced ETL Pipeline Example
==========================================

📄 Example 1: Processing Single Document
----------------------------------------
Step 1: Parsing document...
Step 2: Generating document embedding...
Step 3: Performing smart chunking...
Step 4: Generating chunk embeddings...
Step 5: Storing document...
Step 6: Storing chunks...
Step 7: Building knowledge graph...
✅ Document processed successfully!
📊 Results:
   - Document ID: 123e4567-e89b-12d3-a456-426614174000
   - Chunks processed: 8
   - Keywords extracted: 45
   - Relationships created: 12
   - Processing time: 2345ms
   - Chunk types: question, answer, paragraph
   - Knowledge graph nodes: 15
   - Knowledge graph relationships: 12
```

This indicates that your ETL pipeline is working correctly and has successfully processed your documents with the enhanced features. 