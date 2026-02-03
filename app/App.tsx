import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation';
import { ToastProvider } from './src/contexts/ToastContext';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, Text, TextInput, View } from 'react-native';
import { fontFamily } from './src/constants/theme';
import { initSentry } from './src/services/sentry';

// Initialize Sentry as early as possible
initSentry();

SplashScreen.preventAutoHideAsync();

// Apply DM Sans as the default font for all Text and TextInput components
function setDefaultFonts() {
  const defaultTextStyle = { fontFamily: fontFamily.regular };

  // Set default props on Text
  const oldTextDefaultProps = (Text as any).defaultProps || {};
  (Text as any).defaultProps = {
    ...oldTextDefaultProps,
    style: [defaultTextStyle, oldTextDefaultProps.style],
  };

  // Set default props on TextInput
  const oldInputDefaultProps = (TextInput as any).defaultProps || {};
  (TextInput as any).defaultProps = {
    ...oldInputDefaultProps,
    style: [defaultTextStyle, oldInputDefaultProps.style],
  };

  // On web, also inject a global CSS rule as a safety net
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: 'DMSans_400Regular', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }
}

let fontsApplied = false;

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (!fontsApplied) {
    setDefaultFonts();
    fontsApplied = true;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </ToastProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
