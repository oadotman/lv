"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Scissors, Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

interface AudioTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  callId: string;
  onTrimComplete: () => void;
}

export function AudioTrimModal({
  isOpen,
  onClose,
  audioUrl,
  callId,
  onTrimComplete,
}: AudioTrimModalProps) {
  const [isTrimming, setIsTrimming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const { toast } = useToast();

  // Initialize WaveSurfer
  useEffect(() => {
    if (!isOpen || !waveformRef.current) return;

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ddd",
      progressColor: "#8b5cf6",
      cursorColor: "#6366f1",
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 120,
      barGap: 2,
      normalize: true,
    });

    // Create Regions plugin
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create());

    wavesurferRef.current = wavesurfer;
    regionsRef.current = regions;

    // Load audio
    wavesurfer.load(audioUrl);

    // Event listeners
    wavesurfer.on("ready", () => {
      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);
      setTrimEnd(audioDuration);
      setIsLoading(false);

      // Create initial region (full audio)
      regions.addRegion({
        start: 0,
        end: audioDuration,
        color: "rgba(139, 92, 246, 0.3)",
        drag: true,
        resize: true,
      });
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));

    // Update trim times when region changes
    regions.on("region-updated", (region: any) => {
      setTrimStart(region.start);
      setTrimEnd(region.end);
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [isOpen, audioUrl]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleReset = () => {
    if (regionsRef.current && wavesurferRef.current) {
      regionsRef.current.clearRegions();
      const audioDuration = wavesurferRef.current.getDuration();

      regionsRef.current.addRegion({
        start: 0,
        end: audioDuration,
        color: "rgba(139, 92, 246, 0.3)",
        drag: true,
        resize: true,
      });

      setTrimStart(0);
      setTrimEnd(audioDuration);
    }
  };

  const handleTrim = async () => {
    if (trimEnd - trimStart < 1) {
      toast({
        title: "Selection too short",
        description: "Please select at least 1 second of audio to transcribe.",
        variant: "destructive",
      });
      return;
    }

    setIsTrimming(true);

    try {
      const response = await fetch(`/api/calls/${callId}/trim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: trimStart,
          endTime: trimEnd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trim audio");
      }

      toast({
        title: "Audio trimmed successfully",
        description: `Selected ${formatTime(trimEnd - trimStart)} of audio. Transcription will start automatically.`,
      });

      onTrimComplete();
      onClose();
    } catch (error) {
      console.error("Trim error:", error);
      toast({
        title: "Trim failed",
        description: error instanceof Error ? error.message : "Failed to trim audio",
        variant: "destructive",
      });
    } finally {
      setIsTrimming(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-600" />
            Trim Audio for Transcription
          </DialogTitle>
          <DialogDescription>
            Select the portion of the audio you want to transcribe. Drag the edges of the highlighted region to adjust.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Waveform */}
          <div className="relative bg-gray-50 rounded-lg p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}
            <div ref={waveformRef} className="w-full" />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePlayPause}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Selected:</span>{" "}
              {formatTime(trimStart)} - {formatTime(trimEnd)}{" "}
              <span className="text-blue-600 font-medium">
                ({formatTime(trimEnd - trimStart)})
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Tip:</strong> Drag the colored region edges to select the portion you want to transcribe.
            Only the selected portion will be processed, saving time and usage credits.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isTrimming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTrim}
            disabled={isTrimming || isLoading}
            className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
          >
            {isTrimming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Trimming...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Trim & Transcribe
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
