import { ChunkingStrategy, Chunk, ChunkingOptions, QuestionAnswerPair } from '../../interfaces/ChunkingStrategy';

export class QuestionAnswerChunker implements ChunkingStrategy {
  async chunk(content: string, metadata: any, options: ChunkingOptions = {}): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    
    // Extract Q&A pairs from content
    const qaPairs = this.extractQuestionAnswerPairs(content);
    
    for (let i = 0; i < qaPairs.length; i++) {
      const pair = qaPairs[i];
      
      // Create question chunk
      if (pair.question.trim()) {
        const questionChunk: Chunk = {
          id: `qa_question_${i}_${Date.now()}`,
          content: pair.question.trim(),
          chunkType: 'question',
          keywords: await this.extractKeywords(pair.question),
          relatedChunks: [],
          metadata: {
            ...metadata,
            qaPairIndex: i,
            isQuestion: true,
            relatedAnswer: pair.answerChunkId
          }
        };
        chunks.push(questionChunk);
        pair.questionChunkId = questionChunk.id;
      }
      
      // Create answer chunk
      if (pair.answer.trim()) {
        const answerChunk: Chunk = {
          id: `qa_answer_${i}_${Date.now()}`,
          content: pair.answer.trim(),
          chunkType: 'answer',
          keywords: await this.extractKeywords(pair.answer),
          relatedChunks: pair.questionChunkId ? [pair.questionChunkId] : [],
          metadata: {
            ...metadata,
            qaPairIndex: i,
            isAnswer: true,
            relatedQuestion: pair.questionChunkId
          }
        };
        chunks.push(answerChunk);
        pair.answerChunkId = answerChunk.id;
        
        // Update question chunk with answer relationship
        if (pair.questionChunkId) {
          const questionChunk = chunks.find(c => c.id === pair.questionChunkId);
          if (questionChunk) {
            questionChunk.relatedChunks.push(answerChunk.id);
            questionChunk.relationshipWeights = {
              ...questionChunk.relationshipWeights,
              [answerChunk.id]: 0.9 // High weight for Q&A relationship
            };
          }
        }
      }
    }
    
    return chunks;
  }

  getName(): string {
    return 'QuestionAnswerChunker';
  }

  getDescription(): string {
    return 'Chunks content by separating questions and answers into distinct chunks with high-weight relationships';
  }

  private extractQuestionAnswerPairs(content: string): QuestionAnswerPair[] {
    const pairs: QuestionAnswerPair[] = [];
    
    // Common Q&A patterns
    const patterns = [
      // Pattern 1: Q1. Question A1. Answer
      /(?:Q|Question)\s*(\d+)[\.:]?\s*([^QA]+?)(?:A|Answer)\s*\1[\.:]?\s*([^QA]+)/gi,
      
      // Pattern 2: Question: ... Answer: ...
      /(?:Question|Q)[\s:]+([^A]+?)(?:Answer|A)[\s:]+([^Q]+)/gi,
      
      // Pattern 3: Q&A format
      /(?:Q&A|FAQ)[\s:]+([^A]+?)(?:A:?\s*)([^Q]+)/gi,
      
      // Pattern 4: Numbered questions and answers
      /(\d+)[\.:]?\s*([^?\n]+?\?)\s*([^?\n]+)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match.length >= 3) {
          pairs.push({
            question: match[1] || match[2] || '',
            answer: match[2] || match[3] || ''
          });
        }
      }
    }
    
    // If no structured patterns found, try to identify questions and answers
    if (pairs.length === 0) {
      pairs.push(...this.extractUnstructuredQA(content));
    }
    
    return pairs;
  }

  private extractUnstructuredQA(content: string): QuestionAnswerPair[] {
    const pairs: QuestionAnswerPair[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentQuestion = '';
    let currentAnswer = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line contains a question
      if (this.isQuestion(trimmedLine)) {
        // Save previous Q&A pair if exists
        if (currentQuestion && currentAnswer) {
          pairs.push({
            question: currentQuestion,
            answer: currentAnswer
          });
        }
        
        currentQuestion = trimmedLine;
        currentAnswer = '';
      } else if (currentQuestion && trimmedLine) {
        // Add to current answer
        currentAnswer += (currentAnswer ? '\n' : '') + trimmedLine;
      }
    }
    
    // Add the last pair
    if (currentQuestion && currentAnswer) {
      pairs.push({
        question: currentQuestion,
        answer: currentAnswer
      });
    }
    
    return pairs;
  }

  private isQuestion(text: string): boolean {
    const questionPatterns = [
      /\?$/, // Ends with question mark
      /^(what|who|where|when|why|how|which|whose|whom)\b/i, // Starts with question words
      /^(is|are|was|were|do|does|did|can|could|will|would|should|may|might)\s+\w+/i, // Starts with auxiliary verbs
      /^(question|q\.|q:)\s*\d*/i // Starts with "Question" or "Q."
    ];
    
    return questionPatterns.some(pattern => pattern.test(text));
  }

  private async extractKeywords(text: string): Promise<string[]> {
    // Simple keyword extraction for questions and answers
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
    
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
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    
    return stopWords.has(word);
  }
} 