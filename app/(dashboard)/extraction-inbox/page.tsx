'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Inbox,
  Upload,
  FileAudio,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
  Play,
  Pause,
  RotateCw,
  Zap,
  Flag,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExtractionReview } from '@/components/extraction/ExtractionReview';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import type { ExtractedFreightData } from '@/lib/extraction/freightExtraction';

type ExtractionStatus = 'queued' | 'processing' | 'ready' | 'saved' | 'failed' | 'flagged';

interface ExtractionItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: ExtractionStatus;
  progress?: number;
  callType?: 'shipper_call' | 'carrier_call' | 'check_call';
  duration?: number;
  extraction?: Partial<ExtractedFreightData>;
  error?: string;
  confidence?: number;
  flaggedReason?: string;
}

// Mock data
const mockExtractions: ExtractionItem[] = [
  {
    id: 'ext-001',
    fileName: 'shipper-abc-manufacturing.mp3',
    fileSize: 2.4 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:30:00Z',
    status: 'ready',
    callType: 'shipper_call',
    duration: 245,
    confidence: 92,
    extraction: {
      load_number: 'ABC-2847',
      pickup_location: 'Dallas, TX',
      delivery_location: 'Phoenix, AZ',
      pickup_date: '2024-01-24',
      delivery_date: '2024-01-26',
      commodity: 'Manufacturing Equipment',
      weight: 42000,
      equipment_type: 'Flatbed',
      rate: 3200,
      total_miles: 1065,
      notes: 'ABC Manufacturing needs flatbed from Dallas to Phoenix',
    },
  },
  {
    id: 'ext-002',
    fileName: 'carrier-knight-transport.m4a',
    fileSize: 1.8 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:25:00Z',
    status: 'processing',
    progress: 65,
    callType: 'carrier_call',
    duration: 180,
  },
  {
    id: 'ext-003',
    fileName: 'check-call-load-2847.wav',
    fileSize: 3.1 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:20:00Z',
    status: 'saved',
    callType: 'check_call',
    duration: 120,
    confidence: 88,
  },
  {
    id: 'ext-004',
    fileName: 'shipper-xyz-logistics.mp3',
    fileSize: 2.7 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:15:00Z',
    status: 'failed',
    error: 'Audio quality too poor for transcription',
    duration: 195,
  },
  {
    id: 'ext-005',
    fileName: 'carrier-swift-quote.webm',
    fileSize: 1.5 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:10:00Z',
    status: 'flagged',
    flaggedReason: 'Conflicting rate information',
    callType: 'carrier_call',
    duration: 156,
    confidence: 68,
  },
  {
    id: 'ext-006',
    fileName: 'shipper-morning-calls.mp3',
    fileSize: 4.2 * 1024 * 1024,
    uploadedAt: '2024-01-22T10:05:00Z',
    status: 'queued',
    callType: 'shipper_call',
    duration: 320,
  },
];

