import axios from 'axios';
import { generateEmbedding } from '../../embeddings';
import { logger, LogCategory } from '../../logging/Logger';

// BRDR API configuration
const API_URL = "https://brdr.hkma.gov.hk/restapi/doc-search";
const PDF_URL_TEMPLATE = "https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/{doc_id}/{doc_id}.pdf";
const PAGE_SIZE = 20;

// LlamaParse configuration
const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY || 'llx-fkcCd1mCLtWoYjqC4WMZRoVLDEWnygHeu6M7Do0WUr5JFCp8';

export interface BRDRDocument {
  // Core document fields
  docId: string;
  docUuid?: string;
  docLongTitle: string;
  docTypeCode?: string;
  docTypeDesc: string;
  versionCode?: string;
  docDesc?: string;
  issueDate: string;
  guidelineNo?: string;
  supersessionDate?: string;
  
  // Topic and subtopic information
  docTopicSubtopicList?: Array<{
    codeType?: string;
    topicCode?: string;
    subtopicCode?: string;
    topicSubtopicCode?: string;
    topicSubtopicDesc?: string;
    topicDesc: string;
    subtopicDesc: string;
    topicDspSeq?: number;
    subtopicDspSeq?: number;
    topicSubtopicSame?: boolean;
  }>;
  
  // Lists and arrays
  docKeywordList?: any[];
  docDisplayKeywordList?: any[];
  docAiTypeList?: any[];
  docUserSelectedKeyowrdList?: any[];
  docUserInputtedKeywordList?: any[];
  docViewList?: any[];
  directlyRelatedDocList?: any[];
  versionHistoryDocList?: any[];
  referenceDocList?: any[];
  supersededDocList?: any[];
  
  // Additional metadata
  spmCode?: string;
  consultStsCode?: string;
  consultOpenDate?: string;
  consultClsDate?: string;
  docLangMapDto?: any;
  searchWordSet?: any;
  interestedInDocList?: any;
  crossRelpItemDto?: any;
  versionHistRelpItemDto?: any;
  supsdRelpItemDto?: any;
  showInterestedDoc?: boolean;
  isShowDocEngVersion?: boolean;
  isShowDocChiVersion?: boolean;
  engDocId?: string;
  chiDocId?: string;
  isDocNotExists?: boolean;
  docNotExistsMsg?: string;
  groupRelationshipDtoList?: any[];
  docSubtypeCode?: string;
  isOnlyAvailableLangCode?: boolean;
  isSPM?: boolean;
  
  [key: string]: any;
}

export interface CrawledDocument {
  doc_id: string;
  content: string;
  source: string;
  metadata: {
    docId: string;
    issueDate: string;
    type: string;
    topics: string[];
    originalData: BRDRDocument;
  };
  pdfContent?: string;
  
  // BRDR-specific fields for database storage
  doc_uuid?: string;
  doc_type_code?: string;
  doc_type_desc?: string;
  version_code?: string;
  doc_long_title?: string;
  doc_desc?: string;
  issue_date?: string;
  guideline_no?: string;
  supersession_date?: string;
  
  // BRDR-specific arrays
  doc_topic_subtopic_list?: any;
  doc_keyword_list?: any;
  doc_ai_type_list?: any;
  doc_view_list?: any;
  directly_related_doc_list?: any;
  version_history_doc_list?: any;
  reference_doc_list?: any;
  superseded_doc_list?: any;
  
  // Enhanced fields
  topics?: string[];
  concepts?: string[];
  document_type?: string;
  language?: string;
}


export class BRDRCrawler {
  constructor() {
    // Note: PDF parsing is disabled for now
    // We'll implement it later with a different library
    console.log('BRDR Crawler initialized (PDF parsing disabled)');
  }

  async fetchBRDRPage(pageNumber: number): Promise<{ documents: BRDRDocument[], totalRecords: number }> {
    const startTime = Date.now();
    logger.info(LogCategory.CRAWLER, `Fetching BRDR page ${pageNumber}...`);
    
    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };

    // ValueList options: 
    // ALL
    // THIS_YEAR
    const payload = {
      langCode: "eng",
      pageNumber: pageNumber.toString(),
      pageSize: PAGE_SIZE.toString(),
      sortBy: "RELEVANCE",
      docSrchCriteriaDtoList: [
        { fieldCode: "version", valueList: ["CURRENT"] },
        { fieldCode: "language", valueList: ["eng"] },
        { fieldCode: "issueDateGrp", valueList: ["ALL"] }
      ]
    };

    logger.debug(LogCategory.CRAWLER, 'API request payload', payload);

