"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Pause,
  Copy,
  Share2,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Download,
  Mail,
  Clock,
  Calendar,
  User,
  Volume2,
  ExternalLink,
  Flag,
  DollarSign,
  Check,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

// =====================================================
// TYPESCRIPT INTERFACES
// =====================================================

interface CallRecord {
  id: string;
  user_id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  sentiment_type: string | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
  audio_url: string | null;
}

interface TranscriptUtterance {
  id: string;
  transcript_id: string;
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number | null;
  sentiment: string | null;
  created_at: string;
}

interface Transcript {
  id: string;
  call_id: string;
  full_text: string | null;
  utterances: TranscriptUtterance[];
}

interface CallInsight {
  id: string;
  call_id: string;
  insight_type: string;
  insight_text: string;
  confidence_score: number | null;
  created_at: string;
}

interface CallField {
  id: string;
  call_id: string;
  field_name: string;
  field_value: string | null;
  confidence_score: number | null;
  created_at: string;
}

interface CallDetail {
  call: CallRecord;
  transcript: Transcript | null;
  insights: CallInsight[];
  fields: CallField[];
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [callDetail, setCallDetail] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("plain");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1380); // Default 23 minutes
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copiedInsight, setCopiedInsight] = useState<number | null>(null);

  // =====================================================
  // FETCH CALL DETAIL DATA
  // =====================================================

  useEffect(() => {
    if (!user || !params.id) return;

    async function fetchCallDetail() {
      if (!user) return; // Additional TypeScript safety check

      try {
        const supabase = createClient();
        const callId = params.id as string;

        // Fetch call record
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();

        if (callError) {
          console.error('Error fetching call:', callError);
          setError('Call not found or you do not have access to it.');
          setLoading(false);
          return;
        }

        if (!callData) {
          setError('Call not found.');
          setLoading(false);
          return;
        }

        // Fetch transcript
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('call_id', callId)
          .maybeSingle();

        // Fetch transcript utterances if transcript exists
        let utterancesData: TranscriptUtterance[] = [];
        if (transcriptData) {
          const { data: utterances, error: utterancesError } = await supabase
            .from('transcript_utterances')
            .select('*')
            .eq('transcript_id', transcriptData.id)
            .order('start_time', { ascending: true });

          if (!utterancesError && utterances) {
            utterancesData = utterances;
          }
        }

        // Fetch insights
        const { data: insightsData, error: insightsError } = await supabase
          .from('call_insights')
          .select('*')
          .eq('call_id', callId)
          .order('created_at', { ascending: true });

        // Fetch extracted fields
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('call_fields')
          .select('*')
          .eq('call_id', callId)
          .order('created_at', { ascending: true });

        // Construct call detail object
        const detail: CallDetail = {
          call: callData,
          transcript: transcriptData ? {
            ...transcriptData,
            utterances: utterancesData
          } : null,
          insights: insightsData || [],
          fields: fieldsData || []
        };

        setCallDetail(detail);

        // Set duration from call if available
        if (callData.duration) {
          setDuration(callData.duration);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching call detail:', err);
        setError('Failed to load call details.');
        setLoading(false);
      }
    }

    fetchCallDetail();
  }, [user, params.id]);

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle copy to clipboard
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✓ Copied to clipboard!",
        description: `${label} has been copied.`,
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle individual insight copy
  const handleInsightCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInsight(index);
      setTimeout(() => setCopiedInsight(null), 2000);
      toast({
        title: "✓ Insight copied!",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // =====================================================
  // KEYBOARD SHORTCUTS
  // =====================================================

  useEffect(() => {
    if (!callDetail) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ": // Space bar - play/pause
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "arrowleft": // Rewind 5 seconds
          e.preventDefault();
          setCurrentTime((prev) => Math.max(0, prev - 5));
          break;
        case "arrowright": // Forward 5 seconds
          e.preventDefault();
          setCurrentTime((prev) => Math.min(duration, prev + 5));
          break;
        case "c": // Copy CRM output
          e.preventDefault();
          handleCopy(
            generateCRMOutput(activeTab),
            activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
          );
          break;
        case "escape": // Go back to calls list
          e.preventDefault();
          router.push("/calls");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, callDetail, duration, router]);

  // =====================================================
  // AUDIO PLAYBACK SIMULATION
  // =====================================================

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + playbackSpeed;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, duration]);

  // Jump to timestamp in audio
  const jumpToTimestamp = (seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
  };

  // =====================================================
  // CRM OUTPUT GENERATION
  // =====================================================

  const generateCRMOutput = (format: string): string => {
    if (!callDetail) return "";

    const { call, fields, insights } = callDetail;

    // Extract common fields
    const getField = (name: string) => {
      const field = fields.find(f => f.field_name.toLowerCase() === name.toLowerCase());
      return field?.field_value || "N/A";
    };

    switch (format) {
      case "plain":
        return `CALL SUMMARY
============

Customer: ${call.customer_name || "Unknown"}
Sales Rep: ${call.sales_rep || "Unknown"}
Date: ${format ? new Date(call.call_date).toLocaleDateString() : call.call_date}
Duration: ${call.duration ? Math.floor(call.duration / 60) : 0} minutes
Sentiment: ${call.sentiment_type || "Unknown"}

EXTRACTED FIELDS
================
${fields.map(f => `${f.field_name}: ${f.field_value || "N/A"}`).join('\n')}

INSIGHTS
========

Pain Points:
${insights.filter(i => i.insight_type === 'pain_point').map(i => `- ${i.insight_text}`).join('\n') || '- None identified'}

Action Items:
${insights.filter(i => i.insight_type === 'action_item').map(i => `- ${i.insight_text}`).join('\n') || '- None identified'}

Competitors Mentioned:
${insights.filter(i => i.insight_type === 'competitor').map(i => `- ${i.insight_text}`).join('\n') || '- None mentioned'}
`;

      case "hubspot":
        return `// HubSpot Deal Properties

dealname: "${call.customer_name || "Unknown"} - ${getField('Deal Title')}"
amount: "${getField('Budget') || getField('Deal Value')}"
dealstage: "${getField('Deal Stage') || 'qualifiedtobuy'}"
pipeline: "default"
closedate: "${getField('Close Date') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}"
hubspot_owner_id: "${call.sales_rep || 'unassigned'}"

// Custom Properties
next_steps: "${insights.find(i => i.insight_type === 'action_item')?.insight_text || 'Follow up required'}"
pain_points: "${insights.filter(i => i.insight_type === 'pain_point').map(i => i.insight_text).join('; ')}"
competitors: "${insights.filter(i => i.insight_type === 'competitor').map(i => i.insight_text).join(', ')}"
sentiment: "${call.sentiment_type || 'neutral'}"
call_duration: "${call.duration || 0}"
`;

      case "salesforce":
        return `// Salesforce Opportunity Fields

Name: "${call.customer_name || "Unknown"} - ${getField('Deal Title')}"
Amount: ${getField('Budget')?.replace(/[^0-9]/g, '') || '0'}
StageName: "${getField('Deal Stage') || 'Qualification'}"
CloseDate: ${getField('Close Date') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
Type: "New Business"
LeadSource: "Sales Call"

// Custom Fields
Next_Steps__c: "${insights.find(i => i.insight_type === 'action_item')?.insight_text || 'Follow up required'}"
Pain_Points__c: "${insights.filter(i => i.insight_type === 'pain_point').map(i => i.insight_text).join('; ')}"
Competitors__c: "${insights.filter(i => i.insight_type === 'competitor').map(i => i.insight_text).join(', ')}"
Call_Sentiment__c: "${call.sentiment_type || 'Neutral'}"
Call_Duration__c: ${call.duration || 0}
`;

      case "csv":
        const csvFields = [
          call.customer_name || "Unknown",
          call.sales_rep || "Unknown",
          new Date(call.call_date).toLocaleDateString(),
          call.duration ? Math.floor(call.duration / 60).toString() : "0",
          call.sentiment_type || "neutral",
          getField('Budget'),
          getField('Deal Stage'),
          insights.filter(i => i.insight_type === 'pain_point').map(i => i.insight_text).join('; '),
          insights.filter(i => i.insight_type === 'action_item').map(i => i.insight_text).join('; '),
          insights.filter(i => i.insight_type === 'competitor').map(i => i.insight_text).join(', ')
        ];
        return `"Customer","Sales Rep","Call Date","Duration (min)","Sentiment","Budget","Deal Stage","Pain Points","Next Steps","Competitors"
"${csvFields.join('","')}"`;

      default:
        return "";
    }
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <TopBar showUploadButton={false} />
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading call details...</p>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR STATE
  // =====================================================

  if (error || !callDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <TopBar showUploadButton={false} />
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Call Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "This call does not exist or you do not have access to it."}</p>
            <Link href="/calls">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Calls
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // EXTRACT DATA
  // =====================================================

  const { call, transcript, insights } = callDetail;

  const sentimentConfig = {
    positive: { emoji: "😊", bg: "bg-green-100", text: "text-green-600" },
    neutral: { emoji: "😐", bg: "bg-gray-100", text: "text-gray-600" },
    negative: { emoji: "😟", bg: "bg-red-100", text: "text-red-600" },
  };

  // Extract insights by type
  const painPoints = insights.filter((i) => i.insight_type === "pain_point");
  const actionItems = insights.filter((i) => i.insight_type === "action_item");
  const competitors = insights.filter((i) => i.insight_type === "competitor");

  // Get budget and timeline from fields
  const budgetField = callDetail.fields.find(f => f.field_name.toLowerCase().includes('budget'));
  const timelineField = callDetail.fields.find(f => f.field_name.toLowerCase().includes('timeline') || f.field_name.toLowerCase().includes('close date'));

  // =====================================================
  // RENDER UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <TopBar showUploadButton={false} />

      <div className="px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <Link
            href="/calls"
            className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Calls
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Call with {call.customer_name || "Unknown Customer"}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(call.call_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {call.duration ? Math.floor(call.duration / 60) : 0} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {call.sales_rep || "Unknown Rep"}
                </span>
                <Badge
                  className={cn(
                    "ml-2",
                    call.sentiment_type === "positive"
                      ? "bg-green-100 text-green-800"
                      : call.sentiment_type === "neutral"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  )}
                >
                  {call.sentiment_type === "positive" ? "😊 Positive" :
                   call.sentiment_type === "neutral" ? "😐 Neutral" :
                   call.sentiment_type === "negative" ? "😟 Negative" : "😐 Unknown"}
                </Badge>

                {/* Status Badge */}
                <Badge
                  className={cn(
                    "ml-2",
                    call.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : call.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {call.status === "completed" ? "✓ Completed" :
                   call.status === "failed" ? "✗ Failed" :
                   "⏳ Processing"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player Section */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            {/* Waveform Visualization */}
            <div className="mb-4 h-20 bg-gray-100 rounded-lg relative overflow-hidden border border-gray-200">
              {/* Progress overlay */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500/30 to-purple-600/30 transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Waveform bars simulation */}
              <div className="absolute inset-0 flex items-center gap-0.5 px-2">
                {Array.from({ length: 100 }).map((_, i) => {
                  const height = Math.random() * 60 + 20;
                  const isPast = (i / 100) < (currentTime / duration);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        isPast ? "bg-purple-600" : "bg-gray-300"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center shadow-lg transition-all hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>

              {/* Time Display */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono font-semibold text-gray-900">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{call.customer_name || "Customer"} Call</span>
                    <span>•</span>
                    <span>{call.sales_rep || "Sales Rep"}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer group">
                  <div
                    className="absolute inset-y-0 left-0 bg-purple-600 transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-purple-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${(currentTime / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
                  />
                </div>
              </div>

              {/* Playback Speed */}
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              {/* Volume */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Volume</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transcript (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">Call Transcript</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
                {transcript && transcript.utterances && transcript.utterances.length > 0 ? (
                  transcript.utterances.map((utterance, index) => {
                    const sentiment = sentimentConfig[utterance.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
                    const isRep = utterance.speaker.toLowerCase().includes('rep') || utterance.speaker === 'A';

                    return (
                      <div key={utterance.id} className="flex gap-3 group">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isRep ? "bg-purple-600" : "bg-gray-300"
                            )}
                          >
                            <span className="text-white text-sm font-semibold">
                              {isRep ? "R" : "P"}
                            </span>
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {isRep ? "Rep" : "Prospect"}
                            </span>
                            <button
                              onClick={() => jumpToTimestamp(utterance.start_time)}
                              className="text-xs text-gray-500 hover:text-purple-600 font-medium transition-colors"
                            >
                              [{formatTime(utterance.start_time)}]
                            </button>
                            <span className="text-lg">{sentiment.emoji}</span>

                            {/* Jump to Audio button (appears on hover) */}
                            <button
                              onClick={() => jumpToTimestamp(utterance.start_time)}
                              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Jump to Audio
                            </button>
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={cn(
                              "p-4 rounded-lg border max-w-[90%]",
                              isRep
                                ? "bg-purple-50 border-purple-100"
                                : "bg-gray-100 border-gray-200"
                            )}
                          >
                            <p className="text-base text-gray-900 leading-relaxed">
                              {utterance.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : transcript && transcript.full_text ? (
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {transcript.full_text}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">
                      {call.status === "processing" || call.status === "transcribing"
                        ? "Transcript is being processed..."
                        : "No transcript available for this call."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Insights & CRM Output (1/3 width) */}
          <div className="space-y-6">
            {/* Quick Insights Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-lg font-semibold text-gray-900">Quick Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Pain Points */}
                {painPoints.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                        Pain Points
                      </span>
                    </div>
                    {painPoints.map((insight, idx) => (
                      <div
                        key={insight.id}
                        className="group relative pl-8 pr-8 py-2 hover:bg-red-50/50 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-gray-900">{insight.insight_text}</p>
                        <button
                          onClick={() => handleInsightCopy(insight.insight_text, idx)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded"
                        >
                          {copiedInsight === idx ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Items */}
                {actionItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Action Items
                      </span>
                    </div>
                    {actionItems.map((insight, idx) => (
                      <div
                        key={insight.id}
                        className="group relative pl-8 pr-8 py-2 hover:bg-blue-50/50 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-gray-900">{insight.insight_text}</p>
                        <button
                          onClick={() => handleInsightCopy(insight.insight_text, idx + painPoints.length)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded"
                        >
                          {copiedInsight === idx + painPoints.length ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Competitors */}
                {competitors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <Flag className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                        Competitors
                      </span>
                    </div>
                    {competitors.map((insight, idx) => (
                      <div
                        key={insight.id}
                        className="group relative pl-8 pr-8 py-2 hover:bg-orange-50/50 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-gray-900">{insight.insight_text}</p>
                        <button
                          onClick={() =>
                            handleInsightCopy(insight.insight_text, idx + painPoints.length + actionItems.length)
                          }
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded"
                        >
                          {copiedInsight === idx + painPoints.length + actionItems.length ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* No insights message */}
                {painPoints.length === 0 && actionItems.length === 0 && competitors.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {call.status === "processing" || call.status === "extracting"
                        ? "Insights are being extracted..."
                        : "No insights extracted yet."}
                    </p>
                  </div>
                )}

                {/* Budget (if available) */}
                {budgetField && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                        Budget
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 pl-8">{budgetField.field_value}</p>
                  </div>
                )}

                {/* Timeline (if available) */}
                {timelineField && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                        Timeline
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 pl-8">{timelineField.field_value}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CRM Output Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-lg font-semibold text-gray-900">CRM Output</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full mb-4 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger
                      value="plain"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md font-medium text-sm transition-all"
                    >
                      Plain
                    </TabsTrigger>
                    <TabsTrigger
                      value="hubspot"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md font-medium text-sm transition-all"
                    >
                      HubSpot
                    </TabsTrigger>
                    <TabsTrigger
                      value="salesforce"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md font-medium text-sm transition-all"
                    >
                      Salesforce
                    </TabsTrigger>
                    <TabsTrigger
                      value="csv"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md font-medium text-sm transition-all"
                    >
                      CSV
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="plain" className="mt-0">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {generateCRMOutput("plain")}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="hubspot" className="mt-0">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {generateCRMOutput("hubspot")}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="salesforce" className="mt-0">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {generateCRMOutput("salesforce")}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="csv" className="mt-0">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                        {generateCRMOutput("csv")}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* BIG COPY BUTTON */}
                <Button
                  onClick={() =>
                    handleCopy(
                      generateCRMOutput(activeTab),
                      activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                    )
                  }
                  className="w-full mt-4 h-14 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
                >
                  <Copy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  📋 Copy to Clipboard
                </Button>

                {/* Share Button */}
                <Button
                  variant="outline"
                  className="w-full mt-3 border-2 border-gray-300 hover:bg-gray-50 font-medium"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Call
                </Button>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-2 border-blue-200 font-semibold h-11">
                <Mail className="w-4 h-4 mr-2" />
                Generate Follow-up Email
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as PDF
              </Button>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Keyboard Shortcuts</p>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Space</kbd>
                <span className="text-gray-400">Play/Pause</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">C</kbd>
                <span className="text-gray-400">Copy</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Esc</kbd>
                <span className="text-gray-400">Back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
