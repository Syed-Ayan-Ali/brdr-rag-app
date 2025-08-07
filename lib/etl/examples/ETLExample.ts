import { ETLPipeline, ETLPipelineOptions } from '../processors/ETLPipeline';
import { DatabaseManager } from '../database/DatabaseManager';

export class ETLExample {
  private pipeline: ETLPipeline;
  private databaseManager: DatabaseManager;

  constructor() {
    this.pipeline = new ETLPipeline();
    this.databaseManager = new DatabaseManager();
  }

  async runExample(): Promise<void> {
    console.log('🚀 Starting Enhanced ETL Pipeline Example');
    console.log('==========================================');

    // Example 1: Process a single document with smart chunking
    await this.exampleSingleDocument();

    // Example 2: Process multiple documents with batch processing
    await this.exampleBatchProcessing();

    // Example 3: Demonstrate different chunking strategies
    await this.exampleChunkingStrategies();

    // Example 4: Show knowledge graph capabilities
    await this.exampleKnowledgeGraph();

    // Example 5: Demonstrate enhanced search capabilities
    await this.exampleEnhancedSearch();

    console.log('\n✅ ETL Pipeline Example Completed!');
  }

  private async exampleSingleDocument(): Promise<void> {
    console.log('\n📄 Example 1: Processing Single Document');
    console.log('----------------------------------------');

    const document = {
      doc_id: 'example_doc_001',
      content: `
        # Financial Regulations Overview

        ## Question 1: What are the key requirements for financial reporting?
        
        Financial institutions must submit quarterly reports that include:
        - Balance sheet information
        - Income statement data
        - Risk assessment metrics
        
        ## Question 2: How often should compliance audits be conducted?
        
        Compliance audits should be conducted annually, with additional reviews for:
        - High-risk areas (quarterly)
        - New regulatory changes (immediately)
        - System updates (monthly)
        
        ## Regulatory Framework
        
        The regulatory framework consists of multiple layers:
        
        ### Primary Regulations
        - Banking Act of 2020
        - Financial Services Reform Act
        - Consumer Protection Guidelines
        
        ### Secondary Guidelines
        - Operational procedures
        - Risk management protocols
        - Data protection standards
        
        ![Regulatory Framework Diagram](https://example.com/diagram.png)
        
        Table 1: Compliance Timeline
        | Activity | Frequency | Responsibility |
        |----------|-----------|---------------|
        | Risk Assessment | Quarterly | Risk Manager |
        | Audit Review | Annually | Compliance Officer |
        | System Update | Monthly | IT Department |
      `,
      source: 'BRDRAPI',
      metadata: {
        documentType: 'regulatory_guidance',
        language: 'en',
        topics: ['financial_regulation', 'compliance', 'reporting']
      }
    };

    const options: ETLPipelineOptions = {
      chunkingStrategy: 'smart',
      enableKnowledgeGraph: true,
      enableContextExtension: true,
      contextExtensionSize: 500,
      enableImageProcessing: true,
      enableKeywordExtraction: true,
      enableRelationshipMapping: true,
      embeddingModel: 'text-embedding-3-small',
      enableContextualEmbeddings: true,
      enableConceptMapping: true,
      enableRelationshipScoring: true,
      minRelationshipWeight: 0.3
    };

    try {
      const result = await this.pipeline.processDocument(document, options);
      
      console.log('✅ Document processed successfully!');
      console.log(`📊 Results:`);
      console.log(`   - Document ID: ${result.documentId}`);
      console.log(`   - Chunks processed: ${result.chunksProcessed}`);
      console.log(`   - Keywords extracted: ${result.keywordsExtracted}`);
      console.log(`   - Relationships created: ${result.relationshipsCreated}`);
      console.log(`   - Processing time: ${result.processingTime}ms`);
      
      if (result.metadata.chunkingResult) {
        console.log(`   - Chunk types: ${result.metadata.chunkingResult.chunkTypes.join(', ')}`);
        console.log(`   - Average chunk size: ${Math.round(result.metadata.chunkingResult.averageChunkSize)} chars`);
      }
      
      if (result.metadata.knowledgeGraphResult) {
        console.log(`   - Knowledge graph nodes: ${result.metadata.knowledgeGraphResult.nodes}`);
        console.log(`   - Knowledge graph relationships: ${result.metadata.knowledgeGraphResult.relationships}`);
        console.log(`   - Concepts extracted: ${result.metadata.knowledgeGraphResult.concepts}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing document:', error);
    }
  }

  private async exampleBatchProcessing(): Promise<void> {
    console.log('\n📚 Example 2: Batch Processing Multiple Documents');
    console.log('------------------------------------------------');

    const documents = [
      {
        doc_id: 'batch_doc_001',
        content: 'This is the first document in the batch. It contains information about financial regulations and compliance requirements.',
        source: 'BRDRAPI',
        metadata: { documentType: 'policy', language: 'en' }
      },
      {
        doc_id: 'batch_doc_002',
        content: 'The second document discusses risk management strategies and their implementation in financial institutions.',
        source: 'BRDRAPI',
        metadata: { documentType: 'guideline', language: 'en' }
      },
      {
        doc_id: 'batch_doc_003',
        content: 'Document three covers audit procedures and reporting standards for regulatory compliance.',
        source: 'BRDRAPI',
        metadata: { documentType: 'procedure', language: 'en' }
      }
    ];

    const options: ETLPipelineOptions = {
      chunkingStrategy: 'smart',
      enableKnowledgeGraph: true,
      batchSize: 2,
      enableParallelProcessing: true,
      enableProgressTracking: true
    };

    try {
      const results = await this.pipeline.processBatch(documents, options);
      
      console.log('✅ Batch processing completed!');
      console.log(`📊 Batch Results:`);
      console.log(`   - Total documents processed: ${results.length}`);
      console.log(`   - Total chunks: ${results.reduce((sum, r) => sum + r.chunksProcessed, 0)}`);
      console.log(`   - Total keywords: ${results.reduce((sum, r) => sum + r.keywordsExtracted, 0)}`);
      console.log(`   - Total relationships: ${results.reduce((sum, r) => sum + r.relationshipsCreated, 0)}`);
      console.log(`   - Total processing time: ${results.reduce((sum, r) => sum + r.processingTime, 0)}ms`);
      
      // Show individual results
      results.forEach((result, index) => {
        console.log(`   Document ${index + 1}: ${result.chunksProcessed} chunks, ${result.processingTime}ms`);
      });
      
    } catch (error) {
      console.error('❌ Error in batch processing:', error);
    }
  }

  private async exampleChunkingStrategies(): Promise<void> {
    console.log('\n✂️ Example 3: Different Chunking Strategies');
    console.log('--------------------------------------------');

    const document = {
      doc_id: 'chunking_example',
      content: `
        Q1: What are the reporting requirements?
        A1: Reports must be submitted quarterly with detailed financial data.
        
        Q2: How is compliance measured?
        A2: Compliance is measured through regular audits and assessments.
        
        Chapter 1: Introduction
        This chapter provides an overview of the regulatory framework.
        
        Section 1.1: Background
        The regulatory environment has evolved significantly over the past decade.
        
        Section 1.2: Objectives
        The primary objectives are to ensure transparency and accountability.
        
        Chapter 2: Implementation
        This chapter covers the practical implementation of regulations.
        
        The implementation process involves multiple stakeholders and requires careful coordination.
        Each step must be documented and verified before proceeding to the next phase.
        Regular reviews ensure that the implementation remains on track and effective.
      `,
      source: 'BRDRAPI'
    };

    const strategies = ['question_answer', 'topic_based', 'contextual', 'smart'];

    for (const strategy of strategies) {
      console.log(`\n🔧 Testing ${strategy} chunking strategy:`);
      
      const options: ETLPipelineOptions = {
        chunkingStrategy: strategy as any,
        enableKnowledgeGraph: false, // Disable for comparison
        enableContextExtension: false
      };

      try {
        const result = await this.pipeline.processDocument(document, options);
        console.log(`   ✅ ${strategy}: ${result.chunksProcessed} chunks created`);
        
        if (result.metadata.chunkingResult) {
          console.log(`   📊 Chunk types: ${result.metadata.chunkingResult.chunkTypes.join(', ')}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error with ${strategy} strategy:`, error);
      }
    }
  }

  private async exampleKnowledgeGraph(): Promise<void> {
    console.log('\n🧠 Example 4: Knowledge Graph Capabilities');
    console.log('-------------------------------------------');

    try {
      // Get knowledge graph statistics
      const stats = await this.pipeline.getProcessingStats();
      
      console.log('📊 Knowledge Graph Statistics:');
      console.log(`   - Total chunks: ${stats.chunks}`);
      console.log(`   - Total keywords: ${stats.keywords}`);
      console.log(`   - Total relationships: ${stats.relationships}`);
      console.log(`   - Total concepts: ${stats.concepts}`);
      console.log(`   - Last updated: ${stats.timestamp}`);
      
      // Demonstrate knowledge graph query
      console.log('\n🔍 Testing Knowledge Graph Query:');
      const query = 'financial regulations compliance';
      
      const searchResults = await this.databaseManager.searchChunks(query, {
        limit: 3,
        includeRelationships: true,
        useKnowledgeGraph: true
      });
      
      console.log(`   Found ${searchResults.length} relevant chunks for query: "${query}"`);
      
      searchResults.forEach((result, index) => {
        console.log(`   Result ${index + 1}:`);
        console.log(`     - Content: ${result.content.substring(0, 100)}...`);
        console.log(`     - Keywords: ${result.keywords?.length || 0}`);
        console.log(`     - Relationships: ${result.relationships?.length || 0}`);
      });
      
    } catch (error) {
      console.error('❌ Error demonstrating knowledge graph:', error);
    }
  }

  private async exampleEnhancedSearch(): Promise<void> {
    console.log('\n🔍 Example 5: Enhanced Search Capabilities');
    console.log('-------------------------------------------');

    const queries = [
      'financial reporting requirements',
      'compliance audit procedures',
      'risk management strategies'
    ];

    for (const query of queries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      
      try {
        // Test different search strategies
        const strategies = ['vector', 'keyword', 'hybrid', 'knowledge_graph'];
        
        for (const strategy of strategies) {
          const results = await this.databaseManager.searchChunks(query, {
            limit: 2,
            includeRelationships: true,
            useKnowledgeGraph: strategy === 'knowledge_graph'
          });
          
          console.log(`   ${strategy.toUpperCase()}: ${results.length} results`);
          
          if (results.length > 0) {
            const avgRelevance = results.reduce((sum, r) => sum + (r.similarity || 0), 0) / results.length;
            console.log(`     Average relevance: ${avgRelevance.toFixed(3)}`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error searching for "${query}":`, error);
      }
    }
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up resources...');
    await this.pipeline.cleanup();
    console.log('✅ Cleanup completed');
  }
}

// Example usage
export async function runETLExample(): Promise<void> {
  const example = new ETLExample();
  
  try {
    await example.runExample();
  } catch (error) {
    console.error('❌ Error running ETL example:', error);
  } finally {
    await example.cleanup();
  }
}

// Uncomment to run the example
// runETLExample(); 