import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, SavedArticle } from '@/types/article';

const STORAGE_KEY = '@cybersecurity_news:saved_articles';

/**
 * Get all saved articles from storage
 */
export async function getSavedArticles(): Promise<SavedArticle[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const articles: SavedArticle[] = JSON.parse(data);
    // Sort by saved date (newest first)
    return articles.sort((a, b) => {
      const dateA = new Date(a.savedAt).getTime();
      const dateB = new Date(b.savedAt).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error loading saved articles:', error);
    return [];
  }
}

/**
 * Save an article to storage
 */
export async function saveArticle(article: Article): Promise<boolean> {
  try {
    const savedArticles = await getSavedArticles();
    
    // Check if article is already saved
    const exists = savedArticles.find((a) => a.id === article.id);
    if (exists) {
      return false; // Article already saved
    }

    const savedArticle: SavedArticle = {
      ...article,
      savedAt: new Date().toISOString(),
    };

    savedArticles.push(savedArticle);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedArticles));
    return true;
  } catch (error) {
    console.error('Error saving article:', error);
    return false;
  }
}

/**
 * Remove an article from storage
 */
export async function removeArticle(articleId: string): Promise<boolean> {
  try {
    const savedArticles = await getSavedArticles();
    const filtered = savedArticles.filter((a) => a.id !== articleId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing article:', error);
    return false;
  }
}

/**
 * Check if an article is saved
 */
export async function isArticleSaved(articleId: string): Promise<boolean> {
  try {
    const savedArticles = await getSavedArticles();
    return savedArticles.some((a) => a.id === articleId);
  } catch (error) {
    console.error('Error checking if article is saved:', error);
    return false;
  }
}

/**
 * Get saved article IDs as a Set for quick lookup
 */
export async function getSavedArticleIds(): Promise<Set<string>> {
  try {
    const savedArticles = await getSavedArticles();
    return new Set(savedArticles.map((a) => a.id));
  } catch (error) {
    console.error('Error getting saved article IDs:', error);
    return new Set();
  }
}