    try {
      // Configure axios to handle SSL certificate issues
      const response = await axios.post(API_URL, payload, { 
        headers,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false // Note: This is not recommended for production
        }),
        timeout: 30000 // 30 second timeout
      });
      const data = response.data;
      const duration = Date.now() - startTime;
      
      logger.info(LogCategory.CRAWLER, `BRDR API response received: ${data.resultList?.length || 0} documents, ${data.totalRecordNumber || 0} total records`, {
        pageNumber,
        documentsCount: data.resultList?.length || 0,
        totalRecords: data.totalRecordNumber || 0,
        statusCode: response.status,
        duration
      });
      
      return {
        documents: data.resultList || [],
        totalRecords: data.totalRecordNumber || 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(LogCategory.CRAWLER, `Failed to fetch page ${pageNumber}`, error, {
        pageNumber,
        duration
      });
      throw error;
    }
  }

  formatDocumentContent(doc: BRDRDocument): string {
    console.log(`[AUDIT] Formatting document content for: ${doc.docId}`);
    
    const topics = doc.docTopicSubtopicList
      ?.map(t => `${t.topicDesc || 'N/A'} - ${t.subtopicDesc || 'N/A'}`)
      .join("; ") || "N/A";

    const formattedContent = [
      doc.docLongTitle || 'N/A',
      `Type: ${doc.docTypeDesc || 'N/A'}`,
      `Issue Date: ${doc.issueDate || 'N/A'}`,
      `Topics: ${topics}`
    ].join('\n');

    console.log(`[AUDIT] Document formatted: ${formattedContent.length} characters`);
    console.log(`[AUDIT] Document topics: ${topics}`);

    return formattedContent;
  }

  validateDocument(doc: BRDRDocument): boolean {
    console.log(`[AUDIT] Validating document: ${doc.docId}`);
    
    const requiredFields = ["docId", "docLongTitle"];
    for (const field of requiredFields) {
      if (!doc[field]) {
        console.log(`[AUDIT] Invalid document: Missing ${field} in ${doc.docId}`);
        return false;
      }
    }
    
    console.log(`[AUDIT] Document validation passed: ${doc.docId}`);
    return true;
  }

  async convertPDFToMarkdown(docId: string): Promise<string> {
    console.log(`[AUDIT] PDF conversion requested for: ${docId}`);
    
    // PDF parsing is disabled for now
    // This would be implemented with a proper PDF parsing library
    console.log(`[AUDIT] PDF parsing disabled for ${docId}`);
    return "";
    
    // Future implementation would look like this:
    /*
    const pdfUrl = PDF_URL_TEMPLATE.replace(/{doc_id}/g, docId);
    
    try {
      const response = await axios.get(pdfUrl, { 
        responseType: 'arraybuffer',
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        }),
        timeout: 30000
      });
      const pdfBuffer = Buffer.from(response.data);
      
      // Parse PDF using a library like pdf-parse or pdf2pic
      // const result = await pdfParser(pdfBuffer);
      // return result.text;
      
      return "";
    } catch (error) {
      console.error(`Failed to convert PDF for ${docId}:`, error);
      return "";
    }
    */
  }

  async crawlDocuments(options: {
    maxPages?: number;
    includePDFContent?: boolean;
    filterExisting?: boolean;
  } = {}): Promise<CrawledDocument[]> {
    logger.info(LogCategory.CRAWLER, 'Starting BRDR document crawling', options);
    
    const {
      maxPages = Infinity,
      includePDFContent = true,
      filterExisting = true
    } = options;

    const documents: CrawledDocument[] = [];
    let pageNumber = 1;
    let totalRecords = 0;

    logger.info(LogCategory.CRAWLER, 'Starting BRDR document crawling...');

    while (pageNumber <= maxPages) {
      logger.info(LogCategory.CRAWLER, `Fetching page ${pageNumber}...`);
      
      try {
        const { documents: pageDocuments, totalRecords: total } = await this.fetchBRDRPage(pageNumber);
        
        if (pageNumber === 1) {
          totalRecords = total;
          logger.info(LogCategory.CRAWLER, `Total records to fetch: ${totalRecords}`);
        }

        if (!pageDocuments || pageDocuments.length === 0) {
          logger.info(LogCategory.CRAWLER, "No more documents to fetch.");
          break;
        }

        logger.info(LogCategory.CRAWLER, `Processing ${pageDocuments.length} documents from page ${pageNumber}`);

        for (const doc of pageDocuments) {
          if (!this.validateDocument(doc)) {
            logger.warn(LogCategory.CRAWLER, `Skipping invalid document ${doc.docId}`);
            continue;
          }

          const content = this.formatDocumentContent(doc);
          let pdfContent: string | undefined;

          if (includePDFContent) {
            logger.info(LogCategory.CRAWLER, `Converting PDF for document ${doc.docId}...`);
            pdfContent = await this.convertPDFToMarkdown(doc.docId);
          }

          // Extract all BRDR data and map to database columns
          const crawledDoc: CrawledDocument = {
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
            pdfContent,
            
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
            doc_topic_subtopic_list: doc.docTopicSubtopicList || null,
            doc_keyword_list: doc.docKeywordList || null,
            doc_ai_type_list: doc.docAiTypeList || null,
            doc_view_list: doc.docViewList || null,
            directly_related_doc_list: doc.directlyRelatedDocList || null,
            version_history_doc_list: doc.versionHistoryDocList || null,
            reference_doc_list: doc.referenceDocList || null,
            superseded_doc_list: doc.supersededDocList || null,
            
            // Enhanced fields
            topics: doc.docTopicSubtopicList?.map(t => 
              `${t.topicDesc || 'N/A'}: ${t.subtopicDesc || 'N/A'}`
            ) || [],
            concepts: this.extractConcepts(doc),
            document_type: doc.docTypeDesc || undefined,
            language: 'en'
          };

          documents.push(crawledDoc);
          
          // Log BRDR data mapping details
          this.logBRDRDataMapping(doc, crawledDoc);
          
          // Log crawl result
          logger.logCrawl({
            timestamp: new Date().toISOString(),
            level: 'AUDIT' as any,
            category: LogCategory.CRAWLER,
            message: `Crawled document: ${doc.docId}`,
            docId: doc.docId,
            source: "BRDRAPI",
            status: 'success',
            contentLength: content.length,
            metadata: crawledDoc.metadata
          });
        }

        pageNumber++;
        
        if ((pageNumber - 1) * PAGE_SIZE >= totalRecords) {
          logger.info(LogCategory.CRAWLER, "All pages fetched.");
          break;
        }
      } catch (error) {
        logger.error(LogCategory.CRAWLER, `Error fetching page ${pageNumber}`, error);
        pageNumber++;
      }
    }

    logger.info(LogCategory.CRAWLER, `Crawling completed. Found ${documents.length} documents.`);
    return documents;
  }

  private extractConcepts(doc: BRDRDocument): string[] {
    const concepts: string[] = [];
    
    // Extract concepts from document type
    if (doc.docTypeDesc) {
      concepts.push(doc.docTypeDesc);
    }
    
    // Extract concepts from topics
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
    
    // Remove duplicates
    return [...new Set(concepts)];
  }

  private logBRDRDataMapping(doc: BRDRDocument, crawledDoc: CrawledDocument): void {
    logger.info(LogCategory.CRAWLER, `BRDR data mapping for document: ${doc.docId}`, {
      docId: doc.docId,
      docUuid: doc.docUuid,
      docTypeCode: doc.docTypeCode,
      docTypeDesc: doc.docTypeDesc,
      versionCode: doc.versionCode,
      docLongTitle: doc.docLongTitle,
      docDesc: doc.docDesc,
      issueDate: doc.issueDate,
      guidelineNo: doc.guidelineNo,
      supersessionDate: doc.supersessionDate,
      topicsCount: doc.docTopicSubtopicList?.length || 0,
      keywordsCount: doc.docKeywordList?.length || 0,
      aiTypesCount: doc.docAiTypeList?.length || 0,
      viewsCount: doc.docViewList?.length || 0,
      relatedDocsCount: doc.directlyRelatedDocList?.length || 0,
      versionHistoryCount: doc.versionHistoryDocList?.length || 0,
      referenceDocsCount: doc.referenceDocList?.length || 0,
      supersededDocsCount: doc.supersededDocList?.length || 0,
      extractedConcepts: crawledDoc.concepts,
      extractedTopics: crawledDoc.topics
    });
  }

  async crawlSingleDocument(docId: string, includePDFContent: boolean = true): Promise<CrawledDocument | null> {
    try {
      // For single document, we'll need to fetch it from the API
      // This is a simplified version - you might need to adjust based on your API
      const { documents } = await this.fetchBRDRPage(1);
      const doc = documents.find(d => d.docId === docId);
      
      if (!doc || !this.validateDocument(doc)) {
        console.log(`Document ${docId} not found or invalid`);
        return null;
      }

      const content = this.formatDocumentContent(doc);
      let pdfContent: string | undefined;

      if (includePDFContent) {
        console.log(`Converting PDF for document ${docId}...`);
        pdfContent = await this.convertPDFToMarkdown(docId);
      }

      return {
        doc_id: docId,
        content: content,
        source: "BRDRAPI",
        metadata: {
          docId: docId,
          issueDate: doc.issueDate || "N/A",
          type: doc.docTypeDesc || "N/A",
          topics: doc.docTopicSubtopicList?.map(t => 
            `${t.topicDesc || 'N/A'}: ${t.subtopicDesc || 'N/A'}`
          ) || [],
          originalData: doc
        },
        pdfContent,
        
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
        concepts: this.extractConcepts(doc),
        document_type: doc.docTypeDesc || undefined,
        language: 'en'
      };
    } catch (error) {
      console.error(`Error crawling single document ${docId}:`, error);
      return null;
    }
  }
} 