# Comprehensive Logging System

## Overview
A comprehensive logging system with separate log files for different operations and a unified audit trail viewer.

## Features
- **Separate Log Files**: crawler.log, api.log, llm.log, etl.log, database.log, system.log
- **Unified Audit Trail**: JSON-formatted unified log with web viewer
- **Log Levels**: DEBUG, INFO, WARN, ERROR, AUDIT
- **Categories**: crawler, api, llm, etl, database, system

## Usage

### Basic Logging
```typescript
import { logger, LogCategory } from '../lib/logging/Logger';

logger.info(LogCategory.SYSTEM, 'System startup completed');
logger.error(LogCategory.API, 'API error occurred', error);
```

### Crawler Logging
```typescript
logger.logCrawl({
  docId: 'doc-123',
  source: 'BRDRAPI',
  status: 'success',
  contentLength: 1500,
  metadata: { type: 'circular' }
});
```

### API Logging
```typescript
logger.logAPI({
  endpoint: '/api/chat',
  method: 'POST',
  statusCode: 200,
  duration: 1250
});
```

### LLM Logging
```typescript
logger.logLLM({
  model: 'gemini-2.0-flash',
  prompt: 'What are the latest regulations?',
  response: 'Based on the documents...',
  tokens: 150,
  cost: 0.0025,
  latency: 1250
});
```

## Commands
```bash
# Test logging system
npm run logging:test

# View audit trail
# Visit: http://localhost:3000/audit-trail
```

## Files
- **Logger**: `lib/logging/Logger.ts`
- **Viewer**: `app/audit-trail/page.tsx`
- **API**: `app/api/audit-trail/route.ts`
- **Logs**: `logs/` directory 