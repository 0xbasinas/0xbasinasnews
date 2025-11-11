import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Article } from '@/types/article';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

interface ArticleCardProps {
  article: Article;
  isSaved: boolean;
  onLikePress: (article: Article) => void;
}

export function ArticleCard({ article, isSaved, onLikePress }: ArticleCardProps) {
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const handleLinkPress = async () => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const supported = await Linking.canOpenURL(article.url);
      if (supported) {
        await Linking.openURL(article.url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleLikePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLikePress(article);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return dateString;
    }
  };

  const styles = StyleSheet.create({
    card: {
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: colorScheme === 'dark' ? 1 : 0,
      borderColor: colors.border,
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    sourceBadge: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    sourceText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.tint,
    },
    title: {
      fontSize: 18,
      lineHeight: 24,
      flex: 1,
      marginRight: 12,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
      opacity: 0.8,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    date: {
      fontSize: 12,
      opacity: 0.6,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    linkButton: {
      padding: 4,
      marginRight: 8,
    },
    likeButton: {
      padding: 4,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
            {article.title}
          </ThemedText>
          <View style={styles.sourceBadge}>
            <ThemedText style={styles.sourceText}>{article.source}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.description} numberOfLines={3}>
          {article.description}
        </ThemedText>
        <View style={styles.footer}>
          <ThemedText style={styles.date}>{formatDate(article.publishedDate)}</ThemedText>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleLinkPress}
              style={styles.linkButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IconSymbol
                name="arrow.up.right.square"
                size={22}
                color={colors.tint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLikePress}
              style={styles.likeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IconSymbol
                name={isSaved ? 'heart.fill' : 'heart'}
                size={24}
                color={isSaved ? '#FF3B30' : colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

