/**
 * Individual Blog Post Page
 * Renders MDX content with full SEO support
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, Bookmark, ChevronRight } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBlogPost, getRelatedPosts, getAllBlogPosts } from '@/lib/blog';

// Generate metadata for SEO
export async function generateMetadata({
  params
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = getBlogPost(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found | LoadVoice Blog',
    };
  }

  return {
    title: `${post.frontmatter.title} | LoadVoice Blog`,
    description: post.frontmatter.excerpt,
    keywords: post.frontmatter.tags.join(', '),
    authors: [{ name: post.frontmatter.author }],
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      type: 'article',
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
      images: post.frontmatter.featuredImage ? [post.frontmatter.featuredImage] : undefined,
      tags: post.frontmatter.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      images: post.frontmatter.featuredImage ? [post.frontmatter.featuredImage] : undefined,
    },
  };
}

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const { posts } = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Custom components for MDX rendering
const components = {
  h1: (props: any) => (
    <h1 className="text-4xl font-bold mt-8 mb-4 text-white" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-3xl font-semibold mt-8 mb-4 text-white" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold mt-6 mb-3 text-white" {...props} />
  ),
  p: (props: any) => (
    <p className="text-gray-300 leading-relaxed mb-4" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-2" {...props} />
  ),
  li: (props: any) => (
    <li className="ml-4" {...props} />
  ),
  a: (props: any) => (
    <a className="text-purple-400 hover:text-purple-300 underline" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-400" {...props} />
  ),
  code: (props: any) => (
    <code className="bg-purple-900/50 px-2 py-1 rounded text-sm text-purple-300" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-purple-900/30 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
  ),
  img: (props: any) => (
    <img className="rounded-lg my-6 w-full" alt="" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full bg-purple-900/30 rounded-lg" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="px-4 py-2 bg-purple-800/50 text-left text-white font-semibold" {...props} />
  ),
  td: (props: any) => (
    <td className="px-4 py-2 border-t border-purple-700/30 text-gray-300" {...props} />
  ),
  strong: (props: any) => (
    <strong className="font-bold text-white" {...props} />
  ),
};

export default async function BlogPostPage({
  params
}: {
  params: { slug: string }
}) {
  const post = getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(params.slug, 3);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      <article className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Back to Blog */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.frontmatter.categories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 text-sm bg-purple-800/30 text-purple-300 rounded-full"
              >
                {category}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {post.frontmatter.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-300 mb-6">
            {post.frontmatter.excerpt}
          </p>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(post.frontmatter.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.frontmatter.readingTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.frontmatter.author}
            </span>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-4 mt-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-800/30 hover:bg-purple-800/50 rounded-lg transition-colors">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-800/30 hover:bg-purple-800/50 rounded-lg transition-colors">
              <Bookmark className="h-4 w-4" />
              Save
            </button>
          </div>
        </header>

        {/* Featured Image */}
        {post.frontmatter.featuredImage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.frontmatter.featuredImage}
              alt={post.frontmatter.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-invert max-w-none">
          <MDXRemote
            source={post.content}
            components={components}
          />
        </div>

        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-purple-700/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {post.frontmatter.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 text-sm bg-purple-800/30 text-purple-300 rounded-full hover:bg-purple-800/50 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Author Bio */}
        <div className="mt-12 p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
          <h3 className="text-xl font-semibold mb-3">About the Author</h3>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">{post.frontmatter.author}</p>
              <p className="text-gray-400 text-sm mt-1">
                Freight industry expert and technology enthusiast helping brokers automate their operations with LoadVoice.
              </p>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 p-8 bg-gradient-to-r from-purple-900/50 to-pink-900/30 rounded-xl border border-purple-700/30 text-center">
          <h3 className="text-2xl font-semibold mb-3">
            Get More Freight Broker Tips
          </h3>
          <p className="text-gray-300 mb-6">
            Join 5,000+ freight brokers getting weekly insights and automation tips.
          </p>
          <div className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-purple-900/50 border border-purple-700/50 rounded-lg text-white placeholder-gray-400"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors">
              Subscribe
            </button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-semibold mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="block p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl hover:bg-purple-900/40 transition-all"
                >
                  <h4 className="font-semibold mb-2 line-clamp-2">
                    {relatedPost.frontmatter.title}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {relatedPost.frontmatter.excerpt}
                  </p>
                  <span className="text-purple-400 text-sm flex items-center gap-1">
                    Read more
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* LoadVoice CTA */}
      <div className="bg-purple-950 border-t border-purple-800/30 py-12">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Save 10+ Hours Per Week?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            LoadVoice automates your call documentation so you can focus on moving freight.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
          >
            Start Your Free Hour →
          </Link>
        </div>
      </div>
    </div>
  );
}