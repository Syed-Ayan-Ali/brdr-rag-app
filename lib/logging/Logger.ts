import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'
}

export enum LogCategory {
  CRAWLER = 'crawler',
  API = 'api',
  LLM = 'llm',
  ETL = 'etl',
  DATABASE = 'database',
  SYSTEM = 'system'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: any;
}

export interface CrawlLogEntry extends LogEntry {
  docId?: string;
  source?: string;
  status: 'success' | 'failed' | 'skipped';
  contentLength?: number;
  metadata?: any;
}

export interface APILogEntry extends LogEntry {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestBody?: any;
  responseBody?: any;
  userAgent?: string;
  ipAddress?: string;
}

export interface LLMLogEntry extends LogEntry {
  model?: string;
  prompt?: string;
  response?: string;
  tokens?: number;
  cost?: number;
  latency?: number;
}

export class Logger {
  private logDir: string;
  private logFiles: Map<LogCategory, string>;
  private auditTrailFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    
    this.logFiles = new Map([
      [LogCategory.CRAWLER, path.join(this.logDir, 'crawler.log')],
      [LogCategory.API, path.join(this.logDir, 'api.log')],
      [LogCategory.LLM, path.join(this.logDir, 'llm.log')],
      [LogCategory.ETL, path.join(this.logDir, 'etl.log')],
      [LogCategory.DATABASE, path.join(this.logDir, 'database.log')],
      [LogCategory.SYSTEM, path.join(this.logDir, 'system.log')]
    ]);
    
    this.auditTrailFile = path.join(this.logDir, 'audit-trail.log');
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;
    
    if (entry.data || entry.error) {
      const additionalData = {
        ...entry.data,
        error: entry.error,
        sessionId: entry.sessionId,
        userId: entry.userId,
        requestId: entry.requestId,
        duration: entry.duration
      };
      return `${baseLog} | ${JSON.stringify(additionalData)}`;
    }
    
