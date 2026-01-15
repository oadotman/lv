// =====================================================
// CRM OUTPUT PREVIEW COMPONENT
// Clean, formatted output display with copy functionality
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Check,
  FileText,
  Download,
  Mail,
  Building2,
  Table,
  Briefcase
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCRMOutput } from '@/lib/output-formatters';

interface CRMOutputPreviewProps {
  callData: {
    call: any;
    fields: any[];
    insights: any[];
  };
  customTemplates?: any[];
}

export const CRMOutputPreview: React.FC<CRMOutputPreviewProps> = ({
  callData,
  customTemplates = []
}) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (format: string) => {
    const output = formatCRMOutput(callData, format);

    try {
      await navigator.clipboard.writeText(output);
      setCopiedTab(format);
      toast({
        title: "Copied to clipboard!",
        description: `${format} format copied successfully`,
        duration: 2000,
      });

      setTimeout(() => setCopiedTab(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying manually",
        variant: "destructive",
      });
    }
  };

  const crmFormats = [
    { id: 'plain', label: 'Plain Text', icon: FileText, color: 'bg-gray-500' },
    { id: 'hubspot', label: 'HubSpot', icon: Building2, color: 'bg-orange-500' },
    { id: 'salesforce', label: 'Salesforce', icon: Building2, color: 'bg-blue-500' },
    { id: 'pipedrive', label: 'Pipedrive', icon: Briefcase, color: 'bg-green-500' },
    { id: 'monday', label: 'Monday', icon: Table, color: 'bg-pink-500' },
    { id: 'zoho', label: 'Zoho', icon: Building2, color: 'bg-red-500' },
    { id: 'csv', label: 'CSV/Excel', icon: Table, color: 'bg-emerald-500' },
    { id: 'email', label: 'Email', icon: Mail, color: 'bg-sky-500' },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            CRM-Ready Output
          </span>
          <Badge variant="outline" className="text-xs">
            Copy & Paste Ready
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plain" className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
            {crmFormats.map((format) => {
              const Icon = format.icon;
              return (
                <TabsTrigger
                  key={format.id}
                  value={format.id}
                  className="flex flex-col gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{format.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {crmFormats.map((format) => (
            <TabsContent key={format.id} value={format.id} className="mt-4">
              <div className="space-y-4">
                {/* Format Header */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${format.color}`} />
                    <span className="font-medium">{format.label} Format</span>
                    <Badge variant="secondary" className="text-xs">
                      Optimized for {format.label}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(format.id)}
                    className="gap-2"
                    variant={copiedTab === format.id ? "default" : "outline"}
                  >
                    {copiedTab === format.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* Output Preview */}
                <div className="relative">
                  <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words">
                    {formatCRMOutput(callData, format.id)}
                  </pre>

                  {/* Copy overlay button */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                    onClick={() => handleCopy(format.id)}
                  >
                    {copiedTab === format.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Format Tips */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>Tip:</strong>
                    {format.id === 'plain' && ' This format works with any CRM system.'}
                    {format.id === 'hubspot' && ' Paste directly into HubSpot deal properties.'}
                    {format.id === 'salesforce' && ' Maps to standard Salesforce opportunity fields.'}
                    {format.id === 'pipedrive' && ' Ready for Pipedrive deal creation.'}
                    {format.id === 'monday' && ' Formatted for Monday.com boards.'}
                    {format.id === 'zoho' && ' Compatible with Zoho CRM fields.'}
                    {format.id === 'csv' && ' Import into Excel or Google Sheets.'}
                    {format.id === 'email' && ' Use as a follow-up email template.'}
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}

          {/* Custom Templates */}
          {customTemplates.map((template) => (
            <TabsContent key={`template_${template.id}`} value={`template_${template.id}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-sky-600">Custom Template</Badge>
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(`template_${template.id}`)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>

                <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {/* Template output will be generated here */}
                  Custom template output for {template.name}
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export All Formats
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="w-4 h-4" />
            Email to Team
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};