import { ETLPipeline, ETLPipelineOptions, ETLProcessingResult } from './ETLPipeline';
import { BRDRCrawler, CrawledDocument } from '../crawlers/BRDRCrawler';
import { DatabaseManager } from '../database/DatabaseManager';

export interface CrawlerETLOptions extends ETLPipelineOptions {
  // Crawler options
  maxPages?: number;
  includePDFContent?: boolean;
  filterExisting?: boolean;
  crawlSingleDocument?: string; // If provided, crawl only this document
  enableCrawling?: boolean;
  
  // Processing options
  batchSize?: number;
  enableParallelProcessing?: boolean;
  enableProgressTracking?: boolean;
}

export interface CrawlerETLResult {
  crawledDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  totalProcessingTime: number;
  results: ETLProcessingResult[];
  errors: string[];
}

export class CrawlerETLPipeline extends ETLPipeline {
  private crawler: BRDRCrawler;

  constructor() {
    super();
    this.crawler = new BRDRCrawler();
  }

  async processWithCrawler(options: CrawlerETLOptions = {}): Promise<CrawlerETLResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const results: ETLProcessingResult[] = [];

    console.log(`[AUDIT] Starting Crawler-ETL Pipeline at ${new Date().toISOString()}`);
    console.log(`[AUDIT] Pipeline options: ${JSON.stringify(options)}`);

