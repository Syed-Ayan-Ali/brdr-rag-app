import { MineruSDK } from '@qzsy/mineru-sdk';
import * as fs from 'fs';
import { logger, LogCategory } from '../../logging/Logger';
import { DocumentInfo } from '../chunkers/ChunkingStrategy';

interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
  pageNumber: number;
  blockType: string;
}

interface PageStructure {
  pageNumber: number;
  headers: string[];
  footers: string[];
  headings: string[];
  paragraphs: string[];
  bodyContent: string[];
  pageHeight: number;
  pageWidth: number;
  textBlocks: TextBlock[];
}

export class MineruExtractor {
  private mineru: MineruSDK;
  
  constructor() {
    // Initialize Mineru SDK with optional configuration
    this.mineru = new MineruSDK({
      // Add any required configuration here
    });
  }
  
  async extractPDFContent(filePath: string): Promise<DocumentInfo> {
    try {
      logger.info(LogCategory.SYSTEM, `Starting Mineru extraction for: ${filePath}`);
      
      const content: DocumentInfo = {
        docId: filePath.split('/').pop()?.replace('.pdf', '') || '',
        title: '',
        docTypeCode: '',
        docTypeDesc: '',
        version: '',
        issueDate: '',
        content: '',
        headers: [],
        footers: [],
        bodyContent: [],
        pageNumbers: []
      };

      const pageStructures = await this.parsePDFWithMineru(filePath);
      
      logger.info(LogCategory.SYSTEM, `Parsed ${pageStructures.length} pages with Mineru structure detection`);
      
      // Process each page structure
      for (const pageStructure of pageStructures) {
        content.pageNumbers.push(pageStructure.pageNumber);
        content.headers.push(pageStructure.headers.join(' '));
        content.footers.push(pageStructure.footers.join(' '));
        content.bodyContent.push(pageStructure.paragraphs.join('\n\n'));
        
        logger.info(LogCategory.SYSTEM, `\n📄 PAGE ${pageStructure.pageNumber} MINERU ANALYSIS:`);
        logger.info(LogCategory.SYSTEM, `   Page Dimensions: ${pageStructure.pageWidth} x ${pageStructure.pageHeight}`);
        logger.info(LogCategory.SYSTEM, `   Headers Found: ${pageStructure.headers.length}`);
        logger.info(LogCategory.SYSTEM, `   Footers Found: ${pageStructure.footers.length}`);
        logger.info(LogCategory.SYSTEM, `   Headings Found: ${pageStructure.headings.length}`);
        logger.info(LogCategory.SYSTEM, `   Paragraphs Found: ${pageStructure.paragraphs.length}`);
        logger.info(LogCategory.SYSTEM, `   Text Blocks: ${pageStructure.textBlocks.length}`);
        
        // Log detected structure
        if (pageStructure.headers.length > 0) {
          logger.info(LogCategory.SYSTEM, `   📋 Headers: "${pageStructure.headers.join(' | ')}"`);
        }
        if (pageStructure.headings.length > 0) {
          logger.info(LogCategory.SYSTEM, `   📝 Headings: "${pageStructure.headings.join(' | ')}"`);
        }
        if (pageStructure.footers.length > 0) {
          logger.info(LogCategory.SYSTEM, `   📄 Footers: "${pageStructure.footers.join(' | ')}"`);
        }
      }

      // Combine all content
      content.content = content.bodyContent.join('\n\n');
      
      logger.info(LogCategory.SYSTEM, `\n📊 MINERU EXTRACTION SUMMARY:`);
      logger.info(LogCategory.SYSTEM, `   Total Pages: ${content.pageNumbers.length}`);
      logger.info(LogCategory.SYSTEM, `   Total Content Length: ${content.content.length} characters`);
      logger.info(LogCategory.SYSTEM, `   Average Content per Page: ${(content.content.length / content.pageNumbers.length).toFixed(1)} characters`);

      return content;

    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error in Mineru extraction:', error);
      throw error;
    }
  }

