/**
 * Performance Monitoring Service
 *
 * Tracks app performance metrics including:
 * - API response times
 * - Navigation timing
 * - Component render times
 * - Memory usage (where available)
 *
 * Uses a sampling approach to minimize overhead.
 */

import { Platform } from 'react-native';

// ============================================
// Types
// ============================================

export interface PerformanceMetric {
  name: string;
  category: 'api' | 'navigation' | 'render' | 'operation';
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface PerformanceConfig {
  /** Whether performance monitoring is enabled */
  enabled: boolean;
  /** Sample rate (0-1). 1 = collect all metrics, 0.1 = 10% of metrics */
  sampleRate: number;
  /** Maximum number of metrics to buffer before flush */
  maxBufferSize: number;
  /** Auto-flush interval in milliseconds */
  flushInterval: number;
  /** Whether to log metrics to console */
  debugLog: boolean;
}

// ============================================
// Configuration
// ============================================

const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: __DEV__ ? true : true, // Enable in both dev and prod
  sampleRate: __DEV__ ? 1 : 0.1, // Sample 100% in dev, 10% in prod
  maxBufferSize: 100,
  flushInterval: 60000, // 1 minute
  debugLog: __DEV__,
};

let config: PerformanceConfig = { ...DEFAULT_CONFIG };

