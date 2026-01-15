"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  Tag,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

// =====================================================
// INTERFACES
// =====================================================

interface AnalyticsData {
  totalTimeSaved: number;
  avgSentiment: number;
  activeReps: number;
  avgCallLength: number;
  timeSavedData: { month: string; hours: number }[];
  callsByRepData: { rep: string; calls: number }[];
  sentimentData: { name: string; value: number; color: string }[];
  keywordsData: { keyword: string; count: number; trend: string }[];
  lastMonthTimeSaved: number;
  lastMonthSentiment: number;
}

export default function AnalyticsPage() {
  const { user, organization } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH AND CALCULATE ANALYTICS
  // =====================================================

  useEffect(() => {
    if (!user || !organization) {
      setLoading(false); // Set loading to false if no user or organization
      return;
    }

    let isMounted = true; // Add mounted flag

    async function fetchAnalytics() {
      if (!user || !organization || !isMounted) return; // Check user, organization and mounted state

      setLoading(true); // Ensure loading is set
      try {
        const supabase = createClient();

        // Fetch all organization's calls with insights
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .eq('organization_id', organization.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (callsError) {
          console.error('Error fetching calls:', callsError);
          setLoading(false);
          return;
        }

        // Fetch all insights for keyword analysis
        const { data: insightsData, error: insightsError } = await supabase
          .from('call_insights')
          .select('insight_type, insight_text')
          .in('call_id', callsData?.map(c => c.id) || []);

        const calls = callsData || [];
        const insights = insightsData || [];

        // Calculate current month metrics
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);

        const currentMonthCalls = calls.filter(call => {
          const callDate = parseISO(call.created_at);
          return callDate >= currentMonthStart && callDate <= currentMonthEnd;
        });

        // Calculate last month metrics for comparison
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const lastMonthCalls = calls.filter(call => {
          const callDate = parseISO(call.created_at);
          return callDate >= lastMonthStart && callDate <= lastMonthEnd;
        });

        // 1. Total Time Saved (assuming 15 min saved per call)
        const totalTimeSaved = Math.round((currentMonthCalls.length * 15) / 60); // hours
        const lastMonthTimeSaved = Math.round((lastMonthCalls.length * 15) / 60);

        // 2. Average Sentiment (scale sentiment_score to 0-10)
        const sentimentScores = currentMonthCalls
          .map(c => c.sentiment_score)
          .filter(s => s !== null && s !== undefined);
        const avgSentiment = sentimentScores.length > 0
          ? parseFloat((sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length).toFixed(1))
          : 0;

        const lastMonthSentimentScores = lastMonthCalls
          .map(c => c.sentiment_score)
          .filter(s => s !== null && s !== undefined);
        const lastMonthSentiment = lastMonthSentimentScores.length > 0
          ? parseFloat((lastMonthSentimentScores.reduce((a, b) => a + b, 0) / lastMonthSentimentScores.length).toFixed(1))
          : 0;

        // 3. Active Reps (unique sales reps)
        const uniqueReps = new Set(currentMonthCalls.map(c => c.sales_rep).filter(r => r));
        const activeReps = uniqueReps.size;

        // 4. Average Call Length (in minutes)
        const durations = currentMonthCalls
          .map(c => c.duration)
          .filter(d => d !== null && d !== undefined);
        const avgCallLength = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60) // convert seconds to minutes
          : 0;

        // 5. Time Saved Over Time (last 5 months)
        const timeSavedData = [];
        for (let i = 4; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);

          const monthCalls = calls.filter(call => {
            const callDate = parseISO(call.created_at);
            return callDate >= monthStart && callDate <= monthEnd;
          });

          timeSavedData.push({
            month: format(monthDate, 'MMM'),
            hours: Math.round((monthCalls.length * 15) / 60)
          });
        }

        // 6. Calls by Rep (top 5)
        const repCounts: { [key: string]: number } = {};
        currentMonthCalls.forEach(call => {
          if (call.sales_rep) {
            repCounts[call.sales_rep] = (repCounts[call.sales_rep] || 0) + 1;
          }
        });

        const callsByRepData = Object.entries(repCounts)
          .map(([rep, calls]) => ({ rep, calls }))
          .sort((a, b) => b.calls - a.calls)
          .slice(0, 5);

        // 7. Sentiment Distribution
        const sentimentCounts = {
          positive: 0,
          neutral: 0,
          negative: 0
        };

        currentMonthCalls.forEach(call => {
          const type = call.sentiment_type?.toLowerCase();
          if (type === 'positive') sentimentCounts.positive++;
          else if (type === 'negative') sentimentCounts.negative++;
          else sentimentCounts.neutral++;
        });

        const total = currentMonthCalls.length || 1;
        const sentimentData = [
          {
            name: "Positive",
            value: Math.round((sentimentCounts.positive / total) * 100),
            color: "#10B981"
          },
          {
            name: "Neutral",
            value: Math.round((sentimentCounts.neutral / total) * 100),
            color: "#94A3B8"
          },
          {
            name: "Negative",
            value: Math.round((sentimentCounts.negative / total) * 100),
            color: "#DC2626"
          }
        ];

        // 8. Top Keywords (from insights)
        const keywordCounts: { [key: string]: number } = {};

        insights.forEach(insight => {
          const text = insight.insight_text.toLowerCase();

          // Extract common keywords/phrases
          const keywords = [
            { keyword: 'Pricing concerns', patterns: ['price', 'cost', 'expensive', 'budget'] },
            { keyword: 'Integration questions', patterns: ['integrate', 'integration', 'connect', 'api'] },
            { keyword: 'Feature requests', patterns: ['feature', 'functionality', 'capability', 'need'] },
            { keyword: 'Support needs', patterns: ['support', 'help', 'assistance', 'issue'] },
            { keyword: 'Competitor comparison', patterns: ['competitor', 'alternative', 'vs', 'compared'] },
            { keyword: 'Timeline concerns', patterns: ['timeline', 'deadline', 'urgency', 'when', 'schedule'] }
          ];

          keywords.forEach(({ keyword, patterns }) => {
            if (patterns.some(pattern => text.includes(pattern))) {
              keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            }
          });
        });

        const keywordsData = Object.entries(keywordCounts)
          .map(([keyword, count]) => ({
            keyword,
            count,
            trend: count > 10 ? 'up' : count > 5 ? 'neutral' : 'down'
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Set analytics data
        if (isMounted) {
          setAnalytics({
            totalTimeSaved,
            avgSentiment,
            activeReps,
            avgCallLength,
            timeSavedData,
            callsByRepData,
            sentimentData,
            keywordsData,
            lastMonthTimeSaved,
            lastMonthSentiment
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error calculating analytics:', err);
        if (isMounted) {
          setLoading(false); // ALWAYS set loading to false in error case
        }
      }
    }

    fetchAnalytics();

    // Cleanup on unmount
    return () => {
      isMounted = false; // Mark as unmounted
    };
  }, [user, organization]);

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <p className="text-slate-600 font-medium">Please select an organization to view analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <p className="text-slate-600 font-medium">No analytics data available.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trends
  const timeSavedTrend = analytics.lastMonthTimeSaved > 0
    ? Math.round(((analytics.totalTimeSaved - analytics.lastMonthTimeSaved) / analytics.lastMonthTimeSaved) * 100)
    : 0;

  const sentimentTrend = analytics.lastMonthSentiment > 0
    ? parseFloat((analytics.avgSentiment - analytics.lastMonthSentiment).toFixed(1))
    : 0;

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-200">
        {/* Page Header */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-sky-600/10 to-pink-600/10 rounded-3xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          <div className="relative bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-sky-600 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-sky-900 to-slate-900 bg-clip-text text-transparent tracking-tight mb-1">
                  Analytics
                </h1>
                <p className="text-slate-600 font-medium">
                  Track performance metrics and insights across your team
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats - Top Row (4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Time Saved */}
          <Card className="relative border border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden group hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                  Total Time Saved
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {analytics.totalTimeSaved} hours
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  timeSavedTrend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${timeSavedTrend < 0 ? 'rotate-180' : ''}`} />
                  <span>{timeSavedTrend >= 0 ? '+' : ''}{timeSavedTrend}% vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg. Sentiment */}
          <Card className="relative border border-sky-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-sky-50 to-pink-50 overflow-hidden group hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                  Avg. Sentiment
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-pink-600 flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {analytics.avgSentiment}/10
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  sentimentTrend >= 0 ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${sentimentTrend < 0 ? 'rotate-180' : ''}`} />
                  <span>{sentimentTrend >= 0 ? '+' : ''}{sentimentTrend} vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Reps */}
          <Card className="relative border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden group hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                  Active Reps
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {analytics.activeReps}
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Team members
              </p>
            </CardContent>
          </Card>

          {/* Avg. Call Length */}
          <Card className="relative border border-orange-100 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden group hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                  Avg. Call Length
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {analytics.avgCallLength} min
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Per call
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Row 1 - Line Chart and Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Saved Over Time - Line Chart */}
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Time Saved Over Time
              </CardTitle>
              <p className="text-sm text-slate-600 font-medium mt-1">Hours saved per month</p>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.timeSavedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.timeSavedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="month"
                      stroke="#64748B"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      label={{ value: "Hours", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "none",
                        borderRadius: "12px",
                        color: "#fff",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calls Processed by Rep - Bar Chart */}
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Calls Processed by Rep
              </CardTitle>
              <p className="text-sm text-slate-600 font-medium mt-1">This month's activity</p>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.callsByRepData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.callsByRepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="rep"
                      stroke="#64748B"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#64748B"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      label={{ value: "Calls", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "none",
                        borderRadius: "12px",
                        color: "#fff",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    />
                    <Bar
                      dataKey="calls"
                      fill="#8B5CF6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart Row 2 - Pie Chart and Keywords List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Sentiment Distribution - Pie Chart */}
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Call Sentiment Distribution
              </CardTitle>
              <p className="text-sm text-slate-600 font-medium mt-1">Overall sentiment breakdown</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                {analytics.sentimentData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Keywords & Objections - List View */}
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Top Keywords & Objections
              </CardTitle>
              <p className="text-sm text-slate-600 font-medium mt-1">Most common topics</p>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.keywordsData.length > 0 ? (
                <div className="space-y-3">
                  {analytics.keywordsData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-transparent rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <Tag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {item.keyword}
                          </p>
                          <p className="text-xs text-slate-500">
                            Mentioned {item.count} times
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-slate-900">{item.count}</span>
                        {item.trend === "up" && (
                          <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        )}
                        {item.trend === "down" && (
                          <div className="px-2 py-1 bg-red-100 text-red-700 rounded-lg rotate-180">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        )}
                        {item.trend === "neutral" && (
                          <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                            <div className="w-4 h-0.5 bg-slate-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No keywords data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
