export interface ModelConfig {
  model: string;
  dimension: number;
  maxLength: number;
  localPath?: string;
}

export const embeddingModels: { [key: string]: ModelConfig } = {
  'all-MiniLM-L6-v2': {
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    dimension: 384,
    maxLength: 512
  },
  'bge-base-en-v1.5': {
    model: 'BAAI/bge-base-en-v1.5',
    dimension: 768,
    maxLength: 512
  }
};