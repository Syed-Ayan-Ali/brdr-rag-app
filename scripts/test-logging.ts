import { logger, LogCategory } from '../lib/logging/Logger';

async function testLogging() {
  console.log('🧪 Testing Logging System');
  console.log('========================');

  // Test different log levels and categories
  logger.info(LogCategory.SYSTEM, 'System startup completed');
  logger.debug(LogCategory.DATABASE, 'Database connection established');
  logger.warn(LogCategory.ETL, 'ETL pipeline warning: slow processing');
  logger.error(LogCategory.API, 'API error occurred', new Error('Test error'));

  // Test crawler logging
  logger.logCrawl({
    timestamp: new Date().toISOString(),
    level: 'AUDIT' as any,
    category: LogCategory.CRAWLER,
    message: 'Crawled document: test-doc-123',
    docId: 'test-doc-123',
    source: 'BRDRAPI',
    status: 'success',
    contentLength: 1500,
    metadata: {
      type: 'circular',
      issueDate: '2025-01-15'
    }
  });

  // Test API logging
  logger.logAPI({
    timestamp: new Date().toISOString(),
    level: 'AUDIT' as any,
    category: LogCategory.API,
    message: 'POST /api/chat - 200',
    endpoint: '/api/chat',
    method: 'POST',
    statusCode: 200,
    requestBody: { query: 'test query' },
    responseBody: { response: 'test response' },
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    duration: 1250
  });

  // Test LLM logging
  logger.logLLM({
    timestamp: new Date().toISOString(),
    level: 'AUDIT' as any,
    category: LogCategory.LLM,
    message: 'LLM response generated',
    model: 'gemini-2.0-flash',
    prompt: 'What are the latest banking regulations?',
    response: 'Based on the latest BRDR documents, the key regulations include...',
    tokens: 150,
    cost: 0.0025,
    latency: 1250
  });

  // Test audit trail retrieval
  console.log('\n📊 Testing Audit Trail Retrieval');
  console.log('================================');

  const auditTrail = await logger.getAuditTrail({ limit: 10 });
  console.log(`Retrieved ${auditTrail.length} audit trail entries`);

  const crawlLogs = await logger.getCrawlLogs({ limit: 5 });
  console.log(`Retrieved ${crawlLogs.length} crawl logs`);

  const apiLogs = await logger.getAPILogs({ limit: 5 });
  console.log(`Retrieved ${apiLogs.length} API logs`);

  const llmLogs = await logger.getLLMLogs({ limit: 5 });
  console.log(`Retrieved ${llmLogs.length} LLM logs`);

  console.log('\n✅ Logging system test completed!');
  console.log('\nNext steps:');
  console.log('1. Visit: http://localhost:3000/audit-trail');
  console.log('2. Check log files in: logs/');
  console.log('3. Test with real crawler: npm run crawler:test');
}

testLogging().catch(console.error); 