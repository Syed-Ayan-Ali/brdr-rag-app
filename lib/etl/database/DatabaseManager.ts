import { prisma } from '../../prisma';
import { KnowledgeGraphRelationship } from '../interfaces/ChunkingStrategy';

export interface KeywordData {
  keyword: string;
  weight: number;
  frequency: number;
  concept?: string;
}

export interface RelationshipData {
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  metadata?: any;
}

export interface ConceptData {
  concept: string;
  relatedKeywords: string[];
  weight: number;
}

export class DatabaseManager {
  async storeDocument(document: any): Promise<string> {
    console.log(`[AUDIT] Storing document: ${document.doc_id}`);
    console.log(`[AUDIT] Document content length: ${document.content?.length || 0} characters`);
    
    try {
      const result = await prisma.brdr_documents.create({
        data: {
          doc_id: document.doc_id,
          content: document.content,
          source: document.source,
          metadata: document.metadata,
          
          // BRDR-specific fields
          doc_uuid: document.doc_uuid,
          doc_type_code: document.doc_type_code,
          doc_type_desc: document.doc_type_desc,
          version_code: document.version_code,
          doc_long_title: document.doc_long_title,
          doc_desc: document.doc_desc,
          issue_date: document.issue_date ? new Date(document.issue_date) : null,
          guideline_no: document.guideline_no,
          supersession_date: document.supersession_date ? new Date(document.supersession_date) : null,
          
          // BRDR-specific arrays
          doc_topic_subtopic_list: document.doc_topic_subtopic_list,
          doc_keyword_list: document.doc_keyword_list,
          doc_ai_type_list: document.doc_ai_type_list,
          doc_view_list: document.doc_view_list,
          directly_related_doc_list: document.directly_related_doc_list,
          version_history_doc_list: document.version_history_doc_list,
          reference_doc_list: document.reference_doc_list,
          superseded_doc_list: document.superseded_doc_list,
          
          // Enhanced fields for knowledge graph
          keywords: document.keywords || [],
          topics: document.topics || [],
          concepts: document.concepts || [],
          summary: document.summary,
          document_type: document.document_type,
          language: document.language || 'en'
        }
      });

      console.log(`[AUDIT] Document stored successfully with ID: ${result.id}`);
      
      // Store topics if provided
      if (document.topics && document.topics.length > 0) {
        await this.storeDocumentTopics(result.id, document.topics);
      }
      
      // Store concepts if provided
      if (document.concepts && document.concepts.length > 0) {
        await this.storeDocumentConcepts(result.id, document.concepts);
      }
      
      return result.id;
    } catch (error) {
      console.error(`[AUDIT] Error storing document ${document.doc_id}:`, error);
      throw error;
    }
  }

