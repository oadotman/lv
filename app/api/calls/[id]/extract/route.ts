// =====================================================
// CRM EXTRACTION API ROUTE
// Extracts structured CRM data from transcripts using GPT-4o
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import {
  extractCRMData,
  extractTemplateFields,
  validateExtraction,
  formatForCRM,
  estimateTokens,
  calculateExtractionCost,
  CustomFieldExtraction,
} from '@/lib/openai';
import { extractRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max for extraction

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;

    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for expensive GPT-4 operations
    try {
      await extractRateLimiter.check(user.id);
    } catch (rateLimitError: any) {
      console.warn(`Extract rate limit exceeded for user: ${user.id}`);
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

    // Get call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Check if call is completed
    if (call.status !== 'completed') {
      return NextResponse.json(
        { error: 'Call must be transcribed first' },
        { status: 400 }
      );
    }

    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    console.log('Starting CRM extraction for call:', callId);

    // Check if extraction already exists
    const { data: existingExtraction } = await supabase
      .from('call_fields')
      .select('id')
      .eq('call_id', callId)
      .limit(1);

    if (existingExtraction && existingExtraction.length > 0) {
      console.log('Extraction already exists, re-extracting...');
      // Delete existing extraction
      await supabase.from('call_fields').delete().eq('call_id', callId);
    }

    // Update call status to extracting
    await supabase
      .from('calls')
      .update({ status: 'extracting' })
      .eq('id', callId);

    // Extract CRM data using GPT-4o
    const extraction = await extractCRMData({
      transcript: transcript.full_text,
      utterances: transcript.utterances,
      speakerMapping: transcript.speaker_mapping,
      customerName: call.customer_name,
      callType: call.call_type,
    });

    // Validate extraction
    const validation = validateExtraction(extraction);

    if (!validation.isValid) {
      console.error('Extraction validation failed:', validation.missingFields);
      // Continue anyway but log warnings
    }

    if (validation.warnings.length > 0) {
      console.warn('Extraction warnings:', validation.warnings);
    }

    // Get user's active template (if exists)
    const { data: activeTemplate } = await supabase
      .from('templates')
      .select('*, template_fields(*)')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    let customFieldsExtracted: CustomFieldExtraction[] = [];

    if (activeTemplate && activeTemplate.template_fields?.length > 0) {
      console.log('Extracting custom template fields...');

      customFieldsExtracted = await extractTemplateFields(
        transcript.full_text,
        transcript.utterances,
        transcript.speaker_mapping,
        activeTemplate.template_fields
      );
    }

    // Store core extracted fields
    const coreFields = [
      { name: 'summary', value: extraction.summary, type: 'text' },
      { name: 'key_points', value: JSON.stringify(extraction.keyPoints), type: 'json' },
      { name: 'next_steps', value: JSON.stringify(extraction.nextSteps), type: 'json' },
      { name: 'pain_points', value: JSON.stringify(extraction.painPoints), type: 'json' },
      { name: 'requirements', value: JSON.stringify(extraction.requirements), type: 'json' },
      { name: 'budget', value: extraction.budget || null, type: 'text' },
      { name: 'timeline', value: extraction.timeline || null, type: 'text' },
      { name: 'decision_maker', value: extraction.decisionMaker || null, type: 'text' },
      {
        name: 'product_interest',
        value: JSON.stringify(extraction.productInterest),
        type: 'json',
      },
      {
        name: 'competitors_mentioned',
        value: JSON.stringify(extraction.competitorsMentioned),
        type: 'json',
      },
      { name: 'objections', value: JSON.stringify(extraction.objections), type: 'json' },
      {
        name: 'buying_signals',
        value: JSON.stringify(extraction.buyingSignals),
        type: 'json',
      },
      { name: 'call_outcome', value: extraction.callOutcome, type: 'select' },
      {
        name: 'qualification_score',
        value: extraction.qualificationScore.toString(),
        type: 'number',
      },
      { name: 'urgency', value: extraction.urgency, type: 'select' },
      { name: 'customer_company', value: extraction.raw.customerCompany || null, type: 'text' },
      { name: 'industry', value: extraction.raw.industry || null, type: 'text' },
      { name: 'company_size', value: extraction.raw.companySize || null, type: 'text' },
      {
        name: 'current_solution',
        value: extraction.raw.currentSolution || null,
        type: 'text',
      },
      {
        name: 'decision_process',
        value: extraction.raw.decisionProcess || null,
        type: 'text',
      },
      {
        name: 'technical_requirements',
        value: JSON.stringify(extraction.raw.technicalRequirements || []),
        type: 'json',
      },
    ];

    // Insert core fields
    const { error: fieldsError } = await supabase.from('call_fields').insert(
      coreFields.map((field) => ({
        call_id: callId,
        field_name: field.name,
        field_value: field.value,
        field_type: field.type,
        confidence: 0.9, // Core fields have high confidence
        extracted_by: 'gpt-4o',
      }))
    );

    if (fieldsError) {
      console.error('Error storing core fields:', fieldsError);
      throw fieldsError;
    }

    // Insert custom template fields
    if (customFieldsExtracted.length > 0) {
      const { error: customFieldsError } = await supabase
        .from('call_fields')
        .insert(
          customFieldsExtracted.map((field) => ({
            call_id: callId,
            template_field_id: field.field_id,
            field_name: field.field_name,
            field_value: field.value,
            field_type: 'custom',
            confidence: field.confidence,
            extracted_by: 'gpt-4o',
          }))
        );

      if (customFieldsError) {
        console.error('Error storing custom fields:', customFieldsError);
      }
    }

    // Generate CRM outputs in different formats
    const crmOutputs = {
      plain: formatForCRM(extraction, 'plain'),
      hubspot: formatForCRM(extraction, 'hubspot'),
      salesforce: formatForCRM(extraction, 'salesforce'),
    };

    // Store CRM outputs
    await supabase
      .from('calls')
      .update({
        status: 'completed',
        crm_outputs: crmOutputs,
        extraction_completed_at: new Date().toISOString(),
      })
      .eq('id', callId);

    // Calculate and record token usage
    const inputTokens = estimateTokens(transcript.full_text);
    const outputTokens = estimateTokens(JSON.stringify(extraction));
    const costUsd = calculateExtractionCost(inputTokens, outputTokens);
    const costCents = Math.round(costUsd * 100);

    await supabase.from('usage_metrics').insert({
      user_id: user.id,
      organization_id: call.organization_id,
      metric_type: 'extraction_processed',
      metric_value: 1,
      call_id: callId,
      cost_cents: costCents,
      metadata: {
        provider: 'openai',
        model: 'gpt-4o',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    });

    // Send notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      notification_type: 'extraction_completed',
      title: 'CRM extraction complete',
      message: `CRM data extracted for call with ${call.customer_name || 'customer'}. Qualification score: ${extraction.qualificationScore}/100`,
      link: `/calls/${callId}`,
      call_id: callId,
    });

    console.log('CRM extraction completed successfully:', {
      callId,
      qualificationScore: extraction.qualificationScore,
      callOutcome: extraction.callOutcome,
      fieldsCount: coreFields.length + customFieldsExtracted.length,
      costCents,
    });

    return NextResponse.json({
      success: true,
      extraction: {
        qualificationScore: extraction.qualificationScore,
        callOutcome: extraction.callOutcome,
        urgency: extraction.urgency,
        sentiment: extraction.sentiment,
        fieldsExtracted: coreFields.length + customFieldsExtracted.length,
      },
      crmOutputs,
      validation,
      cost: {
        cents: costCents,
        usd: costUsd,
      },
    });
  } catch (error) {
    console.error('Extraction error:', error);

    // Update call status to failed
    try {
      const supabase = createServerClient();
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          extraction_error: error instanceof Error ? error.message : 'Extraction failed',
        })
        .eq('id', params.id);
    } catch (updateError) {
      console.error('Error updating call status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check extraction status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get call with fields
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, status, extraction_completed_at, crm_outputs')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get extracted fields count
    const { data: fields, error: fieldsError } = await supabase
      .from('call_fields')
      .select('id')
      .eq('call_id', params.id);

    return NextResponse.json({
      callId: call.id,
      status: call.status,
      extractionCompleted: !!call.extraction_completed_at,
      extractionCompletedAt: call.extraction_completed_at,
      fieldsCount: fields?.length || 0,
      hasCrmOutputs: !!call.crm_outputs,
    });
  } catch (error) {
    console.error('Get extraction status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
