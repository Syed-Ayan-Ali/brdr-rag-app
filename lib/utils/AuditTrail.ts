export interface AuditEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  eventType: 'query_start' | 'tool_call' | 'document_retrieval' | 'llm_response' | 'user_warning' | 'error' | 'api_request_start' | 'api_request_end' | 'api_request_success' | 'api_request_failed' | 'tool_call_start' | 'tool_call_end';
  eventData: any;
  metadata: {
    query?: string;
    toolName?: string;
    documentsRetrieved?: string[];
    responseTime?: number;
    confidence?: number;
    searchStrategy?: string;
    cacheHit?: boolean;
    errorMessage?: string;
    requestId?: string;
    status?: string;
    errorType?: string;
    toolInput?: any;
    toolOutput?: any;
  };
}

export interface AuditSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  userId?: string;
  events: AuditEvent[];
  summary: {
    totalQueries: number;
    totalToolCalls: number;
    totalDocumentsRetrieved: number;
    averageResponseTime: number;
    errors: number;
    warnings: number;
  };
}

export class AuditTrailManager {
  private sessions = new Map<string, AuditSession>();
  private currentSession: AuditSession | null = null;

  constructor(private readonly storageKey: string = 'audit_trail') {
    this.loadFromStorage();
  }

  // Start a new audit session
  startSession(userId?: string): string {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      sessionId,
      startTime: new Date(),
      userId,
      events: [],
      summary: {
        totalQueries: 0,
        totalToolCalls: 0,
        totalDocumentsRetrieved: 0,
        averageResponseTime: 0,
        errors: 0,
        warnings: 0
      }
    };
    this.sessions.set(sessionId, this.currentSession);
    this.saveToStorage();
    return sessionId;
  }

  // End current session
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.updateSessionSummary(this.currentSession);
      this.saveToStorage();
    }
  }

  // Log a query start
  logQueryStart(query: string, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'query_start',
      eventData: { query },
      metadata: { query }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log a tool call
  logToolCall(toolName: string, input: any, output: any, responseTime: number, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'tool_call',
      eventData: { toolName, input, output, responseTime },
      metadata: { toolName, responseTime }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log document retrieval
  logDocumentRetrieval(documents: any[], searchStrategy: string, cacheHit: boolean, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'document_retrieval',
      eventData: { documents, searchStrategy, cacheHit },
      metadata: { 
        documentsRetrieved: documents.map(d => d.doc_id || d.id),
        searchStrategy,
        cacheHit
      }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log LLM response
  logLLMResponse(response: string, confidence: number, responseTime: number, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'llm_response',
      eventData: { response, confidence, responseTime },
      metadata: { confidence, responseTime }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log user warning
  logUserWarning(warningType: string, message: string, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'user_warning',
      eventData: { warningType, message },
      metadata: {}
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log error
  logError(error: Error, context: string, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'error',
      eventData: { error: error.message, stack: error.stack, context },
      metadata: { errorMessage: error.message }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log API request start
  logApiRequestStart(requestId: string, requestData: any, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'api_request_start',
      eventData: { requestId, requestData },
      metadata: { requestId, status: 'started' }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log API request end (success)
  logApiRequestEnd(requestId: string, responseData: any, responseTime: number, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'api_request_end',
      eventData: { requestId, responseData, responseTime },
      metadata: { requestId, status: 'success', responseTime }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log API request failed
  logApiRequestFailed(requestId: string, error: Error, responseTime: number, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'api_request_failed',
      eventData: { requestId, error: error.message, responseTime },
      metadata: { requestId, status: 'failed', errorType: error.name, responseTime }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log tool call start
  logToolCallStart(toolName: string, input: any, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'tool_call_start',
      eventData: { toolName, input },
      metadata: { toolName, toolInput: input }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Log tool call end
  logToolCallEnd(toolName: string, output: any, responseTime: number, sessionId?: string): string {
    const eventId = this.generateEventId();
    const session = this.getSession(sessionId);
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      sessionId: session.sessionId,
      userId: session.userId,
      eventType: 'tool_call_end',
      eventData: { toolName, output, responseTime },
      metadata: { toolName, toolOutput: output, responseTime }
    };

    session.events.push(event);
    this.saveToStorage();
    return eventId;
  }

  // Get audit trail for a session
  getSessionAuditTrail(sessionId: string): AuditSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Get all sessions
  getAllSessions(): AuditSession[] {
    return Array.from(this.sessions.values());
  }

  // Export audit trail as JSON
  exportAuditTrail(sessionId?: string): string {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      return session ? JSON.stringify(session, null, 2) : '';
    }
    return JSON.stringify(Array.from(this.sessions.values()), null, 2);
  }

  // Clear audit trail
  clearAuditTrail(): void {
    this.sessions.clear();
    this.currentSession = null;
    this.saveToStorage();
  }

  // Private methods
  private getSession(sessionId?: string): AuditSession {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) return session;
    }
    
    if (!this.currentSession) {
      this.startSession();
    }
    
    return this.currentSession!;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSessionSummary(session: AuditSession): void {
    const events = session.events;
    const queries = events.filter(e => e.eventType === 'query_start').length;
    const toolCalls = events.filter(e => e.eventType === 'tool_call').length;
    const documents = events.filter(e => e.eventType === 'document_retrieval');
    const totalDocs = documents.reduce((sum, e) => sum + (e.metadata.documentsRetrieved?.length || 0), 0);
    const responseTimes = events
      .filter(e => e.metadata.responseTime)
      .map(e => e.metadata.responseTime!);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    const errors = events.filter(e => e.eventType === 'error').length;
    const warnings = events.filter(e => e.eventType === 'user_warning').length;

    session.summary = {
      totalQueries: queries,
      totalToolCalls: toolCalls,
      totalDocumentsRetrieved: totalDocs,
      averageResponseTime: avgResponseTime,
      errors,
      warnings
    };
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.sessions.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save audit trail to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const sessions = JSON.parse(data);
        sessions.forEach((session: any) => {
          session.startTime = new Date(session.startTime);
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
          session.events.forEach((event: any) => {
            event.timestamp = new Date(event.timestamp);
          });
          this.sessions.set(session.sessionId, session);
        });
      }
    } catch (error) {
      console.warn('Failed to load audit trail from storage:', error);
    }
  }
} 