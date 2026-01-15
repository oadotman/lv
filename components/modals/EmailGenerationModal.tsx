"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface EmailGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  customerName: string | null;
}

export function EmailGenerationModal({
  isOpen,
  onClose,
  callId,
  customerName,
}: EmailGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please provide instructions for the email",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`/api/calls/${callId}/generate-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a rate limit error
        if (response.status === 429) {
          const remaining = data.details?.remaining || 0;
          const resetTime = data.details?.resetTime
            ? new Date(data.details.resetTime).toLocaleTimeString()
            : "soon";

          toast({
            title: "Rate limit exceeded",
            description: `You've used all 10 email generations for this hour. ${remaining > 0 ? `${remaining} remaining.` : `Resets at ${resetTime}.`}`,
            variant: "destructive",
          });
          return;
        }

        throw new Error(data.error || "Failed to generate email");
      }

      setGeneratedEmail(data.email);
      toast({
        title: "Email generated successfully",
        description: "You can now copy or edit the email below",
      });
    } catch (error) {
      console.error("Email generation error:", error);
      toast({
        title: "Failed to generate email",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      toast({
        title: "Email copied to clipboard",
        description: "You can now paste it into your email client",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setPrompt("");
    setGeneratedEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Generate Follow-Up Email
          </DialogTitle>
          <DialogDescription>
            {customerName
              ? `Create a personalized follow-up email for ${customerName} based on the call transcript and insights.`
              : "Create a personalized follow-up email based on the call transcript and insights."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium">
              Email Instructions
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Write a professional follow-up email summarizing our discussion about pricing and next steps. Include a proposed timeline for the demo."
              className="mt-2 min-h-[120px] resize-none"
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-gray-500">
              Provide specific instructions for what you want to include in the
              email. The AI will use the call transcript and extracted data to
              personalize it.
            </p>
          </div>

          {/* Generated Email */}
          {generatedEmail && (
            <div>
              <Label htmlFor="generated" className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Generated Email
              </Label>
              <Textarea
                id="generated"
                value={generatedEmail}
                onChange={(e) => setGeneratedEmail(e.target.value)}
                className="mt-2 min-h-[300px] font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                You can edit the email before copying it
              </p>
            </div>
          )}

          {/* Rate Limit Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Rate Limit:</strong> You can generate up to 10 follow-up
            emails per hour to ensure quality and prevent abuse.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            {generatedEmail ? "Close" : "Cancel"}
          </Button>

          {generatedEmail && (
            <Button onClick={handleCopy} variant="outline">
              Copy to Clipboard
            </Button>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {generatedEmail ? "Regenerate" : "Generate Email"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
