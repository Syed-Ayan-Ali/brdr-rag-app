import { ETLPipeline, ETLPipelineOptions } from '../lib/etl/processors/ETLPipeline';
import { ETLExample } from '../lib/etl/examples/ETLExample';

async function runETL() {
  console.log('🚀 RAG ETL Pipeline Runner');
  console.log('============================');
  
  // Check if we should run the example or process custom documents
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'example') {
    console.log('Running ETL Example...');
    const example = new ETLExample();
    await example.runExample();
    await example.cleanup();
  } else if (command === 'process') {
    console.log('Processing custom documents...');
    await processCustomDocuments();
  } else {
    console.log('Usage:');
    console.log('  npm run etl:example  - Run the ETL example');
    console.log('  npm run etl:process  - Process custom documents');
    console.log('');
    console.log('Database Setup:');
    console.log('  1. Run the migration: npm run db:migrate');
    console.log('  2. Ensure your DATABASE_URL is set in .env');
    console.log('');
    console.log('Example: npm run etl:example');
  }
}

async function processCustomDocuments() {
  const pipeline = new ETLPipeline();
  
  // Define sample documents for processing
  const documents = [
    {
      doc_id: 'sample-doc-1',
      content: 'This is a sample document about financial regulations and compliance requirements. It contains information about banking standards and regulatory frameworks.',
      source: 'sample',
      metadata: {
        title: 'Sample Financial Document',
        type: 'regulation',
        date: new Date().toISOString()
      }
    },
    {
      doc_id: 'sample-doc-2',
      content: 'Another sample document discussing monetary policy and economic indicators. This document covers central banking practices and financial stability measures.',
      source: 'sample',
      metadata: {
        title: 'Sample Monetary Policy Document',
        type: 'policy',
        date: new Date().toISOString()
      }
    }
  ];
  
  const options: ETLPipelineOptions = {
    chunkingStrategy: 'smart',
    enableKnowledgeGraph: true,
    enableContextExtension: true,
    enableKeywordExtraction: true,
    enableRelationshipMapping: true,
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    enableContextualEmbeddings: true,
    enableConceptMapping: true,
    enableRelationshipScoring: true,
    minRelationshipWeight: 0.3
  };

  try {
    console.log(`Processing ${documents.length} document(s)...`);
    const results = await pipeline.processBatch(documents, options);
    
    console.log('\n✅ Processing completed!');
    console.log('📊 Results:');
    
    results.forEach((result, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(`  - Document ID: ${result.documentId}`);
      console.log(`  - Chunks processed: ${result.chunksProcessed}`);
      console.log(`  - Keywords extracted: ${result.keywordsExtracted}`);
      console.log(`  - Relationships created: ${result.relationshipsCreated}`);
      console.log(`  - Processing time: ${result.processingTime}ms`);
      
      if (result.errors.length > 0) {
        console.log(`  - Errors: ${result.errors.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing documents:', error);
  } finally {
    await pipeline.cleanup();
  }
}

// Run the script
runETL().catch(console.error); 