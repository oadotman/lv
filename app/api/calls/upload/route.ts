// =====================================================
// CALL UPLOAD API ROUTE
// Handles audio file uploads to Supabase Storage
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { validateUploadedFile, generateSecureFileName, sanitizeFileName } from '@/lib/security/file-validation';
import { calculateUsageAndOverage } from '@/lib/overage';
import { uploadRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for upload

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
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
    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = userOrg?.organization_id || null;

    if (organizationId) {
      // Fetch organization details including overage settings
      const { data: org } = await supabase
        .from('organizations')
        .select('max_minutes_monthly, plan_type, current_period_start, current_period_end')
        .eq('id', organizationId)
        .single();

      if (org) {
        // Use overage-aware usage calculation
        const now = new Date();
        const periodStart = org.current_period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const periodEnd = org.current_period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        const usage = await calculateUsageAndOverage(organizationId, periodStart, periodEnd);

        // Block upload only if user has exceeded even purchased overages
        if (!usage.canUpload) {
          console.log('Usage limit exceeded (including overages):', {
            organizationId,
            minutesUsed: usage.minutesUsed,
            baseLimit: usage.baseMinutes,
            overageMinutes: usage.purchasedOverageMinutes,
            totalLimit: usage.totalAvailableMinutes,
            planType: org.plan_type,
          });

          return NextResponse.json(
            {
              error: 'Monthly transcription limit exceeded',
              details: {
                used: Math.round(usage.minutesUsed),
                baseLimit: usage.baseMinutes,
                overageMinutesAvailable: usage.purchasedOverageMinutes,
                totalLimit: usage.totalAvailableMinutes,
                planType: org.plan_type,
                hasOverage: usage.hasOverage,
                message: usage.hasOverage
                  ? `You've used ${Math.round(usage.minutesUsed)} minutes including your overage allowance. Purchase additional overage packs or upgrade your plan.`
                  : `You've used all ${usage.totalAvailableMinutes} minutes this month. Purchase an overage pack to continue processing calls.`,
                canPurchaseOverage: true,
              },
            },
            { status: 402 } // Payment Required
          );
        }

        // Log usage info (including overage status)
        console.log('Usage check passed:', {
          organizationId,
          minutesUsed: Math.round(usage.minutesUsed),
          baseLimit: usage.baseMinutes,
          overageMinutes: usage.purchasedOverageMinutes,
          totalLimit: usage.totalAvailableMinutes,
          remaining: Math.round(usage.totalAvailableMinutes - usage.minutesUsed),
          percentUsed: Math.round(usage.percentUsed),
          inOverage: usage.minutesUsed > usage.baseMinutes,
        });
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

    // Generate secure unique filename
    const fileName = `${userId}/${generateSecureFileName(file.name, userId)}`;

    // Normalize MIME type for Supabase Storage compatibility
    // Supabase doesn't accept audio/x-m4a, convert to audio/mp4
    let contentType = file.type;
    if (contentType === 'audio/x-m4a') {
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
        const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${callData.id}/process`;

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
