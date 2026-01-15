// =====================================================
// PRESIGNED UPLOAD URL API
// Generates signed URLs for direct upload to Supabase Storage
// Zero memory usage - files never touch our server
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { getUsageStatus } from '@/lib/simple-usage';
import { uploadRateLimiter } from '@/lib/rateLimit';
import { generateSecureFileName } from '@/lib/security/file-validation';

export const runtime = 'nodejs';
export const maxDuration = 30; // Quick endpoint - just generates URL

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

    // Apply rate limiting (10 URL requests per minute per user)
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

    const supabase = createServerClient();

    // Check usage limits BEFORE generating upload URL
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = userOrg?.organization_id || null;

    if (organizationId) {
      // Get simple usage status
      const usage = await getUsageStatus(organizationId, supabase as any);

      // With simple system, we allow uploads even in overage (pay as you go)
      // Just log if they're in overage
      if (usage.status === 'overage') {
        console.log('User generating presigned URL in overage:', {
          organizationId,
          minutesUsed: usage.minutesUsed,
          minutesLimit: usage.minutesLimit,
          overageMinutes: usage.overageMinutes,
          overageCharge: usage.overageCharge,
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

    // Parse request body
    const body = await req.json();
    const { fileName, fileSize, mimeType } = body;

    // Validate inputs
    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!SUPPORTED_FORMATS.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file format', supportedFormats: SUPPORTED_FORMATS },
        { status: 400 }
      );
    }

    // Generate secure filename
    const secureFileName = generateSecureFileName(fileName, userId);
    const storagePath = `${userId}/${secureFileName}`;

    // Normalize MIME type for Supabase compatibility
    let contentType = mimeType;
    // Normalize all M4A variants to audio/mp4 for Supabase
    if (contentType === 'audio/x-m4a' ||
        contentType === 'audio/m4a' ||
        contentType === 'audio/mp4a' ||
        contentType === 'audio/mp4a-latm') {
      contentType = 'audio/mp4';
    }

    console.log('Generating presigned URL:', {
      userId,
      fileName,
      storagePath,
      fileSize,
      mimeType: contentType,
    });

    // Generate signed upload URL (expires in 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('call-audio')
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (signedUrlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      );
    }

    console.log('✅ Presigned URL generated:', {
      path: storagePath,
      token: signedUrlData.token.substring(0, 20) + '...',
    });

    // Return the signed URL and metadata
    return NextResponse.json({
      success: true,
      uploadUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: storagePath,
      expiresIn: 3600, // 1 hour
      metadata: {
        userId,
        organizationId,
        fileName: secureFileName,
        originalFileName: fileName,
        contentType,
      },
    });

  } catch (error) {
    console.error('Presigned URL generation error:', error);

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
