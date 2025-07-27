export interface SearchResult {
  id: string;
  document: string;
  chunk_number: number;
  content: string;
  similarity: number;
}

export interface SearchResultsProps {
  results: SearchResult[];
}

export interface Search {
  searchId: string;
  query: string;
  results: SearchResult[];
  llmResponse: string;
  expandedQueries: string[];
  timestamp: string;
  responseTime: number;
  tokenSize: number;
}

export interface Chat {
  chatId: string;
  startTime: string;
  lastMessageTime: string;
  searches: Search[];
  title: string;
}