// Metrics buffer
let metricsBuffer: PerformanceMetric[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// Active timers (for nested timing)
const activeTimers = new Map<string, number>();

// ============================================
// Configuration API
// ============================================

/**
 * Configure performance monitoring
 */
export function configurePerformance(newConfig: Partial<PerformanceConfig>): void {
  config = { ...config, ...newConfig };

  // Restart flush timer if interval changed
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  if (config.enabled && config.flushInterval > 0) {
    flushTimer = setInterval(flushMetrics, config.flushInterval);
  }
}

/**
 * Get current configuration
 */
export function getPerformanceConfig(): PerformanceConfig {
  return { ...config };
}

// ============================================
// Core Timing Functions
// ============================================

/**
 * Determine if this metric should be sampled
 */
function shouldSample(): boolean {
  if (!config.enabled) return false;
  if (config.sampleRate >= 1) return true;
  return Math.random() < config.sampleRate;
}

/**
 * Start timing an operation
 * Returns a unique timer ID to pass to endTimer
 */
export function startTimer(
  name: string,
  category: PerformanceMetric['category'] = 'operation'
): string {
  const timerId = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (shouldSample()) {
    activeTimers.set(timerId, performance.now());
  }

  return timerId;
}

/**
 * End timing and record the metric
 */
export function endTimer(
  timerId: string,
  metadata?: Record<string, unknown>
): number | null {
  const startTime = activeTimers.get(timerId);

  if (startTime === undefined) {
    return null; // Timer was not sampled or doesn't exist
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  activeTimers.delete(timerId);

  // Extract name and category from timerId
  const namePart = timerId.split('-')[0];

  recordMetric({
    name: namePart,
    category: 'operation',
    duration,
    timestamp: Date.now(),
    metadata,
  });

  return duration;
}

/**
 * Time an async function
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category: PerformanceMetric['category'] = 'operation',
  metadata?: Record<string, unknown>
): Promise<T> {
  if (!shouldSample()) {
    return fn();
  }

  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    recordMetric({
      name,
      category,
      duration,
      timestamp: Date.now(),
      metadata: { ...metadata, success: true },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    recordMetric({
      name,
      category,
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Time a synchronous function
 */
export function timeSync<T>(
  name: string,
  fn: () => T,
  category: PerformanceMetric['category'] = 'operation',
  metadata?: Record<string, unknown>
): T {
  if (!shouldSample()) {
    return fn();
  }

  const startTime = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - startTime;

    recordMetric({
      name,
      category,
      duration,
      timestamp: Date.now(),
      metadata: { ...metadata, success: true },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    recordMetric({
      name,
      category,
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// ============================================
// Specialized Timing Functions
// ============================================

/**
 * Time an API call
 */
export async function timeApiCall<T>(
  endpoint: string,
  fn: () => Promise<T>,
  method: string = 'GET'
): Promise<T> {
  return timeAsync(endpoint, fn, 'api', { method, endpoint });
}

/**
 * Record navigation timing
 */
export function recordNavigationTime(
  routeName: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  if (!shouldSample()) return;

  recordMetric({
    name: routeName,
    category: 'navigation',
    duration,
    timestamp: Date.now(),
    metadata,
  });
}

/**
 * Record component render time
 */
export function recordRenderTime(
  componentName: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  if (!shouldSample()) return;

  recordMetric({
    name: componentName,
    category: 'render',
    duration,
    timestamp: Date.now(),
    metadata,
  });
}

// ============================================
// Metrics Recording and Flushing
// ============================================

/**
 * Record a metric to the buffer
 */
function recordMetric(metric: PerformanceMetric): void {
  metricsBuffer.push(metric);

  // Auto-flush if buffer is full
  if (metricsBuffer.length >= config.maxBufferSize) {
    flushMetrics();
  }
}

/**
 * Flush metrics buffer
 * In production, this would send to an analytics service
 */
export function flushMetrics(): void {
  if (metricsBuffer.length === 0) return;

  const metrics = [...metricsBuffer];
  metricsBuffer = [];

  // TODO: Send to analytics service (e.g., Firebase Cloud Function, Sentry, etc.)
}

// ============================================
// Statistics and Analysis
// ============================================

/**
 * Calculate statistics for a set of metrics
 */
export function calculateStats(durations: number[]): PerformanceStats {
  if (durations.length === 0) {
    return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const count = sorted.length;
  const min = sorted[0];
  const max = sorted[count - 1];
  const avg = sorted.reduce((sum, d) => sum + d, 0) / count;

  const percentile = (p: number) => {
    const index = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    count,
    min,
    max,
    avg,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

/**
 * Summarize a set of metrics by name and category
 */
export function summarizeMetrics(
  metrics: PerformanceMetric[]
): Record<string, Record<string, PerformanceStats>> {
  const grouped: Record<string, Record<string, number[]>> = {};

  for (const metric of metrics) {
    if (!grouped[metric.category]) {
      grouped[metric.category] = {};
    }
    if (!grouped[metric.category][metric.name]) {
      grouped[metric.category][metric.name] = [];
    }
    grouped[metric.category][metric.name].push(metric.duration);
  }

  const summary: Record<string, Record<string, PerformanceStats>> = {};

  for (const [category, names] of Object.entries(grouped)) {
    summary[category] = {};
    for (const [name, durations] of Object.entries(names)) {
      summary[category][name] = calculateStats(durations);
    }
  }

  return summary;
}

/**
 * Get current buffered metrics (for debugging)
 */
export function getBufferedMetrics(): PerformanceMetric[] {
  return [...metricsBuffer];
}

// ============================================
// React Hook for Component Timing
// ============================================

/**
 * Hook to measure component render time
 * Usage: useRenderTime('MyComponent');
 */
export function useRenderTime(componentName: string): void {
  // This is a simplified version - in production you'd use React Profiler API
  // or measure using useLayoutEffect
  const startTime = performance.now();

  // Using setTimeout to measure after paint
  if (shouldSample()) {
    setTimeout(() => {
      const duration = performance.now() - startTime;
      recordRenderTime(componentName, duration);
    }, 0);
  }
}

// ============================================
// Platform Info
// ============================================

/**
 * Get platform information for metrics context
 */
export function getPlatformInfo(): Record<string, string> {
  return {
    os: Platform.OS,
    version: Platform.Version?.toString() || 'unknown',
  };
}

// ============================================
// Lifecycle
// ============================================

/**
 * Initialize performance monitoring
 */
export function initializePerformance(customConfig?: Partial<PerformanceConfig>): void {
  if (customConfig) {
    configurePerformance(customConfig);
  }

  // Start flush timer
  if (config.enabled && config.flushInterval > 0 && !flushTimer) {
    flushTimer = setInterval(flushMetrics, config.flushInterval);
  }
}

/**
 * Cleanup performance monitoring (call on app unmount)
 */
export function cleanupPerformance(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // Flush any remaining metrics
  flushMetrics();

  // Clear timers
  activeTimers.clear();
}
