import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0', // Dummy DSN
  debug: false,
});
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/context/AppContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours caching
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 mins
      retry: 2, // Retry failed requests twice
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
// ── Auth guard — must be inside AppProvider ───────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isAuthLoading) return;

    // Pre-auth screens a logged-out user is allowed to sit on.
    const inAuthScreen = ['login', 'phone-login', 'verify-otp'].includes(segments[0]);
    const inRoleSelect = segments[0] === 'role-select';
    const inLandlord = segments[0] === '(landlord)';
    const isTenantRoute = ['(tabs)', 'connect', 'translator', 'settings', 'chat', 'guide', 'add-property', 'route-planner', 'listing', 'booking'].includes(segments[0]);

    if (!user) {
      // Not logged in → keep on any auth screen, else send to login.
      if (!inAuthScreen) router.replace('/login');
    } else if (!user.role) {
      // Authenticated via phone but hasn't chosen a role yet → role selection.
      if (!inRoleSelect) router.replace('/role-select');
    } else if (user.role === 'landlord') {
      // Landlord → landlord area
      const isLandlordRoute = inLandlord || segments[0] === 'add-property';
      if (!isLandlordRoute) router.replace('/(landlord)/dashboard');
    } else {
      // Tenant → tabs
      if (!isTenantRoute) router.replace('/(tabs)');
    }
  }, [user, isAuthLoading, segments]);

  return <>{children}</>;
}

function WebWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  
  return (
    <View style={styles.webRoot}>
      <View style={styles.webContainer}>
        {children}
      </View>
    </View>
  );
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="phone-login" options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="role-select" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(landlord)" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ headerShown: false }} />
        <Stack.Screen name="translator" options={{ headerShown: false }} />
        <Stack.Screen name="tira" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AppProvider>
                <WebWrapper>
                  <RootLayoutNav />
                </WebWrapper>
              </AppProvider>
            </GestureHandlerRootView>
          </KeyboardProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: '#FAFAF8', // Warm Sand
    alignItems: 'center',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FAFAF8', // Warm Sand base
    shadowColor: '#1A1D1F', // Ink shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 50,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(14,124,123,0.08)',
  }
});
