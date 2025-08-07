export interface ParsedContent {
  content: string;
  images: any[];
  tables: any[];
  metadata: any;
}

export interface ImageContent {
  imageUrl?: string;
  imageData?: string;
  imageType?: string;
  position?: any;
  relatedText?: string;
}

export interface TableContent {
  tableData: any[][];
  headers: string[];
  position?: any;
  relatedText?: string;
}

export class DocumentParser {
  async parse(document: any): Promise<ParsedContent> {
    try {
      // Determine document type and parse accordingly
      const documentType = this.detectDocumentType(document);
      
      switch (documentType) {
        case 'pdf':
          return await this.parsePDF(document);
        case 'markdown':
          return await this.parseMarkdown(document);
        case 'html':
          return await this.parseHTML(document);
        case 'text':
          return await this.parseText(document);
        default:
          return await this.parseText(document);
      }
    } catch (error) {
      console.error('Error parsing document:', error);
      throw error;
    }
  }

  private detectDocumentType(document: any): string {
    const content = document.content || '';
    const filePath = document.filePath || '';
    
    if (filePath.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    } else if (filePath.toLowerCase().endsWith('.md') || content.includes('#')) {
      return 'markdown';
    } else if (filePath.toLowerCase().endsWith('.html') || content.includes('<html')) {
      return 'html';
    } else {
      return 'text';
    }
  }

  private async parsePDF(document: any): Promise<ParsedContent> {
    // This would integrate with a PDF parser like pdf-parse or similar
    // For now, return the content as-is
    const content = document.content || '';
    
    return {
      content: this.cleanContent(content),
      images: this.extractImagesFromText(content),
      tables: this.extractTablesFromText(content),
      metadata: {
        documentType: 'pdf',
        originalContent: content
      }
    };
  }

  private async parseMarkdown(document: any): Promise<ParsedContent> {
    const content = document.content || '';
    
    return {
      content: this.cleanContent(content),
      images: this.extractImagesFromMarkdown(content),
      tables: this.extractTablesFromMarkdown(content),
      metadata: {
        documentType: 'markdown',
        originalContent: content
      }
    };
  }

  private async parseHTML(document: any): Promise<ParsedContent> {
    const content = document.content || '';
    
    return {
      content: this.cleanContent(this.extractTextFromHTML(content)),
      images: this.extractImagesFromHTML(content),
      tables: this.extractTablesFromHTML(content),
      metadata: {
        documentType: 'html',
        originalContent: content
      }
    };
  }

