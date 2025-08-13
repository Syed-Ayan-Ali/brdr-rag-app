import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { BRDRCrawler, BRDRDocument } from '../lib/etl/crawlers/BRDRCrawler';
import { PDFScraper } from '../lib/etl/processors/PDFScraper';
import { logger, LogCategory } from '../lib/logging/Logger';

interface DownloadProgress {
  totalDocuments: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  currentDocument: string;
  startTime: Date;
}

class BRDRPDFDownloader {
  private downloadDir: string;
  private crawler: BRDRCrawler;
  private pdfScraper: PDFScraper;
  private progress: DownloadProgress;
  private failedDownloads: string[] = [];
  private skippedDownloads: string[] = [];

  constructor(downloadDir: string = './brdr-pdfs') {
    this.downloadDir = path.resolve(downloadDir);
    this.crawler = new BRDRCrawler();
    this.pdfScraper = new PDFScraper();
    this.progress = {
      totalDocuments: 0,
      downloadedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      currentDocument: '',
      startTime: new Date()
    };

    // Create download directory
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
      logger.info(LogCategory.SYSTEM, `Created download directory: ${this.downloadDir}`);
    }
  }

  private logProgress(): void {
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    
    const successRate = this.progress.totalDocuments > 0 
      ? ((this.progress.downloadedCount / this.progress.totalDocuments) * 100).toFixed(1)
      : '0.0';

    console.log(`\n📊 Progress: ${this.progress.downloadedCount}/${this.progress.totalDocuments} (${successRate}%)`);
    console.log(`⏱️  Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s`);
    console.log(`❌ Failed: ${this.progress.failedCount}`);
    console.log(`⏭️  Skipped: ${this.progress.skippedCount}`);
    console.log(`📄 Current: ${this.progress.currentDocument}`);
    console.log('─'.repeat(50));
  }

  private async downloadSinglePDF(doc: BRDRDocument): Promise<boolean> {
    try {
      this.progress.currentDocument = doc.docId;
      
      // Check if PDF already exists
      const pdfPath = path.join(this.downloadDir, `${doc.docId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        logger.info(LogCategory.SYSTEM, `PDF already exists, skipping: ${doc.docId}`);
        this.progress.skippedCount++;
        this.skippedDownloads.push(doc.docId);
        return true;
      }

      // Get PDF info from BRDR
      const pdfInfo = await this.pdfScraper.scrapePDFDocument(doc.docId);
      if (!pdfInfo) {
        logger.warn(LogCategory.SYSTEM, `No PDF found for document: ${doc.docId}`);
        this.progress.failedCount++;
        this.failedDownloads.push(doc.docId);
        return false;
      }

      // Download PDF
      const downloadedPath = await this.pdfScraper.downloadPDF(pdfInfo);
      if (!downloadedPath) {
        logger.error(LogCategory.SYSTEM, `Failed to download PDF: ${doc.docId}`);
        this.progress.failedCount++;
        this.failedDownloads.push(doc.docId);
        return false;
      }

      // Move to final location
      const finalPath = path.join(this.downloadDir, `${doc.docId}.pdf`);
      fs.renameSync(downloadedPath, finalPath);

      // Add metadata file
      const metadataPath = path.join(this.downloadDir, `${doc.docId}.json`);
      const metadata = {
        docId: doc.docId,
        docLongTitle: doc.docLongTitle,
        docTypeDesc: doc.docTypeDesc,
        issueDate: doc.issueDate,
        downloadDate: new Date().toISOString(),
        pdfInfo: pdfInfo
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      logger.info(LogCategory.SYSTEM, `✅ Downloaded: ${doc.docId} - ${doc.docLongTitle}`);
      this.progress.downloadedCount++;
      return true;

    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Error downloading PDF for ${doc.docId}:`, error);
      this.progress.failedCount++;
      this.failedDownloads.push(doc.docId);
      return false;
    }
  }

  async downloadAllPDFs(options: {
    maxPages?: number;
    delayBetweenDownloads?: number;
    showProgress?: boolean;
  } = {}): Promise<void> {
    const {
      maxPages = Infinity,
      delayBetweenDownloads = 1000, // 1 second delay between downloads
      showProgress = true
    } = options;

    logger.info(LogCategory.SYSTEM, `Starting BRDR PDF download to: ${this.downloadDir}`);
    logger.info(LogCategory.SYSTEM, `Max pages: ${maxPages}, Delay: ${delayBetweenDownloads}ms`);

    // First, get all documents
    logger.info(LogCategory.SYSTEM, 'Fetching all documents from BRDR API...');
    const documents = await this.crawler.crawlDocuments({ maxPages });
    this.progress.totalDocuments = documents.length;

    logger.info(LogCategory.SYSTEM, `Found ${documents.length} documents to download`);

    if (showProgress) {
      this.logProgress();
    }

    // Download each PDF
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      await this.downloadSinglePDF(doc);

      if (showProgress && (i + 1) % 10 === 0) {
        this.logProgress();
      }

      // Add delay between downloads to be respectful to the server
      if (i < documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenDownloads));
      }
    }

    // Final progress report
    this.logProgress();
    this.generateDownloadReport();
  }

  private generateDownloadReport(): void {
    const reportPath = path.join(this.downloadDir, 'download-report.json');
    const report = {
      downloadDate: new Date().toISOString(),
      totalDocuments: this.progress.totalDocuments,
      downloadedCount: this.progress.downloadedCount,
      failedCount: this.progress.failedCount,
      skippedCount: this.progress.skippedCount,
      successRate: this.progress.totalDocuments > 0 
        ? ((this.progress.downloadedCount / this.progress.totalDocuments) * 100).toFixed(1)
        : '0.0',
      failedDownloads: this.failedDownloads,
      skippedDownloads: this.skippedDownloads,
      downloadDirectory: this.downloadDir
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 Download Report:');
    console.log(`📁 Directory: ${this.downloadDir}`);
    console.log(`📄 Total: ${this.progress.totalDocuments}`);
    console.log(`✅ Downloaded: ${this.progress.downloadedCount}`);
    console.log(`❌ Failed: ${this.progress.failedCount}`);
    console.log(`⏭️  Skipped: ${this.progress.skippedCount}`);
    console.log(`📊 Success Rate: ${report.successRate}%`);
    console.log(`📝 Report saved to: ${reportPath}`);
  }

  async downloadSpecificPDFs(docIds: string[]): Promise<void> {
    logger.info(LogCategory.SYSTEM, `Downloading specific PDFs: ${docIds.join(', ')}`);
    
    this.progress.totalDocuments = docIds.length;
    this.progress.startTime = new Date();

    for (const docId of docIds) {
      // Create a minimal document object for the scraper
      const doc: BRDRDocument = {
        docId: docId,
        docLongTitle: `Document ${docId}`,
        docTypeDesc: 'Unknown',
        issueDate: 'Unknown'
      };

      await this.downloadSinglePDF(doc);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    this.generateDownloadReport();
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const downloadDir = args[0] || './brdr-pdfs';
  const maxPages = args[1] ? parseInt(args[1]) : undefined;
  const delay = args[2] ? parseInt(args[2]) : 1000;

  console.log('🚀 BRDR PDF Downloader');
  console.log('─'.repeat(50));
  console.log(`📁 Download directory: ${downloadDir}`);
  console.log(`📄 Max pages: ${maxPages || 'All'}`);
  console.log(`⏱️  Delay between downloads: ${delay}ms`);
  console.log('─'.repeat(50));

  const downloader = new BRDRPDFDownloader(downloadDir);

  try {
    await downloader.downloadAllPDFs({
      maxPages,
      delayBetweenDownloads: delay,
      showProgress: true
    });
  } catch (error) {
    logger.error(LogCategory.SYSTEM, 'Download failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { BRDRPDFDownloader };
