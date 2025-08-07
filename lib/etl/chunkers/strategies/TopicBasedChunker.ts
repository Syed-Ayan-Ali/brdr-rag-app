import { ChunkingStrategy, Chunk, ChunkingOptions, TopicSection } from '../../interfaces/ChunkingStrategy';

export class TopicBasedChunker implements ChunkingStrategy {
  async chunk(content: string, metadata: any, options: ChunkingOptions = {}): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    
    // Extract topic sections from content
    const topicSections = this.extractTopicSections(content);
    
    for (let i = 0; i < topicSections.length; i++) {
      const section = topicSections[i];
      
      // Create main topic chunk
      const topicChunk: Chunk = {
        id: `topic_${i}_${Date.now()}`,
        content: section.content,
        chunkType: 'topic',
        keywords: section.keywords,
        relatedChunks: [],
        metadata: {
          ...metadata,
          topic: section.topic,
          topicIndex: i,
          subsectionCount: section.subsections?.length || 0
        }
      };
      chunks.push(topicChunk);
      
      // Create subsection chunks if they exist
      if (section.subsections) {
        for (let j = 0; j < section.subsections.length; j++) {
          const subsection = section.subsections[j];
          const subsectionChunk: Chunk = {
            id: `subsection_${i}_${j}_${Date.now()}`,
            content: subsection.content,
            chunkType: 'subsection',
            keywords: subsection.keywords,
            relatedChunks: [topicChunk.id],
            metadata: {
              ...metadata,
              parentTopic: section.topic,
              topicIndex: i,
              subsectionIndex: j,
              parentChunkId: topicChunk.id
            }
          };
          chunks.push(subsectionChunk);
          
          // Update topic chunk with subsection relationship
          topicChunk.relatedChunks.push(subsectionChunk.id);
          topicChunk.relationshipWeights = {
            ...topicChunk.relationshipWeights,
            [subsectionChunk.id]: 0.7 // Medium-high weight for topic-subsection relationship
          };
        }
      }
    }
    
    return chunks;
  }

  getName(): string {
    return 'TopicBasedChunker';
  }

  getDescription(): string {
    return 'Chunks content by topics and subsections, maintaining hierarchical relationships';
  }

  private extractTopicSections(content: string): TopicSection[] {
    const sections: TopicSection[] = [];
    const lines = content.split('\n');
    
    let currentTopic = '';
    let currentContent = '';
    let currentSubsections: TopicSection[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line is a topic heading
      if (this.isTopicHeading(trimmedLine)) {
        // Save previous topic if exists
        if (currentTopic && currentContent) {
          sections.push({
            topic: currentTopic,
            content: currentContent,
            keywords: this.extractKeywordsFromText(currentContent),
            subsections: currentSubsections.length > 0 ? currentSubsections : undefined
          });
        }
        
        currentTopic = trimmedLine;
        currentContent = '';
        currentSubsections = [];
      } else if (this.isSubsectionHeading(trimmedLine)) {
        // Save current content as subsection
        if (currentContent.trim()) {
          currentSubsections.push({
            topic: trimmedLine,
            content: currentContent,
            keywords: this.extractKeywordsFromText(currentContent)
          });
          currentContent = '';
        }
      } else if (trimmedLine) {
        // Add to current content
        currentContent += (currentContent ? '\n' : '') + trimmedLine;
      }
    }
    
    // Add the last topic
    if (currentTopic && currentContent) {
      sections.push({
        topic: currentTopic,
        content: currentContent,
        keywords: this.extractKeywordsFromText(currentContent),
        subsections: currentSubsections.length > 0 ? currentSubsections : undefined
      });
    }
    
    return sections;
  }

  private isTopicHeading(line: string): boolean {
    const topicPatterns = [
      /^(chapter|section|topic|subject)\s*\d+[\.:]?\s*\w+/i,
      /^(heading|title)\s*:\s*\w+/i,
      /^[A-Z][A-Z\s]{3,}$/, // All caps headings
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/, // Title case headings
      /^\d+\.\s+[A-Z][a-z]+/ // Numbered headings
    ];
    
    return topicPatterns.some(pattern => pattern.test(line));
  }

  private isSubsectionHeading(line: string): boolean {
    const subsectionPatterns = [
      /^\d+\.\d+\s+[A-Z][a-z]+/, // Subsection numbering (1.1, 1.2, etc.)
      /^[a-z]\)\s+[A-Z][a-z]+/, // Lettered subsections (a), b), etc.)
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/, // Title case (but shorter than main topics)
      /^[A-Z][A-Z\s]{2,}$/ // All caps (but shorter than main topics)
    ];
    
    return subsectionPatterns.some(pattern => pattern.test(line));
  }

  private extractKeywordsFromText(text: string): string[] {
    // Enhanced keyword extraction for topics
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
      .slice(0, 8)
      .map(([word, _]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'chapter', 'section', 'topic', 'subject', 'heading', 'title', 'content', 'information'
    ]);
    
    return stopWords.has(word);
  }
} 