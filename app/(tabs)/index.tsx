import { ArticleCard } from '@/components/ArticleCard';
import { RefreshButton } from '@/components/RefreshButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchAllArticles, getNewsSources } from '@/services/rssService';
import {
  getSavedArticleIds,
  removeArticle,
  saveArticle,
} from '@/services/storageService';
import { Article } from '@/types/article';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllNewsScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedArticleIds, setSavedArticleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Load saved article IDs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedArticleIds();
    }, [])
  );

  const loadSavedArticleIds = async () => {
    const ids = await getSavedArticleIds();
    setSavedArticleIds(ids);
  };

  const loadArticles = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const fetchedArticles = await fetchAllArticles();
      setArticles(fetchedArticles);
    } catch (err) {
      setError('Failed to load articles. Please try again.');
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const onRefresh = useCallback(() => {
    loadArticles(true);
    loadSavedArticleIds();
  }, []);

  const handleLikePress = async (article: Article) => {
    const isSaved = savedArticleIds.has(article.id);
    
    if (isSaved) {
      const success = await removeArticle(article.id);
      if (success) {
        setSavedArticleIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
      } else {
        Alert.alert('Error', 'Failed to remove article from saved list');
      }
    } else {
      const success = await saveArticle(article);
      if (success) {
        setSavedArticleIds((prev) => new Set(prev).add(article.id));
      } else {
        Alert.alert('Info', 'Article is already saved');
      }
    }
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={styles.loadingText}>Loading cybersecurity news...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error && articles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <ThemedText
              style={styles.retryText}
              onPress={() => loadArticles()}>
              Tap to retry
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <FlatList
          data={articles}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              isSaved={savedArticleIds.has(item.id)}
              onLikePress={handleLikePress}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No articles found</ThemedText>
            </View>
          }
          ListHeaderComponent={
            articles.length > 0 ? (
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <ThemedText type="title" style={styles.headerTitle}>
                    Cybersecurity News
                  </ThemedText>
                  <View style={styles.headerButtons}>
                    <RefreshButton
                      onPress={onRefresh}
                      refreshing={refreshing}
                      size={20}
                    />
                    <ThemeToggle />
                  </View>
                </View>
                <ThemedText style={styles.headerSubtitle}>
                  {articles.length} articles from {getNewsSources().length} sources
                </ThemedText>
              </View>
            ) : (
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <ThemedText type="title" style={styles.headerTitle}>
                    Cybersecurity News
                  </ThemedText>
                  <View style={styles.headerButtons}>
                    <RefreshButton
                      onPress={onRefresh}
                      refreshing={refreshing}
                      size={20}
                    />
                    <ThemeToggle />
                  </View>
                </View>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 15,
    opacity: 0.7,
    fontWeight: '500',
  },
});
