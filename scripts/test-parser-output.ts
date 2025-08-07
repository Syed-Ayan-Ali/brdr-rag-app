import { PDFDataPipeline } from '../lib/etl/processors/PDFDataPipeline';
import { logger, LogCategory } from '../lib/logging/Logger';

async function testParserOutput() {
  console.log('🔍 Testing Parser Output for Single Document\n');
  
  const pipeline = new PDFDataPipeline();
  
  try {
    // Test with a specific document ID
    const testDocId = '20250226-3-EN'; // You can change this to any document ID
    
    console.log(`📄 Processing document: ${testDocId}\n`);
    
    const result = await pipeline.processDocument(testDocId);
    
    if (result.success) {
      console.log('✅ Document processed successfully!\n');
      
      // Get the processed chunks from the database to show detailed output
      const chunks = await pipeline['prisma'].brdr_documents_data.findMany({
        where: { doc_id: testDocId },
        orderBy: { chunk_id: 'asc' }
      });
      
      console.log(`📊 Found ${chunks.length} chunks in database\n`);
      
             // Display detailed chunk information
       chunks.forEach((chunk, index) => {
         console.log(`\n🔹 CHUNK ${index + 1}/${chunks.length}`);
         console.log(`   ID: ${chunk.chunk_id}`);
         console.log(`   Type: ${chunk.chunk_type}`);
         console.log(`   Word Count: ${chunk.content.split(/\s+/).length}`);
         console.log(`   Character Count: ${chunk.content.length}`);
         
         // Display complete content
         console.log(`   📄 COMPLETE CONTENT:`);
         console.log(`   ${'─'.repeat(80)}`);
         console.log(chunk.content);
         console.log(`   ${'─'.repeat(80)}`);
        
        // Display metadata
        if (chunk.metadata) {
          console.log(`   📋 Metadata:`);
          console.log(`      - Strategy: ${chunk.metadata.chunkingStrategy}`);
          console.log(`      - Start Page: ${chunk.metadata.startPage}`);
          console.log(`      - End Page: ${chunk.metadata.endPage}`);
          console.log(`      - Has Tables: ${chunk.metadata.hasTables}`);
          console.log(`      - Has Images: ${chunk.metadata.hasImages}`);
          
          if (chunk.metadata.sectionType) {
            console.log(`      - Section Type: ${chunk.metadata.sectionType}`);
          }
          
          if (chunk.metadata.parentChunkId) {
            console.log(`      - Parent Chunk: ${chunk.metadata.parentChunkId}`);
          }
          
          if (chunk.metadata.childChunkIds && chunk.metadata.childChunkIds.length > 0) {
            console.log(`      - Child Chunks: ${chunk.metadata.childChunkIds.join(', ')}`);
          }
        }
        
        // Display relationships
        if (chunk.related_chunks && chunk.related_chunks.length > 0) {
          console.log(`   🔗 Related Chunks: ${chunk.related_chunks.join(', ')}`);
        }
        
        // Display semantic score
        if (chunk.semantic_score) {
          console.log(`   🎯 Semantic Score: ${chunk.semantic_score}`);
        }
        
        // Display keywords
        if (chunk.keywords && chunk.keywords.length > 0) {
          console.log(`   🏷️  Keywords: ${chunk.keywords.slice(0, 5).join(', ')}${chunk.keywords.length > 5 ? '...' : ''}`);
        }
        
        // Display context extension
        if (chunk.context_extension) {
          console.log(`   📝 Context: ${chunk.context_extension}`);
        }
      });
      
      // Show relationship analysis
      console.log('\n🔗 RELATIONSHIP ANALYSIS');
      console.log('========================');
      
      const hierarchicalChunks = chunks.filter(chunk => 
        chunk.metadata?.chunkingStrategy === 'hierarchical'
      );
      
      if (hierarchicalChunks.length > 0) {
        console.log(`\n📚 Hierarchical Chunks: ${hierarchicalChunks.length}`);
        
        const parentChunks = hierarchicalChunks.filter(chunk => 
          chunk.metadata?.childChunkIds && chunk.metadata.childChunkIds.length > 0
        );
        
        const childChunks = hierarchicalChunks.filter(chunk => 
          chunk.metadata?.parentChunkId
        );
        
        console.log(`   Parent Chunks: ${parentChunks.length}`);
        console.log(`   Child Chunks: ${childChunks.length}`);
        
        // Show parent-child relationships
        parentChunks.forEach(parent => {
          console.log(`\n   📖 Parent: ${parent.chunk_id}`);
          console.log(`      Children: ${parent.metadata?.childChunkIds?.join(', ') || 'None'}`);
        });
      }
      
      // Show semantic relationships
      const semanticChunks = chunks.filter(chunk => 
        chunk.related_chunks && chunk.related_chunks.length > 0
      );
      
      console.log(`\n🧠 Semantic Relationships: ${semanticChunks.length} chunks have related chunks`);
      
      // Show chunking strategy distribution
      const strategyCounts = chunks.reduce((acc, chunk) => {
        const strategy = chunk.metadata?.chunkingStrategy || 'unknown';
        acc[strategy] = (acc[strategy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📈 CHUNKING STRATEGY DISTRIBUTION');
      console.log('==================================');
      Object.entries(strategyCounts).forEach(([strategy, count]) => {
        console.log(`   ${strategy}: ${count} chunks`);
      });
      
      // Show content statistics
      const totalWords = chunks.reduce((sum, chunk) => sum + chunk.content.split(/\s+/).length, 0);
      const totalChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
      const avgWordsPerChunk = totalWords / chunks.length;
      const avgCharsPerChunk = totalChars / chunks.length;
      
      console.log('\n📊 CONTENT STATISTICS');
      console.log('=====================');
      console.log(`   Total Words: ${totalWords}`);
      console.log(`   Total Characters: ${totalChars}`);
      console.log(`   Average Words per Chunk: ${avgWordsPerChunk.toFixed(1)}`);
      console.log(`   Average Characters per Chunk: ${avgCharsPerChunk.toFixed(1)}`);
      
      // Show processing time
      console.log('\n⏱️  PROCESSING TIME');
      console.log('==================');
      console.log(`   Total Processing Time: ${result.processingTime}ms`);
      console.log(`   Average Time per Chunk: ${(result.processingTime / chunks.length).toFixed(1)}ms`);
      
    } else {
      console.log('❌ Document processing failed!');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pipeline.disconnect();
  }
}

// Run the test
if (require.main === module) {
  testParserOutput()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testParserOutput };
