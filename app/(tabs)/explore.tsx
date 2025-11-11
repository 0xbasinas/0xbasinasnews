import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ArticleCard } from '@/components/ArticleCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SavedArticle } from '@/types/article';
import {
  getSavedArticles,
  removeArticle,
} from '@/services/storageService';
import { useFocusEffect } from 'expo-router';

export default function SavedArticlesScreen() {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedArticles = async () => {
    try {
      setLoading(true);
      const articles = await getSavedArticles();
      setSavedArticles(articles);
    } catch (error) {
      console.error('Error loading saved articles:', error);
      Alert.alert('Error', 'Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  };

  // Reload saved articles when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedArticles();
    }, [])
  );

  const handleLikePress = async (article: SavedArticle) => {
    const success = await removeArticle(article.id);
    if (success) {
      // Remove from local state
      setSavedArticles((prev) => prev.filter((a) => a.id !== article.id));
    } else {
      Alert.alert('Error', 'Failed to remove article from saved list');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText style={styles.loadingText}>Loading saved articles...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <FlatList
          data={savedArticles}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              isSaved={true}
              onLikePress={handleLikePress}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText type="title" style={styles.emptyTitle}>
                No Saved Articles
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Tap the heart icon on any article to save it here
              </ThemedText>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <ThemedText type="title" style={styles.headerTitle}>
                  Saved Articles
                </ThemedText>
                <ThemeToggle />
              </View>
              {savedArticles.length > 0 && (
                <ThemedText style={styles.headerSubtitle}>
                  {savedArticles.length} {savedArticles.length === 1 ? 'article' : 'articles'} saved
                </ThemedText>
              )}
            </View>
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
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
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
  headerTitle: {
    fontSize: 32,
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
