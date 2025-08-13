/**
 * Interface for agentic chunker results that maps directly to the optimized database schema
 */
export interface AgenticChunkResult {
  // Core chunk information
  doc_id: string;
  document_id: string; // UUID reference to brdr_documents
  chunk_id: number;
  content: string;
  
  // Chunk classification
  chunk_type: 'header' | 'footer' | 'body' | 'mixed' | 'introduction' | 'main_content' | 'conclusion' | 'definition' | 'procedure' | 'example' | 'reference';
  
  // AI-generated metadata arrays
  keywords: string[];
  related_chunks: string[];
  
  // AI-generated descriptions
  context_extension: string;
  nlp_chunk_description: string;
  chunk_description: string;
  
  // Relationship data
  relationship_weights: { [chunkId: string]: number };
  
  // Standard metadata
  metadata: {
    chunk_title: string;
    semantic_summary: string;
    content_type: string;
    complexity_score: number;
    importance_score: number;
    topics: string[];
    concepts: string[];
    chunk_groups: string[];
    page_number: number;
    word_count: number;
    char_count: number;
    has_tables: boolean;
    has_images: boolean;
    section_type?: string;
    chunking_strategy: string;
    nlp_queries: string[];
  };
}

/**
 * Factory function to convert ChunkInfo to AgenticChunkResult
 */
export function convertToAgenticChunkResult(
  chunkInfo: any, 
  docId: string, 
  documentId: string, 
  chunkIndex: number
): AgenticChunkResult {
  const agenticMetadata = chunkInfo.metadata?.agenticMetadata;
  
  return {
    doc_id: docId,
    document_id: documentId,
    chunk_id: chunkIndex,
    content: chunkInfo.content,
    chunk_type: chunkInfo.chunkType,
    keywords: agenticMetadata?.keywords || [],
    related_chunks: agenticMetadata?.related_chunks || [],
    context_extension: agenticMetadata?.context_extension || '',
    nlp_chunk_description: Array.isArray(agenticMetadata?.nlp_chunk_description) 
      ? agenticMetadata.nlp_chunk_description.join('; ')
      : agenticMetadata?.nlp_chunk_description || '',
    chunk_description: agenticMetadata?.chunk_description || '',
    relationship_weights: agenticMetadata?.relationship_weights || {},
    metadata: {
      chunk_title: agenticMetadata?.chunk_title || `Chunk ${chunkIndex}`,
      semantic_summary: agenticMetadata?.semantic_summary || '',
      content_type: agenticMetadata?.content_type || 'main_content',
      complexity_score: agenticMetadata?.complexity_score || 0.5,
      importance_score: agenticMetadata?.importance_score || 0.5,
      topics: agenticMetadata?.topics || [],
      concepts: agenticMetadata?.concepts || [],
      chunk_groups: agenticMetadata?.chunk_groups || [],
      page_number: chunkInfo.pageNumber || 1,
      word_count: chunkInfo.metadata?.wordCount || chunkInfo.content.split(' ').length,
      char_count: chunkInfo.metadata?.charCount || chunkInfo.content.length,
      has_tables: chunkInfo.metadata?.hasTables || false,
      has_images: chunkInfo.metadata?.hasImages || false,
      section_type: chunkInfo.metadata?.sectionType,
      chunking_strategy: 'agentic',
      nlp_queries: agenticMetadata?.nlp_chunk_description || []
    }
  };
}
