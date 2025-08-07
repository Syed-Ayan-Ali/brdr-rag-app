import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { logger, LogCategory } from '../lib/logging/Logger';
import { Element } from 'domhandler';

const prisma = new PrismaClient();

interface RelatedDocument {
  docId: string;
  docTypeCode: string;
  docTypeDesc: string;
  version: string;
  issueDate: string;
  title: string;
  relationshipType: 'directly_related' | 'cross_referenced' | 'version_history' | 'superseded';
}

interface ScrapedRelationships {
  docId: string;
  directlyRelatedDocs: RelatedDocument[];
  crossReferencedDocs: RelatedDocument[];
  versionHistoryDocs: RelatedDocument[];
  supersededDocs: RelatedDocument[];
}

class BRDRRelationshipScraper {
  private baseUrl = 'https://brdr.hkma.gov.hk';
  // 1 second delay between requests

  constructor() {
    // Configure axios to handle SSL issues
    axios.defaults.httpsAgent = new (require('https').Agent)({ 
      rejectUnauthorized: false 
    });
  }

  async scrapeDocumentRelationships(docId: string): Promise<ScrapedRelationships | null> {
    try {
      const url = `${this.baseUrl}/eng/doc-ldg/docId/${docId}`;
      logger.info(LogCategory.SYSTEM, `Scraping relationships for document: ${docId}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      const relationships: ScrapedRelationships = {
        docId,
        directlyRelatedDocs: [],
        crossReferencedDocs: [],
        versionHistoryDocs: [],
        supersededDocs: []
      };

      // Extract directly related documents (first tab)
      $('.tab-page.selected .relp-item[relp-info="Direct Doc"]').each((_, element) => {
        const doc = this.extractRelatedDocument($, $(element), 'directly_related');
        if (doc) {
          // Check if document already exists
          const existingDoc = this.findExistingDocument(relationships, doc.docId, 'directly_related');
          if (!existingDoc) {
            relationships.directlyRelatedDocs.push(doc);
          } else {
            logger.debug(LogCategory.SYSTEM, `Skipping duplicate directly related document: ${doc.docId}`);
          }
        }
      });

      // Extract cross referenced documents (second tab)
      $('.tab-page:not(.selected) .relp-item[relp-info="Cross Ref Doc"]').each((_, element) => {
        const doc = this.extractRelatedDocument($, $(element), 'cross_referenced');
        if (doc) {
          // Check if document already exists
          const existingDoc = this.findExistingDocument(relationships, doc.docId, 'cross_referenced');
          if (!existingDoc) {
            relationships.crossReferencedDocs.push(doc);
          } else {
            logger.debug(LogCategory.SYSTEM, `Skipping duplicate cross referenced document: ${doc.docId}`);
          }
        }
      });

      // Extract version history documents (third tab)
      $('.tab-page:not(.selected) .relp-item[relp-info="Version Hist Doc"]').each((_, element) => {
        const doc = this.extractRelatedDocument($, $(element), 'version_history');
        if (doc) {
          // Check if document already exists
          const existingDoc = this.findExistingDocument(relationships, doc.docId, 'version_history');
          if (!existingDoc) {
            relationships.versionHistoryDocs.push(doc);
          } else {
            logger.debug(LogCategory.SYSTEM, `Skipping duplicate version history document: ${doc.docId}`);
          }
        }
      });

      // Extract superseded documents (fourth tab)
      $('.tab-page:not(.selected) .relp-item[relp-info="Superseded Doc"]').each((_, element) => {
        const doc = this.extractRelatedDocument($, $(element), 'superseded');
        if (doc) {
          // Check if document already exists
          const existingDoc = this.findExistingDocument(relationships, doc.docId, 'superseded');
          if (!existingDoc) {
            relationships.supersededDocs.push(doc);
          } else {
            logger.debug(LogCategory.SYSTEM, `Skipping duplicate superseded document: ${doc.docId}`);
          }
        }
      });

      // Also check mobile accordion structure
      this.extractFromMobileAccordion($, relationships);

      logger.info(LogCategory.SYSTEM, `Scraped relationships for ${docId}:`, {
        directlyRelated: relationships.directlyRelatedDocs.length,
        crossReferenced: relationships.crossReferencedDocs.length,
        versionHistory: relationships.versionHistoryDocs.length,
        superseded: relationships.supersededDocs.length
      });

      return relationships;

    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Error scraping relationships for ${docId}:`, error);
      return null;
    }
  }

  private extractRelatedDocument($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, relationshipType: RelatedDocument['relationshipType']): RelatedDocument | null {
    try {
      const $element = $(element);
      
      // Extract document type
      const docTypeElement = $element.find('.document-type');
      const docTypeCode = docTypeElement.text().trim();
      const docTypeDesc = docTypeElement.attr('title') || docTypeCode;

      // Extract version
      const versionElement = $element.find('.version');
      const version = versionElement.text().trim();

      // Extract issue date
      const issueDateElement = $element.find('.issue-date');
      const issueDate = issueDateElement.text().trim();

      // Extract document URL and ID
      const urlElement = $element.find('.document-url a');
      const href = urlElement.attr('href');
      const title = urlElement.text().trim();

      if (!href) {
        return null;
      }

      // Extract docId from href
      const docIdMatch = href.match(/\/docId\/([^\/]+)/);
      const docId = docIdMatch ? docIdMatch[1] : '';

      if (!docId) {
        return null;
      }

      return {
        docId,
        docTypeCode,
        docTypeDesc,
        version,
        issueDate,
        title,
        relationshipType
      };

    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error extracting related document:', error);
      return null;
    }
  }