  private async parseText(document: any): Promise<ParsedContent> {
    const content = document.content || '';
    
    return {
      content: this.cleanContent(content),
      images: this.extractImagesFromText(content),
      tables: this.extractTablesFromText(content),
      metadata: {
        documentType: 'text',
        originalContent: content
      }
    };
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractImagesFromText(content: string): ImageContent[] {
    const images: ImageContent[] = [];
    
    // Extract image references
    const imagePatterns = [
      /(?:image|figure|chart|table|diagram)\s*(?:#\d+)?\s*:?\s*([^\n]+)/gi,
      /(?:see|refer to)\s+(?:image|figure|chart|table|diagram)\s*([^\n]+)/gi
    ];
    
    for (const pattern of imagePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        images.push({
          imageType: this.detectImageType(match[0]),
          relatedText: match[1] || match[0],
          position: { index: match.index || 0 }
        });
      }
    }
    
    return images;
  }

  private extractImagesFromMarkdown(content: string): ImageContent[] {
    const images: ImageContent[] = [];
    
    // Extract markdown image syntax: ![alt](url)
    const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = content.matchAll(markdownImagePattern);
    
    for (const match of matches) {
      images.push({
        imageUrl: match[2],
        imageType: this.detectImageType(match[1] || match[2]),
        relatedText: match[1] || '',
        position: { index: match.index || 0 }
      });
    }
    
    return images;
  }

  private extractImagesFromHTML(content: string): ImageContent[] {
    const images: ImageContent[] = [];
    
    // Extract HTML img tags
    const htmlImagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const matches = content.matchAll(htmlImagePattern);
    
    for (const match of matches) {
      images.push({
        imageUrl: match[1],
        imageType: this.detectImageType(match[0]),
        position: { index: match.index || 0 }
      });
    }
    
    return images;
  }

  private extractTablesFromText(content: string): TableContent[] {
    const tables: TableContent[] = [];
    
    // Simple table detection based on patterns
    const tablePatterns = [
      /(?:table|chart)\s*(?:#\d+)?\s*:?\s*([^\n]+)/gi,
      /(?:see|refer to)\s+(?:table|chart)\s*([^\n]+)/gi
    ];
    
    for (const pattern of tablePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        tables.push({
          tableData: [],
          headers: [],
          relatedText: match[1] || match[0],
          position: { index: match.index || 0 }
        });
      }
    }
    
    return tables;
  }

  private extractTablesFromMarkdown(content: string): TableContent[] {
    const tables: TableContent[] = [];
    
    // Extract markdown tables
    const tablePattern = /\|(.+)\|\n\|([-:\s|]+)\|\n((?:\|.+\|\n?)+)/g;
    const matches = content.matchAll(tablePattern);
    
    for (const match of matches) {
      const headers = match[1].split('|').map(h => h.trim()).filter(h => h);
      const rows = match[3].split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      tables.push({
        tableData: rows,
        headers,
        position: { index: match.index || 0 }
      });
    }
    
    return tables;
  }

  private extractTablesFromHTML(content: string): TableContent[] {
    const tables: TableContent[] = [];
    
    // Extract HTML table tags
    const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const matches = content.matchAll(tablePattern);
    
    for (const match of matches) {
      const tableContent = match[1];
      const headers = this.extractTableHeaders(tableContent);
      const rows = this.extractTableRows(tableContent);
      
      tables.push({
        tableData: rows,
        headers,
        position: { index: match.index || 0 }
      });
    }
    
    return tables;
  }

  private extractTableHeaders(tableContent: string): string[] {
    const headerPattern = /<th[^>]*>([^<]+)<\/th>/gi;
    const headers: string[] = [];
    const matches = tableContent.matchAll(headerPattern);
    
    for (const match of matches) {
      headers.push(match[1].trim());
    }
    
    return headers;
  }

  private extractTableRows(tableContent: string): any[][] {
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: any[][] = [];
    const matches = tableContent.matchAll(rowPattern);
    
    for (const match of matches) {
      const cellPattern = /<t[dh][^>]*>([^<]+)<\/t[dh]>/gi;
      const cells: string[] = [];
      const cellMatches = match[1].matchAll(cellPattern);
      
      for (const cellMatch of cellMatches) {
        cells.push(cellMatch[1].trim());
      }
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    
    return rows;
  }

  private extractTextFromHTML(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private detectImageType(imageRef: string): string {
    const lowerRef = imageRef.toLowerCase();
    
    if (lowerRef.includes('chart') || lowerRef.includes('graph')) {
      return 'chart';
    } else if (lowerRef.includes('table')) {
      return 'table';
    } else if (lowerRef.includes('diagram')) {
      return 'diagram';
    } else if (lowerRef.includes('figure')) {
      return 'figure';
    } else if (lowerRef.includes('photo') || lowerRef.includes('image')) {
      return 'photo';
    } else {
      return 'image';
    }
  }

  async processOCR(imageData: string): Promise<string> {
    // This would integrate with an OCR service
    // For now, return empty string
    console.log('OCR processing not implemented');
    return '';
  }

  async extractTextFromImage(imageUrl: string): Promise<string> {
    // This would download the image and process it with OCR
    // For now, return empty string
    console.log('Image text extraction not implemented');
    return '';
  }
} 