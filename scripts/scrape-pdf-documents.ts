import { PDFDataPipeline } from '../lib/etl/processors/PDFDataPipeline';
import { logger, LogCategory } from '../lib/logging/Logger';

async function main() {
  logger.info(LogCategory.SYSTEM, 'Starting BRDR PDF document processing pipeline...');
  
  const pipeline = new PDFDataPipeline();
  
  try {
    const results = await pipeline.processAllDocuments();
    
    // Print summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalChunks = successful.reduce((sum, r) => sum + r.chunksCreated, 0);
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    console.log('\n=== PIPELINE EXECUTION SUMMARY ===');
    console.log(`Total documents processed: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Total chunks created: ${totalChunks}`);
    console.log(`Total processing time: ${totalTime}ms`);
    
    if (failed.length > 0) {
      console.log('\n=== FAILED DOCUMENTS ===');
      failed.forEach(result => {
        console.log(`- ${result.docId}: ${result.error}`);
      });
    }
    
    console.log('\nPDF document processing pipeline completed!');
    
  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Pipeline execution failed:', error);
    console.error('Pipeline execution failed:', error);
    process.exit(1);
  } finally {
    await pipeline.disconnect();
  }
}

// Run the pipeline if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('PDF processing pipeline completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('PDF processing pipeline failed:', error);
      process.exit(1);
    });
}

export { main as runPDFPipeline };