export default function ExtractionInboxPage() {
  const [extractions, setExtractions] = useState<ExtractionItem[]>(mockExtractions);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<ExtractionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedExtraction, setSelectedExtraction] = useState<ExtractionItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Filter extractions
  const filteredExtractions = extractions.filter(ext =>
    filterStatus === 'all' || ext.status === filterStatus
  );

  // Sort extractions
  const sortedExtractions = [...filteredExtractions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      case 'name':
        return a.fileName.localeCompare(b.fileName);
      case 'size':
        return b.fileSize - a.fileSize;
      default:
        return 0;
    }
  });

  // Status counts
  const statusCounts = extractions.reduce((acc, ext) => {
    acc[ext.status] = (acc[ext.status] || 0) + 1;
    return acc;
  }, {} as Record<ExtractionStatus, number>);

  const handleSelectAll = () => {
    if (selectedItems.length === sortedExtractions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(sortedExtractions.map(ext => ext.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = (action: 'process' | 'delete' | 'retry') => {
    switch (action) {
      case 'process':
        toast({
          title: 'Processing Started',
          description: `Processing ${selectedItems.length} items`,
        });
        break;
      case 'delete':
        setExtractions(prev => prev.filter(ext => !selectedItems.includes(ext.id)));
        toast({
          title: 'Items Deleted',
          description: `Deleted ${selectedItems.length} items`,
        });
        setSelectedItems([]);
        break;
      case 'retry':
        toast({
          title: 'Retry Started',
          description: `Retrying ${selectedItems.length} failed items`,
        });
        break;
    }
  };

  const handleReview = (extraction: ExtractionItem) => {
    setSelectedExtraction(extraction);
    setReviewDialogOpen(true);
  };

  const handleSaveExtraction = async (data: Partial<ExtractedFreightData>) => {
    // In production, this would save to the database
    if (selectedExtraction) {
      setExtractions(prev => prev.map(ext =>
        ext.id === selectedExtraction.id
          ? { ...ext, status: 'saved' as ExtractionStatus, extraction: data }
          : ext
      ));
    }
    setReviewDialogOpen(false);
  };

  const getStatusIcon = (status: ExtractionStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'flagged':
        return <Flag className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ExtractionStatus) => {
    const variants: Record<ExtractionStatus, any> = {
      queued: 'outline',
      processing: 'default',
      ready: 'default',
      saved: 'secondary',
      failed: 'destructive',
      flagged: 'secondary',
    };

    const colors: Record<ExtractionStatus, string> = {
      queued: '',
      processing: 'bg-blue-500',
      ready: 'bg-green-500',
      saved: 'bg-gray-500',
      failed: 'bg-red-500',
      flagged: 'bg-yellow-500',
    };

    return (
      <Badge
        variant={variants[status]}
        className={colors[status] ? colors[status] : ''}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-8 w-8" />
            Extraction Inbox
          </h1>
          <p className="text-muted-foreground">
            Review and process your uploaded call recordings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/extraction/new">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.queued || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts.processing || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.ready || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.saved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.failed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statusCounts.flagged || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Upload Date</SelectItem>
                  <SelectItem value="name">File Name</SelectItem>
                  <SelectItem value="size">File Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('process')}
                >
                  Process
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('retry')}
                >
                  Retry
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Extractions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === sortedExtractions.length && sortedExtractions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExtractions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No extractions found
                  </TableCell>
                </TableRow>
              ) : (
                sortedExtractions.map((extraction) => (
                  <TableRow key={extraction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(extraction.id)}
                        onCheckedChange={() => handleSelectItem(extraction.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(extraction.status)}
                        {getStatusBadge(extraction.status)}
                      </div>
                      {extraction.status === 'processing' && extraction.progress && (
                        <Progress value={extraction.progress} className="h-1 mt-2 w-20" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{extraction.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(extraction.fileSize)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {extraction.callType && (
                        <Badge variant="outline">
                          {extraction.callType.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {extraction.duration && formatDuration(extraction.duration)}
                    </TableCell>
                    <TableCell>
                      {extraction.confidence && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{extraction.confidence}%</span>
                          {extraction.confidence < 70 && (
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(extraction.uploadedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {extraction.status === 'ready' && (
                            <>
                              <DropdownMenuItem onClick={() => handleReview(extraction)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Review & Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Save to Loads
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {extraction.status === 'failed' && (
                            <DropdownMenuItem>
                              <RotateCw className="mr-2 h-4 w-4" />
                              Retry Processing
                            </DropdownMenuItem>
                          )}
                          {extraction.status === 'queued' && (
                            <DropdownMenuItem>
                              <Zap className="mr-2 h-4 w-4" />
                              Process Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <FileAudio className="mr-2 h-4 w-4" />
                            Play Audio
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Extraction</DialogTitle>
            <DialogDescription>
              {selectedExtraction?.fileName}
            </DialogDescription>
          </DialogHeader>
          {selectedExtraction?.extraction && (
            <ExtractionReview
              extraction={selectedExtraction.extraction}
              onSave={handleSaveExtraction}
              confidence={selectedExtraction.confidence}
              callId={selectedExtraction.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}