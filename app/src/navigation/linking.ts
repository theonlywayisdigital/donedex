/**
 * Linking configuration for React Navigation
 * Enables deep linking on web (URL routing, back/forward) and native (universal links, URL schemes).
 *
 * NOTE: This is a minimal config that only handles Auth routes.
 * The AdaptiveNavigator has different structures for desktop (flat stack)
 * vs mobile (nested tabs), making comprehensive URL mapping complex.
 * Browser back/forward still works via navigation history.
 */

import { LinkingOptions } from '@react-navigation/native';

/**
 * Linking configuration — enabled on ALL platforms
 * Web: handles URL routing, browser back/forward, bookmarkable URLs
 * Native: handles donedex:// custom URL scheme and universal links
 */
export const linking: LinkingOptions<any> = {
  prefixes: ['https://donedex-app.netlify.app', 'donedex://'],
  enabled: true,
  config: {
    screens: {
      // Auth screens only - these are consistent across all navigation modes
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
          AuthCallback: 'auth/callback',
          SetPassword: 'auth/set-password',
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