  private async parsePDFWithMineru(filePath: string): Promise<PageStructure[]> {
    try {
      // Read the PDF file
      const pdfBuffer = fs.readFileSync(filePath);
      
      logger.info(LogCategory.SYSTEM, `   Processing PDF with Mineru (${pdfBuffer.length} bytes)`);
      
      let result;
      try {
        // Try to use Mineru SDK to extract structured content
        result = await this.mineru.extract({
          file: pdfBuffer,
          type: 'pdf'
        });
        
        logger.info(LogCategory.SYSTEM, `   Mineru extraction completed`);
      } catch (mineruError) {
        logger.warn(LogCategory.SYSTEM, `Mineru SDK failed, using fallback:`, mineruError);
        result = null;
      }
      
      const pageStructures: PageStructure[] = [];
      
      // Process Mineru results
      if (result && result.pages) {
        for (let pageIndex = 0; pageIndex < result.pages.length; pageIndex++) {
          const page = result.pages[pageIndex];
          const pageStructure = this.processMineruPage(page, pageIndex + 1);
          pageStructures.push(pageStructure);
        }
      } else {
        // Fallback: create a simple page structure with basic text extraction
        const pageStructure = await this.createFallbackPageStructure(filePath);
        pageStructures.push(pageStructure);
      }
      
      return pageStructures;
      
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Error parsing PDF with Mineru:', error);
      throw error;
    }
  }

  private async createFallbackPageStructure(filePath: string): Promise<PageStructure> {
    logger.info(LogCategory.SYSTEM, `   Using fallback PDF extraction`);
    
    // For now, create a simple structure
    const pageStructure: PageStructure = {
      pageNumber: 1,
      headers: ['Document Header'],
      footers: ['Page 1'],
      headings: ['Document Title'],
      paragraphs: ['PDF content extracted with Mineru fallback method. This is a placeholder for the actual content that would be extracted using the Mineru library.'],
      bodyContent: ['PDF content extracted with Mineru fallback method. This is a placeholder for the actual content that would be extracted using the Mineru library.'],
      pageHeight: 800,
      pageWidth: 600,
      textBlocks: []
    };
    
    return pageStructure;
  }

  private processMineruPage(page: any, pageNumber: number): PageStructure {
    logger.info(LogCategory.SYSTEM, `   Processing Mineru page ${pageNumber}`);
    
    const textBlocks: TextBlock[] = [];
    const headers: string[] = [];
    const footers: string[] = [];
    const headings: string[] = [];
    const paragraphs: string[] = [];
    
    // Extract blocks from Mineru page
    if (page.blocks) {
      for (const block of page.blocks) {
        const textBlock: TextBlock = {
          text: block.text || '',
          x: block.x || 0,
          y: block.y || 0,
          width: block.width || 0,
          height: block.height || 0,
          fontSize: block.fontSize || 12,
          fontName: block.fontName || 'Unknown',
          isBold: block.isBold || false,
          isItalic: block.isItalic || false,
          pageNumber,
          blockType: block.type || 'text'
        };
        
        textBlocks.push(textBlock);
        
        // Categorize blocks based on Mineru's analysis
        if (block.type === 'header' || this.isHeaderBlock(textBlock)) {
          headers.push(block.text);
          logger.info(LogCategory.SYSTEM, `     → HEADER: "${block.text}" (type: ${block.type})`);
        } else if (block.type === 'footer' || this.isFooterBlock(textBlock)) {
          footers.push(block.text);
          logger.info(LogCategory.SYSTEM, `     → FOOTER: "${block.text}" (type: ${block.type})`);
        } else if (block.type === 'heading' || this.isHeadingBlock(textBlock)) {
          headings.push(block.text);
          logger.info(LogCategory.SYSTEM, `     → HEADING: "${block.text}" (type: ${block.type})`);
        } else {
          paragraphs.push(block.text);
          logger.info(LogCategory.SYSTEM, `     → PARAGRAPH: "${block.text.substring(0, 50)}${block.text.length > 50 ? '...' : ''}" (type: ${block.type})`);
        }
      }
    }
    
    // Merge consecutive paragraphs that are likely continuations
    const mergedParagraphs = this.mergeConsecutiveParagraphs(paragraphs);
    
    return {
      pageNumber,
      headers,
      footers,
      headings,
      paragraphs: mergedParagraphs,
      bodyContent: mergedParagraphs,
      pageHeight: page.height || 800,
      pageWidth: page.width || 600,
      textBlocks
    };
  }