    return baseLog;
  }

  private writeToFile(filePath: string, logEntry: string): void {
    try {
      fs.appendFileSync(filePath, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToAuditTrail(entry: LogEntry): void {
    const auditEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };
    this.writeToFile(this.auditTrailFile, JSON.stringify(auditEntry));
  }

  log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    const formattedLog = this.formatLogEntry(entry);
    const logFile = this.logFiles.get(category);
    
    if (logFile) {
      this.writeToFile(logFile, formattedLog);
    }
    
    // Write to audit trail for all entries
    this.writeToAuditTrail(entry);
    
    // Also log to console for immediate visibility
    console.log(formattedLog);
  }

  // Crawler-specific logging
  logCrawl(entry: CrawlLogEntry): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.AUDIT,
      category: LogCategory.CRAWLER,
      message: `Crawl ${entry.status}: ${entry.docId}`,
      data: {
        docId: entry.docId,
        source: entry.source,
        status: entry.status,
        contentLength: entry.contentLength,
        metadata: entry.metadata
      }
    };

    this.writeToFile(this.logFiles.get(LogCategory.CRAWLER)!, this.formatLogEntry(logEntry));
    this.writeToAuditTrail(logEntry);
  }

  // API-specific logging
  logAPI(entry: APILogEntry): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.AUDIT,
      category: LogCategory.API,
      message: `${entry.method} ${entry.endpoint} - ${entry.statusCode}`,
      data: {
        endpoint: entry.endpoint,
        method: entry.method,
        statusCode: entry.statusCode,
        requestBody: entry.requestBody,
        responseBody: entry.responseBody,
        userAgent: entry.userAgent,
        ipAddress: entry.ipAddress,
        duration: entry.duration
      }
    };

    this.writeToFile(this.logFiles.get(LogCategory.API)!, this.formatLogEntry(logEntry));
    this.writeToAuditTrail(logEntry);
  }

  // LLM-specific logging
  logLLM(entry: LLMLogEntry): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.AUDIT,
      category: LogCategory.LLM,
      message: `LLM Response: ${entry.model}`,
      data: {
        model: entry.model,
        prompt: entry.prompt,
        response: entry.response,
        tokens: entry.tokens,
        cost: entry.cost,
        latency: entry.latency
      }
    };

    this.writeToFile(this.logFiles.get(LogCategory.LLM)!, this.formatLogEntry(logEntry));
    this.writeToAuditTrail(logEntry);
  }

  // Convenience methods
  debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, error?: any, data?: any): void {
    this.log(LogLevel.ERROR, category, message, { ...data, error });
  }

  audit(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.AUDIT, category, message, data);
  }

  // Log retrieval methods for audit trail viewer
  async getAuditTrail(options: {
    startDate?: string;
    endDate?: string;
    category?: LogCategory;
    level?: LogLevel;
    limit?: number;
  } = {}): Promise<LogEntry[]> {
    try {
      if (!fs.existsSync(this.auditTrailFile)) {
        return [];
      }

      const content = fs.readFileSync(this.auditTrailFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let entries: LogEntry[] = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      if (options.startDate) {
        entries = entries.filter(entry => entry.timestamp >= options.startDate!);
      }
      if (options.endDate) {
        entries = entries.filter(entry => entry.timestamp <= options.endDate!);
      }
      if (options.category) {
        entries = entries.filter(entry => entry.category === options.category);
      }
      if (options.level) {
        entries = entries.filter(entry => entry.level === options.level);
      }
      if (options.limit) {
        entries = entries.slice(-options.limit);
      }

      return entries.reverse(); // Most recent first
    } catch (error) {
      console.error('Error reading audit trail:', error);
      return [];
    }
  }

  async getCrawlLogs(options: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<CrawlLogEntry[]> {
    try {
      const logFile = this.logFiles.get(LogCategory.CRAWLER);
      if (!logFile || !fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let entries: CrawlLogEntry[] = lines.map(line => {
        try {
          // Parse the log line format
          const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*?) \| (.*)/);
          if (match) {
            const [, timestamp, level, category, message, dataStr] = match;
            const data = JSON.parse(dataStr);
            return {
              timestamp,
              level: level as LogLevel,
              category: category as LogCategory,
              message,
              ...data
            } as CrawlLogEntry;
          }
          return null;
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      if (options.startDate) {
        entries = entries.filter(entry => entry.timestamp >= options.startDate!);
      }
      if (options.endDate) {
        entries = entries.filter(entry => entry.timestamp <= options.endDate!);
      }
      if (options.status) {
        entries = entries.filter(entry => entry.status === options.status);
      }
      if (options.limit) {
        entries = entries.slice(-options.limit);
      }

      return entries.reverse();
    } catch (error) {
      console.error('Error reading crawl logs:', error);
      return [];
    }
  }

  async getAPILogs(options: {
    startDate?: string;
    endDate?: string;
    endpoint?: string;
    method?: string;
    limit?: number;
  } = {}): Promise<APILogEntry[]> {
    try {
      const logFile = this.logFiles.get(LogCategory.API);
      if (!logFile || !fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let entries: APILogEntry[] = lines.map(line => {
        try {
          const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*?) \| (.*)/);
          if (match) {
            const [, timestamp, level, category, message, dataStr] = match;
            const data = JSON.parse(dataStr);
            return {
              timestamp,
              level: level as LogLevel,
              category: category as LogCategory,
              message,
              ...data
            } as APILogEntry;
          }
          return null;
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      if (options.startDate) {
        entries = entries.filter(entry => entry.timestamp >= options.startDate!);
      }
      if (options.endDate) {
        entries = entries.filter(entry => entry.timestamp <= options.endDate!);
      }
      if (options.endpoint) {
        entries = entries.filter(entry => entry.endpoint?.includes(options.endpoint!));
      }
      if (options.method) {
        entries = entries.filter(entry => entry.method === options.method);
      }
      if (options.limit) {
        entries = entries.slice(-options.limit);
      }

      return entries.reverse();
    } catch (error) {
      console.error('Error reading API logs:', error);
      return [];
    }
  }

  async getLLMLogs(options: {
    startDate?: string;
    endDate?: string;
    model?: string;
    limit?: number;
  } = {}): Promise<LLMLogEntry[]> {
    try {
      const logFile = this.logFiles.get(LogCategory.LLM);
      if (!logFile || !fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let entries: LLMLogEntry[] = lines.map(line => {
        try {
          const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*?) \| (.*)/);
          if (match) {
            const [, timestamp, level, category, message, dataStr] = match;
            const data = JSON.parse(dataStr);
            return {
              timestamp,
              level: level as LogLevel,
              category: category as LogCategory,
              message,
              ...data
            } as LLMLogEntry;
          }
          return null;
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      if (options.startDate) {
        entries = entries.filter(entry => entry.timestamp >= options.startDate!);
      }
      if (options.endDate) {
        entries = entries.filter(entry => entry.timestamp <= options.endDate!);
      }
      if (options.model) {
        entries = entries.filter(entry => entry.model === options.model);
      }
      if (options.limit) {
        entries = entries.slice(-options.limit);
      }

      return entries.reverse();
    } catch (error) {
      console.error('Error reading LLM logs:', error);
      return [];
    }
  }

  // Cleanup old logs
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    for (const [category, logFile] of this.logFiles.entries()) {
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          
          const filteredLines = lines.filter(line => {
            try {
              const match = line.match(/\[(.*?)\]/);
              if (match) {
                const timestamp = new Date(match[1]);
                return timestamp >= cutoffDate;
              }
              return true; // Keep lines that can't be parsed
            } catch {
              return true;
            }
          });

          fs.writeFileSync(logFile, filteredLines.join('\n') + '\n');
          console.log(`Cleaned up ${category} logs`);
        } catch (error) {
          console.error(`Error cleaning up ${category} logs:`, error);
        }
      }
    }
  }
}

// Singleton instance
export const logger = new Logger(); 