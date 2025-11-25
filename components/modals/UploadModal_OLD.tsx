"use client";

import { useState } from "react";
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
import { Upload, FileAudio, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface FileUpload {
  id: string;
  name: string;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [callLink, setCallLink] = useState("");
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: "idle" as UploadStatus,
      progress: 0,
    }));

    setFiles([...files, ...newFiles]);
  };

  const simulateUpload = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "uploading" as UploadStatus } : f
      )
    );

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: Math.min(progress, 100) } : f
        )
      );

      if (progress >= 100) {
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: "processing" as UploadStatus } : f
          )
        );

        // Simulate processing
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "success" as UploadStatus } : f
            )
          );
        }, 2000);
      }
    }, 200);
  };

  const handleProcessCalls = () => {
    files.forEach((file) => {
      if (file.status === "idle") {
        simulateUpload(file.id);
      }
    });

    toast({
      title: "Processing calls",
      description: "Your calls are being transcribed and analyzed...",
    });
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleClose = () => {
    setFiles([]);
    setCallLink("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a Sales Call</DialogTitle>
          <DialogDescription>
            Upload your call recording to extract insights and CRM-ready data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drag and Drop Zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".mp3,.mp4,.wav,.m4a"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm font-medium mb-1">
                Drag & drop your file here, or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: MP4, MP3, WAV. Max file size: 500MB
              </p>
            </label>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Call Link Input */}
          <div>
            <label htmlFor="call-link" className="block text-sm font-medium mb-2">
              Call Link
            </label>
            <Input
              id="call-link"
              placeholder="Paste call recording link here (e.g., from Gong, Zoom)"
              value={callLink}
              onChange={(e) => setCallLink(e.target.value)}
            />
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500">
            Audio files are automatically deleted after 30 days.{" "}
            <a href="#" className="text-primary hover:underline">
              Learn more about privacy →
            </a>
          </p>

          {/* Upload Queue */}
          {files.length > 0 && (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <FileAudio className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.status === "uploading" && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploading... {file.progress}%
                        </p>
                      </>
                    )}
                    {file.status === "processing" && (
                      <p className="text-xs text-primary flex items-center mt-1">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Processing insights...
                      </p>
                    )}
                    {file.status === "success" && (
                      <p className="text-xs text-success flex items-center mt-1">
                        <Check className="w-3 h-3 mr-1" />
                        Upload complete!
                      </p>
                    )}
                    {file.status === "error" && (
                      <p className="text-xs text-destructive flex items-center mt-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {file.error || "Upload failed"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessCalls}
            disabled={files.length === 0 && !callLink}
          >
            Process Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
