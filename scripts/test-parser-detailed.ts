import { PDFDataPipeline } from '../lib/etl/processors/PDFDataPipeline';
import { logger, LogCategory } from '../lib/logging/Logger';

async function testParserDetailed() {
  console.log('🔍 Detailed Parser Output Test\n');
  
  const pipeline = new PDFDataPipeline();
  
  try {
    // Test with different document types to see various chunking strategies
    const testDocuments = [
      '20250226-3-EN',  // Semantic chunking
      '20250716-3-EN',  // Larger document, might use hierarchical
      '20250410-5-EN'   // Very large document, should show different strategies
    ];
    
    for (const docId of testDocuments) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 TESTING DOCUMENT: ${docId}`);
      console.log(`${'='.repeat(60)}\n`);
      
      const result = await pipeline.processDocument(docId);
      
      if (result.success) {
        console.log(`✅ Document processed successfully! (${result.chunksCreated} chunks)\n`);
        
        // Get the processed chunks from the database
        const chunks = await pipeline['prisma'].brdr_documents_data.findMany({
          where: { doc_id: docId },
          orderBy: { chunk_id: 'asc' }
        });
        
        console.log(`📊 Found ${chunks.length} chunks in database\n`);
        
        // Show first few chunks in detail
        const chunksToShow = Math.min(3, chunks.length);
        
                 for (let i = 0; i < chunksToShow; i++) {
           const chunk = chunks[i];
           console.log(`\n🔹 CHUNK ${i + 1}/${chunks.length} (ID: ${chunk.chunk_id})`);
           console.log(`   Type: ${chunk.chunk_type}`);
           console.log(`   Word Count: ${chunk.content.split(/\s+/).length}`);
           console.log(`   Character Count: ${chunk.content.length}`);
           
           // Display complete content
           console.log(`   📄 COMPLETE CONTENT:`);
           console.log(`   ${'─'.repeat(80)}`);
           console.log(chunk.content);
           console.log(`   ${'─'.repeat(80)}`);
          
          // Show raw metadata
          if (chunk.metadata) {
            console.log(`   📋 Raw Metadata:`);
            console.log(`      ${JSON.stringify(chunk.metadata, null, 6)}`);
          }
          
          // Show relationships
          if (chunk.related_chunks && chunk.related_chunks.length > 0) {
            console.log(`   🔗 Related Chunks: ${chunk.related_chunks.join(', ')}`);
          }
          
          // Show semantic score
          if (chunk.semantic_score) {
            console.log(`   🎯 Semantic Score: ${chunk.semantic_score}`);
          }
          
          // Show keywords
          if (chunk.keywords && chunk.keywords.length > 0) {
            console.log(`   🏷️  Keywords: ${chunk.keywords.slice(0, 8).join(', ')}${chunk.keywords.length > 8 ? '...' : ''}`);
          }
        }
        
        // Show summary statistics
        const strategyCounts = chunks.reduce((acc, chunk) => {
          const strategy = chunk.metadata?.chunkingStrategy || 'unknown';
          acc[strategy] = (acc[strategy] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`\n📈 Strategy Distribution:`);
        Object.entries(strategyCounts).forEach(([strategy, count]) => {
          console.log(`   ${strategy}: ${count} chunks`);
        });
        
        // Show content statistics
        const totalWords = chunks.reduce((sum, chunk) => sum + chunk.content.split(/\s+/).length, 0);
        const avgWordsPerChunk = totalWords / chunks.length;
        
        console.log(`\n📊 Content Summary:`);
        console.log(`   Total Words: ${totalWords}`);
        console.log(`   Average Words per Chunk: ${avgWordsPerChunk.toFixed(1)}`);
        console.log(`   Processing Time: ${result.processingTime}ms`);
        
        // Show hierarchical relationships if any
        const hierarchicalChunks = chunks.filter(chunk => 
          chunk.metadata?.chunkingStrategy === 'hierarchical'
        );
        
        if (hierarchicalChunks.length > 0) {
          console.log(`\n📚 Hierarchical Analysis:`);
          console.log(`   Hierarchical Chunks: ${hierarchicalChunks.length}`);
          
          const parentChunks = hierarchicalChunks.filter(chunk => 
            chunk.metadata?.childChunkIds && chunk.metadata.childChunkIds.length > 0
          );
          
          const childChunks = hierarchicalChunks.filter(chunk => 
            chunk.metadata?.parentChunkId
          );
          
          console.log(`   Parent Chunks: ${parentChunks.length}`);
          console.log(`   Child Chunks: ${childChunks.length}`);
        }
        
        // Show semantic relationships
        const semanticChunks = chunks.filter(chunk => 
          chunk.related_chunks && chunk.related_chunks.length > 0
        );
        
        console.log(`\n🧠 Semantic Analysis:`);
        console.log(`   Chunks with Related Chunks: ${semanticChunks.length}`);
        
        if (semanticChunks.length > 0) {
          const avgRelatedChunks = semanticChunks.reduce((sum, chunk) => 
            sum + (chunk.related_chunks?.length || 0), 0
          ) / semanticChunks.length;
          
          console.log(`   Average Related Chunks per Chunk: ${avgRelatedChunks.toFixed(1)}`);
        }
        
      } else {
        console.log(`❌ Document processing failed: ${result.error}`);
      }
      
      // Add delay between documents
      if (docId !== testDocuments[testDocuments.length - 1]) {
        console.log('\n⏳ Waiting 2 seconds before next document...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pipeline.disconnect();
  }
}

// Run the test
if (require.main === module) {
  testParserDetailed()
    .then(() => {
      console.log('\n✅ Detailed test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Detailed test failed:', error);
      process.exit(1);
    });
}

export { testParserDetailed };
