"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileAudio, X, Check, AlertCircle, Loader2, Link as LinkIcon, Plus, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { validateAudioFile, formatFileSize, getAudioDuration, type FileValidationResult } from "@/lib/fileValidation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { getPlanDetails } from "@/lib/pricing";
import { useDirectUpload } from "@/lib/hooks/useDirectUpload";
import { createClient } from "@/lib/supabase/client";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadStatus = "idle" | "validating" | "uploading" | "transcribing" | "extracting" | "processing" | "success" | "error";

interface FileUpload {
  id: string;
  file: File; // Actual File object
  name: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  callId?: string; // Store call ID after upload
  validation?: FileValidationResult;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  company: string;
  role: "customer" | "sales_rep" | "other";
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "1",
      name: "",
      email: "",
      company: "",
      role: "customer",
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateFields, setNewTemplateFields] = useState<any[]>([
    { id: "1", fieldName: "", fieldType: "text", description: "" }
  ]);
  const [typedNotes, setTypedNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user, organization } = useAuth();
  const { upload: directUpload, uploading: isDirectUploading } = useDirectUpload();

  // Upload protection state
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);
  const [showUploadWarning, setShowUploadWarning] = useState(false);
  const uploadAbortController = useRef<AbortController | null>(null);
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Get user's plan details for duration validation
  const userPlan = organization?.plan_type || 'free';
  const planDetails = getPlanDetails(userPlan as any);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear status polling if active
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
        statusPollInterval.current = null;
      }
    };
  }, []);

  // Fetch user's custom templates when modal opens
  useEffect(() => {
    if (!user || !isOpen) return;

    async function fetchTemplates() {
      const supabase = createClient();
      const { data: templatesData } = await supabase
        .from('custom_templates')
        .select('id, name, description')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (templatesData) {
        setCustomTemplates(templatesData);
      }
    }

    fetchTemplates();
  }, [user, isOpen]);

  // handleFileSelect - moved here to fix temporal dead zone issue
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = [];

    // Show toast if multiple files selected
    if (selectedFiles.length > 1) {
      toast({
        title: "Multiple files selected",
        description: `Processing ${selectedFiles.length} files. Each will be uploaded separately.`,
      });
    }

    for (const file of Array.from(selectedFiles)) {
      const fileUpload: FileUpload = {
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        name: file.name,
        status: "validating",
        progress: 0,
      };

      newFiles.push(fileUpload);
    }

    setFiles((prev) => [...prev, ...newFiles]);

    // Validate files in parallel for better performance
    const validationPromises = newFiles.map(async (fileUpload) => {
      const validation = await validateAudioFile(fileUpload.file);

      // Check actual audio duration against user's plan limits
      let actualDuration: number | null = null;
      let durationError: string | null = null;

      if (validation.valid) {
        try {
          actualDuration = await getAudioDuration(fileUpload.file);

          // For free tier, check per-file duration limit (30 minutes per file)
          // For paid tiers, the limit is monthly total, not per-file
          if (userPlan === 'free') {
            const MAX_FREE_TIER_DURATION = 30 * 60; // 30 minutes in seconds
            if (actualDuration > MAX_FREE_TIER_DURATION) {
              durationError = `Recording duration (${Math.ceil(actualDuration / 60)} minutes) exceeds the 30-minute free tier limit per file. Please upgrade your plan or use a shorter recording.`;
            }
          }
          // For paid plans, we don't enforce per-file limits, only monthly totals
          // The server will handle monthly limit checks
        } catch (error) {
          console.warn("Could not determine audio duration:", error);
          // Don't block upload if duration check fails
          if (userPlan === 'free' && selectedFiles.length === 1) {
            toast({
              title: "Warning",
              description: "Could not verify recording duration. Upload may fail if it exceeds 30 minutes on the free plan.",
              variant: "default",
            });
          }
        }
      }

      return {
        fileUpload,
        validation,
        durationError
      };
    });

    // Wait for all validations to complete
    const validationResults = await Promise.all(validationPromises);

    // Update all file statuses at once
    setFiles((prev) =>
      prev.map((f) => {
        const result = validationResults.find(r => r.fileUpload.id === f.id);
        if (result) {
          return {
            ...f,
            status: (result.validation.valid && !result.durationError) ? ("idle" as UploadStatus) : ("error" as UploadStatus),
            error: result.durationError || result.validation.error,
            validation: result.validation,
          };
        }
        return f;
      })
    );

    // Show warnings if any
    const warningFiles = validationResults.filter(r => r.validation.warnings && r.validation.warnings.length > 0);
    if (warningFiles.length > 0) {
      const warningCount = warningFiles.length;
      toast({
        title: `File warnings (${warningCount} file${warningCount > 1 ? 's' : ''})`,
        description: warningFiles[0].validation.warnings?.join(". "),
        variant: "default",
      });
    }
  }, [toast, userPlan, setFiles]);

  // Enhanced drag and drop handlers
  useEffect(() => {
    if (!isOpen) return;

    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;

      // Check if dragging files
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
        if (hasFiles) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;

      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);

      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
        return;
      }

      // Don't process if already processing
      if (isProcessing || isImporting || isUploadInProgress) {
        toast({
          title: "Upload in progress",
          description: "Please wait for the current upload to complete.",
          variant: "destructive",
        });
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer.files);

      // Filter for audio files
      const audioFiles = droppedFiles.filter(file => {
        const isAudio = file.type.startsWith('audio/') ||
                       ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac'].some(ext =>
                         file.name.toLowerCase().endsWith(ext)
                       );
        return isAudio;
      });

      if (audioFiles.length === 0) {
        toast({
          title: "No audio files",
          description: "Please drop audio files (MP3, WAV, M4A, etc.)",
          variant: "destructive",
        });
        return;
      }

      if (audioFiles.length < droppedFiles.length) {
        toast({
          title: "Some files skipped",
          description: `${droppedFiles.length - audioFiles.length} non-audio file(s) were skipped.`,
          variant: "default",
        });
      }

      // Create a synthetic event to reuse handleFileSelect logic
      const dataTransfer = new DataTransfer();
      audioFiles.forEach(file => dataTransfer.items.add(file));

      const syntheticEvent = {
        target: {
          files: dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>;

      handleFileSelect(syntheticEvent);
    };

    // Add event listeners
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      dragCounter = 0;
      setIsDragging(false);
    };
  }, [isOpen, isProcessing, isImporting, isUploadInProgress, toast, handleFileSelect]);

  // Browser visibility detection and upload protection
  useEffect(() => {
    if (!isOpen) return;

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && isUploadInProgress) {
        // Browser minimized/tab switched during upload
        console.warn('Browser hidden during upload - upload may be interrupted');

        // Save current state to localStorage
        const uploadState = {
          files: files.filter(f => f.status === 'uploading'),
          participants,
          timestamp: Date.now()
        };
        localStorage.setItem('pendingUpload', JSON.stringify(uploadState));
      } else if (!document.hidden) {
        // Browser restored - check for interrupted uploads
        const savedState = localStorage.getItem('pendingUpload');
        if (savedState) {
          const state = JSON.parse(savedState);
          const timeSinceInterrupt = Date.now() - state.timestamp;

          // If less than 5 minutes, show recovery option
          if (timeSinceInterrupt < 5 * 60 * 1000) {
            toast({
              title: "Upload interrupted",
              description: "Your upload was interrupted. Please try uploading again.",
              variant: "destructive",
              duration: 10000,
            });
          }
          localStorage.removeItem('pendingUpload');
        }
      }
    };

    // Handle page unload (closing tab/window)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploadInProgress) {
        e.preventDefault();
        e.returnValue = 'You have an upload in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Handle browser back button
    const handlePopState = (e: PopStateEvent) => {
      if (isUploadInProgress) {
        if (confirm('You have an upload in progress. Are you sure you want to leave?')) {
          // User confirmed, clean up
          if (uploadAbortController.current) {
            uploadAbortController.current.abort();
          }
        } else {
          // User canceled, push state back
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state for back button handling
    if (isUploadInProgress) {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, isUploadInProgress, files, participants, toast]);

  const addParticipant = () => {
    const newParticipant: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      email: "",
      company: "",
      role: "customer",
    };
    setParticipants([...participants, newParticipant]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string) => {
    setParticipants(
      participants.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  // handleFileSelect moved earlier in the file to fix temporal dead zone issue

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      // Set upload in progress
      setIsUploadInProgress(true);
      setShowUploadWarning(true);

      // Create abort controller for this upload
      uploadAbortController.current = new AbortController();

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id ? { ...f, status: "uploading" as UploadStatus, progress: 0 } : f
        )
      );

      // Get primary customer and sales rep from participants
      const customers = participants.filter((p) => p.role === "customer");
      const salesReps = participants.filter((p) => p.role === "sales_rep");

      // Only send templateId if it's a custom template (UUID), not a system template
      const templateToSend = selectedTemplateId &&
        !['default', 'salesforce', 'hubspot', 'pipedrive', 'zoho', 'freshsales', 'monday'].includes(selectedTemplateId)
        ? selectedTemplateId
        : null;

      // Get audio duration before upload
      let audioDuration: number | undefined;
      try {
        audioDuration = await getAudioDuration(fileUpload.file);
        console.log('Audio duration captured:', audioDuration, 'seconds');
      } catch (error) {
        console.warn('Could not capture audio duration:', error);
      }

      // Prepare metadata
      const metadata = {
        customerName: customers.length > 0 ? customers[0].name : undefined,
        customerEmail: customers.length > 0 ? customers[0].email : undefined,
        customerPhone: customers.length > 0 ? customers[0].company : undefined,
        customerCompany: customers.length > 0 ? customers[0].company : undefined,
        salesRep: salesReps.length > 0 ? salesReps[0].name : undefined,
        callDate: new Date().toISOString(),
        participants: participants.filter(p => p.name.trim()),
        templateId: templateToSend, // Only send custom template IDs
        audioDuration: audioDuration, // Add duration to metadata
        typedNotes: typedNotes.trim() || undefined, // Add typed notes to metadata
        organizationId: organization?.id, // CRITICAL: Pass current organization ID
      };

      // Upload directly to Supabase Storage (zero memory usage)
      const result = await directUpload(fileUpload.file, metadata, (progress) => {
        // Update file progress in UI
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id ? { ...f, progress: progress.percentage } : f
          )
        );
      });

      if (result.success && result.call) {
        // Update to transcribing status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? {
                  ...f,
                  status: "transcribing" as UploadStatus,
                  progress: 100,
                  callId: result.call.id,
                }
              : f
          )
        );

        toast({
          title: "✅ Upload Complete!",
          description: `${fileUpload.name} has been uploaded and is now being transcribed.`,
        });

        // Clear upload state
        setIsUploadInProgress(false);
        setShowUploadWarning(false);
        uploadAbortController.current = null;

        // Start polling for status updates
        const supabase = createClient();
        let pollCount = 0;
        const maxPolls = 60; // Poll for up to 60 seconds

        // Clear any existing poll interval
        if (statusPollInterval.current) {
          clearInterval(statusPollInterval.current);
        }

        statusPollInterval.current = setInterval(async () => {
          pollCount++;

          // Check call status
          const { data: callData } = await supabase
            .from('calls')
            .select('status, processing_progress, processing_message')
            .eq('id', result.call.id)
            .single();

          if (callData) {
            // Update file status based on call status
            if (callData.status === 'transcribing') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileUpload.id
                    ? { ...f, status: "transcribing" as UploadStatus, progress: callData.processing_progress || 0 }
                    : f
                )
              );
            } else if (callData.status === 'extracting') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileUpload.id
                    ? { ...f, status: "extracting" as UploadStatus, progress: callData.processing_progress || 0 }
                    : f
                )
              );
            } else if (callData.status === 'processing') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileUpload.id
                    ? { ...f, status: "processing" as UploadStatus, progress: callData.processing_progress || 0 }
                    : f
                )
              );
            } else if (callData.status === 'completed' || callData.status === 'ready') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileUpload.id
                    ? { ...f, status: "success" as UploadStatus, progress: 100 }
                    : f
                )
              );
              if (statusPollInterval.current) {
                clearInterval(statusPollInterval.current);
                statusPollInterval.current = null;
              }

              // Navigate to the call detail page
              setTimeout(() => {
                router.push(`/calls/${result.call.id}`);
              }, 1000);
            } else if (callData.status === 'failed') {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileUpload.id
                    ? { ...f, status: "error" as UploadStatus, error: "Processing failed" }
                    : f
                )
              );
              if (statusPollInterval.current) {
                clearInterval(statusPollInterval.current);
                statusPollInterval.current = null;
              }
            }
          }

          // Stop polling after max attempts
          if (pollCount >= maxPolls) {
            if (statusPollInterval.current) {
              clearInterval(statusPollInterval.current);
              statusPollInterval.current = null;
            }
            // Still navigate even if we timeout polling
            router.push(`/calls/${result.call.id}`);
          }
        }, 1000); // Poll every second

        return result.call.id;
      } else {
        // Handle error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? {
                  ...f,
                  status: "error" as UploadStatus,
                  error: result.error || "Upload failed",
                }
              : f
          )
        );

        toast({
          title: "Upload failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });

        // Clear upload state on error
        setIsUploadInProgress(false);
        setShowUploadWarning(false);
        uploadAbortController.current = null;

        return null;
      }
    } catch (error) {
      console.error("Upload error:", error);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id
            ? {
                ...f,
                status: "error" as UploadStatus,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });

      // Clear upload state on error
      setIsUploadInProgress(false);
      setShowUploadWarning(false);
      uploadAbortController.current = null;

      return null;
    }
  };

  const handleImportFromUrl = async () => {
    if (isImporting) return;

    if (!recordingUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a recording URL.",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(recordingUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://...)",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      // Get primary customer and sales rep from participants
      const customers = participants.filter((p) => p.role === "customer");
      const salesReps = participants.filter((p) => p.role === "sales_rep");

      const response = await fetch("/api/calls/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordingUrl: recordingUrl.trim(),
          customerName: customers.length > 0 ? customers[0].name : null,
          customerEmail: customers.length > 0 ? customers[0].email : null,
          customerCompany: customers.length > 0 ? customers[0].company : null,
          salesRep: salesReps.length > 0 ? salesReps[0].name : null,
          participants: participants.filter(p => p.name.trim()),
          callDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      const result = await response.json();

      toast({
        title: "Import successful",
        description: "Your recording is being processed.",
      });

      // Navigate to call detail page
      setTimeout(() => {
        router.push(`/calls/${result.call.id}`);
        handleClose();
      }, 1500);

    } catch (error) {
      console.error("Import error:", error);

      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcessCalls = async () => {
    if (isProcessing) return;

    const validFiles = files.filter((f) => f.status === "idle");

    if (validFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "Please add valid audio files first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Show initial toast for multiple files
    if (validFiles.length > 1) {
      toast({
        title: "Processing multiple calls",
        description: `Uploading ${validFiles.length} files. They will be processed sequentially.`,
      });
    }

    try {
      // Upload files sequentially
      const uploadedCallIds: string[] = [];
      const failedUploads: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        // Show progress for multiple files
        if (validFiles.length > 1) {
          toast({
            title: `Uploading file ${i + 1} of ${validFiles.length}`,
            description: file.name,
          });
        }

        const callId = await uploadFile(file);
        if (callId) {
          uploadedCallIds.push(callId);
        } else {
          failedUploads.push(file.name);
        }
      }

      // Show summary
      if (uploadedCallIds.length > 0) {
        const message = failedUploads.length > 0
          ? `${uploadedCallIds.length} call(s) uploaded successfully. ${failedUploads.length} failed.`
          : `All ${uploadedCallIds.length} call(s) uploaded successfully!`;

        toast({
          title: "Processing complete",
          description: message,
          variant: failedUploads.length > 0 ? "default" : undefined,
        });

        // Navigate to first successful call or calls page
        setTimeout(() => {
          if (uploadedCallIds.length === 1) {
            router.push(`/calls/${uploadedCallIds[0]}`);
          } else {
            // For multiple uploads, go to calls page to see all
            router.push('/calls');
          }
          handleClose();
        }, 1500);
      } else {
        toast({
          title: "All uploads failed",
          description: "Please check your files and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleClose = () => {
    // Check for any upload in progress
    if (isProcessing || isImporting || isUploadInProgress) {
      const message = isUploadInProgress
        ? '⚠️ WARNING: Upload is currently in progress!\n\n❌ Closing this dialog will COMPLETELY INTERRUPT the upload.\n❌ Your file will NOT be processed.\n❌ You will need to start over.\n\nAre you ABSOLUTELY SURE you want to close and lose your upload progress?'
        : '⚠️ Processing in progress. Please wait for it to complete before closing.';

      if (isUploadInProgress) {
        const confirmClose = confirm(message);
        if (!confirmClose) {
          return;
        }
        // User confirmed, abort upload
        if (uploadAbortController.current) {
          uploadAbortController.current.abort();
        }
      } else {
        toast({
          title: "⚠️ Cannot close - Upload in progress",
          description: "Please wait for the upload to complete. Do not close this window!",
          variant: "destructive",
        });
        return;
      }
    }

    // Reset all state
    setFiles([]);
    setParticipants([
      {
        id: "1",
        name: "",
        email: "",
        company: "",
        role: "customer",
      },
    ]);
    setRecordingUrl("");
    setIsUploadInProgress(false);
    setShowUploadWarning(false);
    uploadAbortController.current = null;

    // Clear status polling if active
    if (statusPollInterval.current) {
      clearInterval(statusPollInterval.current);
      statusPollInterval.current = null;
    }

    localStorage.removeItem('pendingUpload');
    onClose();
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case "validating":
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
      case "uploading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "transcribing":
        return <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />;
      case "extracting":
        return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "success":
        return <Check className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <FileAudio className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (file: FileUpload) => {
    switch (file.status) {
      case "validating":
        return "Validating file...";
      case "uploading":
        return `📤 Uploading to server... ${file.progress}%`;
      case "transcribing":
        return `🎙️ Transcribing audio... ${file.progress}%`;
      case "extracting":
        return `✨ Extracting insights with AI... ${file.progress}%`;
      case "processing":
        return `⚡ Processing call data... ${file.progress || 0}%`;
      case "success":
        return "✅ Upload complete! Redirecting...";
      case "error":
        return file.error || "Upload failed";
      default:
        return file.validation?.metadata?.sizeInMB
          ? `Ready (${formatFileSize(file.file.size)})`
          : "Ready";
    }
  };

  return (
    <>
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-blue-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-4 border-dashed border-blue-500 animate-pulse">
            <Upload className="w-20 h-20 mx-auto mb-4 text-blue-500" />
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">Drop your audio files here!</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              Release to upload multiple files at once
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">MP3</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">WAV</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">M4A</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">WEBM</span>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Process Sales Call
            {(isProcessing || isImporting || isUploadInProgress) && (
              <span className="text-sm font-normal text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                DO NOT CLOSE - Upload in progress
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Upload a file or import from a URL (Zoom, Drive, etc.)
          </DialogDescription>
        </DialogHeader>

        {/* Upload Warning Alert */}
        {showUploadWarning && (
          <Alert className="border-red-500 bg-red-50 mb-4 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 text-lg font-bold">⚠️ CRITICAL: Do Not Close This Window!</AlertTitle>
            <AlertDescription className="text-red-700">
              <ul className="mt-2 space-y-1 text-sm font-medium">
                <li>• ❌ DO NOT close this dialog box</li>
                <li>• ❌ DO NOT minimize or switch tabs</li>
                <li>• ❌ DO NOT refresh or navigate away</li>
                <li>• ✅ Keep this window open and active</li>
              </ul>
              {isUploadInProgress && (
                <div className="mt-3 p-2 bg-red-100 rounded-md flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                  <span className="text-sm font-bold">UPLOAD IN PROGRESS - CLOSING WILL INTERRUPT THE PROCESS!</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Template Selection */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold text-blue-900">
              Select Output Template
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-8"
              onClick={() => setShowTemplateCreator(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Create Template
            </Button>
          </div>
          <Select value={selectedTemplateId || "default"} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (All Fields)</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="hubspot">HubSpot</SelectItem>
              <SelectItem value="pipedrive">Pipedrive</SelectItem>
              <SelectItem value="zoho">Zoho CRM</SelectItem>
              <SelectItem value="freshsales">Freshsales</SelectItem>
              <SelectItem value="monday">Monday.com</SelectItem>
              {customTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.field_count} fields)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-blue-700 mt-2">
            AI will extract fields matching this template. You can change templates later.
          </p>
        </div>

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url">
              <LinkIcon className="w-4 h-4 mr-2" />
              Import from URL
            </TabsTrigger>
          </TabsList>

          {/* FILE UPLOAD TAB */}
          <TabsContent value="file" className="space-y-6 mt-6">
            {/* Drag and Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary dark:hover:border-primary transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".mp3,.mp4,.wav,.m4a,.webm,.ogg,.flac"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">
                  Drag & drop your file here, or{" "}
                  <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supported: MP3, WAV, M4A, WEBM, OGG, FLAC. Max: 500MB, 60 min
                </p>
              </label>
            </div>

            {/* Upload Queue */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Files ({files.length})</h3>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg ${
                      file.status === "error" ? "border-destructive bg-destructive/5" : "dark:border-slate-700"
                    }`}
                  >
                    <div className="flex-shrink-0">{getStatusIcon(file.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{file.name}</p>
                      {(file.status === "uploading" || file.status === "transcribing" || file.status === "extracting" || file.status === "processing") && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              file.status === "uploading" ? "bg-blue-500" :
                              file.status === "transcribing" ? "bg-sky-500" :
                              file.status === "extracting" ? "bg-indigo-500" :
                              "bg-primary"
                            }`}
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          file.status === "error" ? "text-destructive" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {getStatusText(file)}
                      </p>
                      {file.validation?.warnings && file.status === "idle" && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          ⚠️ {file.validation.warnings[0]}
                        </p>
                      )}
                    </div>
                    {!isProcessing && file.status !== "processing" && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* URL IMPORT TAB */}
          <TabsContent value="url" className="space-y-6 mt-6">
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Important: Recording Must Be Publicly Accessible
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 ml-6 list-disc">
                  <li><strong>Zoom:</strong> Ensure recording link sharing is enabled (Settings → Recording → Share recordings)</li>
                  <li><strong>Google Drive:</strong> Right-click file → Share → "Anyone with the link can view"</li>
                  <li><strong>Dropbox:</strong> Use "Create link" → "Anyone with the link"</li>
                  <li><strong>OneDrive:</strong> Share → "Anyone with the link can view"</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>If the link requires login or has restricted access, the import will fail. Test by opening the link in an incognito/private browser window.</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recordingUrl">Recording URL *</Label>
                <Input
                  id="recordingUrl"
                  type="url"
                  placeholder="https://zoom.us/rec/share/... or https://drive.google.com/..."
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  disabled={isImporting}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Make sure the URL is publicly accessible or has sharing permissions enabled
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Participants Section - Shared between tabs */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Call Participants (Optional)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add all people who were on the call for better speaker identification
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParticipant}
                disabled={isProcessing || isImporting}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Person
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="grid grid-cols-12 gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/50"
                >
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={participant.name}
                      onChange={(e) => updateParticipant(participant.id, "name", e.target.value)}
                      disabled={isProcessing || isImporting}
                      className="h-9"
                    />
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={participant.email}
                      onChange={(e) => updateParticipant(participant.id, "email", e.target.value)}
                      disabled={isProcessing || isImporting}
                      className="h-9"
                    />
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input
                      placeholder="Acme Corp"
                      value={participant.company}
                      onChange={(e) => updateParticipant(participant.id, "company", e.target.value)}
                      disabled={isProcessing || isImporting}
                      className="h-9"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={participant.role}
                      onValueChange={(value) => updateParticipant(participant.id, "role", value)}
                      disabled={isProcessing || isImporting}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="broker">Broker (You)</SelectItem>
                        <SelectItem value="shipper">Shipper</SelectItem>
                        <SelectItem value="carrier">Carrier/Dispatcher</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 flex items-end justify-center">
                    {participants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParticipant(participant.id)}
                        disabled={isProcessing || isImporting}
                        className="h-9 w-9 text-gray-400 hover:text-red-600 dark:hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typed Notes Section - New */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 space-y-3">
            <div>
              <Label htmlFor="typed-notes" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pre-call Notes (Optional)
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                Add any context or notes about this call to enhance AI extraction accuracy
              </p>
              <Textarea
                id="typed-notes"
                placeholder="e.g., This is a follow-up call with the prospect about their enterprise needs. They mentioned budget concerns in our last meeting. Key decision maker is the CTO..."
                value={typedNotes}
                onChange={(e) => setTypedNotes(e.target.value)}
                disabled={isProcessing || isImporting}
                className="min-h-[100px] resize-y"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                These notes will help the AI better understand the context and extract more relevant information
              </p>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Audio files are securely stored and automatically processed. Transcripts are stored indefinitely unless deleted.{" "}
            <a href="/help" className="text-primary hover:underline">
              Learn more about privacy →
            </a>
          </p>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing || isImporting}>
            Cancel
          </Button>
          <Button
            onClick={recordingUrl.trim() ? handleImportFromUrl : handleProcessCalls}
            disabled={(files.filter((f) => f.status === "idle").length === 0 && !recordingUrl.trim()) || isProcessing || isImporting}
          >
            {isProcessing || isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isImporting ? "Importing..." : "Processing..."}
              </>
            ) : recordingUrl.trim() ? (
              "Import & Process"
            ) : (
              `Process ${files.filter((f) => f.status === "idle").length} Call(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Quick Template Creator Dialog */}
      <Dialog open={showTemplateCreator} onOpenChange={setShowTemplateCreator}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Define the fields you want AI to extract from your sales calls
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* Template Name */}
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Enterprise Sales Template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Template Description */}
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                placeholder="Brief description of this template"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Template Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Template Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewTemplateFields([
                      ...newTemplateFields,
                      { id: Math.random().toString(36).substr(2, 9), fieldName: "", fieldType: "text", description: "" }
                    ]);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {newTemplateFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Field name"
                        value={field.fieldName}
                        onChange={(e) => {
                          const updated = [...newTemplateFields];
                          updated[index].fieldName = e.target.value;
                          setNewTemplateFields(updated);
                        }}
                      />
                    </div>
                    <Select
                      value={field.fieldType}
                      onValueChange={(value) => {
                        const updated = [...newTemplateFields];
                        updated[index].fieldType = value;
                        setNewTemplateFields(updated);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </Select>
                    {newTemplateFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setNewTemplateFields(newTemplateFields.filter((_, i) => i !== index));
                        }}
                        className="h-10 w-10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateCreator(false);
                setNewTemplateName("");
                setNewTemplateDescription("");
                setNewTemplateFields([{ id: "1", fieldName: "", fieldType: "text", description: "" }]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newTemplateName.trim()) {
                  toast({
                    title: "Error",
                    description: "Template name is required",
                    variant: "destructive",
                  });
                  return;
                }

                const validFields = newTemplateFields.filter(f => f.fieldName.trim());
                if (validFields.length === 0) {
                  toast({
                    title: "Error",
                    description: "At least one field is required",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const supabase = createClient();

                  // Create the template
                  const { data: template, error: templateError } = await supabase
                    .from('custom_templates')
                    .insert({
                      user_id: user?.id,
                      organization_id: organization?.id,
                      name: newTemplateName,
                      description: newTemplateDescription,
                      field_count: validFields.length,
                      category: 'custom',
                      is_active: true,
                    })
                    .select()
                    .single();

                  if (templateError) throw templateError;

                  // Create the template fields
                  if (template) {
                    const fieldsToInsert = validFields.map((field, index) => ({
                      template_id: template.id,
                      field_name: field.fieldName,
                      field_type: field.fieldType,
                      description: field.description || null,
                      sort_order: index,
                    }));

                    const { error: fieldsError } = await supabase
                      .from('template_fields')
                      .insert(fieldsToInsert);

                    if (fieldsError) throw fieldsError;
                  }

                  // Refresh templates list
                  const { data: templatesData } = await supabase
                    .from('custom_templates')
                    .select('*')
                    .eq('user_id', user?.id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                  if (templatesData) {
                    setCustomTemplates(templatesData);
                    // Auto-select the new template
                    setSelectedTemplateId(template.id);
                  }

                  toast({
                    title: "Success",
                    description: "Template created successfully",
                  });

                  // Reset and close
                  setShowTemplateCreator(false);
                  setNewTemplateName("");
                  setNewTemplateDescription("");
                  setNewTemplateFields([{ id: "1", fieldName: "", fieldType: "text", description: "" }]);

                } catch (error) {
                  console.error('Error creating template:', error);
                  toast({
                    title: "Error",
                    description: "Failed to create template",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!newTemplateName.trim() || newTemplateFields.filter(f => f.fieldName.trim()).length === 0}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
