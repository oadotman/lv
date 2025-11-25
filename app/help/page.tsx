"use client";

import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Rocket, FileText, CreditCard, Wrench, Mail, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  const categories = [
    {
      icon: Rocket,
      title: "Getting Started",
      description: "Learn the basics",
      articles: [
        "How to upload your first call",
        "Understanding your CRM templates",
        "Quick start guide",
      ],
    },
    {
      icon: FileText,
      title: "Templates & Formatting",
      description: "Customize your output",
      articles: [
        "Creating custom templates",
        "Editing field mappings",
        "Supported CRM formats",
      ],
    },
    {
      icon: CreditCard,
      title: "Billing & Plans",
      description: "Manage your subscription",
      articles: [
        "Plan comparison",
        "Upgrading/downgrading",
        "Understanding usage limits",
      ],
    },
    {
      icon: Wrench,
      title: "Troubleshooting",
      description: "Solve common issues",
      articles: [
        "Common upload errors",
        "Audio quality issues",
        "Template mapping problems",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <TopBar />

      <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-200">
        <div className="max-w-5xl mx-auto">
          {/* Modern Header */}
          <div className="relative group text-center mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-violet-600/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-8 lg:p-12 border border-white/40 shadow-xl">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent tracking-tight mb-4">
                How can we help?
              </h1>
              <p className="text-slate-600 font-medium text-lg mb-8">
                Find answers to your questions, browse articles, and get support.
              </p>

              {/* Modern Search */}
              <div className="relative max-w-2xl mx-auto group/search">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/search:text-violet-600 transition-colors z-10" />
                <Input
                  placeholder="Search help articles..."
                  className="pl-14 pr-6 py-4 h-14 text-base bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-slate-400 font-medium shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((category, index) => (
                <Card key={index} className="border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                        <category.icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">{category.title}</CardTitle>
                        <p className="text-sm text-slate-600 font-medium">{category.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {category.articles.map((article, idx) => (
                        <li key={idx}>
                          <Link
                            href="#"
                            className="text-sm text-violet-600 hover:text-violet-700 font-semibold hover:underline block transition-colors duration-200 flex items-center gap-2 group/link"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 group-hover/link:scale-150 transition-transform" />
                            {article}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Contact Support Card */}
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-pink-600/10 blur-xl" />
              <CardContent className="relative py-12 px-6 text-center bg-gradient-to-br from-violet-50 to-purple-50">
                <div className="inline-flex p-4 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30 mb-6">
                  <Mail className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">Can't find what you're looking for?</h2>
                <p className="text-slate-600 font-medium text-lg mb-8 max-w-2xl mx-auto">
                  Our support team is here to help. Reach out and we'll get back to you as soon
                  as possible.
                </p>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-8 py-3 text-base"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Support
                </Button>
                <div className="mt-8 text-sm text-slate-600 font-medium space-y-2">
                  <p className="font-semibold text-slate-900">Email us at <span className="text-violet-600">support@synqall.com</span></p>
                  <p>Response time: <span className="font-bold text-emerald-600">&lt; 24 hours</span></p>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
