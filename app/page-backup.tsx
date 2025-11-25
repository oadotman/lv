"use client";

import { useMemo, useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, formatDuration } from "@/lib/utils";
import { SentimentType } from "@/lib/types";
import {
  TrendingUp,
  Clock,
  Zap,
  Eye,
  Phone,
  Users,
  Calendar,
  ArrowUpRight,
  FileText,
  Download,
  MoreVertical,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  X,
  HelpCircle,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { UsageMeter } from "@/components/dashboard/UsageMeter";
import { OverageBanner } from "@/components/dashboard/OverageBanner";

// Helper function to get sentiment configuration
const getSentimentConfig = (sentiment?: SentimentType) => {
  switch (sentiment) {
    case "positive":
      return {
        emoji: "😊",
        label: "Positive",
        bgColor: "bg-emerald-100",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
      };
    case "neutral":
      return {
        emoji: "😐",
        label: "Neutral",
        bgColor: "bg-slate-100",
        textColor: "text-slate-700",
        borderColor: "border-slate-200",
      };
    case "negative":
      return {
        emoji: "😟",
        label: "Negative",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        borderColor: "border-red-200",
      };
    default:
      return null;
  }
};

interface DashboardStats {
  callsThisMonth: number;
  callsLastMonth: number;
  callsTrend: string;
  timeSaved: string;
  hoursSavedThisMonth: number;
  hoursSavedLastMonth: number;
  minutesUsed: number;
  minutesTotal: number;
  hourlyRate: number;
}

interface Call {
  id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  sentiment_type: SentimentType | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showMilestone, setShowMilestone] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchDashboardData() {
      if (!user) return; // Additional TypeScript safety check

      try {
        const supabase = createClient();

        // Fetch recent calls (last 5)
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (callsError) {
          console.error('Error fetching calls:', callsError);
        } else {
          setRecentCalls(callsData || []);
        }

        // Fetch metrics for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Current month calls
        const { data: currentMonthCalls } = await supabase
          .from('calls')
          .select('id, duration')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString());

        // Last month calls
        const { data: lastMonthCalls } = await supabase
          .from('calls')
          .select('id, duration')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString());

        const callsThisMonth = currentMonthCalls?.length || 0;
        const callsLastMonth = lastMonthCalls?.length || 0;

        // Calculate minutes used (for billing)
        const totalMinutesThisMonth = (currentMonthCalls || []).reduce(
          (sum, call) => sum + (call.duration ? call.duration / 60 : 0),
          0
        );

        // Calculate time saved (assuming 15 min saved per call)
        const hoursSavedThisMonth = Math.round((callsThisMonth * 15) / 60 * 10) / 10;
        const hoursSavedLastMonth = Math.round((callsLastMonth * 15) / 60 * 10) / 10;

        // Calculate trend
        let callsTrend = "+0%";
        if (callsLastMonth > 0) {
          const percentChange = Math.round(
            ((callsThisMonth - callsLastMonth) / callsLastMonth) * 100
          );
          callsTrend = `${percentChange > 0 ? "+" : ""}${percentChange}%`;
        } else if (callsThisMonth > 0) {
          callsTrend = "+100%";
        }

        setStats({
          callsThisMonth,
          callsLastMonth,
          callsTrend,
          timeSaved: `${hoursSavedThisMonth} hours`,
          hoursSavedThisMonth,
          hoursSavedLastMonth,
          minutesUsed: Math.round(totalMinutesThisMonth),
          minutesTotal: 500, // Plan limit (can be fetched from user subscription)
          hourlyRate: 75, // Average hourly rate (can be customized per user)
        });

        setLoading(false);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Calculate ROI metrics
  const dollarsSaved = stats
    ? stats.hoursSavedThisMonth * stats.hourlyRate
    : 0;
  const percentageIncrease = stats && stats.hoursSavedLastMonth > 0
    ? Math.round(
        ((stats.hoursSavedThisMonth - stats.hoursSavedLastMonth) /
          stats.hoursSavedLastMonth) *
          100
      )
    : 0;

  // Alert logic
  const totalCallsProcessed = stats?.callsThisMonth || 0;
  const hasNoRecentActivity = totalCallsProcessed === 0;
  const minutesUsagePercent = stats
    ? (stats.minutesUsed / stats.minutesTotal) * 100
    : 0;
  const approachingLimit = minutesUsagePercent >= 80;

  // Milestone logic
  const milestones = [10, 50, 100];
  const currentMilestone = milestones.find((m) => totalCallsProcessed === m);

  // Auto-dismiss milestone alert after 5 seconds
  useEffect(() => {
    if (
      currentMilestone &&
      !dismissedAlerts.includes(`milestone-${currentMilestone}`)
    ) {
      setShowMilestone(true);
      const timer = setTimeout(() => {
        setShowMilestone(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentMilestone, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => [...prev, alertId]);
    if (alertId.startsWith("milestone")) {
      setShowMilestone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <TopBar />
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <TopBar />

      <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-200">
        {/* Overage Warning Banner */}
        <OverageBanner />

        {/* Usage Alerts */}
        <div className="space-y-4">
          {/* No Activity Alert */}
          {hasNoRecentActivity &&
            !dismissedAlerts.includes("no-activity") && (
              <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert("no-activity")}
                  className="absolute top-3 right-3 p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-blue-600" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg flex-shrink-0">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-1">
                      We noticed you haven't processed any calls this week
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Need help getting started? We're here to assist you with
                      onboarding and setup.
                    </p>
                    <Link href="/help">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-xl font-semibold text-sm">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Get Help
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

          {/* Approaching Limit Alert */}
          {approachingLimit &&
            !dismissedAlerts.includes("approaching-limit") && stats && (
              <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert("approaching-limit")}
                  className="absolute top-3 right-3 p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-orange-600" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-lg flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 mb-1">
                      You're approaching your plan limit
                    </h3>
                    <p className="text-sm text-orange-700 mb-3">
                      You've used {stats.minutesUsed} of {stats.minutesTotal}{" "}
                      minutes this month ({Math.round(minutesUsagePercent)}%).
                      Consider upgrading to avoid interruptions.
                    </p>
                    <Link href="/settings">
                      <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md rounded-xl font-semibold text-sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

          {/* Success Milestone Alert */}
          {currentMilestone &&
            showMilestone &&
            !dismissedAlerts.includes(`milestone-${currentMilestone}`) && stats && (
              <div className="relative bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert(`milestone-${currentMilestone}`)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-emerald-600" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-900 mb-1 flex items-center gap-2">
                      🎉 Milestone reached!
                    </h3>
                    <p className="text-sm text-emerald-700">
                      You've processed {currentMilestone} calls and saved{" "}
                      {stats.hoursSavedThisMonth} hours. Keep up the great work!
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Top Section - ROI Banner and Welcome Card Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROI Banner */}
          {stats && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 p-6 shadow-2xl shadow-purple-500/30 animate-in fade-in duration-300">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-32 -translate-y-32" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-48 translate-y-48" />
              </div>

              <div className="relative flex flex-col items-start justify-between gap-4 h-full">
                {/* Metrics */}
                <div className="flex items-start gap-3">
                  {/* Sparkles icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>

                  {/* Metrics */}
                  <div>
                    <p className="text-white/80 text-xs font-medium mb-2">
                      Time Saved This Month
                    </p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="text-3xl font-bold text-white">
                        {stats.hoursSavedThisMonth}
                      </h2>
                      <span className="text-lg font-semibold text-white/90">
                        hours
                      </span>
                      <span className="text-xl font-bold text-white mx-1">
                        =
                      </span>
                      <span className="text-3xl font-bold text-white">
                        ${dollarsSaved.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {percentageIncrease >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                      )}
                      <span className="text-white/90 text-xs font-medium">
                        {percentageIncrease > 0 && "+"}
                        {percentageIncrease}% {percentageIncrease >= 0 ? "more" : "less"} than last
                        month
                      </span>
                    </div>
                  </div>
                </div>

                {/* Button */}
                <Link href="/analytics">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm rounded-xl font-semibold px-5 py-2.5 text-sm transition-all duration-200 hover:scale-105 self-start">
                    View Details
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Welcome Card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-pink-600/10 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            <div className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
                    Welcome back,{" "}
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                  </h1>
                </div>
                <p className="text-sm text-slate-600 font-medium ml-14">
                  Here's what's happening with your calls today
                </p>
              </div>
              <div className="self-end">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full blur-lg opacity-50" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">👋</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Metric Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Calls Processed Card */}
            <div className="group relative">
              <Card className="relative border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                      Calls Processed
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {stats.callsThisMonth}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                        stats.callsTrend.startsWith("+")
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {stats.callsTrend.startsWith("+") ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{stats.callsTrend}</span>
                    </div>
                    <span className="text-slate-500">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Saved Card */}
            <div className="group relative">
              <Card className="relative border border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                      Time Saved
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {stats.timeSaved}
                  </div>
                  <p className="text-sm font-bold text-emerald-700 mb-1">
                    ≈ ${dollarsSaved.toLocaleString()} in labor savings
                  </p>
                  <p className="text-sm text-slate-600 font-medium">
                    ~15 min per call average
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Users Card */}
            <div className="group relative">
              <Card className="relative border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                      Active Users
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 mb-2">1</div>
                  <p className="text-sm text-slate-600 font-medium">
                    Team member online
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Minutes Usage Card */}
            <div className="group relative">
              <Card className="relative border border-orange-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                      Minutes Used
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 mb-3">
                    {stats.minutesUsed}
                    <span className="text-xl font-normal text-slate-500">
                      /{stats.minutesTotal}
                    </span>
                  </div>
                  <div className="relative w-full h-3 bg-orange-200 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all duration-1000 ease-out shadow-md"
                      style={{
                        width: `${(stats.minutesUsed / stats.minutesTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 font-medium mt-2">
                    {stats.minutesTotal - stats.minutesUsed} minutes remaining this
                    month
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Usage Meter - Prominent Display */}
        <div className="max-w-2xl mx-auto">
          <UsageMeter />
        </div>

        {/* Premium Recent Calls Table */}
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-slate-50 via-purple-50/30 to-slate-50 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                  Recent Calls
                </CardTitle>
                <p className="text-sm text-slate-600 font-medium">
                  Your latest processed recordings
                </p>
              </div>
              <Link href="/calls">
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 group">
                  View All Calls
                  <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentCalls.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <Phone className="w-12 h-12 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900">
                  No calls processed yet
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
                  Upload your first call recording to get AI-powered insights and
                  CRM-ready data
                </p>
                <Link href="/calls">
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl shadow-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/60 transition-all duration-300 rounded-xl px-8 py-6 text-lg border-0">
                    <Zap className="w-5 h-5 mr-2" />
                    Process Your First Call
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider hidden lg:table-cell">
                        Sentiment
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentCalls.map((call, index) => (
                      <tr
                        key={call.id}
                        className="group hover:bg-gradient-to-r hover:from-violet-50/30 hover:to-transparent transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <span className="text-sm font-bold text-violet-600">
                                {call.customer_name
                                  ? call.customer_name.charAt(0)
                                  : "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">
                                {call.customer_name || "Unknown Customer"}
                              </p>
                              <p className="text-sm text-slate-500">
                                with {call.sales_rep || "Unknown Rep"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(call.call_date || call.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-600 hidden md:table-cell">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {call.duration
                                ? formatDuration(call.duration)
                                : "N/A"}
                            </div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold text-xs border border-emerald-200">
                              <span>+15 min saved</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 hidden lg:table-cell">
                          {call.sentiment_type &&
                            call.sentiment_score !== undefined && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm border cursor-default ${
                                        getSentimentConfig(call.sentiment_type)
                                          ?.bgColor
                                      } ${
                                        getSentimentConfig(call.sentiment_type)
                                          ?.textColor
                                      } ${
                                        getSentimentConfig(call.sentiment_type)
                                          ?.borderColor
                                      }`}
                                    >
                                      <span className="text-base">
                                        {
                                          getSentimentConfig(call.sentiment_type)
                                            ?.emoji
                                        }
                                      </span>
                                      <span>
                                        {
                                          getSentimentConfig(call.sentiment_type)
                                            ?.label
                                        }
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white px-3 py-2 rounded-lg">
                                    <p className="font-medium">
                                      Sentiment Score: {call.sentiment_score}/100
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </td>
                        <td className="px-6 py-5">
                          {call.status === "completed" && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed
                            </div>
                          )}
                          {(call.status === "processing" ||
                            call.status === "transcribing" ||
                            call.status === "extracting") && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium text-sm border border-amber-200">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing
                            </div>
                          )}
                          {call.status === "failed" && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium text-sm border border-red-200">
                              <AlertCircle className="w-4 h-4" />
                              Failed
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/calls/${call.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg font-medium transition-all duration-200 group/btn"
                              >
                                <Eye className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                                View Details
                              </Button>
                            </Link>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
