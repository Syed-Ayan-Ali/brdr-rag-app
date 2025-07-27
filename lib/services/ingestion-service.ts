import { VectorRepository } from '@/lib/repositories/vector-repository';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { BackgroundTaskQueue } from '@/lib/utils/background-task-queue';
import { retry } from '@/utils/retry';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

// Define the document interface for type safety
interface BRDRDocument {
  docId: string;
  docLongTitle: string;
  issueDate: string;
  docTypeDesc: string;
  docTopicSubtopicList: { topicDesc: string; subtopicDesc: string }[];
}

// Define the API response interface
interface BRDRResponse {
  langCode: string;
  pageNumber: number;
  pageSize: number;
  totalRecordNumber: number;
  sortBy: string;
  resultList: BRDRDocument[];
}

export class IngestionService {
  private readonly vectorRepository: VectorRepository;
  private readonly taskQueue: BackgroundTaskQueue;
  private readonly apiUrl = 'https://brdr.hkma.gov.hk/restapi/doc-search';
  private readonly pageSize = 100;

  constructor() {
    this.vectorRepository = new VectorRepository();
    this.taskQueue = BackgroundTaskQueue.getInstance();
  }

  async ingestBRDRData(): Promise<void> {
    try {
      console.log('Starting BRDR data ingestion...');
      let pageNumber = 1;
      let totalRecords = 0;

      while (true) {
        console.log(`Fetching page ${pageNumber}...`);
        const response = await this.fetchPage(pageNumber);

        // Update total records on first page
        if (pageNumber === 1) {
          totalRecords = response.totalRecordNumber;
          console.log(`Total records to fetch: ${totalRecords}`);
        }

        const documents = response.resultList || [];
        if (documents.length === 0) {
          console.log('No more documents to fetch.');
          break;
        }

        // Enqueue ingestion tasks for each document
        for (const doc of documents) {
          this.taskQueue.enqueue(async () => {
            await retry(async () => {
              // Create content string for embedding
              const content = this.formatDocumentContent(doc);
              const embedding = await generateEmbedding(content);
              await this.vectorRepository.insert({
                id: doc.docId,
                content,
                source: 'BRDRAPI',
                embedding,
                metadata: {
                  timestamp: new Date().toISOString(),
                  docId: doc.docId,
                  issueDate: doc.issueDate,
                  type: doc.docTypeDesc,
                  topics: doc.docTopicSubtopicList.map(t => `${t.topicDesc}: ${t.subtopicDesc}`),
                },
              });
              console.log(`Ingested document: ${doc.docId}`);
            });
          });
        }

        // Check if there are more pages
        pageNumber++;
        if ((pageNumber - 1) * this.pageSize >= totalRecords) {
          console.log('All pages fetched.');
          break;
        }
      }

      console.log('BRDR ingestion completed.');
    } catch (error) {
      console.error('BRDR ingestion failed:', error);
      throw new Error(`BRDR ingestion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchPage(pageNumber: number): Promise<BRDRResponse> {
    try {
//       const cookie = process.env.BRDR_COOKIE;
//       if (!cookie) {
//         throw new Error('BRDR_COOKIE environment variable is not set.');
//       }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json', // Changed from text/plain to match JSON response
        //   Cookie: cookie,
        } as HeadersInit,
        body: JSON.stringify({
          langCode: 'eng',
          pageNumber: pageNumber.toString(),
          pageSize: this.pageSize.toString(),
          sortBy: 'RELEVANCE',
          docSrchCriteriaDtoList: [
            { fieldCode: 'version', valueList: ['CURRENT'] },
            { fieldCode: 'language', valueList: ['eng'] },
            { fieldCode: 'issueDateGrp', valueList: ['ALL'] },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch page ${pageNumber}:`, error);
      throw error;
    }
  }

  private formatDocumentContent(doc: BRDRDocument): string {
    // Format document content for embedding
    const topics = doc.docTopicSubtopicList
      .map(t => `${t.topicDesc} - ${t.subtopicDesc}`)
      .join('; ');
    return `${doc.docLongTitle}\nType: ${doc.docTypeDesc}\nIssue Date: ${doc.issueDate}\nTopics: ${topics}`;
  }

  // Placeholder for future Confluence ingestion
  async ingestConfluenceData(spaceKey: string, apiToken: string): Promise<void> {
    console.log(`Ingesting Confluence data for space: ${spaceKey}`);
    // Implement Confluence API integration here
  }
}