  private extractFromMobileAccordion($: cheerio.CheerioAPI, relationships: ScrapedRelationships): void {
    // Extract from mobile accordion structure
    $('.accordion-body .relp-item').each((_, element) => {
      const $element = $(element);
      const relpInfo = $element.attr('relp-info');
      
      if (!relpInfo) return;

      let relationshipType: RelatedDocument['relationshipType'] | null = null;
      
      switch (relpInfo) {
        case 'Direct Doc':
          relationshipType = 'directly_related';
          break;
        case 'Cross Ref Doc':
          relationshipType = 'cross_referenced';
          break;
        case 'Version Hist Doc':
          relationshipType = 'version_history';
          break;
        case 'Superseded Doc':
          relationshipType = 'superseded';
          break;
      }

      if (relationshipType) {
        const doc = this.extractRelatedDocument($, $(element), relationshipType);
        if (doc) {
          // Check if document already exists in the appropriate list
          const existingDoc = this.findExistingDocument(relationships, doc.docId, relationshipType);
          if (!existingDoc) {
            switch (relationshipType) {
              case 'directly_related':
                relationships.directlyRelatedDocs.push(doc);
                break;
              case 'cross_referenced':
                relationships.crossReferencedDocs.push(doc);
                break;
              case 'version_history':
                relationships.versionHistoryDocs.push(doc);
                break;
              case 'superseded':
                relationships.supersededDocs.push(doc);
                break;
            }
          } else {
            logger.debug(LogCategory.SYSTEM, `Skipping duplicate ${relationshipType} document: ${doc.docId}`);
          }
        }
      }
    });
  }

  private findExistingDocument(relationships: ScrapedRelationships, docId: string, relationshipType: RelatedDocument['relationshipType']): RelatedDocument | null {
    let targetList: RelatedDocument[];
    
    switch (relationshipType) {
      case 'directly_related':
        targetList = relationships.directlyRelatedDocs;
        break;
      case 'cross_referenced':
        targetList = relationships.crossReferencedDocs;
        break;
      case 'version_history':
        targetList = relationships.versionHistoryDocs;
        break;
      case 'superseded':
        targetList = relationships.supersededDocs;
        break;
    }
    
    return targetList.find(doc => doc.docId === docId) || null;
  }

  async updateDatabaseRelationships(relationships: ScrapedRelationships): Promise<void> {
    try {
      // Update the brdr_documents table with the scraped relationships
      // Convert the arrays to JSON format for storage
      await prisma.brdr_documents.updateMany({
        where: { doc_id: relationships.docId },
        data: {
          directly_related_doc_list: relationships.directlyRelatedDocs.length > 0 ? relationships.directlyRelatedDocs as any : null,
          reference_doc_list: relationships.crossReferencedDocs.length > 0 ? relationships.crossReferencedDocs as any : null,
          version_history_doc_list: relationships.versionHistoryDocs.length > 0 ? relationships.versionHistoryDocs as any : null,
          superseded_doc_list: relationships.supersededDocs.length > 0 ? relationships.supersededDocs as any : null
        }
      });

      logger.info(LogCategory.SYSTEM, `Updated database relationships for ${relationships.docId}`);
    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Error updating database relationships for ${relationships.docId}:`, error);
      throw error;
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function scrapeAllDocumentRelationships() {
  logger.info(LogCategory.SYSTEM, 'Starting BRDR document relationship scraping...');
  
  try {
    const scraper = new BRDRRelationshipScraper();
    
    // Get all documents from the database
    const documents = await prisma.brdr_documents.findMany({
      select: {
        doc_id: true,
        directly_related_doc_list: true,
        reference_doc_list: true,
        version_history_doc_list: true,
        superseded_doc_list: true
      }
    });

    logger.info(LogCategory.SYSTEM, `Found ${documents.length} documents to process`);

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        processedCount++;
        logger.info(LogCategory.SYSTEM, `Processing document ${processedCount}/${documents.length}: ${doc.doc_id}`);

        // Check if relationships are already populated
        const hasRelationships = doc.directly_related_doc_list || 
                               doc.reference_doc_list || 
                               doc.version_history_doc_list || 
                               doc.superseded_doc_list;

        if (hasRelationships) {
          logger.info(LogCategory.SYSTEM, `Skipping ${doc.doc_id} - relationships already exist`);
          continue;
        }

        // Scrape relationships
        const relationships = await scraper.scrapeDocumentRelationships(doc.doc_id || '');
        
        if (relationships) {
          // Update database
          await scraper.updateDatabaseRelationships(relationships);
          updatedCount++;
          
          logger.info(LogCategory.SYSTEM, `Successfully updated relationships for ${doc.doc_id}`);
        } else {
          errorCount++;
          logger.warn(LogCategory.SYSTEM, `Failed to scrape relationships for ${doc.doc_id}`);
        }

        // Add delay to be respectful to the server
        await scraper.delay(1000);

      } catch (error) {
        errorCount++;
        logger.error(LogCategory.SYSTEM, `Error processing ${doc.doc_id}:`, error);
      }
    }

    logger.info(LogCategory.SYSTEM, '=== SCRAPING SUMMARY ===');
    logger.info(LogCategory.SYSTEM, `Total documents processed: ${processedCount}`);
    logger.info(LogCategory.SYSTEM, `Successfully updated: ${updatedCount}`);
    logger.info(LogCategory.SYSTEM, `Errors: ${errorCount}`);
    logger.info(LogCategory.SYSTEM, 'Document relationship scraping completed!');

  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Error in document relationship scraping:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scraping if this file is executed directly
if (require.main === module) {
  scrapeAllDocumentRelationships()
    .then(() => {
      console.log('Document relationship scraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Document relationship scraping failed:', error);
      process.exit(1);
    });
}

export { scrapeAllDocumentRelationships, BRDRRelationshipScraper }; 