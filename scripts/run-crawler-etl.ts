import { CrawlerETLPipeline, CrawlerETLOptions } from '../lib/etl/processors/CrawlerETLPipeline';

async function runCrawlerETL() {
  console.log('🚀 BRDR Crawler-ETL Pipeline Runner');
  console.log('=====================================');

  const pipeline = new CrawlerETLPipeline();

  try {
    // Configuration options
    const options: CrawlerETLOptions = {
      // Crawler options
      maxPages: 2, // Limit to 2 pages for testing
      includePDFContent: true,
      filterExisting: true,
      crawlSingleDocument: undefined, // Set to a specific doc ID to crawl only one document
      
      // ETL options
      chunkingStrategy: 'smart',
      enableKnowledgeGraph: true,
      enableContextExtension: true,
      enableImageProcessing: false,
      enableKeywordExtraction: true,
      enableRelationshipMapping: true,
      
      // Processing options
      batchSize: 3,
      enableParallelProcessing: false,
      enableProgressTracking: true
    };

    // Check command line arguments
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const command = args[0];
      
      switch (command) {
        case 'single':
          if (args.length < 2) {
            console.error('Usage: npm run crawler:single <doc_id>');
            return;
          }
          const docId = args[1];
          console.log(`🕷️ Crawling single document: ${docId}`);
          
          const result = await pipeline.crawlAndProcessSingleDocument(docId, options);
          if (result) {
            console.log('✅ Single document processing completed!');
            console.log(`   Document ID: ${result.documentId}`);
            console.log(`   Chunks processed: ${result.chunksProcessed}`);
            console.log(`   Processing time: ${result.processingTime}ms`);
          } else {
            console.log('❌ Failed to process single document');
          }
          break;

        case 'stats':
          console.log('📊 Getting crawler statistics...');
          const stats = await pipeline.getCrawlerStats();
          console.log('Crawler Statistics:');
          console.log(`   Total documents: ${stats.totalDocuments}`);
          console.log(`   Processed documents: ${stats.processedDocuments}`);
          console.log(`   Failed documents: ${stats.failedDocuments}`);
          console.log(`   Last crawl time: ${stats.lastCrawlTime}`);
          break;

        case 'test':
          console.log('🧪 Running crawler test...');
          options.maxPages = 1; // Only test with 1 page
          options.batchSize = 1;
          const testResult = await pipeline.processWithCrawler(options);
          console.log('✅ Test completed!');
          console.log(`   Crawled: ${testResult.crawledDocuments}`);
          console.log(`   Processed: ${testResult.processedDocuments}`);
          console.log(`   Failed: ${testResult.failedDocuments}`);
          break;

        default:
          console.log('Unknown command. Available commands:');
          console.log('  npm run crawler:single <doc_id>  - Crawl and process a single document');
          console.log('  npm run crawler:stats            - Get crawler statistics');
          console.log('  npm run crawler:test             - Run a test crawl');
          console.log('  npm run crawler:full             - Run full crawler-ETL pipeline');
          break;
      }
    } else {
      // Default: Run full crawler-ETL pipeline
      console.log('🕷️ Starting full crawler-ETL pipeline...');
      const result = await pipeline.processWithCrawler(options);
      
      console.log('\n🎉 Crawler-ETL Pipeline Completed!');
      console.log('====================================');
      console.log(`📊 Final Summary:`);
      console.log(`   - Crawled documents: ${result.crawledDocuments}`);
      console.log(`   - Processed documents: ${result.processedDocuments}`);
      console.log(`   - Failed documents: ${result.failedDocuments}`);
      console.log(`   - Total processing time: ${result.totalProcessingTime}ms`);
      
      if (result.errors.length > 0) {
        console.log(`\n❌ Errors encountered:`);
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Crawler-ETL Pipeline failed:', error);
    process.exit(1);
  } finally {
    await pipeline.cleanup();
  }
}

// Run the crawler-ETL pipeline
runCrawlerETL().catch(console.error); 