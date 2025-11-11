import React from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface RefreshButtonProps {
  onPress: () => void;
  refreshing?: boolean;
  size?: number;
}

export function RefreshButton({ onPress, refreshing = false, size = 24 }: RefreshButtonProps) {
  const { colorScheme } = useTheme();
  const actualColorScheme = colorScheme || 'light';
  const colors = Colors[actualColorScheme === 'dark' ? 'dark' : 'light'];

  const handlePress = () => {
    // Trigger haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      disabled={refreshing}
      accessibilityLabel="Refresh articles"
      accessibilityRole="button">
      <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <IconSymbol
            name="arrow.clockwise"
            size={size}
            color={colors.tint}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

