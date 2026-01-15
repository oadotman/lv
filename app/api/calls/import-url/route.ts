// =====================================================
// CALL URL IMPORT API ROUTE
// Handles downloading audio from URLs (Zoom, Drive, etc.)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { validateUploadedFile, generateSecureFileName, sanitizeFileName } from '@/lib/security/file-validation';
import { getUsageStatus } from '@/lib/simple-usage';
import { uploadRateLimiter } from '@/lib/rateLimit';
import { validateDownloadUrl, safeFetch, convertToDirectDownloadUrl } from '@/lib/security/url-validation';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for download + upload

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Supported audio MIME types
const SUPPORTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp3',
  'video/mp4', // Sometimes recordings are video with audio
];

function getFileExtensionFromContentType(contentType: string): string {
  const mapping: { [key: string]: string } = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'video/mp4': 'mp4',
  };

  return mapping[contentType] || 'audio';
}

function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];

    // If last segment has an extension, use it
    if (lastSegment && lastSegment.includes('.')) {
      return lastSegment;
    }

    return 'imported_recording';
  } catch {
    return 'imported_recording';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Apply rate limiting
    try {
      await uploadRateLimiter.check(userId);
    } catch (rateLimitError: any) {
      console.warn(`Upload rate limit exceeded for user: ${userId}`);
      return NextResponse.json(
        { error: rateLimitError.message },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          }
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      recordingUrl,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      salesRep,
      callDate,
      callType,
      participants
    } = body;

    if (!recordingUrl || typeof recordingUrl !== 'string') {
      return NextResponse.json(
        { error: 'Recording URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(recordingUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check for supported platforms (informational - we'll try to download anyway)
    const hostname = url.hostname.toLowerCase();
    let platform = 'unknown';
    if (hostname.includes('zoom.us')) {
      platform = 'zoom';
    } else if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      platform = 'google_drive';
    } else if (hostname.includes('dropbox.com')) {
      platform = 'dropbox';
    } else if (hostname.includes('onedrive') || hostname.includes('sharepoint')) {
      platform = 'microsoft';
    }

    console.log('Importing recording from URL:', {
      url: recordingUrl,
      platform,
      hostname,
    });

    // Convert platform-specific URLs to direct download URLs
    const downloadUrl = convertToDirectDownloadUrl(recordingUrl);

    if (downloadUrl !== recordingUrl) {
      console.log('Converted URL to direct download link:', {
        original: recordingUrl,
        converted: downloadUrl,
      });
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Check usage limits
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = userOrg?.organization_id || null;

    if (organizationId) {
      // Get simple usage status
      const usage = await getUsageStatus(organizationId, supabase as any);

      // With simple system, we allow imports even in overage (pay as you go)
      // Just log if they're in overage
      if (usage.status === 'overage') {
        console.log('User importing URL in overage:', {
          organizationId,
          minutesUsed: usage.minutesUsed,
          minutesLimit: usage.minutesLimit,
          overageMinutes: usage.overageMinutes,
          overageCharge: usage.overageCharge,
          url: recordingUrl,
        });
      }

      // Optional: Enforce a hard limit if desired
      /*
      const MAX_OVERAGE_MINUTES = 1000;
      if (usage.overageMinutes > MAX_OVERAGE_MINUTES) {
        return NextResponse.json(
          {
            error: 'Maximum overage limit exceeded',
            details: {
              used: usage.minutesUsed,
              limit: usage.minutesLimit,
              overageMinutes: usage.overageMinutes,
              message: 'Please upgrade your plan to continue.',
            },
          },
          { status: 402 }
        );
      }
      */
    }

    // Step 1: Validate URL for SSRF protection
    console.log('Validating URL...');
    const urlValidation = validateDownloadUrl(downloadUrl);

    if (!urlValidation.valid) {
      console.error('URL validation failed:', urlValidation.error);
      return NextResponse.json(
        {
          error: 'Invalid URL',
          details: urlValidation.error,
        },
        { status: 400 }
      );
    }

    // Step 2: Download the file from URL with SSRF protection
    console.log('Downloading file from URL...');

    let downloadResponse: Response;
    try {
      // Use safeFetch which validates all redirects for SSRF protection
      downloadResponse = await safeFetch(downloadUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'LoadVoice/1.0',
        },
        redirect: 'follow', // safeFetch will validate each redirect
      });

      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      return NextResponse.json(
        {
          error: 'Failed to download recording from URL. Please ensure the URL is publicly accessible.',
          details: process.env.NODE_ENV === 'development'
            ? (error instanceof Error ? error.message : 'Unknown error')
            : 'Unable to access the provided URL'
        },
        { status: 400 }
      );
    }

    // Get content type and validate
    const contentType = downloadResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = downloadResponse.headers.get('content-length');

    console.log('Download headers:', {
      contentType,
      contentLength,
    });

    // Check file size before downloading
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds 500MB limit. Size: ${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400 }
      );
    }

    // Validate content type
    const isSupported = SUPPORTED_MIME_TYPES.some(type => contentType.includes(type));
    if (!isSupported && !contentType.includes('octet-stream')) {
      // Check if it's HTML (likely a sharing page, not a direct link)
      if (contentType.includes('text/html')) {
        let helpMessage = 'The URL appears to be a web page, not a direct media file link.';

        if (platform === 'zoom') {
          helpMessage += ' For Zoom: Go to your Zoom recordings, click the "More" menu (...), select "Download", and use the download link.';
        } else if (platform === 'google_drive') {
          helpMessage += ' For Google Drive: Right-click the file, select "Get link", ensure it\'s set to "Anyone with the link can view", then use that link.';
        } else if (hostname.includes('loom.com')) {
          helpMessage += ' For Loom: Click "Share", then "Download" to get the video file, then upload it directly to LoadVoice.';
        } else {
          helpMessage += ' Please ensure you\'re using a direct download link to the audio/video file, not a sharing page URL.';
        }

        return NextResponse.json(
          {
            error: helpMessage,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: `Unsupported file type: ${contentType}. Please use audio or video files.`,
        },
        { status: 400 }
      );
    }

    // Download the file
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSize = buffer.byteLength;

    console.log('File downloaded:', {
      size: fileSize,
      sizeMB: (fileSize / 1024 / 1024).toFixed(2),
    });

    // Generate filename for validation
    const originalFilename = extractFilenameFromUrl(recordingUrl);
    const extension = getFileExtensionFromContentType(contentType);

    // Advanced validation with magic number verification
    const validation = await validateUploadedFile(buffer, {
      fileName: originalFilename,
      mimeType: contentType,
      size: fileSize
    });

    if (!validation.valid) {
      console.warn('Downloaded file validation failed:', {
        url: recordingUrl,
        errors: validation.errors,
        detectedType: validation.detectedType
      });

      return NextResponse.json(
        {
          error: 'Downloaded file validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    console.log('File validation successful:', {
      fileName: originalFilename,
      detectedType: validation.detectedType,
      sizeMB: validation.sizeMB
    });

    // Generate secure filename
    const sanitizedFilename = sanitizeFileName(originalFilename.replace(/\.[^/.]+$/, ''));
    const fileName = `${userId}/${generateSecureFileName(originalFilename, userId)}`;

    // Normalize MIME type for Supabase Storage compatibility
    // Supabase doesn't accept audio/x-m4a, convert to audio/mp4
    let normalizedContentType = contentType;
    if (contentType === 'audio/x-m4a') {
      normalizedContentType = 'audio/mp4';
    }

    console.log('Uploading to Supabase Storage:', {
      fileName,
      size: fileSize,
      contentType,
      normalizedContentType,
      detectedType: validation.detectedType,
    });

    // Upload to Supabase Storage (using the already validated buffer)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-audio')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: normalizedContentType,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      );
    }

    console.log('File uploaded successfully:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('call-audio')
      .getPublicUrl(fileName);

    console.log('File public URL:', publicUrl);

    // Get user metadata for sales rep name
    const defaultSalesRep = user.user_metadata?.full_name || user.email || 'Unknown';

    // Create call record in database
    const { data: callData, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        file_name: `${sanitizedFilename}.${extension}`,
        file_size: fileSize,
        file_url: publicUrl,
        mime_type: contentType,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_company: customerCompany || null,
        sales_rep: salesRep || defaultSalesRep,
        call_date: callDate ? new Date(callDate).toISOString() : new Date().toISOString(),
        call_type: callType || null,
        status: 'uploading',
        uploaded_at: new Date().toISOString(),
        // Store source info and participants in metadata
        metadata: {
          import_source: 'url',
          original_url: recordingUrl,
          platform: platform,
          ...(participants && { participants }),
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);

      // Clean up uploaded file
      await supabase.storage.from('call-audio').remove([fileName]);

      return NextResponse.json(
        { error: 'Failed to create call record: ' + dbError.message },
        { status: 500 }
      );
    }

    console.log('Call record created:', callData);

    // Check user preferences for auto-transcription
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('auto_transcribe')
      .eq('user_id', userId)
      .maybeSingle();

    const shouldAutoTranscribe = userPreferences?.auto_transcribe ?? true; // Default to true

    if (shouldAutoTranscribe) {
      // Trigger background processing directly (no Inngest needed)
      try {
        console.log('🚀 Triggering background processing for call:', callData.id);

        // Update call status to processing
        await supabase
          .from('calls')
          .update({
            status: 'processing',
          })
          .eq('id', callData.id);

        // Call processing endpoint asynchronously (fire and forget)
        const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${callData.id}/process-async`;

        // Use fetch without awaiting to trigger background processing
        // Use Connection: close to avoid chunked encoding HTTP parser issues
        fetch(processUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-processing': 'true',
            'Connection': 'close',
          },
        }).catch((err) => {
          // Log but don't fail - processing will continue in background
          console.error('Failed to trigger processing (non-fatal):', err.message);
        });

        console.log('✅ Background processing triggered for call:', callData.id);

      } catch (error) {
        console.error('Failed to trigger processing:', error);

        await supabase
          .from('calls')
          .update({
            status: 'failed',
            assemblyai_error: error instanceof Error
              ? error.message
              : 'Failed to start processing',
          })
          .eq('id', callData.id);
      }
    } else {
      console.log('Auto-transcribe disabled, leaving call in uploaded state');
      // Keep status as 'uploaded' - user will manually trigger transcription
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: 'call_uploaded',
      title: 'Recording imported successfully',
      message: shouldAutoTranscribe
        ? `Your recording "${customerName || 'from URL'}" is being processed. This usually takes 3-6 minutes.`
        : `Your recording "${customerName || 'from URL'}" has been uploaded. Click "Start Transcription" to process it.`,
      link: `/calls/${callData.id}`,
    });

    return NextResponse.json({
      success: true,
      call: callData,
      message: 'Recording imported successfully',
    });

  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