    try {
      console.log('🚀 Starting Crawler-ETL Pipeline');
      console.log('==================================');

      // Step 1: Crawl documents
      let crawledDocuments: CrawledDocument[] = [];
      
      if (options.crawlSingleDocument) {
        console.log(`[AUDIT] Single document crawl requested: ${options.crawlSingleDocument}`);
        console.log(`📄 Crawling single document: ${options.crawlSingleDocument}`);
        const doc = await this.crawler.crawlSingleDocument(
          options.crawlSingleDocument,
          options.includePDFContent !== false
        );
        if (doc) {
          crawledDocuments = [doc];
          console.log(`[AUDIT] Single document crawl successful: ${doc.doc_id}`);
        } else {
          console.log(`[AUDIT] Single document crawl failed: ${options.crawlSingleDocument}`);
        }
      } else {
        console.log('[AUDIT] Starting bulk document crawling...');
        console.log('🕷️ Crawling documents from BRDR API...');
        crawledDocuments = await this.crawler.crawlDocuments({
          maxPages: options.maxPages,
          includePDFContent: options.includePDFContent !== false,
          filterExisting: options.filterExisting !== false
        });
      }

      console.log(`[AUDIT] Crawling phase completed: ${crawledDocuments.length} documents`);
      console.log(`✅ Crawled ${crawledDocuments.length} documents`);

      // Step 2: Filter existing documents if requested
      let documentsToProcess = crawledDocuments;
      if (options.filterExisting !== false) {
        console.log('[AUDIT] Starting document filtering...');
        console.log('🔍 Filtering existing documents...');
        documentsToProcess = await this.filterExistingDocuments(crawledDocuments);
        console.log(`[AUDIT] Document filtering completed: ${documentsToProcess.length} new documents out of ${crawledDocuments.length} total`);
        console.log(`📊 Filtered to ${documentsToProcess.length} new documents`);
      } else {
        console.log('[AUDIT] Document filtering skipped');
      }

      // Step 3: Process documents in batches
      const batchSize = options.batchSize || 5;
      const enableParallel = options.enableParallelProcessing || false;
      
      console.log(`[AUDIT] Starting document processing: ${documentsToProcess.length} documents, batch size: ${batchSize}, parallel: ${enableParallel}`);
      console.log(`⚙️ Processing ${documentsToProcess.length} documents in batches of ${batchSize}`);
      
      let processedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < documentsToProcess.length; i += batchSize) {
        const batch = documentsToProcess.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(documentsToProcess.length / batchSize);
        
        console.log(`[AUDIT] Processing batch ${batchNumber}/${totalBatches} (${batch.length} documents)`);
        console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} documents)`);

        if (enableParallel) {
          console.log(`[AUDIT] Processing batch ${batchNumber} in parallel mode`);
          // Process batch in parallel
          const batchResults = await Promise.allSettled(
            batch.map(doc => this.processCrawledDocument(doc, options))
          );

          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              results.push(result.value);
              processedCount++;
              console.log(`[AUDIT] Document processed successfully in parallel: ${result.value.documentId}`);
            } else {
              const errorMsg = result.reason?.message || 'Unknown error';
              errors.push(errorMsg);
              failedCount++;
              console.log(`[AUDIT] Document processing failed in parallel: ${errorMsg}`);
            }
          }
        } else {
          console.log(`[AUDIT] Processing batch ${batchNumber} sequentially`);
          // Process batch sequentially
          for (const doc of batch) {
            try {
              const result = await this.processCrawledDocument(doc, options);
              results.push(result);
              processedCount++;
              console.log(`[AUDIT] Document processed successfully: ${doc.doc_id} -> ${result.documentId}`);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              errors.push(`Failed to process ${doc.doc_id}: ${errorMsg}`);
              failedCount++;
              console.log(`[AUDIT] Document processing failed: ${doc.doc_id} - ${errorMsg}`);
            }
          }
        }

        // Progress tracking
        if (options.enableProgressTracking !== false) {
          const progress = ((i + batch.length) / documentsToProcess.length * 100).toFixed(1);
          console.log(`[AUDIT] Processing progress: ${progress}% (${i + batch.length}/${documentsToProcess.length})`);
          console.log(`📈 Progress: ${progress}% (${i + batch.length}/${documentsToProcess.length})`);
        }
      }

      const totalProcessingTime = Date.now() - startTime;

      console.log(`[AUDIT] Crawler-ETL Pipeline completed at ${new Date().toISOString()}`);
      console.log(`[AUDIT] Total processing time: ${totalProcessingTime}ms`);
      console.log(`[AUDIT] Final statistics: ${crawledDocuments.length} crawled, ${processedCount} processed, ${failedCount} failed, ${errors.length} errors`);

      console.log('\n🎉 Crawler-ETL Pipeline Completed!');
      console.log('====================================');
      console.log(`📊 Summary:`);
      console.log(`   - Crawled documents: ${crawledDocuments.length}`);
      console.log(`   - Processed documents: ${processedCount}`);
      console.log(`   - Failed documents: ${failedCount}`);
      console.log(`   - Total processing time: ${totalProcessingTime}ms`);
      console.log(`   - Errors: ${errors.length}`);

      return {
        crawledDocuments: crawledDocuments.length,
        processedDocuments: processedCount,
        failedDocuments: failedCount,
        totalProcessingTime,
        results,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Pipeline failed: ${errorMsg}`);
      console.error(`[AUDIT] Crawler-ETL Pipeline failed: ${errorMsg}`);
      console.error(`[AUDIT] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      
      return {
        crawledDocuments: 0,
        processedDocuments: 0,
        failedDocuments: 0,
        totalProcessingTime: Date.now() - startTime,
        results: [],
        errors
      };
    }
  }

  private async processCrawledDocument(
    crawledDoc: CrawledDocument,
    options: CrawlerETLOptions
  ): Promise<ETLProcessingResult> {
    // Prepare document for ETL processing with enhanced BRDR data
    const document = {
      doc_id: crawledDoc.doc_id,
      content: crawledDoc.pdfContent || crawledDoc.content, // Use PDF content if available
      source: crawledDoc.source,
      metadata: {
        ...crawledDoc.metadata,
        crawledAt: new Date().toISOString(),
        hasPDFContent: !!crawledDoc.pdfContent
      },
      // Enhanced BRDR fields
      doc_uuid: crawledDoc.metadata?.originalData?.docUuid,
      doc_type_code: crawledDoc.metadata?.originalData?.docTypeCode,
      doc_type_desc: crawledDoc.metadata?.originalData?.docTypeDesc,
      version_code: crawledDoc.metadata?.originalData?.versionCode,
      doc_long_title: crawledDoc.metadata?.originalData?.docLongTitle,
      doc_desc: crawledDoc.metadata?.originalData?.docDesc,
      issue_date: crawledDoc.metadata?.originalData?.issueDate,
      guideline_no: crawledDoc.metadata?.originalData?.guidelineNo,
      supersession_date: crawledDoc.metadata?.originalData?.supersessionDate,
      
      // BRDR arrays
      doc_topic_subtopic_list: crawledDoc.metadata?.originalData?.docTopicSubtopicList,
      doc_keyword_list: crawledDoc.metadata?.originalData?.docKeywordList,
      doc_ai_type_list: crawledDoc.metadata?.originalData?.docAiTypeList,
      doc_view_list: crawledDoc.metadata?.originalData?.docViewList,
      directly_related_doc_list: crawledDoc.metadata?.originalData?.directlyRelatedDocList,
      version_history_doc_list: crawledDoc.metadata?.originalData?.versionHistoryDocList,
      reference_doc_list: crawledDoc.metadata?.originalData?.referenceDocList,
      superseded_doc_list: crawledDoc.metadata?.originalData?.supersededDocList,
      
      // Enhanced fields
      topics: crawledDoc.metadata?.topics || [],
      concepts: this.extractConceptsFromMetadata(crawledDoc.metadata),
      document_type: crawledDoc.metadata?.type,
      language: 'en'
    };

    // Process using the base ETL pipeline
    return await this.processDocument(document, options);
  }

  private extractConceptsFromMetadata(metadata: any): string[] {
    const concepts: string[] = [];
    
    if (metadata?.originalData) {
      const doc = metadata.originalData;
      
      // Extract from document type
      if (doc.docTypeDesc) {
        concepts.push(doc.docTypeDesc);
      }
      
      // Extract from topics
      if (doc.docTopicSubtopicList) {
        for (const topic of doc.docTopicSubtopicList) {
          if (topic.topicDesc) {
            concepts.push(topic.topicDesc);
          }
          if (topic.subtopicDesc) {
            concepts.push(topic.subtopicDesc);
          }
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(concepts)];
  }

  private async filterExistingDocuments(documents: CrawledDocument[]): Promise<CrawledDocument[]> {
    const filteredDocuments: CrawledDocument[] = [];

    for (const doc of documents) {
      try {
        const exists = await this.checkDocumentExists(doc.doc_id);
        if (!exists) {
          filteredDocuments.push(doc);
        } else {
          console.log(`⏭️ Skipping existing document: ${doc.doc_id}`);
        }
      } catch (error) {
        console.error(`Error checking document ${doc.doc_id}:`, error);
        // If we can't check, include it to be safe
        filteredDocuments.push(doc);
      }
    }

    return filteredDocuments;
  }

  async crawlAndProcessSingleDocument(
    docId: string,
    options: CrawlerETLOptions = {}
  ): Promise<ETLProcessingResult | null> {
    try {
      console.log(`🕷️ Crawling single document: ${docId}`);
      
      const crawledDoc = await this.crawler.crawlSingleDocument(
        docId,
        options.includePDFContent !== false
      );

      if (!crawledDoc) {
        console.log(`❌ Failed to crawl document: ${docId}`);
        return null;
      }

      console.log(`✅ Successfully crawled document: ${docId}`);
      
      const result = await this.processCrawledDocument(crawledDoc, options);
      
      console.log(`✅ Successfully processed document: ${docId}`);
      return result;

    } catch (error) {
      console.error(`❌ Error processing document ${docId}:`, error);
      throw error;
    }
  }

  async getCrawlerStats(): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    lastCrawlTime?: string;
  }> {
    try {
      const stats = await this.getKnowledgeGraphStats();
      
      return {
        totalDocuments: stats.chunks || 0,
        processedDocuments: stats.chunks || 0,
        failedDocuments: 0, // This would need to be tracked separately
        lastCrawlTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting crawler stats:', error);
      return {
        totalDocuments: 0,
        processedDocuments: 0,
        failedDocuments: 0
      };
    }
  }
} 