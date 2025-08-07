import { ChunkingStrategy, Chunk, ChunkingOptions, ImageContent } from '../../interfaces/ChunkingStrategy';

export class MultiModalChunker implements ChunkingStrategy {
  async chunk(content: string, metadata: any, options: ChunkingOptions = {}): Promise<Chunk[]> {
    // This chunker is primarily for extracting images and visual content
    // It doesn't create text chunks, but rather processes visual elements
    return [];
  }

  async extractImages(content: string, metadata: any): Promise<Chunk[]> {
    const imageChunks: Chunk[] = [];
    
    // Extract image references from content
    const images = this.extractImageReferences(content);
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      const imageChunk: Chunk = {
        id: `image_${i}_${Date.now()}`,
        content: image.relatedText || '',
        chunkType: 'image',
        keywords: await this.extractKeywordsFromImage(image),
        relatedChunks: [],
        metadata: {
          ...metadata,
          imageUrl: image.imageUrl,
          imageType: image.imageType,
          imageData: image.imageData,
          ocrText: image.ocrText,
          position: image.position,
          isImage: true,
          imageIndex: i
        }
      };
      
      imageChunks.push(imageChunk);
    }
    
    return imageChunks;
  }

  getName(): string {
    return 'MultiModalChunker';
  }

  getDescription(): string {
    return 'Extracts and processes images, charts, and visual content with OCR capabilities';
  }

  private extractImageReferences(content: string): ImageContent[] {
    const images: ImageContent[] = [];
    
    // Extract image URLs and references
    const imagePatterns = [
      // Markdown image syntax: ![alt](url)
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      // HTML img tags
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
      // Image references in text
      /(?:image|figure|chart|table|diagram)\s*(?:#\d+)?\s*:?\s*([^\n]+)/gi,
      // Base64 encoded images
      /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g
    ];
    
    for (const pattern of imagePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const imageContent: ImageContent = {
          id: `img_${images.length}_${Date.now()}`,
          imageUrl: match[1] || match[0],
          imageType: this.detectImageType(match[0] || match[1] || ''),
          relatedText: this.extractRelatedText(content, match.index || 0),
          position: { index: match.index || 0 }
        };
        
        images.push(imageContent);
      }
    }
    
    return images;
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

  private extractRelatedText(content: string, imageIndex: number): string {
    // Extract text around the image reference
    const contextSize = 200;
    const start = Math.max(0, imageIndex - contextSize);
    const end = Math.min(content.length, imageIndex + contextSize);
    
    return content.slice(start, end).trim();
  }

  private async extractKeywordsFromImage(image: ImageContent): Promise<string[]> {
    const keywords: string[] = [];
    
    // Extract keywords from related text
    if (image.relatedText) {
      const textKeywords = this.extractKeywordsFromText(image.relatedText);
      keywords.push(...textKeywords);
    }
    
    // Extract keywords from OCR text
    if (image.ocrText) {
      const ocrKeywords = this.extractKeywordsFromText(image.ocrText);
      keywords.push(...ocrKeywords);
    }
    
    // Add image type as keyword
    if (image.imageType) {
      keywords.push(image.imageType);
    }
    
    // Remove duplicates and return
    return [...new Set(keywords)];
  }

  private extractKeywordsFromText(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    // Count frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([word, _]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'image', 'figure', 'chart', 'table', 'diagram', 'photo', 'picture'
    ]);
    
    return stopWords.has(word);
  }

  // Method to process OCR for images (would integrate with OCR service)
  async processOCR(imageUrl: string): Promise<string> {
    // This would integrate with an OCR service like Tesseract.js or cloud OCR
    // For now, return empty string
    return '';
  }

  // Method to generate embeddings for images (would integrate with vision models)
  async generateImageEmbedding(imageData: string): Promise<number[]> {
    // This would integrate with vision models like CLIP or similar
    // For now, return empty array
    return [];
  }
} 