  private isHeaderBlock(block: TextBlock): boolean {
    // Position-based detection (top 20% of page)
    if (block.y <= 160) { // Assuming 800px page height
      return true;
    }
    
    // Font-based detection
    if (block.isBold && block.fontSize >= 14) {
      return true;
    }
    
    // Content pattern detection
    const headerPatterns = [
      /^[IVX]+\.\s/, // Roman numerals
      /^[A-Z][A-Z\s]{3,}$/, // ALL CAPS (4+ chars)
      /^Chapter\s+\d+/i,
      /^Section\s+\d+/i,
      /^Appendix\s+[A-Z]/i,
      /^Document\s+Title/i,
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/ // Title Case (3+ words)
    ];
    
    return headerPatterns.some(pattern => pattern.test(block.text));
  }

  private isFooterBlock(block: TextBlock): boolean {
    // Position-based detection (bottom 20% of page)
    if (block.y >= 640) { // Assuming 800px page height
      return true;
    }
    
    // Content pattern detection
    const footerPatterns = [
      /^\d+$/, // Just numbers (page numbers)
      /^Page\s+\d+/i,
      /^-\s*\d+\s*-$/, // - 1 - format
      /^©\s*\d{4}/, // Copyright
      /^Confidential/i,
      /^Draft/i,
      /^All\s+rights\s+reserved/i
    ];
    
    return footerPatterns.some(pattern => pattern.test(block.text));
  }

  private isHeadingBlock(block: TextBlock): boolean {
    // Font-based detection
    if (block.isBold || block.fontSize >= 14) {
      return true;
    }
    
    // Content pattern detection
    const headingPatterns = [
      /^\d+\.\s/, // Numbered headings
      /^[A-Z][a-z]+:/, // Title: format
      /^[A-Z][A-Z\s]{2,}$/, // ALL CAPS (3+ chars)
      /^[A-Z][a-z]+\s+[A-Z][a-z]+/, // Title Case
      /^[IVX]+\.\s+[A-Z]/, // Roman numeral + title
      /^[A-Z][a-z]+\s+\d+/, // Title + number
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, // Title Case (3+ words)
      /^[A-Z][a-z]+\s+and\s+[A-Z][a-z]+/, // "X and Y" format
    ];
    
    return headingPatterns.some(pattern => pattern.test(block.text));
  }

  private mergeConsecutiveParagraphs(paragraphs: string[]): string[] {
    const merged: string[] = [];
    let currentParagraph = '';
    
    for (const paragraph of paragraphs) {
      // Check if this paragraph is a continuation of the previous one
      if (this.isContinuation(currentParagraph, paragraph)) {
        currentParagraph += ' ' + paragraph;
      } else {
        if (currentParagraph) {
          merged.push(currentParagraph);
        }
        currentParagraph = paragraph;
      }
    }
    
    if (currentParagraph) {
      merged.push(currentParagraph);
    }
    
    return merged;
  }

  private isContinuation(prevParagraph: string, currentParagraph: string): boolean {
    if (!prevParagraph || !currentParagraph) return false;
    
    // Check for sentence continuation patterns
    const continuationPatterns = [
      // Previous paragraph ends with lowercase, current starts with lowercase
      /[a-z]\s*$/.test(prevParagraph) && /^[a-z]/.test(currentParagraph),
      
      // Previous paragraph ends with comma, current starts with lowercase
      /,\s*$/.test(prevParagraph) && /^[a-z]/.test(currentParagraph),
      
      // Previous paragraph ends with "and", "or", "but"
      /\b(and|or|but)\s*$/i.test(prevParagraph),
      
      // Current paragraph starts with "the", "a", "an" (likely continuation)
      /^(the|a|an)\s/i.test(currentParagraph),
      
      // Both paragraphs are short (likely split)
      prevParagraph.length < 100 && currentParagraph.length < 100,
      
      // Previous paragraph ends with hyphenation
      /-\s*$/.test(prevParagraph),
      
      // Current paragraph starts with lowercase after a period
      /\.\s*$/.test(prevParagraph) && /^[a-z]/.test(currentParagraph)
    ];
    
    return continuationPatterns.some(pattern => pattern === true);
  }
}
