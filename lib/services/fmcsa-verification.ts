import { createClient } from '@/lib/supabase/server';

/**
 * FMCSA SAFER Web Services Integration
 * Provides real-time carrier verification against the Federal Motor Carrier Safety Administration database
 */

// Types
export interface FMCSACarrierData {
  // Basic Info
  dotNumber?: string;
  mcNumber?: string;
  legalName?: string;
  dbaName?: string;

  // Address
  physicalAddress?: string;
  physicalCity?: string;
  physicalState?: string;
  physicalZip?: string;
  phone?: string;

  // Operating Status
  operatingStatus?: string;
  entityType?: string;
  operationClassification?: string;
  cargoCarried?: string[];

  // Authority Dates
  authorityDate?: Date;
  commonAuthorityDate?: Date;
  contractAuthorityDate?: Date;
  brokerAuthorityDate?: Date;

  // Safety
  safetyRating?: string;
  safetyRatingDate?: Date;
  safetyReviewDate?: Date;
  outOfServiceDate?: Date;
  mcs150Date?: Date;
  mcs150Mileage?: number;

  // Insurance
  bipdInsuranceOnFile?: boolean;
  bipdRequired?: number;
  bipdOnFile?: number;
  cargoInsuranceOnFile?: boolean;
  cargoRequired?: number;
  cargoOnFile?: number;
  bondInsuranceOnFile?: boolean;
  bondRequired?: number;
  bondOnFile?: number;

  // Safety Performance
  vehicleInspections?: number;
  vehicleOOS?: number;
  vehicleOOSRate?: number;
  driverInspections?: number;
  driverOOS?: number;
  driverOOSRate?: number;
  hazmatInspections?: number;
  hazmatOOS?: number;
  hazmatOOSRate?: number;

  // Crash Data
  fatalCrashes?: number;
  injuryCrashes?: number;
  towCrashes?: number;
  totalCrashes?: number;

  // Fleet Info
  powerUnits?: number;
  drivers?: number;
}

export interface CarrierVerificationResult {
  verified: boolean;
  data?: FMCSACarrierData;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  warnings: VerificationWarning[];
  cached: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  error?: string;
}

export interface VerificationWarning {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  field?: string;
}

// National averages for comparison
const NATIONAL_AVERAGES = {
  vehicleOOSRate: 20.7,
  driverOOSRate: 5.5,
  hazmatOOSRate: 4.5,
};

/**
 * Main verification function
 */
