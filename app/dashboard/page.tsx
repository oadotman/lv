"use client";

import { useMemo, useState, useEffect } from "react";
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
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { UsageMeter } from "@/components/dashboard/UsageMeter";
import { UploadModal } from "@/components/modals/UploadModal";

// Helper function to get sentiment configuration
const getSentimentConfig = (sentiment?: SentimentType) => {
  switch (sentiment) {
    case "positive":
      return {
        emoji: "😊",
        label: "Positive",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
        textColor: "text-emerald-700 dark:text-emerald-400",
        borderColor: "border-emerald-200 dark:border-emerald-700",
      };
    case "neutral":
      return {
        emoji: "😐",
        label: "Neutral",
        bgColor: "bg-slate-100 dark:bg-slate-800",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-200 dark:border-slate-700",
      };
    case "negative":
      return {
        emoji: "😟",
        label: "Negative",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-700 dark:text-red-400",
        borderColor: "border-red-200 dark:border-red-700",
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
  const { user, organization } = useAuth();
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showMilestone, setShowMilestone] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false); // Always set loading to false if no user
      return;
    }

    let isMounted = true; // Add mounted flag to prevent state updates after unmount
    let debounceTimer: NodeJS.Timeout | null = null; // For debouncing real-time updates

    async function fetchDashboardData() {
      if (!user || !isMounted) return; // Check both user and mounted state

      try {
        setLoading(true); // Ensure loading is set at start
        const supabase = createClient();

        // Use organization from AuthContext if available
        let planLimit = 30; // Default to free plan (30 minutes)
        let orgId = organization?.id;

        if (organization) {
          // Use the organization from AuthContext (already selected correctly)
          planLimit = organization.max_minutes_monthly || 30;
          console.log('📊 Dashboard using organization from context:', organization.name, 'Plan:', organization.plan_type);
        } else {
          // Fallback: fetch user's organization if not in context
          const { data: userOrg } = await supabase
            .from('user_organizations')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .single();

          if (userOrg?.organization_id) {
            orgId = userOrg.organization_id;
            // Fetch organization details for plan limit
            const { data: org } = await supabase
              .from('organizations')
              .select('max_minutes_monthly, plan_type')
              .eq('id', userOrg.organization_id)
              .single();

            if (org?.max_minutes_monthly) {
              planLimit = org.max_minutes_monthly;
            }
          }
        }

        // Fetch recent calls (last 5)
        // If we have an organization, fetch calls from that org, otherwise fetch user's personal calls
        const recentCallsQuery = supabase
          .from('calls')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (orgId) {
          // Fetch organization calls
          recentCallsQuery.eq('organization_id', orgId);
        } else {
          // Fallback to user's personal calls
          recentCallsQuery.eq('user_id', user.id);
        }

        const { data: callsData, error: callsError } = await recentCallsQuery;

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

        // Current month calls - for all organization members if user is in an org
        const callsQuery = orgId
          ? supabase
              .from('calls')
              .select('id, duration, user_id')
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString())
              .eq('organization_id', orgId)
          : supabase
              .from('calls')
              .select('id, duration')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString());

        const { data: currentMonthCalls } = await callsQuery;

        // Last month calls - using same logic
        const lastMonthQuery = orgId
          ? supabase
              .from('calls')
              .select('id, duration, user_id')
              .eq('status', 'completed')
              .gte('created_at', startOfLastMonth.toISOString())
              .lte('created_at', endOfLastMonth.toISOString())
              .eq('organization_id', orgId)
          : supabase
              .from('calls')
              .select('id, duration')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', startOfLastMonth.toISOString())
              .lte('created_at', endOfLastMonth.toISOString());

        const { data: lastMonthCalls } = await lastMonthQuery;

        const callsThisMonth = currentMonthCalls?.length || 0;
        const callsLastMonth = lastMonthCalls?.length || 0;

        // Calculate minutes used (for billing)
        // NOTE: Assuming call.duration is stored in SECONDS based on AssemblyAI integration
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

        if (isMounted) {
          setStats({
            callsThisMonth,
            callsLastMonth,
            callsTrend,
            timeSaved: `${hoursSavedThisMonth} hours`,
            hoursSavedThisMonth,
            hoursSavedLastMonth,
            minutesUsed: Math.round(totalMinutesThisMonth),
            minutesTotal: planLimit, // Now using actual plan limit from organization
            hourlyRate: 75, // Average hourly rate (can be customized per user)
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        if (isMounted) {
          setLoading(false); // ALWAYS set loading to false in error case
        }
      }
    }

    fetchDashboardData();

    // Set up real-time subscription for call status updates
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard-calls')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'calls',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Call updated:', payload);
          // Debounce refresh to prevent rapid re-fetches
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            if (isMounted) {
              fetchDashboardData();
            }
          }, 1000); // Wait 1 second before fetching
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      isMounted = false; // Mark as unmounted
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [user, organization]); // Re-run when user or organization changes

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 dark:text-violet-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-200">
        {/* Usage Alerts */}
        <div className="space-y-4">
          {/* No Activity Alert */}
          {hasNoRecentActivity &&
            !dismissedAlerts.includes("no-activity") && (
              <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert("no-activity")}
                  className="absolute top-3 right-3 p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-lg flex-shrink-0">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                      We noticed you haven't processed any calls this week
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Need help getting started? We're here to assist you with
                      onboarding and setup.
                    </p>
                    <Link href="/help">
                      <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md rounded-xl font-semibold text-sm">
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
              <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 border-2 border-orange-300 dark:border-orange-800 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert("approaching-limit")}
                  className="absolute top-3 right-3 p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-orange-500 dark:bg-orange-600 rounded-xl shadow-lg flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-1">
                      You're approaching your plan limit
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                      You've used {stats.minutesUsed} of {stats.minutesTotal}{" "}
                      minutes this month ({Math.round(minutesUsagePercent)}%).
                      Consider upgrading to avoid interruptions.
                    </p>
                    <Link href="/settings">
                      <Button className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-md rounded-xl font-semibold text-sm">
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
              <div className="relative bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => dismissAlert(`milestone-${currentMilestone}`)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 dark:from-emerald-600 dark:to-green-600 rounded-xl shadow-lg flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-1 flex items-center gap-2">
                      🎉 Milestone reached!
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
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
                      Monthly Usage
                    </p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="text-3xl font-bold text-white">
                        {stats.minutesUsed}
                      </h2>
                      <span className="text-lg font-semibold text-white/90">
                        / {stats.minutesTotal} minutes
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            minutesUsagePercent >= 80
                              ? 'bg-gradient-to-r from-orange-400 to-red-400'
                              : 'bg-gradient-to-r from-emerald-400 to-green-400'
                          }`}
                          style={{
                            width: `${Math.min((stats.minutesUsed / stats.minutesTotal) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-white/90 text-sm font-medium">
                        {Math.round(minutesUsagePercent)}%
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
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-slate-100 dark:via-purple-400 dark:to-slate-100 bg-clip-text text-transparent tracking-tight">
                    Welcome back,{" "}
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                  </h1>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium ml-14">
                  Here's what's happening with your calls today
                </p>
              </div>

              {/* Primary Process Call CTA Button */}
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3 text-base font-semibold border-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Process New Call
              </Button>
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
              <Card className="relative border border-blue-100 dark:border-blue-900 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                      Calls Processed
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {stats.callsThisMonth}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                        stats.callsTrend.startsWith("+")
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {stats.callsTrend.startsWith("+") ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{stats.callsTrend}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Minutes Used Card - Primary Usage Display */}
            <div className="group relative">
              <Card className="relative border border-violet-100 dark:border-violet-900 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                      Minutes Used
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {stats.minutesUsed} / {stats.minutesTotal}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                      minutes
                    </span>
                  </div>
                  <div className="relative w-full h-2.5 bg-violet-200 dark:bg-violet-900/30 rounded-full overflow-hidden mb-2">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                        minutesUsagePercent >= 80
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : minutesUsagePercent >= 60
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-violet-500 to-purple-500'
                      }`}
                      style={{
                        width: `${Math.min((stats.minutesUsed / stats.minutesTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {Math.round(minutesUsagePercent)}% of monthly plan used
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Time Saved Card */}
            <div className="group relative">
              <Card className="relative border border-emerald-100 dark:border-emerald-900 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                      Time Saved
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {stats.hoursSavedThisMonth}
                    <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-2">
                      hours
                    </span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    ≈ ${dollarsSaved.toLocaleString()} saved
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    ~15 min per call average
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Team Card */}
            <div className="group relative">
              <Card className="relative border border-purple-100 dark:border-purple-900 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 overflow-hidden group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                      Active Team
                    </CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">1</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Team member online
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Actions Card - Moved to top for prominence */}
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50">
          <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <CardTitle className="text-2xl font-bold tracking-tight mb-1">
              Quick Actions
            </CardTitle>
            <p className="text-violet-100 font-medium">
              What would you like to do?
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/calls">
                <Button className="w-full h-24 bg-white hover:bg-violet-50 text-violet-600 border-2 border-violet-200 hover:border-violet-400 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-2">
                  <Phone className="w-8 h-8" />
                  View All Calls
                </Button>
              </Link>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full h-24 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl flex flex-col items-center justify-center gap-2"
              >
                <Plus className="w-8 h-8" />
                Process New Call
              </Button>
              <Link href="/templates">
                <Button className="w-full h-24 bg-white hover:bg-violet-50 text-violet-600 border-2 border-violet-200 hover:border-violet-400 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-2">
                  <FileText className="w-8 h-8" />
                  Manage Templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Usage Meter - Prominent Display */}
        <div className="max-w-2xl mx-auto">
          <UsageMeter />
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-2xl shadow-violet-500/50 hover:shadow-3xl hover:scale-110 transition-all duration-300 rounded-full flex items-center justify-center group"
          >
            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    </div>
  );
}
