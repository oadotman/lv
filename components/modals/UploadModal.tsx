"use client";

import { useState, useEffect } from "react";
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
import { Upload, FileAudio, X, Check, AlertCircle, Loader2, Link as LinkIcon, Plus, Users } from "lucide-react";
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

type UploadStatus = "idle" | "validating" | "uploading" | "processing" | "success" | "error";

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const { user, organization } = useAuth();
  const { upload: directUpload, uploading: isDirectUploading } = useDirectUpload();

  // Get user's plan details for duration validation
  const userPlan = organization?.plan_type || 'free';
  const planDetails = getPlanDetails(userPlan as any);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = [];

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

    // Validate files
    for (const fileUpload of newFiles) {
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
          if (userPlan === 'free') {
            toast({
              title: "Warning",
              description: "Could not verify recording duration. Upload may fail if it exceeds 30 minutes on the free plan.",
              variant: "default",
            });
          }
        }
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id
            ? {
                ...f,
                status: (validation.valid && !durationError) ? ("idle" as UploadStatus) : ("error" as UploadStatus),
                error: durationError || validation.error,
                validation: validation,
              }
            : f
        )
      );

      if (validation.warnings && validation.warnings.length > 0) {
        toast({
          title: "File warnings",
          description: validation.warnings.join(". "),
          variant: "default",
        });
      }
    }
  };

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id ? { ...f, status: "uploading" as UploadStatus, progress: 0 } : f
        )
      );

      // Get primary customer and sales rep from participants
      const customers = participants.filter((p) => p.role === "customer");
      const salesReps = participants.filter((p) => p.role === "sales_rep");

      // Prepare metadata
      const metadata = {
        customerName: customers.length > 0 ? customers[0].name : undefined,
        customerEmail: customers.length > 0 ? customers[0].email : undefined,
        customerPhone: customers.length > 0 ? customers[0].company : undefined,
        customerCompany: customers.length > 0 ? customers[0].company : undefined,
        salesRep: salesReps.length > 0 ? salesReps[0].name : undefined,
        callDate: new Date().toISOString(),
        participants: participants.filter(p => p.name.trim()),
        templateId: selectedTemplateId, // Add template ID to metadata
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
        // Update to success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? {
                  ...f,
                  status: "processing" as UploadStatus,
                  progress: 100,
                  callId: result.call.id,
                }
              : f
          )
        );

        toast({
          title: "Upload successful",
          description: `${fileUpload.name} is now being processed.`,
        });

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

    try {
      // Upload files sequentially
      const uploadedCallIds: string[] = [];

      for (const file of validFiles) {
        const callId = await uploadFile(file);
        if (callId) {
          uploadedCallIds.push(callId);
        }
      }

      // If at least one file uploaded successfully
      if (uploadedCallIds.length > 0) {
        toast({
          title: "Processing started",
          description: `${uploadedCallIds.length} call(s) are being transcribed and analyzed.`,
        });

        // Navigate to first call detail page after a short delay
        setTimeout(() => {
          router.push(`/calls/${uploadedCallIds[0]}`);
          handleClose();
        }, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleClose = () => {
    if (isProcessing || isImporting) {
      toast({
        title: "Upload in progress",
        description: "Please wait for uploads to complete.",
        variant: "destructive",
      });
      return;
    }

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
    onClose();
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case "validating":
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
      case "uploading":
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
        return "Validating...";
      case "uploading":
        return `Uploading... ${file.progress}%`;
      case "processing":
        return "Processing transcript...";
      case "success":
        return "Complete!";
      case "error":
        return file.error || "Upload failed";
      default:
        return file.validation?.metadata?.sizeInMB
          ? `Ready (${formatFileSize(file.file.size)})`
          : "Ready";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Sales Call</DialogTitle>
          <DialogDescription>
            Upload a file or import from a URL (Zoom, Drive, etc.)
          </DialogDescription>
        </DialogHeader>

        {/* Template Selection */}
        <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl">
          <Label className="text-sm font-semibold text-violet-900 mb-2 block">
            Select Output Template
          </Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (All Fields)</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="hubspot">HubSpot</SelectItem>
              <SelectItem value="pipedrive">Pipedrive</SelectItem>
              {customTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-violet-700 mt-2">
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
                      {file.status === "uploading" && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
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
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
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
  );
}
