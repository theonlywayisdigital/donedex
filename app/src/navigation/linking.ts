/**
 * Web linking configuration for React Navigation
 * Enables deep linking, browser back/forward, and bookmarkable URLs
 *
 * NOTE: This is a minimal config that only handles Auth routes.
 * The AdaptiveNavigator has different structures for desktop (flat stack)
 * vs mobile (nested tabs), making comprehensive URL mapping complex.
 * Browser back/forward still works via navigation history.
 */

import { LinkingOptions } from '@react-navigation/native';
import { Platform } from 'react-native';

// Only enable linking on web
const isWeb = Platform.OS === 'web';

/**
 * Minimal linking configuration - Auth routes only
 * This avoids conflicts with the adaptive desktop/mobile navigation structure
 */
export const linking: LinkingOptions<any> = {
  prefixes: [],
  enabled: isWeb,
  config: {
    screens: {
      // Auth screens only - these are consistent across all navigation modes
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
        },
      },
      Onboarding: {
        screens: {
          OrganisationSetup: 'onboarding/organisation',
          Complete: 'onboarding/complete',
        },
      },
    },
  },
};

export default linking;
