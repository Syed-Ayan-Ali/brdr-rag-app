import { ETLPipeline } from '../lib/etl/processors/ETLPipeline';
import { generateEmbedding } from '../lib/embeddings';

async function testSimpleETL() {
  console.log('🧪 Simple ETL Test with Xenova Embeddings');
  console.log('==========================================');
  
  try {
    // Test 1: Test embedding generation
    console.log('\n1. Testing Xenova embedding generation...');
    const testText = "This is a test document for the ETL pipeline.";
    const embedding = await generateEmbedding(testText);
    console.log(`✅ Embedding generated successfully!`);
    console.log(`   Vector length: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 5).join(', ')}...]`);

    // Test 2: Test ETL pipeline with simple document
    console.log('\n2. Testing ETL pipeline...');
    const etlPipeline = new ETLPipeline();
    
    const testDocument = {
      doc_id: 'test_doc_' + Date.now(),
      content: 'This is a test document about financial regulations and compliance requirements.',
      source: 'TEST',
      metadata: { type: 'test' }
    };

    const result = await etlPipeline.processDocument(testDocument, {
      chunkingStrategy: 'smart',
      enableKnowledgeGraph: false, // Disable for simple test
      enableContextExtension: false,
      enableImageProcessing: false,
      enableKeywordExtraction: true,
      enableRelationshipMapping: false
    });

    console.log('✅ ETL pipeline test completed!');
    console.log(`   Document ID: ${result.documentId}`);
    console.log(`   Chunks processed: ${result.chunksProcessed}`);
    console.log(`   Keywords extracted: ${result.keywordsExtracted}`);
    console.log(`   Processing time: ${result.processingTime}ms`);

    // Test 3: Test search functionality
    console.log('\n3. Testing search functionality...');
    const databaseManager = etlPipeline['databaseManager'];
    const searchResults = await databaseManager.searchChunks('financial regulations', {
      limit: 3,
      includeRelationships: false
    });

    console.log(`✅ Search completed! Found ${searchResults.length} results`);

    console.log('\n🎉 All tests passed! The ETL pipeline is working with Xenova embeddings.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleETL().catch(console.error); 