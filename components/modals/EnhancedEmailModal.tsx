// =====================================================
// ENHANCED EMAIL GENERATION MODAL
// 10/10 Email functionality with templates & suggestions
// =====================================================

"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Mail,
  Sparkles,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Clock,
  RotateCw,
  Save,
  History,
  ChevronRight,
  Star,
  Zap,
  Target,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  emailTemplates,
  getSmartTemplateSuggestions,
  generateSubjectLine,
  type EmailTemplate
} from "@/lib/email-templates";
import { cn } from "@/lib/utils";

interface EnhancedEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  customerName: string | null;
  callData?: {
    sentiment?: string;
    outcome?: string;
    fields?: any[];
    insights?: any[];
  };
}

interface GeneratedEmail {
  id: string;
  subject: string;
  body: string;
  tone: 'professional' | 'friendly' | 'formal';
  timestamp: Date;
}

export function EnhancedEmailModal({
  isOpen,
  onClose,
  callId,
  customerName,
  callData,
}: EnhancedEmailModalProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailHistory, setEmailHistory] = useState<GeneratedEmail[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const { toast } = useToast();

  // Get smart suggestions based on call data
  const smartSuggestions = getSmartTemplateSuggestions({
    sentiment: callData?.sentiment,
    outcome: callData?.outcome,
    hasObjections: callData?.insights?.some(i => i.insight_type === 'objection'),
    hasBudgetDiscussion: callData?.fields?.some(f => f.field_name === 'budget'),
    hasNextSteps: callData?.fields?.some(f => f.field_name === 'next_steps'),
    hasCompetitors: callData?.insights?.some(i => i.insight_type === 'competitor'),
    isFirstCall: true, // You might determine this from call history
    dealStage: callData?.fields?.find(f => f.field_name === 'deal_stage')?.field_value,
  });

  // Load email history from localStorage
  useEffect(() => {
    const history = localStorage.getItem(`email_history_${callId}`);
    if (history) {
      setEmailHistory(JSON.parse(history));
    }
  }, [callId]);

  // Save to history
  const saveToHistory = (email: GeneratedEmail) => {
    const updatedHistory = [email, ...emailHistory].slice(0, 10); // Keep last 10
    setEmailHistory(updatedHistory);
    localStorage.setItem(`email_history_${callId}`, JSON.stringify(updatedHistory));
  };

  // Generate multiple email variations
  const handleGenerate = async (variations: number = 1) => {
    const prompt = selectedTemplate
      ? `${selectedTemplate.prompt}\n\nAdditional instructions: ${customPrompt}`
      : customPrompt;

    if (!prompt.trim()) {
      toast({
        title: "Please select a template or provide instructions",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate multiple variations
      const emailPromises = Array(variations).fill(null).map(async (_, index) => {
        const toneMap = ['professional', 'friendly', 'formal'];
        const tone = toneMap[index] || 'professional';

        const response = await fetch(`/api/calls/${callId}/generate-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${prompt}\n\nTone: ${tone}`,
            templateId: selectedTemplate?.id,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            const data = await response.json();
            throw new Error(`Rate limit: ${data.message}`);
          }
          throw new Error("Failed to generate email");
        }

        const data = await response.json();

        // Generate subject line
        const subject = selectedTemplate
          ? generateSubjectLine(selectedTemplate, {
              customerName,
              companyName: callData?.fields?.find(f => f.field_name === 'company')?.field_value,
              date: new Date().toLocaleDateString(),
              mainTopic: callData?.fields?.find(f => f.field_name === 'summary')?.field_value,
            })
          : `Follow-up: Our conversation on ${new Date().toLocaleDateString()}`;

        return {
          id: `email_${Date.now()}_${index}`,
          subject,
          body: data.email,
          tone: tone as 'professional' | 'friendly' | 'formal',
          timestamp: new Date(),
        };
      });

      const emails = await Promise.all(emailPromises);
      setGeneratedEmails(emails);

      // Select first one by default
      if (emails.length > 0) {
        setSelectedEmailId(emails[0].id);
        setEditedSubject(emails[0].subject);
        setEditedBody(emails[0].body);

        // Save to history
        emails.forEach(saveToHistory);
      }

      toast({
        title: "Emails generated successfully",
        description: `Generated ${emails.length} variation${emails.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error("Email generation error:", error);
      toast({
        title: "Failed to generate email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy email to clipboard
  const handleCopy = async (includeSubject: boolean = true) => {
    const textToCopy = includeSubject
      ? `Subject: ${editedSubject}\n\n${editedBody}`
      : editedBody;

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to clipboard",
        description: includeSubject ? "Subject and body copied" : "Email body copied",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  // Select email variation
  const selectEmail = (email: GeneratedEmail) => {
    setSelectedEmailId(email.id);
    setEditedSubject(email.subject);
    setEditedBody(email.body);
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'follow-up': return '📬';
      case 'proposal': return '📄';
      case 'meeting': return '📅';
      case 'clarification': return '❓';
      case 'thank-you': return '🙏';
      case 'next-steps': return '🚀';
      default: return '📧';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Enhanced Email Generator
            <Badge variant="secondary">10/10 Experience</Badge>
          </DialogTitle>
          <DialogDescription>
            Create personalized follow-up emails with AI-powered templates and smart suggestions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="flex-1 overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" disabled={generatedEmails.length === 0}>
              <Mail className="w-4 h-4" />
              Preview ({generatedEmails.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 overflow-hidden">
            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Smart Suggestions for This Call
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {smartSuggestions.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedTemplate?.id === template.id && "ring-2 ring-blue-600"
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{template.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.whenToUse}
                            </p>
                            <Badge className="mt-2" variant="secondary">
                              <Star className="w-3 h-3 mr-1" />
                              Recommended
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Templates */}
            <div className="space-y-2">
              <Label>All Email Templates</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-4">
                  {['follow-up', 'proposal', 'meeting', 'clarification', 'thank-you', 'next-steps'].map(category => (
                    <div key={category}>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        {emailTemplates
                          .filter(t => t.category === category)
                          .map((template) => (
                            <Button
                              key={template.id}
                              variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <span className="mr-2">{template.icon}</span>
                              {template.name}
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">Selected: {selectedTemplate.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTemplate.whenToUse}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            {/* Custom Instructions */}
            <div>
              <Label htmlFor="custom-prompt">
                Additional Instructions (Optional)
              </Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific details or customization you want in the email..."
                className="mt-2 min-h-[100px]"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {selectedTemplate
                  ? `Using template: ${selectedTemplate.name}. Add any specific customization here.`
                  : "Select a template or provide custom instructions for your email."}
              </p>
            </div>

            {/* Generation Options */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerate(1)}
                disabled={isGenerating || (!selectedTemplate && !customPrompt)}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleGenerate(3)}
                disabled={isGenerating || (!selectedTemplate && !customPrompt)}
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                Generate 3 Variations
              </Button>
            </div>

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Pro Tips
                </p>
                <ul className="text-xs mt-2 space-y-1 ml-6">
                  <li>• Generate multiple variations to find the perfect tone</li>
                  <li>• Combine templates with custom instructions for best results</li>
                  <li>• Edit the generated email before copying</li>
                  <li>• Save frequently used customizations for future use</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4 overflow-hidden">
            {generatedEmails.length > 0 && (
              <>
                {/* Email Variations */}
                {generatedEmails.length > 1 && (
                  <div className="flex gap-2">
                    {generatedEmails.map((email, index) => (
                      <Button
                        key={email.id}
                        variant={selectedEmailId === email.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => selectEmail(email)}
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        {email.tone.charAt(0).toUpperCase() + email.tone.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Subject Line */}
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="mt-2 min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => handleCopy(true)} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy with Subject
                  </Button>
                  <Button onClick={() => handleCopy(false)} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Body Only
                  </Button>
                  <Button
                    onClick={() => handleGenerate(1)}
                    variant="outline"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {emailHistory.length > 0 ? (
                <div className="space-y-2">
                  {emailHistory.map((email) => (
                    <Card
                      key={email.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setEditedSubject(email.subject);
                        setEditedBody(email.body);
                        toast({
                          title: "Email loaded from history",
                          description: "You can now edit and copy it",
                        });
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{email.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(email.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No email history yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Rate Limit Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
          <strong>Rate Limit:</strong> 10 emails per hour • Quality over quantity
        </div>
      </DialogContent>
    </Dialog>
  );
}