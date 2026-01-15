/**
 * Blog Utility Functions
 * Handles reading, parsing, and processing blog posts from MDX files
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { BlogPost, BlogCategory, BlogTag, BlogSearchParams, BlogPagination } from '@/lib/types/blog';

const BLOG_CONTENT_PATH = path.join(process.cwd(), 'content', 'blog');

/**
 * Ensures the blog content directory exists
 */
function ensureBlogDirectory() {
  if (!fs.existsSync(BLOG_CONTENT_PATH)) {
    fs.mkdirSync(BLOG_CONTENT_PATH, { recursive: true });
  }
}

/**
 * Get all blog post files from the content directory
 */
export function getBlogFiles(): string[] {
  ensureBlogDirectory();
  try {
    return fs.readdirSync(BLOG_CONTENT_PATH).filter((file) => file.endsWith('.mdx'));
  } catch (error) {
    console.error('Error reading blog files:', error);
    return [];
  }
}

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string): BlogPost | null {
  try {
    const filePath = path.join(BLOG_CONTENT_PATH, `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(source);
    const readTime = readingTime(content);

    return {
      slug,
      frontmatter: {
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || '',
        author: data.author || 'LoadVoice Team',
        categories: data.categories || [],
        tags: data.tags || [],
        featuredImage: data.featuredImage || null,
        published: data.published !== false,
        readingTime: readTime.text,
      },
      content,
      readingTime: readTime,
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Get all blog posts (optionally filtered)
 */
export function getAllBlogPosts(params?: BlogSearchParams): {
  posts: BlogPost[];
  pagination: BlogPagination;
} {
  ensureBlogDirectory();

  const files = getBlogFiles();
  let posts: BlogPost[] = [];

  // Read and parse all posts
  files.forEach((file) => {
    const slug = file.replace('.mdx', '');
    const post = getBlogPost(slug);
    if (post && post.frontmatter.published) {
      posts.push(post);
    }
  });

  // Sort posts by date (newest first)
  posts.sort((a, b) => {
    return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
  });

  // Apply filters
  if (params) {
    // Search filter
    if (params.query) {
      const query = params.query.toLowerCase();
      posts = posts.filter((post) => {
        return (
          post.frontmatter.title.toLowerCase().includes(query) ||
          post.frontmatter.excerpt.toLowerCase().includes(query) ||
          post.frontmatter.categories.some((cat) => cat.toLowerCase().includes(query)) ||
          post.frontmatter.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      });
    }

    // Category filter
    if (params.category) {
      posts = posts.filter((post) =>
        post.frontmatter.categories.some(
          (cat) => cat.toLowerCase() === params.category?.toLowerCase()
        )
      );
    }

    // Tag filter
    if (params.tag) {
      posts = posts.filter((post) =>
        post.frontmatter.tags.some(
          (tag) => tag.toLowerCase() === params.tag?.toLowerCase()
        )
      );
    }

    // Author filter
    if (params.author) {
      posts = posts.filter((post) =>
        post.frontmatter.author.toLowerCase() === params.author?.toLowerCase()
      );
    }
  }

  // Pagination
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedPosts = posts.slice(startIndex, endIndex);

  return {
    posts: paginatedPosts,
    pagination: {
      currentPage: page,
      totalPages,
      totalPosts,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Get all unique categories with counts
 */
export function getAllCategories(): BlogCategory[] {
  const { posts } = getAllBlogPosts();
  const categoryMap = new Map<string, number>();

  posts.forEach((post) => {
    post.frontmatter.categories.forEach((category) => {
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + 1);
    });
  });

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get all unique tags with counts
 */
export function getAllTags(): BlogTag[] {
  const { posts } = getAllBlogPosts();
  const tagMap = new Map<string, number>();

  posts.forEach((post) => {
    post.frontmatter.tags.forEach((tag) => {
      const current = tagMap.get(tag) || 0;
      tagMap.set(tag, current + 1);
    });
  });

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get related posts based on shared categories and tags
 */
export function getRelatedPosts(slug: string, limit: number = 3): BlogPost[] {
  const currentPost = getBlogPost(slug);
  if (!currentPost) return [];

  const { posts } = getAllBlogPosts();

  // Filter out the current post
  const otherPosts = posts.filter((post) => post.slug !== slug);

  // Score each post based on shared categories and tags
  const scoredPosts = otherPosts.map((post) => {
    let score = 0;

    // Score for shared categories (weight: 2)
    currentPost.frontmatter.categories.forEach((category) => {
      if (post.frontmatter.categories.includes(category)) {
        score += 2;
      }
    });

    // Score for shared tags (weight: 1)
    currentPost.frontmatter.tags.forEach((tag) => {
      if (post.frontmatter.tags.includes(tag)) {
        score += 1;
      }
    });

    return { post, score };
  });

  // Sort by score and return top posts
  return scoredPosts
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
}

/**
 * Get recent posts
 */
export function getRecentPosts(limit: number = 5): BlogPost[] {
  const { posts } = getAllBlogPosts({ limit });
  return posts;
}

/**
 * Get posts by author
 */
export function getPostsByAuthor(author: string, limit?: number): BlogPost[] {
  const { posts } = getAllBlogPosts({ author, limit });
  return posts;
}

/**
 * Get scheduled posts (posts with future dates)
 */
export function getScheduledPosts(): BlogPost[] {
  ensureBlogDirectory();
  const files = getBlogFiles();
  const now = new Date();
  const scheduledPosts: BlogPost[] = [];

  files.forEach((file) => {
    const slug = file.replace('.mdx', '');
    const post = getBlogPost(slug);
    if (post && new Date(post.frontmatter.date) > now) {
      scheduledPosts.push(post);
    }
  });

  return scheduledPosts.sort((a, b) => {
    return new Date(a.frontmatter.date).getTime() - new Date(b.frontmatter.date).getTime();
  });
}

/**
 * Get draft posts (unpublished)
 */
export function getDraftPosts(): BlogPost[] {
  ensureBlogDirectory();
  const files = getBlogFiles();
  const draftPosts: BlogPost[] = [];

  files.forEach((file) => {
    const slug = file.replace('.mdx', '');
    const filePath = path.join(BLOG_CONTENT_PATH, file);
    const source = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(source);

    if (data.published === false) {
      const readTime = readingTime(content);
      draftPosts.push({
        slug,
        frontmatter: {
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          excerpt: data.excerpt || '',
          author: data.author || 'LoadVoice Team',
          categories: data.categories || [],
          tags: data.tags || [],
          featuredImage: data.featuredImage || null,
          published: false,
          readingTime: readTime.text,
        },
        content,
        readingTime: readTime,
      });
    }
  });

  return draftPosts;
}

/**
 * Generate a slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}