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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Mail, Send, X, Plus, Trash2 } from "lucide-react";

interface ReferralInviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
  referralCode: string;
}

export function ReferralInviteModal({
  onClose,
  onSuccess,
  referralCode,
}: ReferralInviteModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [message, setMessage] = useState(
    `Hi there!\n\nI've been using CallIQ for call recording and AI-powered transcription, and I think you'd find it really valuable for your business.\n\nWhen you sign up using my referral link, you'll get 60 free minutes to try it out!\n\nBest regards`
  );
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  const addEmailField = () => {
    if (emails.length < 10) {
      setEmails([...emails, ""]);
    }
  };

  const removeEmailField = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails.length === 0 ? [""] : newEmails);

    // Clear error for removed field
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);

    // Clear error when user types
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateEmails = () => {
    const newErrors: { [key: number]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const uniqueEmails = new Set<string>();
    let hasValidEmail = false;

    emails.forEach((email, index) => {
      const trimmed = email.trim();
      if (trimmed) {
        if (!emailRegex.test(trimmed)) {
          newErrors[index] = "Invalid email format";
        } else if (uniqueEmails.has(trimmed.toLowerCase())) {
          newErrors[index] = "Duplicate email";
        } else {
          uniqueEmails.add(trimmed.toLowerCase());
          hasValidEmail = true;
        }
      }
    });

    setErrors(newErrors);

    if (!hasValidEmail) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email",
        variant: "destructive",
      });
      return false;
    }

    return Object.keys(newErrors).length === 0;
  };

  const sendInvitations = async () => {
    if (!validateEmails()) return;

    setSending(true);
    const validEmails = emails.filter((email) => email.trim());
    let successCount = 0;
    let failedEmails: string[] = [];

    for (const email of validEmails) {
      try {
        const response = await fetch("/api/referrals/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            productType: "calliq",
          }),
        });

        if (response.ok) {
          successCount++;

          // Send email with custom message
          // Note: In a real implementation, you might want to handle email sending
          // on the backend for better security and reliability
          const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
          const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
            "You're invited to try CallIQ!"
          )}&body=${encodeURIComponent(`${message}\n\nSign up here: ${referralLink}`)}`;

          // Open mailto link in a new window to avoid navigation
          window.open(mailtoLink, "_blank");
        } else {
          const error = await response.json();
          failedEmails.push(`${email}: ${error.error}`);
        }
      } catch (error) {
        failedEmails.push(`${email}: Network error`);
      }
    }

    setSending(false);

    if (successCount > 0) {
      toast({
        title: "Success!",
        description: `Sent ${successCount} invitation${successCount !== 1 ? "s" : ""}`,
      });
      onSuccess();
    }

    if (failedEmails.length > 0) {
      toast({
        title: "Some invitations failed",
        description: failedEmails.join(", "),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Send referral invitations to your friends and colleagues
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Fields */}
          <div className="space-y-2">
            <Label>Email Addresses</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    className={errors[index] ? "border-red-500" : ""}
                  />
                  {errors[index] && (
                    <p className="text-xs text-red-500 mt-1">{errors[index]}</p>
                  )}
                </div>
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </Button>
                )}
              </div>
            ))}

            {emails.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Email
              </Button>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Personal Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
              placeholder="Add a personal message to your invitation..."
            />
            <p className="text-xs text-gray-500">
              Your referral link will be automatically added to the message
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={sendInvitations} disabled={sending}>
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}