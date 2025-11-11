import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

const THEME_STORAGE_KEY = '@cybersecurity_news:theme_preference';

type ThemeMode = 'light' | 'dark' | 'automatic';

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: ColorSchemeName;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('automatic');
  const initialSystemScheme = Appearance.getColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
    initialSystemScheme
  );
  const isInitializedRef = useRef(false);

  const updateSystemUI = (scheme: ColorSchemeName) => {
    // Fire and forget - don't block UI
    SystemUI.setBackgroundColorAsync(scheme === 'dark' ? '#1a1a1a' : '#ffffff').catch((error) => {
      // Silently fail - system UI update is not critical
      if (__DEV__) {
        console.error('Error updating system UI:', error);
      }
    });
  };

  // Load saved theme preference on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'automatic')) {
          const savedMode = saved as ThemeMode;
          isInitializedRef.current = true;
          
          // Update state immediately
          setThemeModeState(savedMode);
          
          // Update color scheme immediately
          if (savedMode === 'automatic') {
            const systemScheme = Appearance.getColorScheme();
            setColorScheme(systemScheme);
            updateSystemUI(systemScheme);
          } else {
            setColorScheme(savedMode);
            updateSystemUI(savedMode);
          }
        } else {
          isInitializedRef.current = true;
          // No saved preference, already using default (automatic)
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('Error loading theme preference:', error);
        }
        isInitializedRef.current = true;
      });
  }, []);

  // Listen to system theme changes when in automatic mode
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    let subscription: any;
    
    if (themeMode === 'automatic') {
      // Update immediately with current system scheme
      const currentSystemScheme = Appearance.getColorScheme();
      setColorScheme(currentSystemScheme);
      updateSystemUI(currentSystemScheme);
      
      // Listen for system theme changes
      subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
        setColorScheme(newScheme);
        updateSystemUI(newScheme);
      });
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [themeMode]);

  const setThemeMode = React.useCallback((mode: ThemeMode) => {
    // Determine the color scheme immediately
    const newColorScheme: ColorSchemeName = mode === 'automatic' 
      ? Appearance.getColorScheme() 
      : mode;
    
    // Batch state updates for instant UI update (React will batch these)
    setThemeModeState(mode);
    setColorScheme(newColorScheme);
    
    // Update system UI immediately (fire and forget, non-blocking)
    updateSystemUI(newColorScheme);
    
    // Save to storage asynchronously (fire and forget, non-blocking)
    // Use setTimeout to defer to next event loop, ensuring UI updates first
    setTimeout(() => {
      AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error) => {
        if (__DEV__) {
          console.error('Error saving theme preference:', error);
        }
      });
    }, 0);
  }, []);

  const toggleTheme = React.useCallback(() => {
    // Determine new mode immediately
    const newMode: ThemeMode = themeMode === 'automatic'
      ? (Appearance.getColorScheme() === 'dark' ? 'light' : 'dark')
      : (themeMode === 'dark' ? 'light' : 'dark');
    
    // Update immediately (calls setThemeMode which is synchronous for UI)
    setThemeMode(newMode);
  }, [themeMode, setThemeMode]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    themeMode,
    colorScheme: colorScheme || 'light',
    setThemeMode,
    toggleTheme,
  }), [themeMode, colorScheme, setThemeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

