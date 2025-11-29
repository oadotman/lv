// =====================================================
// DIRECT UPLOAD HOOK
// Handles direct uploads to Supabase Storage
// Zero memory usage on our server - production ready
// =====================================================

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadMetadata {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  salesRep?: string;
  callDate?: string;
  callType?: string;
  participants?: any[];
}

export interface UploadResult {
  success: boolean;
  call?: any;
  error?: string;
}

export function useDirectUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    metadata: UploadMetadata = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Step 1: Get presigned upload URL from our API
      console.log('📋 Requesting presigned upload URL...');

      const urlResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, token, path, metadata: uploadMetadata } = await urlResponse.json();

      console.log('✅ Presigned URL received');

      // Step 2: Upload directly to Supabase Storage using signed URL
      console.log('📤 Uploading file to Supabase Storage...');

      // Create Supabase browser client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Use Supabase's uploadToSignedUrl method
      // Note: This doesn't support progress tracking, so we'll simulate it
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newPercentage = Math.min(prev.percentage + 2, 95); // Cap at 95% until complete
          const progressData = {
            loaded: Math.round((file.size * newPercentage) / 100),
            total: file.size,
            percentage: newPercentage,
          };

          if (onProgress && newPercentage !== prev.percentage) {
            onProgress(progressData);
          }

          return progressData;
        });
      }, 200); // Update every 200ms

      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('call-audio')
          .uploadToSignedUrl(path, token, file);

        clearInterval(progressInterval);

        if (uploadError) {
          throw new Error(uploadError.message || 'Failed to upload file to storage');
        }

        console.log('✅ File uploaded to storage:', uploadData);
      } catch (uploadErr) {
        clearInterval(progressInterval);
        throw uploadErr;
      }

      console.log('✅ File uploaded to storage');

      // Step 3: Notify our API that upload is complete
      console.log('📝 Creating database record...');

      const completeResponse = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          ...metadata,
        }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const result = await completeResponse.json();

      console.log('✅ Upload completed successfully');

      setUploading(false);
      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      return {
        success: true,
        call: result.call,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      console.error('❌ Upload error:', errorMessage);

      setError(errorMessage);
      setUploading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
}
