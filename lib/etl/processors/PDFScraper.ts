import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { logger, LogCategory } from '../../logging/Logger';
import { DocumentInfo } from '../chunkers/ChunkingStrategy';
import { MineruExtractor } from './MineruExtractor';

export interface PDFDocumentInfo {
  docId: string;
  pdfUrl: string;
  pdfFileName: string;
  fileSize: string;
  title: string;
  docTypeCode: string;
  docTypeDesc: string;
  version: string;
  issueDate: string;
}

export class PDFScraper {
  private baseUrl = 'https://brdr.hkma.gov.hk';
  private tempDir = path.join(__dirname, '../../../temp-pdfs');

  constructor() {
    // Configure axios to handle SSL issues
    axios.defaults.httpsAgent = new (require('https').Agent)({ 
      rejectUnauthorized: false 
    });
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async scrapePDFDocument(docId: string): Promise<PDFDocumentInfo | null> {
    try {
      const url = `${this.baseUrl}/eng/doc-ldg/docId/${docId}`;
      logger.info(LogCategory.SYSTEM, `Scraping PDF for document: ${docId}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract document info
      const docTypeElement = $('.tag.bg-primary-darker');
      const docTypeCode = docTypeElement.text().trim();
      const docTypeDesc = docTypeElement.attr('title') || docTypeCode;
      
      const titleElement = $('.long-title');
      const title = titleElement.text().trim();
      
      const issueDateElement = $('.issue-date').next();
      const issueDate = issueDateElement.text().trim();
      
      const versionElement = $('.version.tag');
      const version = versionElement.text().trim();

      // Extract PDF link
      const pdfLink = $('.document-file-info');
      const pdfUrl = pdfLink.attr('href');
      const pdfFileName = pdfLink.text().trim();
      
      if (!pdfUrl) {
        logger.warn(LogCategory.SYSTEM, `No PDF found for document: ${docId}`);
        return null;
      }

      // Extract file size from the text
      const fileSizeMatch = pdfFileName.match(/\(([^)]+)\)/);
      const fileSize = fileSizeMatch ? fileSizeMatch[1] : 'Unknown';

      const pdfInfo: PDFDocumentInfo = {
        docId,
        pdfUrl: pdfUrl.startsWith('http') ? pdfUrl : `${this.baseUrl}${pdfUrl}`,
        pdfFileName: pdfFileName.split('(')[0].trim(),
        fileSize,
        title,
        docTypeCode,
        docTypeDesc,
        version,
        issueDate
      };

      logger.info(LogCategory.SYSTEM, `Found PDF for ${docId}: ${pdfInfo.pdfFileName}`);
      return pdfInfo;

    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Error scraping PDF for ${docId}:`, error);
      return null;
    }
  }

  async downloadPDF(pdfInfo: PDFDocumentInfo): Promise<string | null> {
    try {
      const filePath = path.join(this.tempDir, `${pdfInfo.docId}.pdf`);
      
      logger.info(LogCategory.SYSTEM, `Downloading PDF: ${pdfInfo.pdfUrl}`);
      logger.info(LogCategory.SYSTEM, `File size: ${pdfInfo.fileSize}`);
      logger.info(LogCategory.SYSTEM, `Target path: ${filePath}`);

      const response = await axios.get(pdfInfo.pdfUrl, {
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      logger.info(LogCategory.SYSTEM, `Download response status: ${response.status}`);
      logger.info(LogCategory.SYSTEM, `Content-Type: ${response.headers['content-type']}`);
      logger.info(LogCategory.SYSTEM, `Content-Length: ${response.headers['content-length'] || 'unknown'} bytes`);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // Check file size after download
          const stats = fs.statSync(filePath);
          logger.info(LogCategory.SYSTEM, `PDF downloaded successfully: ${filePath}`);
          logger.info(LogCategory.SYSTEM, `Actual file size: ${stats.size} bytes`);
          logger.info(LogCategory.SYSTEM, `Expected size: ${pdfInfo.fileSize}`);
          
          // Verify it's actually a PDF
          const fileBuffer = fs.readFileSync(filePath, { encoding: null });
          const isPDF = fileBuffer.length >= 4 && 
                       fileBuffer[0] === 0x25 && // %
                       fileBuffer[1] === 0x50 && // P
                       fileBuffer[2] === 0x44 && // D
                       fileBuffer[3] === 0x46;   // F
          
          if (isPDF) {
            logger.info(LogCategory.SYSTEM, `✅ File is confirmed to be a valid PDF`);
          } else {
            logger.warn(LogCategory.SYSTEM, `⚠️  WARNING: File does not appear to be a valid PDF!`);
            logger.info(LogCategory.SYSTEM, `First 4 bytes: ${fileBuffer.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
          }
          
          resolve(filePath);
        });
        writer.on('error', (error) => {
          logger.error(LogCategory.SYSTEM, `Download failed:`, error);
          reject(error);
        });
      });

    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Error downloading PDF for ${pdfInfo.docId}:`, error);
      return null;
    }
  }

  async extractPDFContent(filePath: string): Promise<DocumentInfo> {
    try {
      logger.info(LogCategory.SYSTEM, `Starting Mineru extraction for: ${filePath}`);
      
      const mineruExtractor = new MineruExtractor();
      const content = await mineruExtractor.extractPDFContent(filePath);
      
      // Update docId to use the filename
      content.docId = path.basename(filePath, '.pdf');
      
      return content;

    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error in Mineru extraction:', error);
      throw error;
    }
  }

  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(LogCategory.SYSTEM, `Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error cleaning up temp file:', error);
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
