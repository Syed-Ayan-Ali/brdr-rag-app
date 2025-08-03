import { PerformanceMonitor } from '../interfaces/RetrievalStrategy';

export interface PerformanceMetrics {
  queryLatency: number;
  retrievalAccuracy: number;
  contextUtilization: number;
  cacheHitRate: number;
  timestamp: number;
  query: string;
  strategy: string;
}

export class AdvancedPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  recordQuery(
    query: string, 
    latency: number, 
    accuracy: number, 
    contextUtilization: number, 
    cacheHit: boolean,
    strategy: string = 'unknown'
  ): void {
    const metric: PerformanceMetrics = {
      queryLatency: latency,
      retrievalAccuracy: accuracy,
      contextUtilization: contextUtilization,
      cacheHitRate: cacheHit ? 1 : 0,
      timestamp: Date.now(),
      query,
      strategy
    };

    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        queryLatency: 0,
        retrievalAccuracy: 0,
        contextUtilization: 0,
        cacheHitRate: 0,
        timestamp: Date.now(),
        query: '',
        strategy: ''
      };
    }

    const sum = this.metrics.reduce((acc, metric) => ({
      queryLatency: acc.queryLatency + metric.queryLatency,
      retrievalAccuracy: acc.retrievalAccuracy + metric.retrievalAccuracy,
      contextUtilization: acc.contextUtilization + metric.contextUtilization,
      cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
      timestamp: Date.now(),
      query: '',
      strategy: ''
    }));

    const count = this.metrics.length;
    return {
      queryLatency: sum.queryLatency / count,
      retrievalAccuracy: sum.retrievalAccuracy / count,
      contextUtilization: sum.contextUtilization / count,
      cacheHitRate: sum.cacheHitRate / count,
      timestamp: Date.now(),
      query: '',
      strategy: ''
    };
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Get metrics for a specific strategy
  getStrategyMetrics(strategy: string): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.strategy === strategy);
  }

  // Get metrics for a time range
  getMetricsForTimeRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metrics.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  // Get performance summary
  getPerformanceSummary(): {
    totalQueries: number;
    averageLatency: number;
    averageAccuracy: number;
    averageCacheHitRate: number;
    strategyBreakdown: Record<string, number>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageLatency: 0,
        averageAccuracy: 0,
        averageCacheHitRate: 0,
        strategyBreakdown: {}
      };
    }

    const avgMetrics = this.getAverageMetrics();
    const strategyBreakdown = this.metrics.reduce((acc, metric) => {
      acc[metric.strategy] = (acc[metric.strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalQueries: this.metrics.length,
      averageLatency: avgMetrics.queryLatency,
      averageAccuracy: avgMetrics.retrievalAccuracy,
      averageCacheHitRate: avgMetrics.cacheHitRate,
      strategyBreakdown
    };
  }

  // Clear old metrics (older than specified hours)
  clearOldMetrics(hours: number = 24): void {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
} 