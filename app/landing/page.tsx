"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Zap,
  Users,
  TrendingUp,
  Shield,
  ArrowRight,
  Play,
  X,
  Check,
  DollarSign,
  Target,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  BarChart3,
  Folder,
  MessageSquare,
  Award,
} from "lucide-react";
import Link from "next/link";
import { getPublicPlans } from "@/lib/pricing";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reps, setReps] = useState(5);
  const [callsPerWeek, setCallsPerWeek] = useState(10);
  const [minsPerCall, setMinsPerCall] = useState(15);

  const plans = getPublicPlans();

  // ROI Calculator Logic
  const weeklyHours = (reps * callsPerWeek * minsPerCall) / 60;
  const monthlyHours = weeklyHours * 4;
  const savedHours = monthlyHours * 0.9; // 90% time saved
  const monthlySavings = savedHours * 75; // $75/hr average

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">SynQall</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                FAQ
              </a>
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <Badge className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 px-4 py-1.5 text-sm font-semibold">
              Save 15+ minutes per call
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Your Sales Reps Spend <span className="text-violet-600 dark:text-violet-400">2 Hours a Day</span> on CRM Data Entry.<br />
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                SynQall Cuts It to 90 Seconds.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Upload your sales call → Get perfectly formatted CRM entries → Copy, paste, done.<br />
              <span className="font-semibold text-slate-900 dark:text-slate-100">No integrations. No IT. Just accurate data.</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-2xl shadow-violet-500/40 px-8 py-6 text-lg font-semibold rounded-xl">
                  Start Free Trial
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">3 Calls Free</span>
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-6 text-lg font-semibold rounded-xl">
                <Play className="w-5 h-5 mr-2" />
                Watch 2-min Demo
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Save 15+ minutes per call
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Setup in 5 minutes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Works with any CRM
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              The Hidden Cost of Manual CRM Updates
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Sales reps lose 2+ hours every day updating the CRM—time they should be selling.<br />
              For a 10-person team, that's <span className="font-bold text-red-600 dark:text-red-500">$400K+ per year</span> in lost productivity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
                  <X className="w-6 h-6" />
                  What Happens Now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Details get forgotten between calls</p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Key fields are skipped or rushed</p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Data becomes inconsistent across reps</p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Leaders manage pipeline with incomplete information</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-500" />
                  The Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">2+ hours/day</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Per rep on manual data entry</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">60-70%</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Typical CRM data accuracy</p>
                </div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-500 pt-2">
                  Outcome: Slower deals, weaker coaching, and forecasts no one trusts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Turn Every Call Into Perfect CRM Data—<span className="text-violet-600 dark:text-violet-400">in 60 Seconds</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto">
              SynQall transcribes your calls and formats the output into your exact CRM structure.<br />
              Your reps simply <span className="font-semibold text-slate-900 dark:text-slate-100">review and paste</span>.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <div className="text-center p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 rounded-2xl border-2 border-violet-200 dark:border-violet-700">
              <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Upload</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Drop your recording or meeting link</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">60-second processing</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">AI extracts all CRM fields</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Review</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Check formatted data</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">4</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Paste</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Copy to your CRM, done</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-violet-600 to-purple-600 text-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold mb-2">90 seconds</div>
                  <p className="text-violet-100">Active work time</p>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">90%+</div>
                  <p className="text-violet-100">Detail accuracy</p>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">14-19 min</div>
                  <p className="text-violet-100">Saved per call</p>
                </div>
              </div>
              <p className="text-center mt-6 text-lg font-medium">
                Your team instantly recovers 15–20 hours weekly, and your CRM becomes a reliable source of truth.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works - Before/After Comparison */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Less Typing. Better Data. <span className="text-violet-600 dark:text-violet-400">Done Faster.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-slate-100 dark:bg-slate-800">
                <CardTitle className="text-slate-900 dark:text-slate-100">Before SynQall</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Time per call</span>
                  <span className="font-bold text-red-600 dark:text-red-500">15–20 minutes</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Notes quality</span>
                  <span className="font-bold text-red-600 dark:text-red-500">Incomplete</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Accuracy</span>
                  <span className="font-bold text-red-600 dark:text-red-500">60–70%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Context retention</span>
                  <span className="font-bold text-red-600 dark:text-red-500">Lost between calls</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-violet-200 dark:border-violet-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  With SynQall
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Time per call</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">90 seconds</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Notes quality</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">Complete + structured</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Accuracy</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">90%+</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Context retention</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">100% captured</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Everything Reps Need. <span className="text-violet-600 dark:text-violet-400">Nothing They Don't.</span>
            </h2>
          </div>
          {/* Multi-Party Call Highlight - USP */}
          <div className="mb-12 p-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-2 border-violet-200 dark:border-violet-800 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Multi-Party Call Support</h3>
                  <Badge className="bg-violet-600 text-white border-0">Industry First</Badge>
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
                  The only platform that accurately handles calls with <span className="font-semibold text-violet-600 dark:text-violet-400">multiple stakeholders</span>. Add unlimited participants, assign roles, and get perfect speaker identification—even on complex enterprise deals.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Track Every Participant</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Name, role, company for each person</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Automatic Speaker Labels</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI identifies who said what</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Enterprise Sales Ready</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Perfect for complex buying committees</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Unlimited Participants</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">No limits on team size</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-2 border-blue-100 dark:border-blue-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Automatic Extraction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Full transcript with speaker labels</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Company and contact details</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pain points, challenges, budget</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Timeline, next steps, decision makers</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Objections, competitors, sentiment</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-violet-100 dark:border-violet-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-4">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <CardTitle>CRM-Ready Output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Salesforce, HubSpot, Pipedrive templates</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Custom templates for any CRM</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">One-time setup, auto-format forever</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Export multiple formats from one call</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-100 dark:border-emerald-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Additional Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Follow-up email drafts</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Search across past calls</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">PDF export for sharing</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Analytics dashboard</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why No Integration Is a Feature */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Works With Any CRM—<span className="text-violet-600 dark:text-violet-400">Because It Doesn't Rely on Integrations</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Most tools require IT approval, API access, and weeks of setup. SynQall avoids that entirely.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
                  <X className="w-6 h-6" />
                  Traditional Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">6–12 week security reviews</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Only support certain CRMs</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Break when APIs change</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Can't handle custom CRMs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                  SynQall's Copy-Paste Approach
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Live in 5 minutes</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Works with any CRM, including custom</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Never breaks</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Supports multiple CRMs at once</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-center mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
            A few seconds of copy-paste = total flexibility.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              How SynQall Stacks Up
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl">Gong / Chorus</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">Full conversation intelligence</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Setup</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">6–12 weeks</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Custom CRM</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-500">No</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Best for</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Large teams</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl">ChatGPT</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">Occasional transcription</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Setup</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Instant</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Limitation</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-500">8-10 min formatting</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Best for</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Ad-hoc use</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-violet-900 dark:text-violet-300">SynQall</CardTitle>
                    <p className="text-sm text-violet-700 dark:text-violet-400">Speed + CRM flexibility</p>
                  </div>
                  <Badge className="bg-violet-600 text-white">Best Value</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-violet-100 dark:border-violet-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Setup</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">5 minutes</span>
                </div>
                <div className="flex justify-between py-2 border-b border-violet-100 dark:border-violet-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom CRM</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">Yes ✓</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Best for</span>
                  <span className="text-sm font-bold text-violet-900 dark:text-violet-300">5-50 rep teams</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Start free. Scale as you grow.
            </p>
            <div className="inline-flex items-center gap-4 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-violet-600 text-white shadow-lg"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  billingCycle === "annual"
                    ? "bg-violet-600 text-white shadow-lg"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Annual
                <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.isPopular
                    ? "border-2 border-violet-200 dark:border-violet-700 shadow-2xl shadow-violet-500/20"
                    : "border-2 border-slate-200 dark:border-slate-700"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-1.5">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        {plan.priceDisplay}
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                          ${billingCycle === "monthly" ? plan.price : Math.round(plan.priceAnnual / 12)}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {billingCycle === "monthly" ? "/month" : "/month, billed annually"}
                        </div>
                      </>
                    )}
                  </div>
                  <Link href={plan.id === "free" ? "/signup" : "/signup"}>
                    <Button
                      className={`w-full ${
                        plan.isPopular
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                          : "bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              See Your Team's <span className="text-violet-600 dark:text-violet-400">Time Savings</span>
            </h2>
          </div>
          <Card className="border-2 border-violet-200 dark:border-violet-700 shadow-2xl">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Number of Reps
                  </label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Calls per Week
                  </label>
                  <input
                    type="number"
                    value={callsPerWeek}
                    onChange={(e) => setCallsPerWeek(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Minutes Spent per Call
                  </label>
                  <input
                    type="number"
                    value={minsPerCall}
                    onChange={(e) => setMinsPerCall(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100"
                    min="1"
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
                <div className="grid md:grid-cols-3 gap-6 text-center mb-6">
                  <div>
                    <div className="text-4xl font-bold mb-2">{monthlyHours.toFixed(0)}</div>
                    <p className="text-violet-100">Hours spent monthly</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold mb-2">{savedHours.toFixed(0)}</div>
                    <p className="text-violet-100">Hours saved monthly</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold mb-2">${monthlySavings.toLocaleString()}</div>
                    <p className="text-violet-100">Monthly savings</p>
                  </div>
                </div>
                <p className="text-center text-lg font-medium">
                  SynQall reduces {monthlyHours.toFixed(0)} hours to {(monthlyHours - savedHours).toFixed(0)} hours, saving ${monthlySavings.toLocaleString()} monthly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              What Sales Teams Are Saying
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 italic">
                  "We save ~12 hours per week across our 4-rep team. Data quality improved instantly."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    MS
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Micheal Sanni</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Sales Ops Manager</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 italic">
                  "Setup took under 10 minutes. Our custom CRM fields mapped perfectly."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    JO
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Jules Oliver</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">VP of Sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 italic">
                  "Perfect for our legacy CRM. No IT approval needed."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    JM
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Jessica Marlone</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Head of RevOps</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Why not just use Gong/Chorus?",
                a: "They're full coaching platforms. Great for large teams, but heavy to implement. SynQall is the fastest path to accurate CRM data.",
              },
              {
                q: "Why not use ChatGPT?",
                a: "You'll spend 8–10 minutes formatting fields. SynQall formats for you automatically with 1-time setup.",
              },
              {
                q: "How accurate is it?",
                a: "Typically 90–95% for clear audio—much higher than rushed manual notes.",
              },
              {
                q: "Is copy-paste really better than API integration?",
                a: "If you want speed, flexibility, and no IT involvement—yes. You can be live in 5 minutes with any CRM, including custom ones.",
              },
              {
                q: "Is my data secure?",
                a: "Encrypted in transit and at rest, auto-delete options, no training on your data, and enterprise agreements available.",
              },
            ].map((faq, idx) => (
              <Card
                key={idx}
                className="border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                onClick={() => toggleFaq(idx)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{faq.q}</h3>
                    {openFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    )}
                  </div>
                  {openFaq === idx && (
                    <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Is SynQall Right for You?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                  Perfect Fit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams with 5–50 reps</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Companies using custom or multi-CRM setups</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams needing fast deployment</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Organizations with inconsistent CRM data</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
                  <X className="w-6 h-6" />
                  Not a Fit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Solo reps with &lt;5 calls weekly</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams already using Gong/Chorus for full enablement</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Very low call volume organizations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-violet-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Give Your Reps Their Time Back
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-violet-100">
            More selling. Better data. Faster workflows.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-slate-100 shadow-2xl px-8 py-6 text-lg font-semibold rounded-xl">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl">
                Schedule a Demo
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              3 calls included
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              No card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              5-minute setup
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">SynQall</span>
              </div>
              <p className="text-slate-400 text-sm">
                Turn sales calls into perfect CRM data in 60 seconds.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:support@synqall.com" className="hover:text-white transition-colors">support@synqall.com</a></li>
                <li><a href="tel:+2348106740579" className="hover:text-white transition-colors">+234 810 674 0579</a></li>
                <li className="text-slate-400">Lagos, Nigeria</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2025 SynQall. All rights reserved.</p>
            <p className="mt-2">SynQall is owned and operated by Nikola Innovations Limited.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
