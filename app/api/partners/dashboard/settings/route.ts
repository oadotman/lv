// =====================================================
// PARTNER SETTINGS API
// Update partner profile and payment information
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const partnerToken = cookieStore.get('partner_token')?.value;

    if (!partnerToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Verify partner session
    const { data: session } = await supabase
      .from('partner_sessions')
      .select('partner_id')
      .eq('token', partnerToken)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get partner details
    const { data: partner, error } = await supabase
      .from('partners')
      .select(`
        id,
        email,
        name,
        company,
        phone,
        website,
        payment_method,
        payment_details,
        notification_preferences,
        created_at
      `)
      .eq('id', session.partner_id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ partner });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const partnerToken = cookieStore.get('partner_token')?.value;

    if (!partnerToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Verify partner session
    const { data: session } = await supabase
      .from('partner_sessions')
      .select('partner_id')
      .eq('token', partnerToken)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      company,
      phone,
      website,
      payment_method,
      payment_details,
      notification_preferences,
      current_password,
      new_password,
    } = body;

    // If changing password, verify current password
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: 'Current password required' },
          { status: 400 }
        );
      }

      const { data: partner } = await supabase
        .from('partners')
        .select('password_hash')
        .eq('id', session.partner_id)
        .single();

      if (!partner) {
        return NextResponse.json(
          { error: 'Partner not found' },
          { status: 404 }
        );
      }

      const validPassword = await bcrypt.compare(current_password, partner.password_hash);
      if (!validPassword) {
        return NextResponse.json(
          { error: 'Invalid current password' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (payment_details !== undefined) updateData.payment_details = payment_details;
    if (notification_preferences !== undefined) updateData.notification_preferences = notification_preferences;

    // Hash new password if provided
    if (new_password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(new_password, salt);
    }

    // Update partner
    const { data: updatedPartner, error: updateError } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', session.partner_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the update
    await supabase
      .from('partner_activity_logs')
      .insert({
        partner_id: session.partner_id,
        action: 'settings_updated',
        details: JSON.stringify({
          updated_fields: Object.keys(updateData).filter(k => k !== 'password_hash'),
        }),
      });

    return NextResponse.json({
      partner: updatedPartner,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}