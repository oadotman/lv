// =====================================================
// OVERAGE PACK PURCHASE API
// Handles overage pack purchases via Paddle
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { OVERAGE_CONFIG } from '@/lib/overage';

export const runtime = 'nodejs';

/**
 * GET /api/overage/purchase
 * Returns available overage packs and pricing
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return overage pack options
    const packs = Object.entries(OVERAGE_CONFIG.packs).map(([key, pack]) => ({
      id: key,
      minutes: pack.minutes,
      price: pack.price,
      pricePerMinute: pack.price / pack.minutes,
      savings: (pack.minutes * OVERAGE_CONFIG.pricePerMinute) - pack.price,
      savingsPercent: Math.round(((pack.minutes * OVERAGE_CONFIG.pricePerMinute - pack.price) / (pack.minutes * OVERAGE_CONFIG.pricePerMinute)) * 100),
      paddlePriceId: pack.paddlePriceId,
    }));

    return NextResponse.json({
      basePrice: OVERAGE_CONFIG.pricePerMinute,
      packs,
      recommended: null, // Can be enhanced based on usage patterns
    });
  } catch (error) {
    console.error('[Overage] Error fetching packs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overage packs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/overage/purchase
 * Initiates Paddle checkout for overage pack
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { packSize, organizationId } = body;

    if (!packSize || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has admin access to the organization
    const { requireOrganizationAdmin } = await import('@/lib/security/authorization');

    try {
      await requireOrganizationAdmin(user.id, organizationId);
    } catch (authError) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required to purchase overage packs' },
        { status: 403 }
      );
    }

    // Validate pack size
    if (!OVERAGE_CONFIG.packs[packSize as keyof typeof OVERAGE_CONFIG.packs]) {
      return NextResponse.json(
        { error: 'Invalid pack size' },
        { status: 400 }
      );
    }

    const pack = OVERAGE_CONFIG.packs[packSize as keyof typeof OVERAGE_CONFIG.packs];

    // Return checkout information
    // The client will use this to open Paddle checkout
    return NextResponse.json({
      success: true,
      checkout: {
        priceId: pack.paddlePriceId,
        customData: {
          user_id: user.id,
          organization_id: organizationId,
          pack_size: packSize,
          type: 'overage_pack',
        },
      },
      pack: {
        size: packSize,
        minutes: pack.minutes,
        price: pack.price,
      },
    });
  } catch (error) {
    console.error('[Overage] Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
