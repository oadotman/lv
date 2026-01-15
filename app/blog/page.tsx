/**
 * Blog List Page - Enhanced with MDX support
 * Displays blog posts from MDX files with search and filtering
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, ArrowRight, Tag, Search, Filter } from 'lucide-react';
import { getAllBlogPosts, getAllCategories, getAllTags } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog | LoadVoice - Freight Broker Insights & Updates',
  description: 'Stay updated with the latest freight broker automation tips, industry insights, and LoadVoice product updates.',
  keywords: [
    'freight broker blog',
    'logistics insights',
    'freight technology news',
    'LoadVoice updates',
    'transportation blog'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/blog'
  },
  openGraph: {
    title: 'LoadVoice Blog - Freight Industry Insights',
    description: 'Expert insights on freight brokerage, automation tips, and industry updates.',
    url: 'https://loadvoice.com/blog',
    siteName: 'LoadVoice',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default async function BlogPage() {
  // Fetch blog posts from MDX files
  const { posts, pagination } = getAllBlogPosts({ limit: 20 });
  const categories = getAllCategories();
  const tags = getAllTags();

  // Format date helper
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
      <div className="container mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            LoadVoice Blog
          </h1>
          <p className="text-xl text-gray-300">
            Insights, tips, and updates for freight brokers
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full pl-12 pr-4 py-3 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Blog Posts Grid */}
            <div className="grid gap-6">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="block"
                  >
                    <article className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl hover:bg-purple-900/40 transition-all group cursor-pointer">
                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
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

                      {/* Title */}
                      <h2 className="text-2xl font-semibold mb-3 group-hover:text-purple-300 transition-colors">
                        {post.frontmatter.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-gray-300 mb-4">
                        {post.frontmatter.excerpt}
                      </p>

                      {/* Categories and Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.frontmatter.categories.map((category) => (
                          <span
                            key={category}
                            className="px-3 py-1 text-xs bg-purple-800/30 text-purple-300 rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>

                      {/* Read More Link */}
                      <div className="flex items-center text-purple-400 group-hover:text-purple-300 transition-colors">
                        Read more
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </article>
                  </Link>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No blog posts found.</p>
                  <p className="text-sm text-gray-500">Check back soon for new content!</p>
                </div>
              )}
            </div>

            {/* Pagination (if needed) */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`px-4 py-2 rounded-lg ${
                      i + 1 === pagination.currentPage
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-gray-400 hover:bg-purple-900/50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Categories */}
            <div className="mb-8 p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.slug}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-800/30 transition-colors flex justify-between items-center"
                  >
                    <span>{category.name}</span>
                    <span className="text-sm text-gray-400">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div className="mb-8 p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((tag) => (
                  <button
                    key={tag.slug}
                    className="px-3 py-1 text-sm bg-purple-800/30 text-purple-300 rounded-full hover:bg-purple-800/50 transition-colors"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Newsletter CTA */}
            <div className="p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/30 rounded-xl border border-purple-700/30">
              <h3 className="text-xl font-semibold mb-3">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                Get the latest freight automation tips delivered to your inbox.
              </p>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-lg mb-3 text-white placeholder-gray-400"
              />
              <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors">
                Subscribe
              </button>
            </div>

            {/* Guest Post CTA */}
            <div className="mt-8 p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl text-center">
              <h3 className="text-lg font-semibold mb-3">
                Want to contribute?
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                Share your freight broker insights with our community.
              </p>
              <a
                href="mailto:blog@loadvoice.com"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                Contact us
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}