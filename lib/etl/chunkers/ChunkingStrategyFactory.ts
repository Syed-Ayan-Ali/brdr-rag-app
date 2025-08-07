import { ChunkingStrategy, ChunkingOptions, DocumentInfo } from './ChunkingStrategy';
import { StandardChunker } from './StandardChunker';
import { HierarchicalChunker } from './HierarchicalChunker';
import { SemanticChunker } from './SemanticChunker';
import { logger, LogCategory } from '../../logging/Logger';

export class ChunkingStrategyFactory {
  private strategies: ChunkingStrategy[] = [
    new StandardChunker(),
    new HierarchicalChunker(),
    new SemanticChunker()
  ];

  async selectStrategy(content: DocumentInfo, options?: ChunkingOptions): Promise<ChunkingStrategy> {
    logger.info(LogCategory.SYSTEM, `Selecting chunking strategy for document: ${content.docId}`);
    
    // Q0. Does the text have meaning?
    if (!this.hasMeaningfulContent(content)) {
      logger.info(LogCategory.SYSTEM, `Document ${content.docId} has no meaningful content`);
      
      // Q4. Does the document have structure?
      if (this.hasStructuredContent(content)) {
        logger.info(LogCategory.SYSTEM, `Using hierarchical chunking for structured document: ${content.docId}`);
        return new HierarchicalChunker();
      } else {
        logger.info(LogCategory.SYSTEM, `Using standard chunking for unstructured document: ${content.docId}`);
        return new StandardChunker();
      }
    }

    // Q1. Are you using LLMs?
    if (this.isLLMAvailable()) {
      logger.info(LogCategory.SYSTEM, `Using proposition-based semantic chunking with LLM for: ${content.docId}`);
      return new SemanticChunker();
    }

    // Q2. Is it important to maintain sentence order?
    if (!this.isOrderImportant(content)) {
      logger.info(LogCategory.SYSTEM, `Using clustering-based semantic chunking for: ${content.docId}`);
      return new SemanticChunker();
    }

    // Q3. Is it important to consider sentences beyond the adjacent ones?
    if (this.needsNonAdjacentAnalysis(content)) {
      logger.info(LogCategory.SYSTEM, `Using double-pass semantic chunking for: ${content.docId}`);
      return new SemanticChunker();
    } else {
      logger.info(LogCategory.SYSTEM, `Using standard deviation semantic chunking for: ${content.docId}`);
      return new SemanticChunker();
    }
  }

  private hasMeaningfulContent(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    
    // Check for meaningful content indicators
    const hasHeadings = /\b\d+\.\s|\b[A-Z][A-Z\s]{2,}\b|\b(Chapter|Section|Part)\b/i.test(text);
    const hasStructuredLists = /\b\d+\.\d+\.\d+|\b[a-z]\)\s|\b[A-Z]\)\s/.test(text);
    const hasMeaningfulLength = text.length > 1000;
    const hasRegulatoryContent = /\b(regulation|guideline|policy|requirement|compliance|supervision)\b/i.test(text);
    const hasTechnicalContent = /\b(procedure|method|process|algorithm|implementation)\b/i.test(text);
    
    return hasHeadings || hasStructuredLists || hasMeaningfulLength || hasRegulatoryContent || hasTechnicalContent;
  }

  private hasStructuredContent(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    
    // Check for hierarchical structure patterns
    const hierarchicalPatterns = [
      /\b\d+\.\d+\.\d+\.\d+\b/, // 1.1.1.1
      /\b\d+\.\d+\.\d+\b/,      // 1.1.1
      /\b\d+\.\d+\b/,           // 1.1
      /\bChapter\s+\d+\b/i,     // Chapter 1
      /\bSection\s+\d+\b/i,     // Section 1
      /\bPart\s+\d+\b/i         // Part 1
    ];
    
    return hierarchicalPatterns.some(pattern => pattern.test(text));
  }

  private isLLMAvailable(): boolean {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }

  private isOrderImportant(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    
    // Check for sequential information that needs to maintain order
    const hasSequentialPatterns = /\b(First|Second|Third|Finally|Next|Then|Therefore|However|Subsequently)\b/i.test(text);
    const hasNumberedLists = /\b\d+\.\s|\b[a-z]\)\s|\b[A-Z]\)\s/.test(text);
    const hasProceduralContent = /\b(Step|Procedure|Process|Method|Algorithm|Implementation)\b/i.test(text);
    const hasCausalRelations = /\b(Because|Since|As a result|Consequently|Thus|Hence)\b/i.test(text);
    
    return hasSequentialPatterns || hasNumberedLists || hasProceduralContent || hasCausalRelations;
  }

  private needsNonAdjacentAnalysis(content: DocumentInfo): boolean {
    const text = content.bodyContent.join(' ');
    
    // Check for complex document structure that might have interruptions
    const hasQuotes = /"[^"]*"/.test(text);
    const hasFormulas = /\$[^$]*\$|\\\([^)]*\\\)/.test(text);
    const hasInterruptions = /\b(Note|Remark|Example|Case Study|Footnote|Appendix)\b/i.test(text);
    const hasTables = /\|.*\|/.test(text);
    const hasComplexStructure = /\b(However|Nevertheless|On the other hand|In contrast)\b/i.test(text);
    
    return hasQuotes || hasFormulas || hasInterruptions || hasTables || hasComplexStructure;
  }

  async chunkDocument(content: DocumentInfo, options?: ChunkingOptions): Promise<any[]> {
    const strategy = await this.selectStrategy(content, options);
    return await strategy.chunk(content, options);
  }

  getAvailableStrategies(): ChunkingStrategy[] {
    return this.strategies;
  }

  getStrategyByName(name: string): ChunkingStrategy | null {
    return this.strategies.find(strategy => strategy.name === name) || null;
  }
}

