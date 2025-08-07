# Comprehensive Logging System

## Overview

This project implements a comprehensive logging system with separate log files for different operations and a unified audit trail viewer. The system is designed to provide complete visibility into crawling operations, API calls, and LLM responses.

## Features

### 1. **Separate Log Files**
- **Crawler Logs** (`logs/crawler.log`): Document crawling operations
- **API Logs** (`logs/api.log`): API request/response tracking
- **LLM Logs** (`logs/llm.log`): Language model interactions
- **ETL Logs** (`logs/etl.log`): ETL pipeline operations
- **Database Logs** (`logs/database.log`): Database operations
- **System Logs** (`logs/system.log`): System-level events

### 2. **Unified Audit Trail**
- **Audit Trail** (`logs/audit-trail.log`): JSON-formatted unified log
- **Audit Trail Viewer**: Web interface at `/audit-trail`
- **API Endpoint**: `/api/audit-trail` for programmatic access

### 3. **Log Levels**
- `DEBUG`: Detailed debugging information
- `INFO`: General information messages
- `WARN`: Warning messages
- `ERROR`: Error messages with stack traces
- `AUDIT`: Special audit-level logging for compliance

### 4. **Log Categories**
- `crawler`: Web crawling operations
- `api`: API request/response tracking
- `llm`: Language model interactions
- `etl`: ETL pipeline operations
- `database`: Database operations
- `system`: System-level events

## Usage

### Basic Logging

```typescript
import { logger, LogCategory } from '../lib/logging/Logger';

// General logging
logger.info(LogCategory.SYSTEM, 'System startup completed');
logger.debug(LogCategory.DATABASE, 'Database connection established');
logger.warn(LogCategory.ETL, 'ETL pipeline warning: slow processing');
logger.error(LogCategory.API, 'API error occurred', error);
```

### Crawler-Specific Logging

```typescript
// Log crawl results
logger.logCrawl({
  timestamp: new Date().toISOString(),
  level: 'AUDIT',
  category: LogCategory.CRAWLER,
  message: 'Crawled document: doc-123',
  docId: 'doc-123',
  source: 'BRDRAPI',
  status: 'success', // 'success' | 'failed' | 'skipped'
  contentLength: 1500,
  metadata: {
    type: 'circular',
    issueDate: '2025-01-15'
  }
});
```

### API-Specific Logging

```typescript
// Log API calls
logger.logAPI({
  timestamp: new Date().toISOString(),
  level: 'AUDIT',
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
```

### LLM-Specific Logging

```typescript
// Log LLM interactions
logger.logLLM({
  timestamp: new Date().toISOString(),
  level: 'AUDIT',
  category: LogCategory.LLM,
  message: 'LLM response generated',
  model: 'gemini-2.0-flash',
  prompt: 'What are the latest banking regulations?',
  response: 'Based on the latest BRDR documents...',
  tokens: 150,
  cost: 0.0025,
  latency: 1250
});
```

## Audit Trail Viewer

### Web Interface
Visit `http://localhost:3000/audit-trail` to view logs in a web interface.

### API Endpoint
```bash
# Get all logs
GET /api/audit-trail

# Filter by category
GET /api/audit-trail?category=crawler&limit=50

# Filter by date range
GET /api/audit-trail?startDate=2025-08-01&endDate=2025-08-06
```

### Programmatic Access

```typescript
// Get audit trail
const auditTrail = await logger.getAuditTrail({ 
  startDate: '2025-08-01',
  endDate: '2025-08-06',
  category: LogCategory.CRAWLER,
  limit: 100 
});

// Get specific log types
const crawlLogs = await logger.getCrawlLogs({ limit: 50 });
const apiLogs = await logger.getAPILogs({ limit: 50 });
const llmLogs = await logger.getLLMLogs({ limit: 50 });
```

## Commands

### Testing
```bash
# Test logging system
npm run logging:test

# Test crawler with logging
npm run crawler:test-basic

# Test ETL with logging
npm run etl:process
```

### Log Management
```typescript
// Cleanup old logs (30 days by default)
await logger.cleanupOldLogs(30);
```

## Log File Structure

### Crawler Logs
```
[timestamp] [level] [category] message | {data}
```

Example:
```
[2025-08-06T07:30:08.087Z] [INFO] [crawler] Fetching BRDR page 1...
[2025-08-06T07:30:08.764Z] [INFO] [crawler] BRDR API response received: 20 documents, 73 total records | {"pageNumber":1,"documentsCount":20,"totalRecords":73,"statusCode":200,"duration":677}
```

### Audit Trail (JSON)
```json
{
  "timestamp": "2025-08-06T07:30:08.087Z",
  "level": "INFO",
  "category": "crawler",
  "message": "Fetching BRDR page 1...",
  "data": {
    "pageNumber": 1,
    "documentsCount": 20,
    "totalRecords": 73,
    "statusCode": 200,
    "duration": 677
  }
}
```

## Future Enhancements

### 1. **Cloud Log Management**
- Integration with AWS CloudWatch, Azure Monitor, or Google Cloud Logging
- Centralized log aggregation and analysis
- Real-time log streaming and alerting

### 2. **Advanced Filtering**
- Full-text search across all log entries
- Advanced date range filtering
- Log correlation and trace tracking

### 3. **Performance Monitoring**
- Automatic performance metrics collection
- Cost tracking for LLM usage
- Response time analysis

### 4. **Security & Compliance**
- Log encryption for sensitive data
- GDPR compliance features
- Audit trail retention policies

### 5. **Real-time Monitoring**
- Live log streaming
- WebSocket-based real-time updates
- Dashboard with metrics and charts

## File Locations

- **Log Files**: `my-ai-app/logs/`
- **Logger Implementation**: `my-ai-app/lib/logging/Logger.ts`
- **Audit Trail Viewer**: `my-ai-app/app/audit-trail/page.tsx`
- **API Endpoint**: `my-ai-app/app/api/audit-trail/route.ts`
- **Test Script**: `my-ai-app/scripts/test-logging.ts`

## Integration Points

### Crawler Integration
- `my-ai-app/lib/etl/crawlers/BRDRCrawler.ts`
- Logs document crawling operations
- Tracks API calls to BRDR
- Records crawl success/failure status

### API Integration
- `my-ai-app/app/api/chat/route.ts`
- Logs all API requests and responses
- Tracks LLM interactions
- Monitors performance metrics

### ETL Integration
- `my-ai-app/lib/etl/processors/ETLPipeline.ts`
- Logs document processing steps
- Tracks embedding generation
- Records knowledge graph building

## Monitoring & Alerts

The logging system provides comprehensive monitoring capabilities:

1. **Performance Monitoring**: Track response times and throughput
2. **Error Tracking**: Monitor error rates and types
3. **Usage Analytics**: Understand system usage patterns
4. **Cost Tracking**: Monitor LLM usage costs
5. **Compliance**: Maintain audit trails for regulatory requirements

This logging system provides complete visibility into the RAG application's operations, enabling effective monitoring, debugging, and compliance management. 