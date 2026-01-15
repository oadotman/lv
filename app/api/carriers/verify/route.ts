import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCarrier } from '@/lib/services/fmcsa-verification';

/**
 * GET /api/carriers/verify
 * Verify a carrier against the FMCSA SAFER database
 *
 * Query params:
 * - mc: MC number
 * - dot: DOT number
 * - carrier_id: Carrier ID from database (optional)
 * - force: Force refresh (bypass cache)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const mcNumber = searchParams.get('mc');
    const dotNumber = searchParams.get('dot');
    const carrierId = searchParams.get('carrier_id');
    const forceRefresh = searchParams.get('force') === 'true';

    // If carrier_id is provided, fetch MC/DOT from database
    let mc = mcNumber;
    let dot = dotNumber;

    if (carrierId && (!mc && !dot)) {
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // Fetch carrier details
      const { data: carrier, error: carrierError } = await supabase
        .from('carriers')
        .select('mc_number, dot_number, carrier_name')
        .eq('id', carrierId)
        .eq('organization_id', userOrg.organization_id)
        .single();

      if (carrierError || !carrier) {
        return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
      }

      mc = carrier.mc_number;
      dot = carrier.dot_number;
    }

    // Validate input
    if (!mc && !dot) {
      return NextResponse.json(
        { error: 'MC number or DOT number is required' },
        { status: 400 }
      );
    }

    // Clean up the numbers (remove prefixes and clean format)
    if (mc) {
      mc = mc.replace(/^MC-?/i, '').replace(/\D/g, '');
    }
    if (dot) {
      dot = dot.replace(/^DOT-?/i, '').replace(/\D/g, '');
    }

    // Perform verification
    const result = await verifyCarrier(mc, dot, forceRefresh);

    // If carrier_id was provided and verification successful, update carrier record
    if (carrierId && result.verified) {
      const verificationStatus =
        result.riskLevel === 'LOW' ? 'VERIFIED_LOW_RISK' :
        result.riskLevel === 'MEDIUM' ? 'VERIFIED_MEDIUM_RISK' :
        'VERIFIED_HIGH_RISK';

      await supabase
        .from('carriers')
        .update({
          last_verification_date: new Date().toISOString(),
          verification_status: verificationStatus,
          verification_warnings: result.warnings,
          // Update carrier info if available
          ...(result.data?.legalName && { legal_name: result.data.legalName }),
          ...(result.data?.phone && { phone: result.data.phone }),
          ...(result.data?.physicalAddress && { address: result.data.physicalAddress }),
          ...(result.data?.physicalCity && { city: result.data.physicalCity }),
          ...(result.data?.physicalState && { state: result.data.physicalState }),
          ...(result.data?.physicalZip && { zip_code: result.data.physicalZip }),
        })
        .eq('id', carrierId);

      // Also save to carrier_verifications table if we have a carrier_id
      if (!result.cached) {
        await supabase
          .from('carrier_verifications')
          .insert({
            carrier_id: carrierId,
            mc_number: mc || result.data?.mcNumber,
            dot_number: dot || result.data?.dotNumber,
            legal_name: result.data?.legalName,
            dba_name: result.data?.dbaName,
            physical_address: result.data?.physicalAddress,
            physical_city: result.data?.physicalCity,
            physical_state: result.data?.physicalState,
            physical_zip: result.data?.physicalZip,
            phone: result.data?.phone,
            operating_status: result.data?.operatingStatus,
            entity_type: result.data?.entityType,
            safety_rating: result.data?.safetyRating,
            bipd_insurance_on_file: result.data?.bipdInsuranceOnFile,
            bipd_required: result.data?.bipdRequired,
            bipd_on_file: result.data?.bipdOnFile,
            cargo_insurance_on_file: result.data?.cargoInsuranceOnFile,
            cargo_required: result.data?.cargoRequired,
            cargo_on_file: result.data?.cargoOnFile,
            vehicle_oos_rate: result.data?.vehicleOOSRate,
            driver_oos_rate: result.data?.driverOOSRate,
            risk_level: result.riskLevel,
            risk_score: result.riskScore,
            warnings: result.warnings,
            raw_response: result.data,
          });
      }
    }

    // Format response
    const response = {
      verified: result.verified,
      mc_number: mc || result.data?.mcNumber,
      dot_number: dot || result.data?.dotNumber,
      legal_name: result.data?.legalName,
      dba_name: result.data?.dbaName,
      operating_status: result.data?.operatingStatus,
      safety_rating: result.data?.safetyRating,
      authority_age_days: result.data?.authorityDate
        ? Math.floor((Date.now() - new Date(result.data.authorityDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      insurance: {
        liability: {
          required: result.data?.bipdRequired || 750000,
          on_file: result.data?.bipdOnFile || 0,
          status: result.data?.bipdInsuranceOnFile
            ? (result.data?.bipdOnFile && result.data?.bipdRequired &&
               result.data.bipdOnFile >= result.data.bipdRequired)
              ? 'ADEQUATE'
              : 'INADEQUATE'
            : 'NOT_ON_FILE',
        },
        cargo: {
          required: result.data?.cargoRequired || 100000,
          on_file: result.data?.cargoOnFile || 0,
          status: result.data?.cargoInsuranceOnFile
            ? (result.data?.cargoOnFile && result.data?.cargoRequired &&
               result.data.cargoOnFile >= result.data.cargoRequired)
              ? 'ADEQUATE'
              : 'INADEQUATE'
            : 'NOT_ON_FILE',
        },
      },
      safety_scores: result.data?.vehicleOOSRate || result.data?.driverOOSRate
        ? {
            vehicle_oos_rate: result.data?.vehicleOOSRate,
            driver_oos_rate: result.data?.driverOOSRate,
            national_avg_vehicle: 20.7,
            national_avg_driver: 5.5,
          }
        : null,
      crashes: result.data?.totalCrashes
        ? {
            fatal: result.data?.fatalCrashes || 0,
            injury: result.data?.injuryCrashes || 0,
            tow: result.data?.towCrashes || 0,
            total: result.data?.totalCrashes || 0,
          }
        : null,
      fleet_size: {
        power_units: result.data?.powerUnits,
        drivers: result.data?.drivers,
      },
      risk_level: result.riskLevel,
      risk_score: result.riskScore,
      warnings: result.warnings,
      verified_at: result.verifiedAt,
      cache_expires_at: result.expiresAt,
      from_cache: result.cached,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Carrier verification error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify carrier',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/carriers/verify
 * Verify and save a carrier to the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get request body
    const body = await request.json();
    const { mc_number, dot_number, carrier_name } = body;

    // Validate input
    if (!mc_number && !dot_number) {
      return NextResponse.json(
        { error: 'MC number or DOT number is required' },
        { status: 400 }
      );
    }

    // Clean up the numbers
    const mc = mc_number?.replace(/^MC-?/i, '').replace(/\D/g, '');
    const dot = dot_number?.replace(/^DOT-?/i, '').replace(/\D/g, '');

    // Check if carrier already exists
    let existingCarrier = null;

    if (mc) {
      const { data } = await supabase
        .from('carriers')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('mc_number', `MC-${mc}`)
        .single();

      existingCarrier = data;
    }

    if (!existingCarrier && dot) {
      const { data } = await supabase
        .from('carriers')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('dot_number', dot)
        .single();

      existingCarrier = data;
    }

    // Verify with FMCSA
    const verification = await verifyCarrier(mc, dot, true);

    if (!verification.verified) {
      return NextResponse.json(
        {
          error: 'Carrier verification failed',
          warnings: verification.warnings,
        },
        { status: 400 }
      );
    }

    // Prepare carrier data
    const carrierData = {
      organization_id: userOrg.organization_id,
      carrier_name: verification.data?.legalName || carrier_name || 'Unknown Carrier',
      mc_number: mc ? `MC-${mc}` : null,
      dot_number: dot || null,
      legal_name: verification.data?.legalName,
      phone: verification.data?.phone,
      address: verification.data?.physicalAddress,
      city: verification.data?.physicalCity,
      state: verification.data?.physicalState,
      zip_code: verification.data?.physicalZip,
      verification_status:
        verification.riskLevel === 'LOW' ? 'VERIFIED_LOW_RISK' :
        verification.riskLevel === 'MEDIUM' ? 'VERIFIED_MEDIUM_RISK' :
        'VERIFIED_HIGH_RISK',
      verification_warnings: verification.warnings,
      last_verification_date: new Date().toISOString(),
    };

    let carrierId: string;

    if (existingCarrier) {
      // Update existing carrier
      const { error: updateError } = await supabase
        .from('carriers')
        .update(carrierData)
        .eq('id', existingCarrier.id);

      if (updateError) {
        throw updateError;
      }

      carrierId = existingCarrier.id;
    } else {
      // Create new carrier
      const { data: newCarrier, error: createError } = await supabase
        .from('carriers')
        .insert({
          ...carrierData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      carrierId = newCarrier.id;
    }

    // Save verification record
    await supabase
      .from('carrier_verifications')
      .insert({
        carrier_id: carrierId,
        mc_number: mc,
        dot_number: dot,
        legal_name: verification.data?.legalName,
        operating_status: verification.data?.operatingStatus,
        safety_rating: verification.data?.safetyRating,
        bipd_insurance_on_file: verification.data?.bipdInsuranceOnFile,
        cargo_insurance_on_file: verification.data?.cargoInsuranceOnFile,
        risk_level: verification.riskLevel,
        risk_score: verification.riskScore,
        warnings: verification.warnings,
        raw_response: verification.data,
      });

    return NextResponse.json({
      success: true,
      carrier_id: carrierId,
      carrier_name: carrierData.carrier_name,
      verification: {
        risk_level: verification.riskLevel,
        risk_score: verification.riskScore,
        warnings: verification.warnings,
      },
      message: existingCarrier ? 'Carrier updated successfully' : 'Carrier created successfully',
    });

  } catch (error) {
    console.error('Carrier save error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save carrier',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}