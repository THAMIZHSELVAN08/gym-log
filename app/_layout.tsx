import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { runMigrations } from '../src/db/migrate';
import { seedExercises } from '../src/data/seeder';

import { useThemeStore } from '../src/store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    async function init() {
      try {
        await initTheme();
        await runMigrations();
        await seedExercises();
        setReady(true);
      } catch (e) {
        console.error('DB init error:', e);
        setError(String(e));
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-error text-base font-semibold">DB Error</Text>
        <Text className="text-text-secondary text-sm mt-2">{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-accent text-2xl font-bold tracking-wider">GYMLOG</Text>
        <Text className="text-text-tertiary text-sm mt-2">Loading...</Text>
      </View>
    );
  }

  const isDark = theme === 'dark';

  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? '#0D0D0D' : '#F8FAFC' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/active"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="workout/summary" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/create" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/picker" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="routine/create" options={{ headerShown: false }} />
          <Stack.Screen name="routine/[id]" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
