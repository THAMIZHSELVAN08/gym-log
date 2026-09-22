import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',
  setTheme: async (newTheme: ThemeMode) => {
    colorScheme.set(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
    set({ theme: newTheme });
  },
  initTheme: async () => {
    const saved = (await AsyncStorage.getItem('app_theme')) as ThemeMode | null;
    const initialTheme: ThemeMode = saved || 'dark';
    colorScheme.set(initialTheme);
    set({ theme: initialTheme });
  },
}));
