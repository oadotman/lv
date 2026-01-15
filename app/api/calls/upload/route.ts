// =====================================================
// CALL UPLOAD API ROUTE
// Handles audio file uploads to Supabase Storage
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { validateUploadedFile, generateSecureFileName, sanitizeFileName } from '@/lib/security/file-validation';
import { getUsageStatus } from '@/lib/simple-usage';
import { canProcessCall, estimateMinutesFromFileSize } from '@/lib/usage-guard';
import { uploadRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for upload

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mp4a',
  'audio/mp4a-latm',
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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

    // Apply rate limiting (5 uploads per minute per user)
    try {
      await uploadRateLimiter.check(userId);
    } catch (rateLimitError: any) {
      console.warn(`Upload rate limit exceeded for user: ${userId}`);
      return NextResponse.json(
        { error: rateLimitError.message },
        {
          status: 429,
          headers: {
            'Retry-After': '60', // 1 minute in seconds
          }
        }
      );
    }

    // Create Supabase client (needed for usage check)
    const supabase = createServerClient();

    // Check usage limits BEFORE accepting upload
    // CRITICAL: Ensure user has an organization
    const { ensureUserOrganization } = await import('@/lib/ensure-organization');
    const orgResult = await ensureUserOrganization(userId);

    if (!orgResult.success) {
      console.error('Failed to ensure organization for user:', userId);
      return NextResponse.json(
        { error: 'Failed to determine organization. Please contact support.' },
        { status: 500 }
      );
    }

    const organizationId = orgResult.organizationId;

    if (orgResult.wasCreated) {
      console.log(`Created default organization for user ${userId}`);
    }

    // Phase 1: Early check BEFORE accepting the file
    // This is crucial - we need to reject BEFORE they upload
    if (organizationId) {
      // We need the file size first to estimate minutes
      // But we haven't parsed the form data yet...
      // For now, do a preliminary check with current usage
      const usage = await getUsageStatus(organizationId, supabase as any);

      // HARD STOP at $20 overage (100 minutes over limit)
      if (usage.overageCharge >= 20.00) {
        console.error('🚫 BLOCKED: User at overage cap:', {
          organizationId,
          minutesUsed: usage.minutesUsed,
          overageCharge: usage.overageCharge,
        });

        return NextResponse.json(
          {
            error: 'Monthly overage limit exceeded',
            details: {
              used: usage.minutesUsed,
              limit: usage.minutesLimit,
              overageCharge: usage.overageCharge,
              message: `You've reached the $20 overage cap (${usage.overageMinutes} minutes over your ${usage.minutesLimit} minute plan). Please upgrade your plan to continue.`,
              isHardLimit: true,
            },
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customerName = formData.get('customerName') as string | null;
    const customerEmail = formData.get('customerEmail') as string | null;
    const customerPhone = formData.get('customerPhone') as string | null;
    const customerCompany = formData.get('customerCompany') as string | null;
    const salesRep = formData.get('salesRep') as string | null;
    const callDate = formData.get('callDate') as string | null;
    const callType = formData.get('callType') as string | null;
    const participantsRaw = formData.get('participants') as string | null;
    const templateId = formData.get('templateId') as string | null;

    // Parse participants if provided
    let participants = null;
    if (participantsRaw) {
      try {
        participants = JSON.parse(participantsRaw);
      } catch (e) {
        console.warn('Failed to parse participants JSON:', e);
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer for magic number validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Advanced validation with magic number verification
    const validation = await validateUploadedFile(buffer, {
      fileName: file.name,
      mimeType: file.type,
      size: file.size
    });

    if (!validation.valid) {
      console.warn('File validation failed:', {
        fileName: file.name,
        errors: validation.errors,
        detectedType: validation.detectedType
      });

      return NextResponse.json(
        {
          error: 'File validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    console.log('File validation successful:', {
      fileName: file.name,
      detectedType: validation.detectedType,
      sizeMB: validation.sizeMB
    });

    // Phase 2: CRITICAL - Check if we can process this file with usage guard
    if (organizationId) {
      const estimatedMinutes = estimateMinutesFromFileSize(file.size);
      const usageCheck = await canProcessCall(organizationId, estimatedMinutes, supabase as any);

      if (!usageCheck.allowed) {
        console.error('🚫 BLOCKED by usage guard:', {
          organizationId,
          reason: usageCheck.reason,
          projectedCharge: usageCheck.projectedCharge,
        });

        return NextResponse.json(
          {
            error: 'Usage limit would be exceeded',
            details: {
              currentUsage: usageCheck.currentUsage,
              limit: usageCheck.limit,
              pendingJobs: usageCheck.pendingMinutes,
              estimatedMinutes,
              projectedTotal: usageCheck.projectedTotal,
              projectedOverageCharge: usageCheck.projectedCharge,
              reason: usageCheck.reason,
              message: 'This file would exceed your $20 overage cap. Please wait for pending jobs to complete or upgrade your plan.',
            },
          },
          { status: 402 } // Payment Required
        );
      }

      // Log that we're allowing but watching
      if (usageCheck.projectedCharge > 10) {
        console.warn('⚠️ User approaching overage cap:', {
          organizationId,
          projectedCharge: usageCheck.projectedCharge,
          remainingBeforeCap: 20 - usageCheck.projectedCharge,
        });
      }
    }

    // Generate secure unique filename
    const fileName = `${userId}/${generateSecureFileName(file.name, userId)}`;

    // Normalize MIME type for Supabase Storage compatibility
    // Supabase doesn't accept audio/x-m4a, convert to audio/mp4
    let contentType = file.type;
    if (contentType === 'audio/x-m4a' ||
        contentType === 'audio/m4a' ||
        contentType === 'audio/mp4a' ||
        contentType === 'audio/mp4a-latm') {
      contentType = 'audio/mp4';
    }

    console.log('Uploading file:', {
      originalName: file.name,
      storagePath: fileName,
      size: file.size,
      type: file.type,
      normalizedType: contentType,
      detectedType: validation.detectedType,
    });

    // Create Blob from validated buffer for upload
    const blob = new Blob([buffer], { type: contentType });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-audio')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType,
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
        file_name: file.name,
        file_size: file.size,
        file_url: publicUrl,
        mime_type: file.type,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_company: customerCompany || null,
        sales_rep: salesRep || defaultSalesRep,
        call_date: callDate ? new Date(callDate).toISOString() : new Date().toISOString(),
        call_type: callType || null,
        status: 'uploading',
        uploaded_at: new Date().toISOString(),
        metadata: participants ? { participants } : null,
        template_id: templateId || null, // Save the selected template
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

    // Phase 5: Check user preferences for auto-transcription
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('auto_transcribe')
      .eq('user_id', userId)
      .maybeSingle();

    const shouldAutoTranscribe = userPreferences?.auto_transcribe ?? true; // Default to true

    if (shouldAutoTranscribe) {
      // Use our queue system with retry logic
      try {
        console.log('🚀 Enqueueing call for processing:', callData.id);

        // Import our queue processor
        const { enqueueCallProcessing } = await import('@/lib/queue/call-processor');

        // Add to processing queue
        await enqueueCallProcessing(callData.id);

        console.log('✅ Call enqueued for processing:', callData.id);

      } catch (error) {
        console.error('Failed to enqueue processing:', error);

        // Update status to failed
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            assemblyai_error: error instanceof Error
              ? error.message
              : 'Failed to start processing',
          })
          .eq('id', callData.id);

        // Send failure email notification
        try {
          const { sendFailedProcessingEmail } = await import('@/lib/emails/failed-processing');

          await sendFailedProcessingEmail({
            callId: callData.id,
            userId: userId,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            salesRep: salesRep || undefined,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : 'Failed to start processing',
            errorType: 'unknown',
          });

          console.log('📧 Failure notification email sent to user');
        } catch (emailError) {
          console.error('Failed to send failure email:', emailError);
        }
      }
    } else {
      console.log('Auto-transcribe disabled, leaving call in uploaded state');
      // Keep status as 'uploaded' - user will manually trigger transcription
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: 'call_uploaded',
      title: 'Call uploaded successfully',
      message: shouldAutoTranscribe
        ? `Your call with ${customerName || 'customer'} is being processed. This usually takes 3-6 minutes.`
        : `Your call with ${customerName || 'customer'} has been uploaded. Click "Start Transcription" to process it.`,
      link: `/calls/${callData.id}`,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      call: callData,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve call details
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Get user's calls
    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      calls,
    });

  } catch (error) {
    console.error('Fetch calls error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