export async function verifyCarrier(
  mcNumber?: string,
  dotNumber?: string,
  forceRefresh: boolean = false
): Promise<CarrierVerificationResult> {
  const supabase = createClient();

  // Validate input
  if (!mcNumber && !dotNumber) {
    return {
      verified: false,
      riskLevel: 'HIGH',
      riskScore: 0,
      warnings: [
        {
          type: 'CRITICAL',
          message: 'No MC or DOT number provided for verification',
        },
      ],
      cached: false,
      verifiedAt: new Date(),
      expiresAt: new Date(),
      error: 'No MC or DOT number provided',
    };
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedVerification(mcNumber, dotNumber);
    if (cached) {
      return cached;
    }
  }

  // Fetch from FMCSA
  try {
    const fmcsaData = await fetchFromFMCSA(mcNumber, dotNumber);

    if (!fmcsaData) {
      return {
        verified: false,
        riskLevel: 'HIGH',
        riskScore: 0,
        warnings: [
          {
            type: 'CRITICAL',
            message: 'Carrier not found in FMCSA database',
          },
        ],
        cached: false,
        verifiedAt: new Date(),
        expiresAt: new Date(),
        error: 'Carrier not found',
      };
    }

    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(fmcsaData);

    // Cache the result
    await cacheVerification(fmcsaData, riskAssessment, mcNumber, dotNumber);

    return {
      verified: true,
      data: fmcsaData,
      ...riskAssessment,
      cached: false,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  } catch (error) {
    console.error('FMCSA verification error:', error);
    return {
      verified: false,
      riskLevel: 'HIGH',
      riskScore: 0,
      warnings: [
        {
          type: 'WARNING',
          message: 'Unable to verify carrier at this time',
        },
      ],
      cached: false,
      verifiedAt: new Date(),
      expiresAt: new Date(),
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Fetch carrier data from FMCSA SAFER Web Services
 */
async function fetchFromFMCSA(
  mcNumber?: string,
  dotNumber?: string
): Promise<FMCSACarrierData | null> {
  // FMCSA provides multiple endpoints, we'll use the mobile API which returns JSON
  const baseUrl = 'https://mobile.fmcsa.dot.gov/qc/services';

  // Construct the search parameter
  const searchParam = mcNumber ? `mc/${mcNumber}` : `dot/${dotNumber}`;
  const url = `${baseUrl}/carriers/${searchParam}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LoadVoice/1.0', // Identify our application
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Carrier not found
      }
      throw new Error(`FMCSA API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse the FMCSA response into our format
    return parseFMCSAResponse(data);
  } catch (error) {
    console.error('FMCSA API fetch error:', error);

    // Fallback to alternative API endpoint if available
    return fetchFromAlternativeSource(mcNumber, dotNumber);
  }
}

/**
 * Alternative data source (fallback)
 */
async function fetchFromAlternativeSource(
  mcNumber?: string,
  dotNumber?: string
): Promise<FMCSACarrierData | null> {
  // Alternative: Use the SAFER Company Snapshot
  // This is a web scraping approach as a fallback
  const baseUrl = 'https://safer.fmcsa.dot.gov/query.asp';

  try {
    const searchType = mcNumber ? 'MC_MX' : 'DOT';
    const searchValue = mcNumber || dotNumber;

    const params = new URLSearchParams({
      searchtype: searchType,
      query: searchValue!,
    });

    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'LoadVoice/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse HTML response (simplified version)
    return parseHTMLResponse(html);
  } catch (error) {
    console.error('Alternative source fetch error:', error);
    return null;
  }
}

/**
 * Parse FMCSA JSON response
 */
function parseFMCSAResponse(data: any): FMCSACarrierData {
  // The actual structure depends on FMCSA's response format
  // This is a general mapping based on typical FMCSA data

  return {
    dotNumber: data.dotNumber || data.dot,
    mcNumber: data.mcNumber || data.mc,
    legalName: data.legalName || data.name,
    dbaName: data.dbaName || data.doingBusinessAs,

    physicalAddress: data.phyStreet || data.physicalAddress,
    physicalCity: data.phyCity || data.physicalCity,
    physicalState: data.phyState || data.physicalState,
    physicalZip: data.phyZip || data.physicalZip,
    phone: data.phone || data.telephone,

    operatingStatus: parseOperatingStatus(data.status || data.operatingStatus),
    entityType: data.entityType,
    operationClassification: data.operationClassification,
    cargoCarried: parseCargoTypes(data.cargo || data.cargoCarried),

    authorityDate: parseDate(data.authorityDate),
    commonAuthorityDate: parseDate(data.commonAuthorityDate),
    contractAuthorityDate: parseDate(data.contractAuthorityDate),
    brokerAuthorityDate: parseDate(data.brokerAuthorityDate),

    safetyRating: data.safetyRating || data.rating,
    safetyRatingDate: parseDate(data.safetyRatingDate),
    outOfServiceDate: parseDate(data.outOfServiceDate || data.oosDate),
    mcs150Date: parseDate(data.mcs150Date),
    mcs150Mileage: parseInt(data.mcs150Mileage) || undefined,

    bipdInsuranceOnFile: data.bipdInsuranceOnFile === 'Y' || data.bipdInsuranceOnFile === true,
    bipdRequired: parseFloat(data.bipdRequired) || 750000,
    bipdOnFile: parseFloat(data.bipdOnFile) || undefined,
    cargoInsuranceOnFile: data.cargoInsuranceOnFile === 'Y' || data.cargoInsuranceOnFile === true,
    cargoRequired: parseFloat(data.cargoRequired) || 100000,
    cargoOnFile: parseFloat(data.cargoOnFile) || undefined,

    vehicleInspections: parseInt(data.vehicleInspections) || undefined,
    vehicleOOS: parseInt(data.vehicleOOS) || undefined,
    vehicleOOSRate: parseFloat(data.vehicleOOSRate) || undefined,
    driverInspections: parseInt(data.driverInspections) || undefined,
    driverOOS: parseInt(data.driverOOS) || undefined,
    driverOOSRate: parseFloat(data.driverOOSRate) || undefined,

    fatalCrashes: parseInt(data.fatalCrashes) || undefined,
    injuryCrashes: parseInt(data.injuryCrashes) || undefined,
    towCrashes: parseInt(data.towCrashes) || undefined,
    totalCrashes: parseInt(data.totalCrashes) || undefined,

    powerUnits: parseInt(data.powerUnits) || undefined,
    drivers: parseInt(data.drivers) || undefined,
  };
}

/**
 * Parse HTML response (simplified fallback parser)
 */
function parseHTMLResponse(html: string): FMCSACarrierData | null {
  // This is a simplified parser - in production, use a proper HTML parser like cheerio
  const data: FMCSACarrierData = {};

  // Extract MC number
  const mcMatch = html.match(/MC-(\d+)/);
  if (mcMatch) data.mcNumber = mcMatch[1];

  // Extract DOT number
  const dotMatch = html.match(/DOT:\s*(\d+)/);
  if (dotMatch) data.dotNumber = dotMatch[1];

  // Extract legal name
  const nameMatch = html.match(/Legal Name:.*?<[^>]+>([^<]+)</);
  if (nameMatch) data.legalName = nameMatch[1].trim();

  // Extract operating status
  const statusMatch = html.match(/Operating Status:.*?<[^>]+>([^<]+)</);
  if (statusMatch) data.operatingStatus = parseOperatingStatus(statusMatch[1].trim());

  // More parsing would be needed for complete data extraction

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Parse operating status to standard format
 */
function parseOperatingStatus(status: string): string {
  const upperStatus = status?.toUpperCase();

  if (upperStatus?.includes('AUTHORIZED')) return 'AUTHORIZED';
  if (upperStatus?.includes('NOT') && upperStatus?.includes('AUTHORIZED')) return 'NOT AUTHORIZED';
  if (upperStatus?.includes('OUT') && upperStatus?.includes('SERVICE')) return 'OUT OF SERVICE';
  if (upperStatus?.includes('SUSPENDED')) return 'SUSPENDED';

  return 'UNREGISTERED';
}

/**
 * Parse cargo types from various formats
 */
function parseCargoTypes(cargo: any): string[] {
  if (Array.isArray(cargo)) return cargo;
  if (typeof cargo === 'string') return cargo.split(',').map(c => c.trim());
  return [];
}

/**
 * Parse date strings
 */
function parseDate(dateStr: any): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Calculate risk assessment based on FMCSA data
 */
function calculateRiskAssessment(data: FMCSACarrierData): {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  warnings: VerificationWarning[];
} {
  let riskScore = 100;
  const warnings: VerificationWarning[] = [];

  // Critical checks
  if (data.operatingStatus !== 'AUTHORIZED') {
    riskScore -= 50;
    warnings.push({
      type: 'CRITICAL',
      message: `Carrier is ${data.operatingStatus || 'NOT AUTHORIZED'} to operate`,
      field: 'operatingStatus',
    });
  }

  if (data.outOfServiceDate) {
    riskScore -= 40;
    warnings.push({
      type: 'CRITICAL',
      message: `Carrier was placed out of service on ${data.outOfServiceDate}`,
      field: 'outOfServiceDate',
    });
  }

  if (data.safetyRating === 'UNSATISFACTORY') {
    riskScore -= 35;
    warnings.push({
      type: 'CRITICAL',
      message: 'Carrier has an UNSATISFACTORY safety rating',
      field: 'safetyRating',
    });
  }

  // Insurance checks
  const liabilityAdequate = data.bipdOnFile && data.bipdRequired &&
    data.bipdOnFile >= data.bipdRequired;

  if (!data.bipdInsuranceOnFile || !liabilityAdequate) {
    riskScore -= 30;
    warnings.push({
      type: 'CRITICAL',
      message: 'Liability insurance is inadequate or not on file',
      field: 'insurance',
    });
  }

  if (!data.cargoInsuranceOnFile) {
    riskScore -= 15;
    warnings.push({
      type: 'WARNING',
      message: 'Cargo insurance not on file',
      field: 'cargoInsurance',
    });
  }

  // Safety rating warnings
  if (data.safetyRating === 'CONDITIONAL') {
    riskScore -= 20;
    warnings.push({
      type: 'WARNING',
      message: 'Carrier has a CONDITIONAL safety rating',
      field: 'safetyRating',
    });
  }

  // Authority age check
  if (data.authorityDate) {
    const authorityAge = (Date.now() - data.authorityDate.getTime()) / (1000 * 60 * 60 * 24);

    if (authorityAge < 90) {
      riskScore -= 15;
      warnings.push({
        type: 'WARNING',
        message: `New carrier - authority is only ${Math.floor(authorityAge)} days old`,
        field: 'authorityAge',
      });
    } else if (authorityAge < 180) {
      riskScore -= 5;
      warnings.push({
        type: 'INFO',
        message: `Relatively new carrier - authority is ${Math.floor(authorityAge)} days old`,
        field: 'authorityAge',
      });
    }
  }

  // MCS-150 update check
  if (data.mcs150Date) {
    const mcs150Age = (Date.now() - data.mcs150Date.getTime()) / (1000 * 60 * 60 * 24);

    if (mcs150Age > 730) { // 2 years
      riskScore -= 10;
      warnings.push({
        type: 'WARNING',
        message: `MCS-150 not updated in ${Math.floor(mcs150Age / 365)} years`,
        field: 'mcs150Date',
      });
    }
  }

  // Out of Service rates
  if (data.vehicleOOSRate !== undefined) {
    if (data.vehicleOOSRate > 30) {
      riskScore -= 15;
      warnings.push({
        type: 'WARNING',
        message: `High vehicle out-of-service rate: ${data.vehicleOOSRate}% (national avg: ${NATIONAL_AVERAGES.vehicleOOSRate}%)`,
        field: 'vehicleOOSRate',
      });
    } else if (data.vehicleOOSRate > NATIONAL_AVERAGES.vehicleOOSRate) {
      riskScore -= 5;
      warnings.push({
        type: 'INFO',
        message: `Vehicle OOS rate above average: ${data.vehicleOOSRate}% (national avg: ${NATIONAL_AVERAGES.vehicleOOSRate}%)`,
        field: 'vehicleOOSRate',
      });
    }
  }

  if (data.driverOOSRate !== undefined) {
    if (data.driverOOSRate > 10) {
      riskScore -= 15;
      warnings.push({
        type: 'WARNING',
        message: `High driver out-of-service rate: ${data.driverOOSRate}% (national avg: ${NATIONAL_AVERAGES.driverOOSRate}%)`,
        field: 'driverOOSRate',
      });
    } else if (data.driverOOSRate > NATIONAL_AVERAGES.driverOOSRate) {
      riskScore -= 5;
      warnings.push({
        type: 'INFO',
        message: `Driver OOS rate above average: ${data.driverOOSRate}% (national avg: ${NATIONAL_AVERAGES.driverOOSRate}%)`,
        field: 'driverOOSRate',
      });
    }
  }

  // Crash history
  if (data.totalCrashes && data.totalCrashes > 0) {
    if (data.fatalCrashes && data.fatalCrashes > 0) {
      riskScore -= 20;
      warnings.push({
        type: 'WARNING',
        message: `${data.fatalCrashes} fatal crash${data.fatalCrashes > 1 ? 'es' : ''} on record`,
        field: 'crashes',
      });
    }

    if (data.totalCrashes > 5) {
      riskScore -= 10;
      warnings.push({
        type: 'INFO',
        message: `${data.totalCrashes} total crashes on record`,
        field: 'crashes',
      });
    }
  }

  // Ensure score doesn't go below 0
  riskScore = Math.max(0, riskScore);

  // Determine risk level
  let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  if (riskScore >= 80) {
    riskLevel = 'LOW';
  } else if (riskScore >= 50) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  return { riskLevel, riskScore, warnings };
}

/**
 * Get cached verification from database
 */
async function getCachedVerification(
  mcNumber?: string,
  dotNumber?: string
): Promise<CarrierVerificationResult | null> {
  const supabase = createClient();

  try {
    // Build query
    let query = supabase
      .from('carrier_verifications')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    // Add conditions
    if (mcNumber) {
      query = query.eq('mc_number', mcNumber);
    } else if (dotNumber) {
      query = query.eq('dot_number', dotNumber);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    // Parse cached data
    return {
      verified: true,
      data: {
        dotNumber: data.dot_number,
        mcNumber: data.mc_number,
        legalName: data.legal_name,
        dbaName: data.dba_name,
        physicalAddress: data.physical_address,
        physicalCity: data.physical_city,
        physicalState: data.physical_state,
        physicalZip: data.physical_zip,
        phone: data.phone,
        operatingStatus: data.operating_status,
        entityType: data.entity_type,
        safetyRating: data.safety_rating,
        bipdInsuranceOnFile: data.bipd_insurance_on_file,
        bipdRequired: data.bipd_required,
        bipdOnFile: data.bipd_on_file,
        cargoInsuranceOnFile: data.cargo_insurance_on_file,
        vehicleOOSRate: data.vehicle_oos_rate,
        driverOOSRate: data.driver_oos_rate,
      },
      riskLevel: data.risk_level as 'HIGH' | 'MEDIUM' | 'LOW',
      riskScore: data.risk_score || 0,
      warnings: data.warnings || [],
      cached: true,
      verifiedAt: new Date(data.verified_at),
      expiresAt: new Date(data.expires_at),
    };
  } catch (error) {
    console.error('Cache lookup error:', error);
    return null;
  }
}

/**
 * Cache verification result in database
 */
async function cacheVerification(
  data: FMCSACarrierData,
  riskAssessment: { riskLevel: string; riskScore: number; warnings: any[] },
  mcNumber?: string,
  dotNumber?: string
): Promise<void> {
  const supabase = createClient();

  try {
    const verificationData = {
      mc_number: mcNumber || data.mcNumber,
      dot_number: dotNumber || data.dotNumber,
      legal_name: data.legalName,
      dba_name: data.dbaName,
      physical_address: data.physicalAddress,
      physical_city: data.physicalCity,
      physical_state: data.physicalState,
      physical_zip: data.physicalZip,
      phone: data.phone,
      operating_status: data.operatingStatus,
      entity_type: data.entityType,
      operation_classification: data.operationClassification,
      cargo_carried: data.cargoCarried,
      authority_date: data.authorityDate,
      safety_rating: data.safetyRating,
      safety_rating_date: data.safetyRatingDate,
      out_of_service_date: data.outOfServiceDate,
      mcs150_date: data.mcs150Date,
      mcs150_mileage: data.mcs150Mileage,
      bipd_insurance_on_file: data.bipdInsuranceOnFile,
      bipd_required: data.bipdRequired,
      bipd_on_file: data.bipdOnFile,
      cargo_insurance_on_file: data.cargoInsuranceOnFile,
      cargo_required: data.cargoRequired,
      cargo_on_file: data.cargoOnFile,
      vehicle_inspections: data.vehicleInspections,
      vehicle_oos: data.vehicleOOS,
      vehicle_oos_rate: data.vehicleOOSRate,
      driver_inspections: data.driverInspections,
      driver_oos: data.driverOOS,
      driver_oos_rate: data.driverOOSRate,
      fatal_crashes: data.fatalCrashes,
      injury_crashes: data.injuryCrashes,
      tow_crashes: data.towCrashes,
      total_crashes: data.totalCrashes,
      power_units: data.powerUnits,
      drivers: data.drivers,
      risk_level: riskAssessment.riskLevel,
      risk_score: riskAssessment.riskScore,
      warnings: riskAssessment.warnings,
      raw_response: data,
      verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    const { error } = await supabase
      .from('carrier_verifications')
      .insert(verificationData);

    if (error) {
      console.error('Cache insert error:', error);
    }
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

export default {
  verifyCarrier,
  calculateRiskAssessment,
  NATIONAL_AVERAGES,
};