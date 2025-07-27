import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/db/supabase';
import { retry } from '@/utils/retry';

export class VectorRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async insert(document: { id: string; content: string; source: string; embedding: number[]; metadata: object }) {
    return await retry(async () => {
      await this.prisma.document.create({
        data: {
          id: document.id,
          content: document.content,
          source: document.source,
          embedding: document.embedding,
          metadata: document.metadata,
        },
      });
    });
  }

  async searchByCosineSimilarity(embedding: number[], limit: number = 3) {
    return await retry(async () => {
      const { data, error } = await supabase
        .rpc('search_documents', {
          query_embedding: embedding,
          match_limit: limit,
          similarity_threshold: 0.3,
        });
      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }
      return data || [];
    });
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}