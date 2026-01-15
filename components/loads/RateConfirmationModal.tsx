"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  Loader2,
  Download,
  Eye,
  Send,
  CheckCircle,
  AlertCircle,
  History,
  Mail,
  Signature,
  Activity,
  Calendar,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface RateConfirmation {
  id: string;
  rate_con_number: string;
  pdf_url: string;
  status: "generated" | "sent" | "viewed" | "signed";
  version: number;
  is_latest: boolean;
  sent_at?: string;
  sent_to_email?: string;
  signed_at?: string;
  signed_by?: string;
  created_at: string;
  // Tracking data
  view_count?: number;
  last_viewed_at?: string;
  download_count?: number;
  last_downloaded_at?: string;
}

interface RateConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  loadId: string;
  loadNumber?: string;
  carrierName?: string;
  carrierEmail?: string;
  carrierRate?: number;
  hasRequiredData: boolean;
}

export function RateConfirmationModal({
  open,
  onClose,
  loadId,
  loadNumber,
  carrierName,
  carrierEmail,
  carrierRate,
  hasRequiredData,
}: RateConfirmationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [rateConfirmations, setRateConfirmations] = useState<RateConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("current");
  const [emailTo, setEmailTo] = useState(carrierEmail || "");
  const [emailMessage, setEmailMessage] = useState("");
  const { toast } = useToast();

  // Fetch rate confirmations when modal opens
  useEffect(() => {
    if (open) {
      fetchRateConfirmations();
    }
  }, [open, loadId]);

  const fetchRateConfirmations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rate-confirmations/generate?load_id=${loadId}`);
      if (response.ok) {
        const data = await response.json();
        setRateConfirmations(data.rate_confirmations || []);
      }
    } catch (error) {
      console.error("Error fetching rate confirmations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasRequiredData) {
      toast({
        title: "Missing Information",
        description: "Please ensure the load has a carrier assigned with a valid rate.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/rate-confirmations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ load_id: loadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          toast({
            title: "Validation Error",
            description: data.details.join(". "),
            variant: "destructive",
          });
        } else {
          throw new Error(data.error || "Failed to generate");
        }
        return;
      }

      // Add to list
      setRateConfirmations((prev) => [data.rate_confirmation, ...prev]);

      toast({
        title: "Rate Confirmation Generated",
        description: `${data.rate_confirmation.rate_con_number} has been created successfully.`,
      });

      // Switch to current tab to show the new rate con
      setSelectedTab("current");
    } catch (error) {
      console.error("Error generating rate confirmation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate rate confirmation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async (rateConfirmation: RateConfirmation) => {
    if (!emailTo) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/rate-confirmations/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate_confirmation_id: rateConfirmation.id,
          to_email: emailTo,
          message: emailMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      // Update local state
      setRateConfirmations((prev) =>
        prev.map((rc) =>
          rc.id === rateConfirmation.id
            ? {
                ...rc,
                status: "sent" as const,
                sent_at: new Date().toISOString(),
                sent_to_email: emailTo,
              }
            : rc
        )
      );

      toast({
        title: "Email Sent",
        description: `Rate confirmation sent to ${emailTo}`,
      });

      // Clear email form
      setEmailMessage("");
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleView = (pdfUrl: string, rateConfirmationId: string) => {
    // Track view
    fetch("/api/rate-confirmations/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rate_confirmation_id: rateConfirmationId,
        action: "view",
      }),
    }).catch(console.error);

    window.open(pdfUrl, "_blank");
  };

  const handleDownload = (pdfUrl: string, rateConNumber: string, rateConfirmationId: string) => {
    // Track download
    fetch("/api/rate-confirmations/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rate_confirmation_id: rateConfirmationId,
        action: "download",
      }),
    }).catch(console.error);

    // Create a link and trigger download
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${rateConNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <FileText className="w-3 h-3 mr-1" />
            Generated
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Mail className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case "viewed":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Eye className="w-3 h-3 mr-1" />
            Viewed
          </Badge>
        );
      case "signed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Signed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const currentRateCon = rateConfirmations.find((rc) => rc.is_latest);
  const historyRateCons = rateConfirmations.filter((rc) => !rc.is_latest);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Confirmation Management</DialogTitle>
          <DialogDescription>
            Generate, send, and track rate confirmations for{" "}
            {loadNumber ? `Load #${loadNumber}` : "this load"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Current Tab */}
          <TabsContent value="current" className="space-y-4">
            {!hasRequiredData ? (
              <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Cannot Generate Rate Confirmation</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please ensure the following requirements are met:
                    </p>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• Load has a carrier assigned</li>
                      <li>• Carrier rate is set</li>
                      <li>• Organization has MC/DOT number configured</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : currentRateCon ? (
              <div className="space-y-4">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{currentRateCon.rate_con_number}</h3>
                        {getStatusBadge(currentRateCon.status)}
                        {currentRateCon.version > 1 && (
                          <Badge variant="outline">v{currentRateCon.version}</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Generated: {formatDate(currentRateCon.created_at)}
                        </div>
                        {currentRateCon.sent_at && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Sent to: {currentRateCon.sent_to_email} on {formatDate(currentRateCon.sent_at)}
                          </div>
                        )}
                        {currentRateCon.signed_at && (
                          <div className="flex items-center gap-2">
                            <Signature className="w-4 h-4" />
                            Signed by: {currentRateCon.signed_by} on {formatDate(currentRateCon.signed_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(currentRateCon.pdf_url, currentRateCon.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(currentRateCon.pdf_url, currentRateCon.rate_con_number, currentRateCon.id)
                        }
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Tracking Stats */}
                  {(currentRateCon.view_count || currentRateCon.download_count) && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                      {currentRateCon.view_count && (
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            Viewed {currentRateCon.view_count} time{currentRateCon.view_count > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {currentRateCon.download_count && (
                        <div className="flex items-center gap-2 text-sm">
                          <Download className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            Downloaded {currentRateCon.download_count} time{currentRateCon.download_count > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating New Version...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate New Version
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4">No rate confirmation generated yet</p>
                <Button onClick={handleGenerate} disabled={isGenerating || !hasRequiredData}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Rate Confirmation
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            {currentRateCon ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    Sending: {currentRateCon.rate_con_number}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Rate: {formatCurrency(carrierRate || 0)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email-to">Recipient Email *</Label>
                    <Input
                      id="email-to"
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder={carrierEmail || "carrier@example.com"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Send to carrier's email address
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email-message">Additional Message (Optional)</Label>
                    <Textarea
                      id="email-message"
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Add any additional notes or instructions for the carrier..."
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={() => handleSendEmail(currentRateCon)}
                    disabled={isSending || !emailTo}
                    className="w-full"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Rate Confirmation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">Generate a rate confirmation first before sending</p>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : rateConfirmations.length > 0 ? (
              <div className="space-y-3">
                {rateConfirmations.map((rc) => (
                  <div
                    key={rc.id}
                    className={`p-4 rounded-lg border ${
                      rc.is_latest ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium">{rc.rate_con_number}</p>
                          {getStatusBadge(rc.status)}
                          {rc.is_latest && (
                            <Badge className="bg-blue-600 text-white">Latest</Badge>
                          )}
                          {rc.version > 1 && (
                            <Badge variant="outline">v{rc.version}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatDate(rc.created_at)}
                          </div>
                          {rc.sent_at && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              Sent: {rc.sent_to_email}
                            </div>
                          )}
                          {rc.signed_at && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3" />
                              Signed: {rc.signed_by}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(rc.pdf_url, rc.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(rc.pdf_url, rc.rate_con_number, rc.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No rate confirmation history</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}