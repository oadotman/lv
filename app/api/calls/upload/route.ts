// =====================================================
// CALL UPLOAD API ROUTE
// Handles audio file uploads to Supabase Storage
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { sanitizeFilename } from '@/lib/fileValidation';
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

    // Validate file
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file format: ${file.type}. Please use MP3, WAV, M4A, WEBM, OGG, or FLAC.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 500MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.name);
    const fileName = `${userId}/${timestamp}_${sanitized}`;

    // Normalize MIME type for Supabase Storage compatibility
    // Supabase doesn't accept audio/x-m4a, convert to audio/mp4
    let contentType = file.type;
    if (contentType === 'audio/x-m4a') {
      contentType = 'audio/mp4';
    }

    console.log('Uploading file:', {
      originalName: file.name,
      sanitizedName: sanitized,
      storagePath: fileName,
      size: file.size,
      type: file.type,
      normalizedType: contentType,
    });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-audio')
      .upload(fileName, file, {
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

    // Phase 5: Trigger Inngest job for reliable processing
    try {
      const { inngest } = await import('@/lib/inngest/client');

      // Send event to Inngest to start processing
      await inngest.send({
        name: 'call/uploaded',
        data: {
          callId: callData.id,
          userId: userId,
          organizationId: organizationId || undefined,
          fileName: file.name,
          fileSize: file.size,
          audioUrl: publicUrl,
          customerName: customerName || undefined,
        },
      });

      console.log('Inngest job triggered for call:', callData.id);

      // Update call status to processing
      await supabase
        .from('calls')
        .update({
          status: 'processing',
        })
        .eq('id', callData.id);

    } catch (inngestError) {
      console.error('Failed to trigger Inngest job:', inngestError);

      // Update status to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: inngestError instanceof Error
            ? inngestError.message
            : 'Failed to start processing',
        })
        .eq('id', callData.id);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: 'call_uploaded',
      title: 'Call uploaded successfully',
      message: `Your call with ${customerName || 'customer'} is being processed. This usually takes 3-6 minutes.`,
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
