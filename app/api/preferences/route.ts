// =====================================================
// USER PREFERENCES API
// GET: Fetch user preferences
// PATCH: Update user preferences
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_PREFERENCES } from '@/lib/types/preferences';
import type { UserPreferences, UpdatePreferencesInput } from '@/lib/types/preferences';

// GET - Fetch user preferences (creates default if doesn't exist)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to fetch existing preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching preferences:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // If preferences don't exist, create them with defaults
    if (!preferences) {
      const { data: newPreferences, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default preferences:', insertError);
        return NextResponse.json(
          { error: 'Failed to create default preferences' },
          { status: 500 }
        );
      }

      return NextResponse.json({ preferences: newPreferences });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const updates: UpdatePreferencesInput = await request.json();

    // Validate updates (only allow known fields)
    const allowedFields: (keyof UpdatePreferencesInput)[] = [
      'auto_transcribe',
      'email_on_transcription_complete',
      'email_on_extraction_complete',
      'email_on_review_needed',
      'default_view',
      'calls_per_page',
      'show_quick_insights',
      'show_sentiment_analysis',
    ];

    const filteredUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key as keyof UpdatePreferencesInput)) {
        filteredUpdates[key] = updates[key as keyof UpdatePreferencesInput];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let preferences: UserPreferences;

    if (existing) {
      // Update existing preferences
      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update(filteredUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating preferences:', updateError);
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 }
        );
      }

      preferences = data;
    } else {
      // Create new preferences with updates
      const { data, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
          ...filteredUpdates,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating preferences:', insertError);
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }

      preferences = data;
    }

    return NextResponse.json({
      preferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Preferences PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
