import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: number;
}

export function ThemeToggle({ showLabel = false, size = 24 }: ThemeToggleProps) {
  const { toggleTheme, themeMode, colorScheme } = useTheme();
  const actualColorScheme = colorScheme || 'light';
  const colors = Colors[actualColorScheme === 'dark' ? 'dark' : 'light'];

  const handlePress = () => {
    // Trigger haptic feedback immediately (non-blocking)
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Toggle theme immediately (synchronous state update)
    toggleTheme();
  };

  // Determine icon based on current theme
  const getIcon = () => {
    if (themeMode === 'automatic') {
      return 'circle.lefthalf.filled'; // Half circle for automatic
    }
    return actualColorScheme === 'dark' ? 'sun.max.fill' : 'moon.fill';
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={`Toggle theme. Current: ${themeMode === 'automatic' ? 'automatic' : actualColorScheme}`}
      accessibilityRole="button">
      <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
        <IconSymbol
          name={getIcon()}
          size={size}
          color={colors.tint}
        />
      </View>
      {showLabel && (
        <ThemedText style={styles.label}>
          {themeMode === 'automatic' 
            ? 'Auto' 
            : actualColorScheme === 'dark' 
            ? 'Light' 
            : 'Dark'}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});

