// =====================================================
// EMAIL GENERATION API
// POST: Generate follow-up email from call transcript
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { emailRateLimiter } from '@/lib/rateLimit/email';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user first using requireAuth
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Now create server client with proper cookie context
    const supabase = createServerClient();

    const userId = user.id;
    const callId = params.id;

    // Apply rate limiting (10 emails per hour per user)
    try {
      await emailRateLimiter.check(userId);
    } catch (rateLimitError: any) {
      console.warn(`Email generation rate limit exceeded for user: ${userId}`);

      // Get remaining quota
      const rateLimitStatus = emailRateLimiter.getStatus(userId);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitError.message,
          details: {
            limit: 10,
            remaining: rateLimitStatus?.remaining || 0,
            resetTime: rateLimitStatus?.resetAt?.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': '3600', // 1 hour in seconds
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': (rateLimitStatus?.remaining || 0).toString(),
            'X-RateLimit-Reset': rateLimitStatus?.resetAt?.getTime().toString() || '',
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Get transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('full_text')
      .eq('call_id', callId)
      .maybeSingle();

    if (!transcript || !transcript.full_text) {
      return NextResponse.json(
        { error: 'No transcript available for this call. Please transcribe the call first.' },
        { status: 400 }
      );
    }

    // Get extracted fields
    const { data: fields } = await supabase
      .from('call_fields')
      .select('*')
      .eq('call_id', callId);

    // Get insights
    const { data: insights } = await supabase
      .from('call_insights')
      .select('*')
      .eq('call_id', callId);

    // Build context for OpenAI
    const fieldsContext = fields && fields.length > 0
      ? fields.map(f => `${f.field_name}: ${f.field_value || 'N/A'}`).join('\n')
      : 'No structured data extracted';

    const insightsContext = insights && insights.length > 0
      ? insights.map(i => `- ${i.insight_type}: ${i.insight_text}`).join('\n')
      : 'No insights available';

    // Generate email using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales professional writing follow-up emails after sales calls.
Your emails are:
- Professional yet personable
- Concise and action-oriented
- Focused on next steps
- Personalized based on the conversation
- Free of generic sales language

Write the email body only (no subject line). Use a professional email format with proper greeting and signature placeholder.`,
        },
        {
          role: 'user',
          content: `Write a follow-up email for a sales call with the following details:

**Customer:** ${call.customer_name || 'the prospect'}
**Sales Rep:** ${call.sales_rep || 'Unknown'}
**Call Date:** ${new Date(call.call_date).toLocaleDateString()}

**Extracted Information:**
${fieldsContext}

**Key Insights:**
${insightsContext}

**Call Transcript Summary:**
${transcript.full_text.substring(0, 2000)}${transcript.full_text.length > 2000 ? '...' : ''}

**User Instructions:**
${prompt}

Generate the email now:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const generatedEmail = completion.choices[0]?.message?.content;

    if (!generatedEmail) {
      throw new Error('Failed to generate email');
    }

    // Log email generation for analytics
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: 'email_generated',
      title: 'Follow-up email generated',
      message: `Email generated for call with ${call.customer_name || 'customer'}`,
      link: `/calls/${callId}`,
    });

    return NextResponse.json({
      success: true,
      email: generatedEmail,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('Email generation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Failed to generate email'
      },
      { status: 500 }
    );
  }
}
