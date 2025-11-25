// =====================================================
// INNGEST FUNCTION: Process CRM Extraction
// Handles GPT-4o extraction with retries
// =====================================================

import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/server';
import {
  extractCRMData,
  extractTemplateFields,
  validateExtraction,
  formatForCRM,
  estimateTokens,
  calculateExtractionCost,
} from '@/lib/openai';

export const processExtraction = inngest.createFunction(
  {
    id: 'process-extraction',
    name: 'Process CRM Extraction',
    retries: 3, // Retry up to 3 times on failure
  },
  { event: 'call/transcribed' },
  async ({ event, step }) => {
    const { callId } = event.data;

    console.log('[Inngest] Starting extraction job for call:', callId);

    // Step 1: Get call and transcript
    const { call, transcript } = await step.run('get-data', async () => {
      const supabase = createAdminClient();

      // Get call
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError || !callData) {
        throw new Error(`Call ${callId} not found: ${callError?.message}`);
      }

      // Get transcript
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (transcriptError || !transcriptData) {
        throw new Error(`Transcript not found for call ${callId}: ${transcriptError?.message}`);
      }

      return { call: callData, transcript: transcriptData };
    });

    // Step 2: Update call status to extracting
    await step.run('update-status-extracting', async () => {
      const supabase = createAdminClient();

      await supabase
        .from('calls')
        .update({ status: 'extracting' })
        .eq('id', callId);

      console.log('[Inngest] Call status updated to extracting');
    });

    // Step 3: Extract CRM data with GPT-4o
    const extraction = await step.run('extract-crm-data', async () => {
      console.log('[Inngest] Calling GPT-4o for extraction...');

      const result = await extractCRMData({
        transcript: transcript.full_text,
        utterances: transcript.utterances,
        speakerMapping: transcript.speaker_mapping,
        customerName: call.customer_name,
        callType: call.call_type,
      });

      // Validate extraction
      const validation = validateExtraction(result);

      if (!validation.isValid) {
        console.warn('[Inngest] Extraction validation warnings:', validation.missingFields);
      }

      if (validation.warnings.length > 0) {
        console.warn('[Inngest] Extraction quality warnings:', validation.warnings);
      }

      console.log('[Inngest] Extraction complete:', {
        qualificationScore: result.qualificationScore,
        callOutcome: result.callOutcome,
      });

      return result;
    });

    // Step 4: Extract custom template fields (if template exists)
    const customFields = await step.run('extract-custom-fields', async () => {
      const supabase = createAdminClient();

      // Get user's active template
      const { data: activeTemplate } = await supabase
        .from('templates')
        .select('*, template_fields(*)')
        .eq('user_id', call.user_id)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (!activeTemplate || !activeTemplate.template_fields || activeTemplate.template_fields.length === 0) {
        console.log('[Inngest] No active template found, skipping custom field extraction');
        return [];
      }

      console.log('[Inngest] Extracting custom template fields...');

      const fields = await extractTemplateFields(
        transcript.full_text,
        transcript.utterances,
        transcript.speaker_mapping,
        activeTemplate.template_fields
      );

      console.log('[Inngest] Custom fields extracted:', fields.length);

      return fields;
    });

    // Step 5: Store extracted fields
    await step.run('store-fields', async () => {
      const supabase = createAdminClient();

      // Store core fields
      const coreFields = [
        { name: 'summary', value: extraction.summary, type: 'text' },
        { name: 'key_points', value: JSON.stringify(extraction.keyPoints), type: 'json' },
        { name: 'next_steps', value: JSON.stringify(extraction.nextSteps), type: 'json' },
        { name: 'pain_points', value: JSON.stringify(extraction.painPoints), type: 'json' },
        { name: 'requirements', value: JSON.stringify(extraction.requirements), type: 'json' },
        { name: 'budget', value: extraction.budget || null, type: 'text' },
        { name: 'timeline', value: extraction.timeline || null, type: 'text' },
        { name: 'decision_maker', value: extraction.decisionMaker || null, type: 'text' },
        { name: 'product_interest', value: JSON.stringify(extraction.productInterest), type: 'json' },
        { name: 'competitors_mentioned', value: JSON.stringify(extraction.competitorsMentioned), type: 'json' },
        { name: 'objections', value: JSON.stringify(extraction.objections), type: 'json' },
        { name: 'buying_signals', value: JSON.stringify(extraction.buyingSignals), type: 'json' },
        { name: 'call_outcome', value: extraction.callOutcome, type: 'select' },
        { name: 'qualification_score', value: extraction.qualificationScore.toString(), type: 'number' },
        { name: 'urgency', value: extraction.urgency, type: 'select' },
        { name: 'customer_company', value: (extraction.raw as any).customerCompany || null, type: 'text' },
        { name: 'industry', value: (extraction.raw as any).industry || null, type: 'text' },
        { name: 'company_size', value: (extraction.raw as any).companySize || null, type: 'text' },
        { name: 'current_solution', value: (extraction.raw as any).currentSolution || null, type: 'text' },
        { name: 'decision_process', value: (extraction.raw as any).decisionProcess || null, type: 'text' },
        { name: 'technical_requirements', value: JSON.stringify((extraction.raw as any).technicalRequirements || []), type: 'json' },
      ];

      // Insert core fields
      const { error: fieldsError } = await supabase.from('call_fields').insert(
        coreFields.map((field) => ({
          call_id: callId,
          field_name: field.name,
          field_value: field.value,
          field_type: field.type,
          confidence: 0.9,
          extracted_by: 'gpt-4o',
        }))
      );

      if (fieldsError) {
        console.error('[Inngest] Error storing core fields:', fieldsError);
        throw fieldsError;
      }

      // Insert custom template fields
      if (customFields.length > 0) {
        const { error: customFieldsError } = await supabase
          .from('call_fields')
          .insert(
            customFields.map((field) => ({
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
          console.error('[Inngest] Error storing custom fields:', customFieldsError);
        }
      }

      console.log('[Inngest] Fields stored successfully:', coreFields.length + customFields.length);
    });

    // Step 6: Generate and store CRM outputs
    await step.run('generate-crm-outputs', async () => {
      const supabase = createAdminClient();

      const crmOutputs = {
        plain: formatForCRM(extraction as any, 'plain'),
        hubspot: formatForCRM(extraction as any, 'hubspot'),
        salesforce: formatForCRM(extraction as any, 'salesforce'),
      };

      await supabase
        .from('calls')
        .update({
          crm_outputs: crmOutputs,
          extraction_completed_at: new Date().toISOString(),
        })
        .eq('id', callId);

      console.log('[Inngest] CRM outputs generated and stored');
    });

    // Step 7: Record usage metrics
    await step.run('record-metrics', async () => {
      const supabase = createAdminClient();

      const inputTokens = estimateTokens(transcript.full_text);
      const outputTokens = estimateTokens(JSON.stringify(extraction));
      const costUsd = calculateExtractionCost(inputTokens, outputTokens);
      const costCents = Math.round(costUsd * 100);

      await supabase.from('usage_metrics').insert({
        user_id: call.user_id,
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

      console.log('[Inngest] Usage metrics recorded:', { costCents });
    });

    // Step 8: Update call status to completed
    await step.run('complete-call', async () => {
      const supabase = createAdminClient();

      await supabase
        .from('calls')
        .update({ status: 'completed' })
        .eq('id', callId);

      console.log('[Inngest] Call status updated to completed');
    });

    // Step 9: Send notification
    await step.run('send-notification', async () => {
      const supabase = createAdminClient();

      await supabase.from('notifications').insert({
        user_id: call.user_id,
        notification_type: 'extraction_completed',
        title: 'CRM extraction complete',
        message: `CRM data extracted for call with ${call.customer_name || 'customer'}. Qualification score: ${extraction.qualificationScore}/100`,
        link: `/calls/${callId}`,
        call_id: callId,
      });

      console.log('[Inngest] Notification sent');
    });

    // Step 10: Trigger extracted event
    await step.run('trigger-extracted-event', async () => {
      // Core fields count (20 standard fields) + custom fields
      const totalFieldsExtracted = 20 + customFields.length;
      const totalInsights = extraction.painPoints.length + extraction.requirements.length;

      await inngest.send({
        name: 'call/extracted',
        data: {
          callId,
          userId: call.user_id,
          fieldsExtracted: totalFieldsExtracted,
          insightsGenerated: totalInsights,
        },
      });

      console.log('[Inngest] Extracted event sent');
    });

    console.log('[Inngest] Extraction job completed successfully');

    return {
      success: true,
      callId,
      qualificationScore: extraction.qualificationScore,
      callOutcome: extraction.callOutcome,
    };
  }
);
