import { BRDRCrawler } from '../lib/etl/crawlers/BRDRCrawler';
import { DatabaseManager } from '../lib/etl/database/DatabaseManager';
import { logger, LogCategory } from '../lib/logging/Logger';

async function testFirstPageCrawler() {
  logger.info(LogCategory.SYSTEM, 'Starting first page crawler test...');
  
  try {
    // Initialize components
    const crawler = new BRDRCrawler();
    const databaseManager = new DatabaseManager();
    
    logger.info(LogCategory.SYSTEM, 'Fetching first page from BRDR API...');
    
    // Fetch only the first page
    const { documents, totalRecords } = await crawler.fetchBRDRPage(1);
    
    logger.info(LogCategory.SYSTEM, `First page results:`, {
      documentsCount: documents.length,
      totalRecords,
      pageNumber: 1
    });
    
    if (documents.length === 0) {
      logger.warn(LogCategory.SYSTEM, 'No documents found on first page');
      return;
    }
    
    // Process each document from the first page
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      logger.info(LogCategory.SYSTEM, `Processing document ${i + 1}/${documents.length}: ${doc.docId}`);
      
      // Validate document
      if (!crawler.validateDocument(doc)) {
        logger.warn(LogCategory.SYSTEM, `Skipping invalid document: ${doc.docId}`);
        continue;
      }
      
      // Format content
      const content = crawler.formatDocumentContent(doc);
      
      // Create crawled document with full data mapping
      const crawledDoc = {
        doc_id: doc.docId,
        content: content,
        source: "BRDRAPI",
        metadata: {
          docId: doc.docId,
          issueDate: doc.issueDate || "N/A",
          type: doc.docTypeDesc || "N/A",
          topics: doc.docTopicSubtopicList?.map(t => 
            `${t.topicDesc || 'N/A'}: ${t.subtopicDesc || 'N/A'}`
          ) || [],
          originalData: doc
        },
        pdfContent: undefined,
        
        // Map all BRDR-specific fields to database columns
        doc_uuid: doc.docUuid || undefined,
        doc_type_code: doc.docTypeCode || undefined,
        doc_type_desc: doc.docTypeDesc || undefined,
        version_code: doc.versionCode || undefined,
        doc_long_title: doc.docLongTitle || undefined,
        doc_desc: doc.docDesc || undefined,
        issue_date: doc.issueDate || undefined,
        guideline_no: doc.guidelineNo || undefined,
        supersession_date: doc.supersessionDate || undefined,
        
        // Map BRDR-specific arrays
        doc_topic_subtopic_list: doc.docTopicSubtopicList || undefined,
        doc_keyword_list: doc.docKeywordList || undefined,
        doc_ai_type_list: doc.docAiTypeList || undefined,
        doc_view_list: doc.docViewList || undefined,
        directly_related_doc_list: doc.directlyRelatedDocList || undefined,
        version_history_doc_list: doc.versionHistoryDocList || undefined,
        reference_doc_list: doc.referenceDocList || undefined,
        superseded_doc_list: doc.supersededDocList || undefined,
        
        // Enhanced fields
        topics: doc.docTopicSubtopicList?.map(t => 
          `${t.topicDesc || 'N/A'}: ${t.subtopicDesc || 'N/A'}`
        ) || [],
        concepts: crawler['extractConcepts'](doc),
        document_type: doc.docTypeDesc || undefined,
        language: 'en'
      };
      
      // Log the mapped data
      logger.info(LogCategory.SYSTEM, `Mapped data for ${doc.docId}:`, {
        docId: doc.docId,
        docUuid: crawledDoc.doc_uuid,
        docTypeCode: crawledDoc.doc_type_code,
        docTypeDesc: crawledDoc.doc_type_desc,
        versionCode: crawledDoc.version_code,
        docLongTitle: crawledDoc.doc_long_title,
        docDesc: crawledDoc.doc_desc,
        issueDate: crawledDoc.issue_date,
        guidelineNo: crawledDoc.guideline_no,
        supersessionDate: crawledDoc.supersession_date,
        topicsCount: crawledDoc.topics?.length || 0,
        conceptsCount: crawledDoc.concepts?.length || 0,
        extractedTopics: crawledDoc.topics,
        extractedConcepts: crawledDoc.concepts,
        documentType: crawledDoc.document_type,
        language: crawledDoc.language,
        contentLength: crawledDoc.content.length,
        hasTopicSubtopicList: !!crawledDoc.doc_topic_subtopic_list,
        hasKeywordList: !!crawledDoc.doc_keyword_list,
        hasAiTypeList: !!crawledDoc.doc_ai_type_list,
        hasViewList: !!crawledDoc.doc_view_list,
        hasRelatedDocList: !!crawledDoc.directly_related_doc_list,
        hasVersionHistoryList: !!crawledDoc.version_history_doc_list,
        hasReferenceDocList: !!crawledDoc.reference_doc_list,
        hasSupersededDocList: !!crawledDoc.superseded_doc_list
      });
      
      // Check if document already exists
      const exists = await databaseManager.checkDocumentExists(doc.docId);
      if (exists) {
        logger.warn(LogCategory.SYSTEM, `Document ${doc.docId} already exists in database, skipping...`);
        continue;
      }
      
      // Store document in database
      logger.info(LogCategory.SYSTEM, `Storing document ${doc.docId} in database...`);
      try {
        const documentId = await databaseManager.storeDocument(crawledDoc);
        logger.info(LogCategory.SYSTEM, `Successfully stored document ${doc.docId} with database ID: ${documentId}`);
        
        // Verify the stored data by querying it back
        logger.info(LogCategory.SYSTEM, `Verifying stored data for ${doc.docId}...`);
        const storedDoc = await databaseManager.getDocumentById(documentId);
        if (storedDoc) {
          logger.info(LogCategory.SYSTEM, `Verified stored document:`, {
            docId: storedDoc.doc_id,
            docUuid: storedDoc.doc_uuid,
            docTypeCode: storedDoc.doc_type_code,
            docTypeDesc: storedDoc.doc_type_desc,
            versionCode: storedDoc.version_code,
            docLongTitle: storedDoc.doc_long_title,
            docDesc: storedDoc.doc_desc,
            issueDate: storedDoc.issue_date,
            guidelineNo: storedDoc.guideline_no,
            supersessionDate: storedDoc.supersession_date,
            topicsCount: storedDoc.topics?.length || 0,
            conceptsCount: storedDoc.concepts?.length || 0,
            hasTopicSubtopicList: !!storedDoc.doc_topic_subtopic_list,
            hasKeywordList: !!storedDoc.doc_keyword_list,
            hasAiTypeList: !!storedDoc.doc_ai_type_list,
            hasViewList: !!storedDoc.doc_view_list,
            hasRelatedDocList: !!storedDoc.directly_related_doc_list,
            hasVersionHistoryList: !!storedDoc.version_history_doc_list,
            hasReferenceDocList: !!storedDoc.reference_doc_list,
            hasSupersededDocList: !!storedDoc.superseded_doc_list
          });
        } else {
          logger.error(LogCategory.SYSTEM, `Failed to retrieve stored document ${doc.docId}`);
        }
        
      } catch (error) {
        logger.error(LogCategory.SYSTEM, `Error storing document ${doc.docId}:`, error);
      }
    }
    
    // Summary
    logger.info(LogCategory.SYSTEM, 'First page crawler test completed!');
    logger.info(LogCategory.SYSTEM, `Processed ${documents.length} documents from first page`);
    
    // Show database summary
    logger.info(LogCategory.SYSTEM, 'Database summary:');
    try {
      const stats = await databaseManager.getKnowledgeGraphStats();
      logger.info(LogCategory.SYSTEM, 'Database stats:', stats);
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error getting database stats:', error);
    }
    
  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Error in first page crawler test:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFirstPageCrawler()
    .then(() => {
      console.log('First page crawler test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('First page crawler test failed:', error);
      process.exit(1);
    });
}

export { testFirstPageCrawler }; 