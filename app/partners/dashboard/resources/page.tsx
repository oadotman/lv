// =====================================================
// PARTNER MARKETING RESOURCES PAGE
// Download marketing materials and templates
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Mail,
  Share2,
  Video,
  Image,
  Copy,
  ExternalLink,
  CheckCircle,
  Twitter,
  Linkedin,
  MessageSquare,
  Globe,
  Sparkles
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Resource {
  id: string;
  resource_type: 'email_template' | 'social_post' | 'document' | 'video' | 'image' | 'other';
  title: string;
  description: string;
  content?: string;
  file_url?: string;
  file_size?: number;
  category?: string;
  download_count: number;
  is_featured?: boolean;
}

interface ResourcesData {
  resources: Resource[];
  referral_link: string;
  referral_code: string;
  partner_name: string;
}

export default function ResourcesPage() {
  const [data, setData] = useState<ResourcesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('emails');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/partners/resources');
      if (!response.ok) throw new Error('Failed to fetch resources');
      const resourcesData = await response.json();
      setData(resourcesData);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketing resources',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      if (resource.file_url) {
        // Track download
        await fetch(`/api/partners/resources/${resource.id}/download`, {
          method: 'POST',
        });

        // Download file
        window.open(resource.file_url, '_blank');
      }

      toast({
        title: 'Downloaded',
        description: `${resource.title} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download resource',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    // Replace placeholders with actual values
    const personalizedText = text
      .replace(/\[YOUR REFERRAL LINK\]/g, data?.referral_link || '')
      .replace(/\[YOUR LINK\]/g, data?.referral_link || '')
      .replace(/\[Partner Name\]/g, data?.partner_name || '')
      .replace(/\[Your Name\]/g, data?.partner_name || '');

    navigator.clipboard.writeText(personalizedText);

    setCopiedItems(new Set([...copiedItems, id]));
    setTimeout(() => {
      setCopiedItems(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);

    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard',
    });
  };

  const getResourceIcon = (type: string) => {
    const icons = {
      email_template: Mail,
      social_post: Share2,
      document: FileText,
      video: Video,
      image: Image,
      other: FileText,
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>Failed to load resources. Please try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const emailTemplates = data.resources.filter(r => r.resource_type === 'email_template');
  const socialPosts = data.resources.filter(r => r.resource_type === 'social_post');
  const documents = data.resources.filter(r => ['document', 'video', 'image'].includes(r.resource_type));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marketing Resources</h1>
        <p className="text-gray-600 mt-1">
          Everything you need to promote LoadVoice to your clients
        </p>
      </div>

      {/* Quick Links Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <CardHeader>
          <CardTitle>Your Referral Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Referral Link:</span>
            <code className="flex-1 px-2 py-1 bg-white rounded text-sm">{data.referral_link}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(data.referral_link, 'link')}
            >
              {copiedItems.has('link') ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Partner Code:</span>
            <code className="flex-1 px-2 py-1 bg-white rounded text-sm">{data.referral_code.toUpperCase()}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(data.referral_code.toUpperCase(), 'code')}
            >
              {copiedItems.has('code') ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resources Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Pre-written emails you can customize and send to your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailTemplates.length > 0 ? (
                <div className="space-y-4">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">{template.title}</h3>
                          {template.is_featured && (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(template.content || '', template.id)}
                        >
                          {copiedItems.has(template.id) ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      {template.content && (
                        <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{template.content}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No email templates available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Posts</CardTitle>
              <CardDescription>
                Ready-to-post content for social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                {/* Quick Share Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    asChild
                  >
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out LoadVoice - AI-powered CRM automation!')}&url=${encodeURIComponent(data.referral_link)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    asChild
                  >
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referral_link)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    asChild
                  >
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.referral_link)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Facebook
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    asChild
                  >
                    <a
                      href={`mailto:?subject=${encodeURIComponent('Check out LoadVoice')}&body=${encodeURIComponent(`I've been using LoadVoice for call recording and transcription. Check it out: ${data.referral_link}`)}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                </div>

                {/* Social Post Templates */}
                {socialPosts.length > 0 ? (
                  <div className="space-y-4">
                    {socialPosts.map((post) => (
                      <div key={post.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold">{post.title}</h3>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(post.content || '', post.id)}
                          >
                            {copiedItems.has(post.id) ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{post.description}</p>
                        {post.content && (
                          <div className="bg-gray-50 rounded p-3 text-sm">
                            {post.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Share2 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No social posts available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Materials</CardTitle>
              <CardDescription>
                Documents, videos, and images to help you sell
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => {
                    const Icon = getResourceIcon(doc.resource_type);
                    return (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{doc.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                            {doc.file_size && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(doc.file_size)}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              {doc.file_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No materials available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Talking Points */}
          <Card>
            <CardHeader>
              <CardTitle>Key Talking Points</CardTitle>
              <CardDescription>
                Use these points when discussing LoadVoice with clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Saves 15-20 hours per week across a sales team</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>CRM completion rates go from 65% to 95%+</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Works with Salesforce, HubSpot, Pipedrive - no integration needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>5-minute setup, no IT involvement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>AI extracts all key details: pain points, budget, timeline, next steps</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>60-second CRM update instead of 20 minutes</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}