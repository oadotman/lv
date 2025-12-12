"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModernProgress } from "@/components/ui/modern-progress";
import { motion } from "framer-motion";
// Removed Tabs import - using dropdown instead
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
  Scissors,
  Mic,
  Users,
  MessageSquare,
  Building2,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { AudioTrimModal } from "@/components/modals/AudioTrimModal";
import { EnhancedEmailModal } from "@/components/modals/EnhancedEmailModal";
import { generateCallPDF, downloadPDF } from "@/lib/pdf-export";
import { formatCRMOutput } from "@/lib/output-formatters";

// =====================================================
// TYPESCRIPT INTERFACES
// =====================================================

interface Participant {
  id: string;
  name: string;
  email: string;
  company: string;
  role: "customer" | "sales_rep" | "other";
}

interface CallRecord {
  id: string;
  user_id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  duration_minutes: number | null;
  sentiment_type: string | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
  audio_url: string | null;
  file_url: string | null;
  processing_progress: number | null;
  processing_message: string | null;
  template_id: string | null;
  metadata?: {
    participants?: Participant[];
  };
  template?: {
    id: string;
    name: string;
    description: string | null;
    field_count: number;
  };
  typed_notes?: string | null;
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
  template_id: string | null;
  field_name: string;
  field_value: string | null;
  field_type?: string;
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
  const [duration, setDuration] = useState(0); // Start with 0, will be set from audio metadata
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [copiedInsight, setCopiedInsight] = useState<number | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio trimming and transcription states
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [isStartingTranscription, setIsStartingTranscription] = useState(false);