  async storeChunk(chunk: any, documentId: string): Promise<string> {
    console.log(`[AUDIT] Storing chunk: ${chunk.doc_id}:${chunk.chunk_id}`);
    console.log(`[AUDIT] Chunk content length: ${chunk.content?.length || 0} characters`);
    
    try {
      const result = await prisma.brdr_documents_data.upsert({
        where: {
          doc_id_chunk_id: {
            doc_id: chunk.doc_id,
            chunk_id: chunk.chunk_id
          }
        },
        update: {
          content: chunk.content,
          metadata: chunk.metadata,
          chunk_type: chunk.chunk_type,
          keywords: chunk.keywords || [],
          related_chunks: chunk.relatedChunks || [],
          context_extension: chunk.contextExtension,
          relationship_weights: chunk.relationshipWeights,
          semantic_score: chunk.semanticScore
        },
        create: {
          doc_id: chunk.doc_id,
          document_id: documentId,
          chunk_id: chunk.chunk_id,
          content: chunk.content,
          metadata: chunk.metadata,
          chunk_type: chunk.chunk_type,
          keywords: chunk.keywords || [],
          related_chunks: chunk.relatedChunks || [],
          context_extension: chunk.contextExtension,
          relationship_weights: chunk.relationshipWeights,
          semantic_score: chunk.semanticScore
        }
      });

      console.log(`[AUDIT] Chunk stored successfully with ID: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error(`[AUDIT] Error storing chunk ${chunk.doc_id}:${chunk.chunk_id}:`, error);
      throw error;
    }
  }

  async storeKeyword(keywordData: KeywordData): Promise<void> {
    try {
      await prisma.keywords.upsert({
        where: { keyword: keywordData.keyword },
        update: {
          weight: keywordData.weight,
          frequency: keywordData.frequency,
          concept: keywordData.concept
        },
        create: {
          keyword: keywordData.keyword,
          weight: keywordData.weight,
          frequency: keywordData.frequency,
          concept: keywordData.concept
        }
      });
    } catch (error) {
      console.error('Error storing keyword:', error);
      throw error;
    }
  }

  async storeRelationship(relationship: RelationshipData): Promise<void> {
    try {
      await prisma.chunk_relationships.upsert({
        where: {
          source_chunk_id_target_chunk_id_relationship_type: {
            source_chunk_id: relationship.sourceId,
            target_chunk_id: relationship.targetId,
            relationship_type: relationship.type
          }
        },
        update: {
          weight: relationship.weight,
          metadata: relationship.metadata
        },
        create: {
          source_chunk_id: relationship.sourceId,
          target_chunk_id: relationship.targetId,
          relationship_type: relationship.type,
          weight: relationship.weight,
          metadata: relationship.metadata
        }
      });
    } catch (error) {
      console.error('Error storing relationship:', error);
      throw error;
    }
  }

  async storeConcept(concept: string, relatedKeywords: string[]): Promise<void> {
    try {
      await prisma.keywords.upsert({
        where: { keyword: concept },
        update: {
          concept: concept,
          frequency: relatedKeywords.length
        },
        create: {
          keyword: concept,
          concept: concept,
          weight: 1.0,
          frequency: relatedKeywords.length
        }
      });
    } catch (error) {
      console.error('Error storing concept:', error);
      throw error;
    }
  }

  async storeDocumentTopics(documentId: string, topics: string[]): Promise<void> {
    try {
      for (const topic of topics) {
        // Extract topic and subtopic from BRDR format
        const [topicDesc, subtopicDesc] = topic.split(': ');
        
        // Create or update topic
        const topicRecord = await prisma.topics.upsert({
          where: { topic_code: topic },
          update: {
            topic_desc: topicDesc || topic,
            subtopic_desc: subtopicDesc || null
          },
          create: {
            topic_code: topic,
            topic_desc: topicDesc || topic,
            subtopic_desc: subtopicDesc || null,
            topic_subtopic_desc: topic
          }
        });

        // Create document-topic mapping
        await prisma.document_topics.upsert({
          where: {
            document_id_topic_id: {
              document_id: documentId,
              topic_id: topicRecord.id
            }
          },
          update: {
            weight: 1.0
          },
          create: {
            document_id: documentId,
            topic_id: topicRecord.id,
            weight: 1.0
          }
        });
      }
    } catch (error) {
      console.error('Error storing document topics:', error);
      throw error;
    }
  }

  async storeDocumentConcepts(documentId: string, concepts: string[]): Promise<void> {
    try {
      for (const concept of concepts) {
        // Create or update concept
        const conceptRecord = await prisma.concepts.upsert({
          where: { concept_name: concept },
          update: {
            weight: 1.0
          },
          create: {
            concept_name: concept,
            concept_type: 'regulatory', // Default type
            weight: 1.0
          }
        });

        // Create document-concept mapping
        await prisma.document_concepts.upsert({
          where: {
            document_id_concept_id: {
              document_id: documentId,
              concept_id: conceptRecord.id
            }
          },
          update: {
            weight: 1.0
          },
          create: {
            document_id: documentId,
            concept_id: conceptRecord.id,
            weight: 1.0
          }
        });
      }
    } catch (error) {
      console.error('Error storing document concepts:', error);
      throw error;
    }
  }

  async storeImageContent(imageData: any): Promise<string> {
    try {
      const result = await prisma.image_content.create({
        data: {
          document_id: imageData.document_id,
          chunk_id: imageData.chunk_id,
          image_url: imageData.image_url,
          image_data: imageData.image_data,
          ocr_text: imageData.ocr_text,
          image_type: imageData.image_type,
          position: imageData.position,
          related_text: imageData.related_text
          // Note: embedding field is handled by Prisma as Unsupported("vector")
          // We'll store it separately if needed
        }
      });

      return result.id;
    } catch (error) {
      console.error('Error storing image content:', error);
      throw error;
    }
  }

  async searchChunks(
    query: string,
    options: {
      limit?: number;
      minSimilarity?: number;
      includeRelationships?: boolean;
      useKnowledgeGraph?: boolean;
    } = {}
  ): Promise<any[]> {
    const {
      limit = 10,
      minSimilarity = 0.3,
      includeRelationships = true,
      useKnowledgeGraph = false
    } = options;

    try {
      // For now, use a simple text search since vector search requires special setup
      const chunks = await prisma.brdr_documents_data.findMany({
        where: {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          brdr_documents: true,
          chunk_keywords: includeRelationships ? {
            include: {
              keywords: true
            }
          } : false
        },
        take: limit,
        orderBy: {
          semantic_score: 'desc'
        }
      });

      return chunks;
    } catch (error) {
      console.error('Error searching chunks:', error);
      throw error;
    }
  }

  async getRelatedChunks(chunkId: string, limit: number = 5): Promise<any[]> {
    try {
      const relationships = await prisma.chunk_relationships.findMany({
        where: {
          OR: [
            { source_chunk_id: chunkId },
            { target_chunk_id: chunkId }
          ],
          weight: {
            gte: 0.3
          }
        },
        include: {
          source_chunk: true,
          target_chunk: true
        },
        orderBy: {
          weight: 'desc'
        },
        take: limit
      });

      return relationships;
    } catch (error) {
      console.error('Error getting related chunks:', error);
      throw error;
    }
  }

  async getKeywordsForChunk(chunkId: string): Promise<any[]> {
    try {
      const keywords = await prisma.chunk_keywords.findMany({
        where: {
          chunk_id: chunkId
        },
        include: {
          keyword: true
        },
        orderBy: {
          weight: 'desc'
        }
      });

      return keywords;
    } catch (error) {
      console.error('Error getting keywords for chunk:', error);
      throw error;
    }
  }

  async getConceptsForDocument(docId: string): Promise<any[]> {
    try {
      const concepts = await prisma.keywords.findMany({
        where: {
          concept: {
            not: null
          },
          document_keywords: {
            some: {
              document_id: docId
            }
          }
        }
      });

      return concepts;
    } catch (error) {
      console.error('Error getting concepts for document:', error);
      throw error;
    }
  }

  async updateChunkRelationships(chunkId: string, relationships: any[]): Promise<void> {
    try {
      // Delete existing relationships
      await prisma.chunk_relationships.deleteMany({
        where: {
          OR: [
            { source_chunk_id: chunkId },
            { target_chunk_id: chunkId }
          ]
        }
      });

      // Insert new relationships
      if (relationships.length > 0) {
        await prisma.chunk_relationships.createMany({
          data: relationships
        });
      }
    } catch (error) {
      console.error('Error updating chunk relationships:', error);
      throw error;
    }
  }

  async checkDocumentExists(docId: string): Promise<boolean> {
    try {
      const document = await prisma.brdr_documents.findFirst({
        where: { doc_id: docId }
      });
      return document !== null;
    } catch (error) {
      console.error('Error checking document existence:', error);
      return false;
    }
  }

  async getDocumentById(documentId: string): Promise<any> {
    try {
      const document = await prisma.brdr_documents.findUnique({
        where: { id: documentId }
      });
      return document;
    } catch (error) {
      console.error('Error getting document by ID:', error);
      return null;
    }
  }

  async getKnowledgeGraphStats(): Promise<any> {
    try {
      const [chunkCount, keywordCount, relationshipCount, conceptCount] = await Promise.all([
        prisma.brdr_documents_data.count(),
        prisma.keywords.count(),
        prisma.chunk_relationships.count(),
        prisma.keywords.count({
          where: {
            concept: {
              not: null
            }
          }
        })
      ]);

      return {
        chunks: chunkCount,
        keywords: keywordCount,
        relationships: relationshipCount,
        concepts: conceptCount
      };
    } catch (error) {
      console.error('Error getting knowledge graph stats:', error);
      throw error;
    }
  }
} 