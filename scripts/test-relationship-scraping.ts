import { BRDRRelationshipScraper } from './scrape-document-relationships';
import { logger, LogCategory } from '../lib/logging/Logger';

async function testRelationshipScraping() {
  logger.info(LogCategory.SYSTEM, 'Testing BRDR relationship scraping...');
  
  try {
    const scraper = new BRDRRelationshipScraper();
    
    // Test with a known document ID from your example
    const testDocId = '20250728-1-EN';
    
    logger.info(LogCategory.SYSTEM, `Testing scraping for document: ${testDocId}`);
    
    const relationships = await scraper.scrapeDocumentRelationships(testDocId);
    
    if (relationships) {
      logger.info(LogCategory.SYSTEM, '=== SCRAPING TEST RESULTS ===');
      logger.info(LogCategory.SYSTEM, `Document ID: ${relationships.docId}`);
      logger.info(LogCategory.SYSTEM, `Directly Related Documents: ${relationships.directlyRelatedDocs.length}`);
      logger.info(LogCategory.SYSTEM, `Cross Referenced Documents: ${relationships.crossReferencedDocs.length}`);
      logger.info(LogCategory.SYSTEM, `Version History Documents: ${relationships.versionHistoryDocs.length}`);
      logger.info(LogCategory.SYSTEM, `Superseded Documents: ${relationships.supersededDocs.length}`);
      
      // Log details of each relationship type
      if (relationships.directlyRelatedDocs.length > 0) {
        logger.info(LogCategory.SYSTEM, '\nDirectly Related Documents:');
        relationships.directlyRelatedDocs.forEach((doc, index) => {
          logger.info(LogCategory.SYSTEM, `  ${index + 1}. ${doc.docId} - ${doc.title} (${doc.docTypeCode})`);
        });
      }
      
      if (relationships.crossReferencedDocs.length > 0) {
        logger.info(LogCategory.SYSTEM, '\nCross Referenced Documents:');
        relationships.crossReferencedDocs.forEach((doc, index) => {
          logger.info(LogCategory.SYSTEM, `  ${index + 1}. ${doc.docId} - ${doc.title} (${doc.docTypeCode})`);
        });
      }
      
      if (relationships.versionHistoryDocs.length > 0) {
        logger.info(LogCategory.SYSTEM, '\nVersion History Documents:');
        relationships.versionHistoryDocs.forEach((doc, index) => {
          logger.info(LogCategory.SYSTEM, `  ${index + 1}. ${doc.docId} - ${doc.title} (${doc.docTypeCode})`);
        });
      }
      
      if (relationships.supersededDocs.length > 0) {
        logger.info(LogCategory.SYSTEM, '\nSuperseded Documents:');
        relationships.supersededDocs.forEach((doc, index) => {
          logger.info(LogCategory.SYSTEM, `  ${index + 1}. ${doc.docId} - ${doc.title} (${doc.docTypeCode})`);
        });
      }
      
      logger.info(LogCategory.SYSTEM, '\nRelationship scraping test completed successfully!');
      
    } else {
      logger.error(LogCategory.SYSTEM, 'Failed to scrape relationships for test document');
    }
    
  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Error in relationship scraping test:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRelationshipScraping()
    .then(() => {
      console.log('Relationship scraping test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Relationship scraping test failed:', error);
      process.exit(1);
    });
}

export { testRelationshipScraping }; 