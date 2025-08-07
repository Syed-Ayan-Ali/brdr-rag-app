import { BRDRCrawler } from '../lib/etl/crawlers/BRDRCrawler';
import { logger, LogCategory } from '../lib/logging/Logger';

interface DocumentTypeAnalysis {
  docTypeCode: string;
  docTypeDesc: string;
  count: number;
  examples: string[];
  firstSeen: string;
  lastSeen: string;
}

async function analyzeDocumentTypes() {
  logger.info(LogCategory.SYSTEM, 'Starting BRDR document type analysis...');
  
  try {
    const crawler = new BRDRCrawler();
    
    // First, get the total number of records to calculate pages
    logger.info(LogCategory.SYSTEM, 'Fetching first page to determine total records...');
    const { documents: firstPageDocs, totalRecords } = await crawler.fetchBRDRPage(1);
    
    logger.info(LogCategory.SYSTEM, `Total records found: ${totalRecords}`);
    
    // Calculate total pages (20 documents per page)
    const pageSize = 20;
    const totalPages = Math.ceil(totalRecords / pageSize);
    
    logger.info(LogCategory.SYSTEM, `Total pages to process: ${totalPages}`);
    
    // Initialize analysis tracking
    const documentTypeMap = new Map<string, DocumentTypeAnalysis>();
    let processedDocuments = 0;
    let processedPages = 0;
    
    // Process all pages
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      logger.info(LogCategory.SYSTEM, `Processing page ${pageNumber}/${totalPages}...`);
      
      try {
        const { documents } = await crawler.fetchBRDRPage(pageNumber);
        
        if (documents.length === 0) {
          logger.warn(LogCategory.SYSTEM, `No documents found on page ${pageNumber}`);
          continue;
        }
        
        // Analyze each document on this page
        for (const doc of documents) {
          processedDocuments++;
          
          // Extract document type information
          const docTypeCode = doc.docTypeCode || 'UNKNOWN';
          const docTypeDesc = doc.docTypeDesc || 'Unknown Document Type';
          const docId = doc.docId;
          const issueDate = doc.issueDate || 'Unknown Date';
          
          // Get or create analysis entry for this document type
          if (!documentTypeMap.has(docTypeCode)) {
            documentTypeMap.set(docTypeCode, {
              docTypeCode,
              docTypeDesc,
              count: 0,
              examples: [],
              firstSeen: issueDate,
              lastSeen: issueDate
            });
          }
          
          const analysis = documentTypeMap.get(docTypeCode)!;
          analysis.count++;
          
          // Add example if we don't have too many
          if (analysis.examples.length < 3) {
            analysis.examples.push(docId);
          }
          
          // Update date range
          if (issueDate < analysis.firstSeen) {
            analysis.firstSeen = issueDate;
          }
          if (issueDate > analysis.lastSeen) {
            analysis.lastSeen = issueDate;
          }
        }
        
        processedPages++;
        
        // Log progress every 5 pages
        if (pageNumber % 5 === 0) {
          logger.info(LogCategory.SYSTEM, `Progress: ${pageNumber}/${totalPages} pages, ${processedDocuments} documents processed`);
        }
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        logger.error(LogCategory.SYSTEM, `Error processing page ${pageNumber}:`, error);
        // Continue with next page
      }
    }
    
    // Convert map to array and sort by count
    const documentTypeAnalysis = Array.from(documentTypeMap.values())
      .sort((a, b) => b.count - a.count);
    
    // Generate detailed report
    logger.info(LogCategory.SYSTEM, '=== BRDR DOCUMENT TYPE ANALYSIS ===');
    logger.info(LogCategory.SYSTEM, `Total documents processed: ${processedDocuments}`);
    logger.info(LogCategory.SYSTEM, `Total pages processed: ${processedPages}`);
    logger.info(LogCategory.SYSTEM, `Unique document types found: ${documentTypeAnalysis.length}`);
    logger.info(LogCategory.SYSTEM, '');
    
    // Summary table
    logger.info(LogCategory.SYSTEM, 'DOCUMENT TYPE SUMMARY:');
    logger.info(LogCategory.SYSTEM, '='.repeat(120));
    logger.info(LogCategory.SYSTEM, 
      `${'Type Code'.padEnd(15)} | ${'Description'.padEnd(40)} | ${'Count'.padEnd(8)} | ${'Date Range'.padEnd(25)} | Examples`
    );
    logger.info(LogCategory.SYSTEM, '='.repeat(120));
    
    documentTypeAnalysis.forEach((analysis, index) => {
      const dateRange = `${analysis.firstSeen.split('T')[0]} to ${analysis.lastSeen.split('T')[0]}`;
      const examples = analysis.examples.join(', ');
      
      logger.info(LogCategory.SYSTEM, 
        `${analysis.docTypeCode.padEnd(15)} | ${analysis.docTypeDesc.substring(0, 38).padEnd(40)} | ${analysis.count.toString().padEnd(8)} | ${dateRange.padEnd(25)} | ${examples}`
      );
    });
    
    logger.info(LogCategory.SYSTEM, '='.repeat(120));
    
    // Statistics
    const totalDocuments = documentTypeAnalysis.reduce((sum, analysis) => sum + analysis.count, 0);
    const mostCommonType = documentTypeAnalysis[0];
    const leastCommonType = documentTypeAnalysis[documentTypeAnalysis.length - 1];
    
    logger.info(LogCategory.SYSTEM, '');
    logger.info(LogCategory.SYSTEM, 'STATISTICS:');
    logger.info(LogCategory.SYSTEM, `- Most common document type: ${mostCommonType.docTypeCode} (${mostCommonType.docTypeDesc}) with ${mostCommonType.count} documents`);
    logger.info(LogCategory.SYSTEM, `- Least common document type: ${leastCommonType.docTypeCode} (${leastCommonType.docTypeDesc}) with ${leastCommonType.count} documents`);
    logger.info(LogCategory.SYSTEM, `- Average documents per type: ${(totalDocuments / documentTypeAnalysis.length).toFixed(1)}`);
    
    // Export detailed results
    const results = {
      summary: {
        totalDocuments: processedDocuments,
        totalPages: processedPages,
        uniqueDocumentTypes: documentTypeAnalysis.length,
        analysisDate: new Date().toISOString()
      },
      documentTypes: documentTypeAnalysis,
      statistics: {
        mostCommonType: mostCommonType,
        leastCommonType: leastCommonType,
        averageDocumentsPerType: totalDocuments / documentTypeAnalysis.length
      }
    };
    
    // Save results to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../logs/document-type-analysis.json');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(outputPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    logger.info(LogCategory.SYSTEM, `Detailed results saved to: ${outputPath}`);
    
    logger.info(LogCategory.SYSTEM, 'Document type analysis completed successfully!');
    
    return results;
    
  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Error in document type analysis:', error);
    throw error;
  }
}

// Run the analysis if this file is executed directly
if (require.main === module) {
  analyzeDocumentTypes()
    .then(() => {
      console.log('Document type analysis completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Document type analysis failed:', error);
      process.exit(1);
    });
}

export { analyzeDocumentTypes }; 