export interface QueryMetrics {
  queryTime: number;
  toolsCalled: string[];
  tokenCount: number;
  documentsRetrieved: string[];
  searchStrategy: string;
}

export interface DocumentLink {
  docId: string;
  url: string;
  title?: string;
}

// Generate document URL from doc ID
export function generateDocumentUrl(docId: string): string {
  return `https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/${docId}/${docId}.pdf`;
}

// Format metrics for display
export function formatMetrics(metrics: QueryMetrics): string {
  const toolNames = metrics.toolsCalled.map(tool => {
    switch (tool) {
      case 'searchDocuments': return 'Document Search';
      case 'clarifyQuery': return 'Query Clarification';
      case 'analyzeDocument': return 'Document Analysis';
      case 'manageContext': return 'Context Management';
      case 'refineQuery': return 'Query Refinement';
      default: return tool;
    }
  });

  return `
⏱️ Response Time: ${metrics.queryTime}ms
🔧 Tools Used: ${toolNames.join(', ') || 'None'}
📝 Tokens Used: ${metrics.tokenCount}
  `.trim();
}

// Format document links for display
export function formatDocumentLinks(documents: string[]): DocumentLink[] {
  return documents.map(docId => ({
    docId,
    url: generateDocumentUrl(docId),
    title: `Document ${docId}`
  }));
} 