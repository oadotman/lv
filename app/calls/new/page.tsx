'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileAudio, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
  'video/mp4', // Some recordings come as video
];

export default function NewCallPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError('');

    // Validate file type
    if (!ACCEPTED_AUDIO_TYPES.includes(selectedFile.type) &&
        !selectedFile.name.match(/\.(mp3|wav|m4a|ogg|flac|webm|mp4)$/i)) {
      setError('Please upload a valid audio file (MP3, WAV, M4A, OGG, FLAC, or WebM)');
      return;
    }

    // Validate file size (max 500MB)
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/calls/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Navigate to the call detail page
      router.push(`/calls/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload call');
      setUploading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/calls">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Upload New Call</h1>
        <p className="text-gray-600 mt-2">
          Upload a call recording to automatically transcribe and extract freight information
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Call Recording</CardTitle>
          <CardDescription>
            Upload your call recording in MP3, WAV, M4A, OGG, FLAC, or WebM format (max 500MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${file ? 'bg-gray-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="audio/*,video/mp4"
              onChange={handleChange}
              disabled={uploading}
            />

            {file ? (
              <div className="space-y-4">
                <FileAudio className="h-12 w-12 mx-auto text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                  <label htmlFor="file-upload">
                    <span
                      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Change File
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >
                    <span className="text-purple-600 hover:text-purple-700 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    MP3, WAV, M4A, OGG, FLAC, or WebM up to 500MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {file && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Info Box */}
          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens next:</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside text-sm">
                <li>Your call will be transcribed using AI</li>
                <li>Freight details will be automatically extracted</li>
                <li>Carrier and shipper information will be identified</li>
                <li>You can review and correct any extracted data</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}