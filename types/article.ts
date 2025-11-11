export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  savedAt?: string;
}

export interface SavedArticle extends Article {
  savedAt: string;
}