  // Email generation state
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Typed notes state
  const [typedNotes, setTypedNotes] = useState<string>('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // FETCH CALL DETAIL DATA
  // =====================================================

  useEffect(() => {
    if (!user || !params.id) {
      setLoading(false); // Always set loading to false if no user or no id
      return;
    }

    let isMounted = true; // Add mounted flag

    async function fetchCallDetail() {
      if (!user || !isMounted) return; // Check both user and mounted state

      try {
        setLoading(true); // Ensure loading is set at start
        const supabase = createClient();
        const callId = params.id as string;

        // Fetch call record with template information
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .select('*, template:custom_templates(*)')
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
            console.log('[CallDetail] Found', utterances.length, 'utterances for transcript');
          } else if (utterancesError) {
            console.error('[CallDetail] Error fetching utterances:', utterancesError);
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

        if (isMounted) {
          setCallDetail(detail);

          // Initialize typed notes if they exist
          if (callData.typed_notes) {
            setTypedNotes(callData.typed_notes);
          }

          // Don't set duration from call data - let audio metadata handle it
          // The call.duration is in minutes while audio player needs seconds
          console.log('Call duration from DB (minutes):', callData.duration);
        }

        // Fetch user's custom templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('custom_templates')
          .select('*, template_fields(*)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (!templatesError && templatesData && isMounted) {
          // Transform fields to match frontend format
          const formattedTemplates = templatesData.map(template => ({
            ...template,
            fields: template.template_fields?.map((f: any) => ({
              id: f.id,
              fieldName: f.field_name,
              fieldType: f.field_type,
              description: f.description,
              picklistValues: f.picklist_values,
              required: f.is_required
            })) || []
          }));
          setCustomTemplates(formattedTemplates);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching call detail:', err);
        if (isMounted) {
          setError('Failed to load call details.');
          setLoading(false); // ALWAYS set loading to false in error case
        }
      }
    }

    fetchCallDetail();

    // Cleanup on unmount
    return () => {
      isMounted = false; // Mark as unmounted
    };
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

  // Poll for status updates while processing
  useEffect(() => {
    if (!callDetail) return;

    const processingStates = ['uploading', 'processing', 'transcribing', 'extracting'];
    const isProcessing = processingStates.includes(callDetail.call.status);

    if (!isProcessing) return;

    let lastKnownStatus = callDetail.call.status;
    let pollCount = 0;
    const maxPolls = 120; // Max 10 minutes (120 * 5 seconds)
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const pollInterval = setInterval(async () => {
      pollCount++;

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.error('Polling timeout - stopping after', pollCount, 'attempts');
        clearInterval(pollInterval);
        toast({
          title: "Processing timeout",
          description: "Call processing is taking longer than expected. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      try {
        const supabase = createClient();
        const { data: updatedCall, error } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callDetail.call.id)
          .single();

        if (error) {
          consecutiveErrors++;
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error('Too many consecutive errors - stopping polling');
            clearInterval(pollInterval);
            toast({
              title: "Connection error",
              description: "Unable to check call status. Please refresh the page.",
              variant: "destructive",
            });
          }
          return;
        }

        // Reset error count on success
        consecutiveErrors = 0;

        if (updatedCall) {
          // Check if status changed to completed/failed
          const justCompleted =
            (updatedCall.status === 'completed' || updatedCall.status === 'failed') &&
            lastKnownStatus !== updatedCall.status;

          lastKnownStatus = updatedCall.status;

          // Always update the call data
          setCallDetail(prev => prev ? { ...prev, call: updatedCall } : null);

          // If completed or failed, stop polling and fetch all related data
          if (updatedCall.status === 'completed' || updatedCall.status === 'failed') {
            clearInterval(pollInterval); // Stop polling immediately

            const { data: transcriptData } = await supabase
              .from('transcripts')
              .select('*')
              .eq('call_id', updatedCall.id)
              .maybeSingle();

            let utterancesData: TranscriptUtterance[] = [];
            if (transcriptData) {
              const { data: utterances } = await supabase
                .from('transcript_utterances')
                .select('*')
                .eq('transcript_id', transcriptData.id)
                .order('start_time', { ascending: true });

              if (utterances) {
                utterancesData = utterances;
                console.log('[Polling] Found', utterances.length, 'utterances after completion');
              }
            } else {
              console.log('[Polling] No transcript found after completion');
            }

            const { data: insightsData } = await supabase
              .from('call_insights')
              .select('*')
              .eq('call_id', updatedCall.id)
              .order('created_at', { ascending: true });

            const { data: fieldsData } = await supabase
              .from('call_fields')
              .select('*')
              .eq('call_id', updatedCall.id)
              .order('created_at', { ascending: true });

            setCallDetail({
              call: updatedCall,
              transcript: transcriptData ? { ...transcriptData, utterances: utterancesData } : null,
              insights: insightsData || [],
              fields: fieldsData || []
            });

            // Show toast on completion
            if (justCompleted) {
              console.log('Call processing completed!', {
                status: updatedCall.status,
                progress: updatedCall.processing_progress,
                message: updatedCall.processing_message,
                hasTranscript: !!transcriptData,
                insightsCount: insightsData?.length || 0,
                fieldsCount: fieldsData?.length || 0,
              });

              toast({
                title: updatedCall.status === 'completed' ? "Processing complete!" : "Processing failed",
                description: updatedCall.processing_message || "Call processing has finished.",
                variant: updatedCall.status === 'completed' ? "default" : "destructive",
              });
            }
          }

          // Also stop if call is in an unexpected state
          if (!processingStates.includes(updatedCall.status)) {
            console.log('Call in unexpected state, stopping polling:', updatedCall.status);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling call status:', error);
        consecutiveErrors++;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error('Too many consecutive errors - stopping polling');
          clearInterval(pollInterval);
          toast({
            title: "Connection error",
            description: "Unable to check call status. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [callDetail, toast]);

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
  // TRANSCRIPTION & TRIMMING HANDLERS
  // =====================================================

  const handleStartTranscription = async () => {
    if (!callDetail) return;

    setIsStartingTranscription(true);

    try {
      const response = await fetch(`/api/calls/${callDetail.call.id}/transcribe`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      // Update local state
      setCallDetail(prev => prev ? {
        ...prev,
        call: { ...prev.call, status: 'processing' },
      } : null);

      toast({
        title: "Transcription started",
        description: "This usually takes 3-6 minutes.",
      });
    } catch (error) {
      console.error('Start transcription error:', error);
      toast({
        title: "Failed to start transcription",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsStartingTranscription(false);
    }
  };

  const handleTrimComplete = () => {
    // Refresh call detail after trim to get updated status
    if (callDetail) {
      setCallDetail(prev => prev ? {
        ...prev,
        call: { ...prev.call, status: 'processing' },
      } : null);
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
  // REAL AUDIO PLAYBACK
  // =====================================================

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration (seconds):', audio.duration);
      setDuration(audio.duration);
      setAudioLoaded(true);
      // Force update to ensure UI reflects the change
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Add debug log for first few updates to verify it's working
      if (audio.currentTime < 1 || Math.floor(audio.currentTime) % 10 === 0) {
        console.log('Audio time update:', audio.currentTime, '/', audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      toast({
        title: "Playback Error",
        description: "Failed to load or play audio file",
        variant: "destructive",
      });
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [toast]);

  // Control play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Play failed:', error);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Control playback speed
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Control volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  // Jump to timestamp in audio
  const jumpToTimestamp = (seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = seconds;
      setIsPlaying(true);
    }
  };

  // =====================================================
  // TYPED NOTES HANDLERS
  // =====================================================

  const saveTypedNotes = async (notes: string) => {
    if (!callDetail) return;

    setNotesSaving(true);
    setNotesSaved(false);

    try {
      const response = await fetch(`/api/calls/${callDetail.call.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000); // Show saved indicator for 2 seconds
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error saving notes",
        description: "Failed to save your notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setNotesSaving(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setTypedNotes(value);

    // Clear existing timer
    if (notesDebounceTimer.current) {
      clearTimeout(notesDebounceTimer.current);
    }

    // Set new timer for auto-save (1.5 seconds after user stops typing)
    notesDebounceTimer.current = setTimeout(() => {
      if (value !== callDetail?.call.typed_notes) {
        saveTypedNotes(value);
      }
    }, 1500);
  };

  // =====================================================
  // ACTION HANDLERS
  // =====================================================

  const handleCopyToClipboard = () => {
    const output = generateCRMOutput(activeTab);
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied to clipboard",
      description: "The output has been copied to your clipboard.",
    });
  };

  const handleDownloadPDF = () => {
    if (!callDetail) return;

    const output = generateCRMOutput(activeTab);
    const { call, fields } = callDetail;

    // Extract customer name and sales rep from fields
    const customerName = fields.find(f => f.field_name.toLowerCase() === 'customer name')?.field_value || 'Unknown Customer';
    const salesRep = fields.find(f => f.field_name.toLowerCase() === 'sales representative')?.field_value || 'Unknown';
    const sentiment = fields.find(f => f.field_name.toLowerCase() === 'sentiment')?.field_value || 'neutral';

    // Generate PDF
    const pdfBlob = generateCallPDF({
      callId: call.id,
      customerName,
      salesRep,
      callDate: format(new Date(call.created_at), 'MMMM d, yyyy'),
      duration: Math.round(call.duration / 60), // Convert to minutes
      sentiment,
      content: output,
      format: activeTab
    });

    // Download the PDF
    const filename = `call-summary-${call.id.slice(0, 8)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    downloadPDF(pdfBlob, filename);

    toast({
      title: "PDF Downloaded",
      description: "The call summary has been downloaded as a PDF.",
    });
  };

  const handleGenerateEmail = () => {
    setShowEmailModal(true);
  };

  // =====================================================
  // CRM OUTPUT GENERATION
  // =====================================================

  const generateCRMOutput = (format: string): string => {
    if (!callDetail) return "";

    const { call, fields, insights } = callDetail;

    // Calculate participant analytics if available
    const participantAnalytics = call.metadata?.participants?.map((p: any) => ({
      name: p.name,
      talkTimePercentage: p.talkTimePercentage || 0,
      wordCount: p.wordCount || 0,
      utteranceCount: p.utteranceCount || 0
    }));

    // Prepare data in the format expected by formatCRMOutput
    // Extract customer_company and next_steps from fields since they're not in CallRecord
    const customerCompanyField = fields.find(f => f.field_name === 'customer_company');
    const nextStepsField = fields.find(f => f.field_name === 'next_steps');

    const callData = {
      call: {
        customer_name: call.customer_name,
        customer_company: customerCompanyField?.field_value || null,
        sales_rep: call.sales_rep,
        call_date: call.call_date,
        duration: call.duration,
        sentiment_type: call.sentiment_type,
        next_steps: nextStepsField?.field_value || null,
        metadata: call.metadata
      },
      fields,
      insights,
      participantAnalytics
    };

    // For custom templates that aren't supported by the library yet,
    // we'll keep the existing logic temporarily
    if (format.startsWith('template_') && format !== 'template_plain') {
      // Extract common fields
      const getField = (name: string) => {
        const field = fields.find(f => f.field_name.toLowerCase() === name.toLowerCase());
        return field?.field_value || "N/A";
      };

      const templateId = format.replace('template_', '');
      const template = customTemplates.find(t => t.id === templateId);

      if (!template) return "Template not found";

      let output = `📋 ${template.name}\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (template.description) {
        output += `📝 Description: ${template.description}\n\n`;
      }

      // Check if this template was used during extraction
      const wasUsedForExtraction = call.template_id === templateId;

      if (wasUsedForExtraction) {
        output += `✅ This template was used during extraction\n\n`;
      } else {
        output += `ℹ️ Different template used during extraction\n\n`;
      }

      // Generate output based on template fields
      output += `📊 TEMPLATE-SPECIFIC FIELDS\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Get template-specific fields (those with template_id)
      const templateSpecificFields = fields.filter(f => f.template_id === templateId);

      if (templateSpecificFields.length > 0) {
        templateSpecificFields.forEach((field: any) => {
          const icon =
            field.field_type === 'email' ? '📧' :
            field.field_type === 'date' ? '📅' :
            field.field_type === 'number' ? '🔢' :
            field.field_type === 'boolean' ? '✅' :
            field.field_type === 'url' ? '🔗' :
            '📋';

          output += `${icon} ${field.field_name}: ${field.field_value || 'N/A'}\n`;
          if (field.confidence_score) {
            output += `   Confidence: ${Math.round(field.confidence_score * 100)}%\n`;
          }
          output += '\n';
        });
      } else if (wasUsedForExtraction) {
        output += `⚠️ Template fields are still being extracted...\n\n`;
      } else {
        output += `📝 No fields extracted for this template yet\n\n`;
      }

      // Add core fields section
      output += `\n📋 CORE FIELDS (Always Extracted)\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const coreFields = fields.filter(f => !f.template_id);
      const importantCoreFields = ['summary', 'key_points', 'next_steps', 'pain_points', 'budget', 'timeline', 'call_outcome'];

      importantCoreFields.forEach(fieldName => {
        const field = coreFields.find(f => f.field_name === fieldName);
        if (field) {
          let value = field.field_value;
          try {
            // Try to parse JSON fields
            if (value && (value.startsWith('[') || value.startsWith('{'))) {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                value = parsed.join(', ');
              } else {
                value = JSON.stringify(parsed, null, 2);
              }
            }
          } catch {}

          const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          output += `📍 ${label}: ${value || 'N/A'}\n`;
        }
      });

      // Add insights section
      output += `\n💡 INSIGHTS\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (insights.length > 0) {
        insights.forEach(insight => {
          const icon =
            insight.insight_type === 'pain_point' ? '⚠️' :
            insight.insight_type === 'action_item' ? '🎯' :
            insight.insight_type === 'competitor' ? '🏢' : '📝';

          output += `${icon} ${insight.insight_text}\n`;
        });
      } else {
        output += '📝 No insights extracted yet\n';
      }

      return output;
    }

    // Use the library's formatCRMOutput for standard formats
    return formatCRMOutput(callData, format);
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
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

  // Extract participants from metadata
  const participants = call.metadata?.participants || [];

  // Create speaker mapping (map speaker labels to participant names)
  const createSpeakerMapping = () => {
    const mapping: Record<string, string> = {};

    // First, try to map by role
    const salesReps = participants.filter(p => p.role === "sales_rep");
    const customers = participants.filter(p => p.role === "customer");

    // Common speaker labels from AssemblyAI
    const speakerLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Map first speaker (usually A) to sales rep if available
    if (salesReps.length > 0) {
      mapping['A'] = salesReps[0].name || 'Sales Rep';
      mapping['Speaker A'] = salesReps[0].name || 'Sales Rep';
    }

    // Map subsequent speakers to customers
    let customerIndex = 0;
    for (let i = 1; i < speakerLabels.length && customerIndex < customers.length; i++) {
      const label = speakerLabels[i];
      mapping[label] = customers[customerIndex].name || `Customer ${customerIndex + 1}`;
      mapping[`Speaker ${label}`] = customers[customerIndex].name || `Customer ${customerIndex + 1}`;
      customerIndex++;
    }

    // Map any remaining participants
    let otherIndex = 0;
    const others = participants.filter(p => p.role === "other");
    for (let i = customers.length + 1; i < speakerLabels.length && otherIndex < others.length; i++) {
      const label = speakerLabels[i];
      mapping[label] = others[otherIndex].name || `Participant ${i}`;
      mapping[`Speaker ${label}`] = others[otherIndex].name || `Participant ${i}`;
      otherIndex++;
    }

    return mapping;
  };

  const speakerMapping = createSpeakerMapping();

  // Calculate participant analytics
  const calculateParticipantAnalytics = () => {
    if (!transcript?.utterances || transcript.utterances.length === 0) {
      return [];
    }

    const analytics: Record<string, {
      name: string;
      talkTime: number;
      wordCount: number;
      utteranceCount: number;
      sentiment: { positive: number; neutral: number; negative: number };
    }> = {};

    transcript.utterances.forEach(utterance => {
      const speakerName = speakerMapping[utterance.speaker] || utterance.speaker;

      if (!analytics[speakerName]) {
        analytics[speakerName] = {
          name: speakerName,
          talkTime: 0,
          wordCount: 0,
          utteranceCount: 0,
          sentiment: { positive: 0, neutral: 0, negative: 0 }
        };
      }

      // Calculate talk time
      const duration = (utterance.end_time - utterance.start_time);
      analytics[speakerName].talkTime += duration;

      // Count words
      analytics[speakerName].wordCount += utterance.text.split(/\s+/).length;

      // Count utterances
      analytics[speakerName].utteranceCount++;

      // Track sentiment
      const sentiment = utterance.sentiment?.toLowerCase() || 'neutral';
      if (sentiment === 'positive') analytics[speakerName].sentiment.positive++;
      else if (sentiment === 'negative') analytics[speakerName].sentiment.negative++;
      else analytics[speakerName].sentiment.neutral++;
    });

    // Convert to array and calculate percentages
    const totalTalkTime = Object.values(analytics).reduce((sum, a) => sum + a.talkTime, 0);

    return Object.values(analytics).map(participant => ({
      ...participant,
      talkTimePercentage: totalTalkTime > 0 ? (participant.talkTime / totalTalkTime) * 100 : 0,
      avgWordsPerUtterance: participant.utteranceCount > 0 ?
        Math.round(participant.wordCount / participant.utteranceCount) : 0
    }));
  };

  const participantAnalytics = calculateParticipantAnalytics();

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
      {/* Hidden audio element for playback */}
      {call.file_url && (
        <audio
          ref={audioRef}
          src={call.file_url}
          preload="metadata"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('Audio element error:', e);
            console.error('Audio src:', call.file_url);
            const audio = e.currentTarget;
            console.error('Audio error code:', audio.error?.code);
            console.error('Audio error message:', audio.error?.message);
          }}
          onLoadedMetadata={() => {
            console.log('Audio loaded successfully:', call.file_url);
          }}
        />
      )}

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
                  {call.duration_minutes || (call.duration ? Math.ceil(call.duration / 60) : 0)} minutes
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
                      : "bg-violet-100 text-violet-800"
                  )}
                >
                  {call.status === "completed" ? "✓ Completed" :
                   call.status === "failed" ? "✗ Failed" :
                   call.status === "transcribing" && call.processing_progress !== null
                     ? `Transcribing ${call.processing_progress}%`
                     : call.status === "extracting"
                     ? "Extracting Data"
                     : "Processing"}
                </Badge>
              </div>
            </div>

            {/* Modern Animated Progress Indicator */}
            {(call.status === "processing" || call.status === "transcribing" || call.status === "extracting") && (
              <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border border-violet-200 rounded-lg p-6 mt-4 shadow-lg">
                <ModernProgress
                  progress={call.processing_progress || 0}
                  message={call.processing_message || (
                    call.status === "transcribing" ? "Transcribing audio..." :
                    call.status === "extracting" ? "Extracting insights..." :
                    "Starting processing..."
                  )}
                  status={
                    call.status === "transcribing" || call.status === "extracting" ? "processing" :
                    call.status === "processing" ? "processing" :
                    "queued"
                  }
                />

                {/* Additional Info */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-violet-600">
                    {call.status === "transcribing"
                      ? "This usually takes 3-6 minutes depending on call length"
                      : call.status === "extracting"
                      ? "Analyzing conversation and extracting insights..."
                      : "Initializing transcription service..."}
                  </p>

                  {/* Live Status Dots */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-purple-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {(call.status === "uploaded" || call.status === "failed") && call.file_url && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowTrimModal(true)}
                  variant="outline"
                  className="border-violet-600 text-violet-600 hover:bg-violet-50"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Trim Audio
                </Button>
                <Button
                  onClick={handleStartTranscription}
                  disabled={isStartingTranscription}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {isStartingTranscription ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Transcription
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Participants Section - Only show if participants exist */}
        {participants.length > 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Users className="w-5 h-5 text-violet-600" />
                  Call Participants ({participants.length})
                </CardTitle>
                {participantAnalytics.length > 0 && (
                  <Badge className="bg-violet-100 text-violet-700">
                    {Math.round(participantAnalytics.reduce((sum, p) => sum + p.talkTime, 0) / 60)} min total talk time
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant, index) => {
                  const analytics = participantAnalytics.find(a =>
                    a.name === participant.name ||
                    a.name.includes(participant.name)
                  );

                  return (
                    <div
                      key={participant.id || index}
                      className="relative p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      {/* Role Badge */}
                      <Badge
                        className={cn(
                          "absolute top-2 right-2 text-xs",
                          participant.role === "sales_rep"
                            ? "bg-purple-100 text-purple-700"
                            : participant.role === "customer"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {participant.role === "sales_rep" ? "Sales Rep" :
                         participant.role === "customer" ? "Customer" : "Other"}
                      </Badge>

                      {/* Participant Info */}
                      <div className="space-y-2 mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {participant.name || "Unknown"}
                        </h4>
                        {participant.email && (
                          <p className="text-sm text-gray-600">{participant.email}</p>
                        )}
                        {participant.company && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {participant.company}
                          </p>
                        )}
                      </div>

                      {/* Analytics if available */}
                      {analytics && (
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Talk Time</span>
                            <span className="font-medium">
                              {Math.round(analytics.talkTime / 60)}m ({Math.round(analytics.talkTimePercentage)}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Words Spoken</span>
                            <span className="font-medium">{analytics.wordCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Utterances</span>
                            <span className="font-medium">{analytics.utteranceCount}</span>
                          </div>

                          {/* Sentiment Bar */}
                          <div className="mt-2">
                            <div className="text-xs text-gray-600 mb-1">Sentiment</div>
                            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                              {analytics.sentiment.positive > 0 && (
                                <div
                                  className="bg-green-500"
                                  style={{
                                    width: `${(analytics.sentiment.positive / analytics.utteranceCount) * 100}%`
                                  }}
                                  title={`Positive: ${analytics.sentiment.positive}`}
                                />
                              )}
                              {analytics.sentiment.neutral > 0 && (
                                <div
                                  className="bg-gray-400"
                                  style={{
                                    width: `${(analytics.sentiment.neutral / analytics.utteranceCount) * 100}%`
                                  }}
                                  title={`Neutral: ${analytics.sentiment.neutral}`}
                                />
                              )}
                              {analytics.sentiment.negative > 0 && (
                                <div
                                  className="bg-red-500"
                                  style={{
                                    width: `${(analytics.sentiment.negative / analytics.utteranceCount) * 100}%`
                                  }}
                                  title={`Negative: ${analytics.sentiment.negative}`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall Analytics Summary */}
              {participantAnalytics.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                    Conversation Analytics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {participantAnalytics.length}
                      </div>
                      <div className="text-xs text-gray-600">Active Speakers</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(participantAnalytics.reduce((sum, p) => sum + p.talkTime, 0) / 60)}m
                      </div>
                      <div className="text-xs text-gray-600">Total Duration</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {participantAnalytics.reduce((sum, p) => sum + p.wordCount, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Words</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {participantAnalytics.reduce((sum, p) => sum + p.utteranceCount, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total Utterances</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                disabled={!audioLoaded}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  audioLoaded
                    ? 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
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
                  {audioLoaded ? (
                    <span className={`text-sm font-mono font-semibold transition-all duration-300 ${
                      isPlaying ? 'text-purple-600 animate-pulse' : 'text-gray-900'
                    }`}>
                      <span className="text-lg">{formatTime(currentTime)}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-base text-gray-600">{formatTime(duration)}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 animate-pulse">
                      Loading audio...
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{call.customer_name || "Customer"} Call</span>
                    <span>•</span>
                    <span>{call.sales_rep || "Sales Rep"}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className="relative h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer group"
                  onClick={(e) => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    audio.currentTime = percentage * duration;
                  }}
                >
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

        {/* Transcript Section - Full Width */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-900">Call Transcript</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
                {transcript && transcript.utterances && transcript.utterances.length > 0 ? (
                  transcript.utterances.map((utterance, index) => {
                    const sentiment = sentimentConfig[utterance.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;

                    // Map speaker to participant name
                    const speakerName = speakerMapping[utterance.speaker] || utterance.speaker;

                    // Find the participant for this speaker
                    const participant = participants.find(p =>
                      p.name === speakerName ||
                      speakerMapping[utterance.speaker] === p.name
                    );

                    const isRep = participant?.role === 'sales_rep' ||
                                  utterance.speaker.toLowerCase().includes('rep') ||
                                  utterance.speaker === 'A';

                    // Get initials for avatar
                    const getInitials = (name: string) => {
                      const parts = name.split(' ');
                      if (parts.length >= 2) {
                        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                      }
                      return name.substring(0, 2).toUpperCase();
                    };

                    return (
                      <div key={utterance.id} className="flex gap-3 group">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                              participant?.role === 'sales_rep' ? "bg-purple-600 text-white" :
                              participant?.role === 'customer' ? "bg-blue-500 text-white" :
                              isRep ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-700"
                            )}
                          >
                            {speakerName && speakerName !== utterance.speaker
                              ? getInitials(speakerName)
                              : utterance.speaker.substring(0, 2).toUpperCase()}
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {speakerName}
                            </span>
                            {participant?.company && (
                              <span className="text-xs text-gray-500">
                                • {participant.company}
                              </span>
                            )}
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

        {/* Optional Typed Notes Section */}
        {callDetail && (callDetail.call.status === 'completed' || callDetail.call.status === 'transcribed' || callDetail.call.status === 'processing' || callDetail.call.status === 'extracting') && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader
              className="bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StickyNote className="w-5 h-5 text-gray-600" />
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Typed Notes
                  </CardTitle>
                  <span className="text-sm text-gray-500">
                    (Optional - Add any typed notes from the call to improve extraction accuracy)
                  </span>
                  {notesSaving && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </div>
                  )}
                  {notesSaved && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-3 h-3" />
                      Notes saved
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                >
                  {notesExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {notesExpanded && (
              <CardContent className="p-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Paste or type any notes you took during the call. These will be used to enhance the CRM extraction accuracy.
                    The transcript remains the primary source - notes are only used for additional context.
                  </p>
                  <textarea
                    value={typedNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Enter your typed notes here... (e.g., customer mentioned budget of $50k, considering Q2 implementation, main competitor is XYZ Corp)"
                    className="w-full min-h-[150px] p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y text-gray-900 placeholder-gray-400"
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {typedNotes.length} / 5000 characters
                    </p>
                    <p className="text-xs text-gray-500">
                      Auto-saves as you type
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* CRM Output Section - Full Width */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-2xl font-bold text-gray-900">CRM Output</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                {callDetail?.call.template && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    Template: {callDetail.call.template.name}
                  </Badge>
                )}
                {/* Dropdown for selecting other CRM formats */}
                <select
                  value={activeTab.startsWith('template_') ? 'template' : activeTab}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'template' && callDetail?.call.template_id) {
                      setActiveTab(`template_${callDetail.call.template_id}`);
                    } else {
                      setActiveTab(value);
                    }
                  }}
                  className="px-3 py-1 text-sm border rounded-md bg-white"
                >
                  <option value="plain">Plain Text</option>
                  {callDetail?.call.template && (
                    <option value="template">{callDetail.call.template.name}</option>
                  )}
                  <option value="hubspot">HubSpot</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="monday">Monday.com</option>
                  <option value="zoho">Zoho CRM</option>
                  <option value="csv">CSV/Excel</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
                {/* Single content area that changes based on activeTab */}
                <div className="mt-4">
                  <div className={`p-6 rounded-lg border ${
                    activeTab.startsWith('template_')
                      ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  } min-h-[400px] max-h-[600px] overflow-y-auto`}>
                    <pre className="text-base text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                      {generateCRMOutput(activeTab)}
                    </pre>
                  </div>
                </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Button
                onClick={() =>
                  handleCopy(
                    generateCRMOutput(activeTab),
                    activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                  )
                }
                className="h-12 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
              >
                <Copy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Copy to Clipboard
              </Button>

              <Button
                onClick={() => setShowEmailModal(true)}
                disabled={!transcript || (!transcript.full_text && (!transcript.utterances || transcript.utterances.length === 0))}
                className="h-12 bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4 mr-2" />
                Generate Follow-up Email
              </Button>

              <Button
                variant="outline"
                className="h-12 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Download as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audio Trim Modal */}
      {callDetail && call.file_url && (
        <AudioTrimModal
          isOpen={showTrimModal}
          onClose={() => setShowTrimModal(false)}
          audioUrl={call.file_url}
          callId={call.id}
          onTrimComplete={handleTrimComplete}
        />
      )}

      {/* Enhanced Email Generation Modal */}
      {callDetail && (
        <EnhancedEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          callData={callDetail}
          callId={call.id}
          customerName={call.customer_name}
        />
      )}
    </div>
  );
}
