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
  templateId?: string; // Add templateId to metadata type
  audioDuration?: number; // Duration in seconds
  typedNotes?: string; // Add typed notes to metadata
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
      console.log('Original file info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Fix MIME type for M4A files - browsers report different types
      let mimeType = file.type;

      // Check file extension if MIME type is missing or unusual
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'm4a') {
        // Normalize M4A MIME types to what the server expects
        if (!mimeType || mimeType === 'audio/m4a' || mimeType === 'audio/mp4a' || mimeType === 'audio/mp4a-latm') {
          mimeType = 'audio/x-m4a';
        }
      }

      // For empty MIME types, try to detect from extension
      if (!mimeType && fileExtension) {
        const extensionToMimeMap: Record<string, string> = {
          'mp3': 'audio/mpeg',
          'mp4': 'audio/mp4',
          'm4a': 'audio/x-m4a',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'flac': 'audio/flac',
          'webm': 'audio/webm',
        };
        mimeType = extensionToMimeMap[fileExtension] || '';
      }

      console.log('Normalized MIME type for upload:', mimeType);

      const urlResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: mimeType,
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
        // Get the normalized content type from the presigned URL response
        const contentType = uploadMetadata.contentType;

        // For M4A files, we need to upload directly via HTTP to bypass Supabase SDK validation
        if (file.name.toLowerCase().endsWith('.m4a')) {
          console.log('📝 Using direct HTTP upload for M4A file with normalized MIME type');

          // Create FormData for the upload
          const formData = new FormData();

          // Create a new File object with the correct MIME type
          const normalizedFile = new File([file], file.name, { type: contentType });
          formData.append('', normalizedFile);

          // Upload directly using fetch
          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: normalizedFile,
            headers: {
              'Content-Type': contentType,
              'x-upsert': 'false',
            },
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }

          console.log('✅ M4A file uploaded successfully via direct HTTP');
        } else {
          // For non-M4A files, use the standard Supabase SDK method
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('call-audio')
            .uploadToSignedUrl(path, token, file, {
              contentType: contentType,
            });

          if (uploadError) {
            throw new Error(uploadError.message || 'Failed to upload file to storage');
          }

          console.log('✅ File uploaded to storage:', uploadData);
        }

        clearInterval(progressInterval);
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
          mimeType: mimeType,  // Use the normalized MIME type
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
