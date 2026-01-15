/**
 * Performance Monitoring Hooks
 *
 * React hooks for integrating performance monitoring into components.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  startTimer,
  endTimer,
  recordRenderTime,
  recordNavigationTime,
  timeAsync,
} from '../services/performance';

/**
 * Hook to measure component mount time
 */
export function useMountTime(componentName: string): void {
  const mountTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - mountTime.current;
    recordRenderTime(`${componentName}:mount`, duration);
  }, [componentName]);
}

/**
 * Hook to measure screen focus time (navigation)
 */
export function useScreenFocusTime(screenName: string): void {
  const focusTime = useRef<number | null>(null);

  useEffect(() => {
    focusTime.current = performance.now();

    return () => {
      if (focusTime.current !== null) {
        const duration = performance.now() - focusTime.current;
        recordNavigationTime(`${screenName}:unfocus`, duration, {
          type: 'screen_time',
        });
      }
    };
  }, [screenName]);
}

/**
 * Hook to create a timed async function
 * Returns a memoized function that times execution
 */
export function useTimedAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T,
  deps: React.DependencyList = []
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    (async (...args: Parameters<T>) => {
      return timeAsync(name, () => fn(...args) as Promise<unknown>, 'operation');
    }) as T,
    [name, ...deps]
  );
}

/**
 * Hook to measure operation duration
 * Returns start/end functions for manual timing
 */
export function useOperationTimer(operationName: string): {
  start: () => string;
  end: (timerId: string, metadata?: Record<string, unknown>) => number | null;
} {
  const start = useCallback(() => {
    return startTimer(operationName);
  }, [operationName]);

  const end = useCallback(
    (timerId: string, metadata?: Record<string, unknown>) => {
      return endTimer(timerId, metadata);
    },
    []
  );

  return { start, end };
}

/**
 * Hook to track render count (useful for debugging re-renders)
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current += 1;

  if (__DEV__) {
    console.log(`[Perf] ${componentName} render #${renderCount.current}`);
  }

  return renderCount.current;
}

/**
 * Hook to measure and log slow renders
 */
export function useSlowRenderWarning(
  componentName: string,
  thresholdMs: number = 16 // ~60fps frame budget
): void {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;

    if (duration > thresholdMs && __DEV__) {
      console.warn(
        `[Perf] Slow render detected: ${componentName} took ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
      );
    }

    recordRenderTime(componentName, duration, {
      slow: duration > thresholdMs,
      threshold: thresholdMs,
    });

    // Reset for next render
    startTime.current = performance.now();
  });
}
