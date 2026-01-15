/**
 * Blog Type Definitions
 * Defines the structure for blog posts and related data
 */

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  published: boolean;
  readingTime?: string;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
  readingTime: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
}

export interface BlogCategory {
  name: string;
  slug: string;
  count: number;
}

export interface BlogTag {
  name: string;
  slug: string;
  count: number;
}

export interface BlogSearchParams {
  query?: string;
  category?: string;
  tag?: string;
  author?: string;
  page?: number;
  limit?: number;
}

export interface BlogPagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNext: boolean;
  hasPrevious: boolean;
}