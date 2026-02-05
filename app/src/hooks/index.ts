/**
 * Custom Hooks
 */

export {
  useResponsive,
  useBreakpoint,
  useBreakpointValue,
  useResponsiveStyles,
  useAdaptiveLayout,
  BREAKPOINTS,
  type BreakpointKey,
  type ResponsiveInfo,
  type AdaptiveLayoutInfo,
} from './useResponsive';

export { useDebounce, useDebouncedCallback } from './useDebounce';

export { useUnsavedChanges } from './useUnsavedChanges';

export { usePushNotifications } from './usePushNotifications';

export {
  useMountTime,
  useScreenFocusTime,
  useTimedAsync,
  useOperationTimer,
  useRenderCount,
  useSlowRenderWarning,
} from './usePerformance';

export { useSessionHeartbeat } from './useSessionHeartbeat';
