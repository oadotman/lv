import { createClient } from '@supabase/supabase-js';
import type { Carrier } from '@/lib/types';

/**
 * Carrier Service - Manages carrier database operations and statistics
 * Automatically populates and maintains carrier records from call extractions
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Extracted carrier data from calls
export interface ExtractedCarrierData {
  // Identification
  mc_number?: string;
  dot_number?: string;
  company_name?: string;

  // Contact Info
  contact_name?: string;
  phone?: string;
  email?: string;

  // Address
  city?: string;
  state?: string;
  address?: string;
  zip_code?: string;

  // Equipment & Operations
  equipment_types?: string[];
  preferred_lanes?: string[];

  // From current conversation
  quoted_rate?: number;
  available_date?: string;
  driver_name?: string;
  driver_phone?: string;

  // Call metadata
  call_id: string;
  organization_id: string;
  call_date: string;
}

// Carrier statistics update
export interface CarrierStatistics {
  total_loads: number;
  completed_loads: number;
  cancelled_loads: number;
  on_time_percentage: number;
  average_rate: number;
  average_margin: number;
  lifetime_revenue: number;
  preferred_equipment: string[];
  common_lanes: Array<{
    lane: string;
    count: number;
  }>;
  last_load_date?: string;
  performance_score?: number;
}

export class CarrierService {
  /**
   * Process extracted carrier data from a call
   * Creates or updates carrier record and links to load
   */
  async processCarrierFromCall(
    extractedData: ExtractedCarrierData,
    loadId?: string
  ): Promise<{
    carrier: Carrier;
    isNew: boolean;
    updated: boolean;
  }> {
    try {
      // Step 1: Check if carrier exists by MC number
      let existingCarrier = null;
      if (extractedData.mc_number) {
        existingCarrier = await this.findCarrierByMC(
          extractedData.mc_number,
          extractedData.organization_id
        );
      }

      // If no MC number or not found by MC, try by phone
      if (!existingCarrier && extractedData.phone) {
        existingCarrier = await this.findCarrierByPhone(
          extractedData.phone,
          extractedData.organization_id
        );
      }

      let carrier: Carrier;
      let isNew = false;
      let updated = false;

      if (existingCarrier) {
        // Step 2: Update existing carrier
        carrier = await this.updateCarrierFromCall(
          existingCarrier.id,
          extractedData
        );
        updated = true;
      } else {
        // Step 3: Create new carrier
        carrier = await this.createCarrierFromCall(extractedData);
        isNew = true;
      }

      // Step 4: Link carrier to load if provided
      if (loadId) {
        await this.linkCarrierToLoad(carrier.id, loadId, {
          quoted_rate: extractedData.quoted_rate,
          driver_name: extractedData.driver_name,
          driver_phone: extractedData.driver_phone,
        });
      }

      // Step 5: Update carrier statistics
      await this.updateCarrierStatistics(carrier.id);

      // Record the call interaction
      await this.recordCarrierCall(carrier.id, extractedData);

      return { carrier, isNew, updated };
    } catch (error) {
      console.error('Error processing carrier from call:', error);
      throw error;
    }
  }

  /**
   * Find carrier by MC number
   */
  private async findCarrierByMC(
    mcNumber: string,
    organizationId: string
  ): Promise<Carrier | null> {
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('mc_number', mcNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding carrier by MC:', error);
    }

    return data as Carrier | null;
  }

  /**
   * Find carrier by phone number
   */
  private async findCarrierByPhone(
    phone: string,
    organizationId: string
  ): Promise<Carrier | null> {
    // Normalize phone number (remove formatting)
    const normalizedPhone = phone.replace(/\D/g, '');

    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`phone.ilike.%${normalizedPhone}%,alt_phone.ilike.%${normalizedPhone}%`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding carrier by phone:', error);
    }

    return data as Carrier | null;
  }

  /**
   * Create new carrier from extracted call data
   */
  private async createCarrierFromCall(
    extractedData: ExtractedCarrierData
  ): Promise<Carrier> {
    const carrierData = {
      organization_id: extractedData.organization_id,
      name: extractedData.company_name || 'Unknown Carrier',
      mc_number: extractedData.mc_number,
      dot_number: extractedData.dot_number,
      phone: extractedData.phone,
      email: extractedData.email,
      primary_contact: extractedData.contact_name,
      address: extractedData.address,
      city: extractedData.city,
      state: extractedData.state,
      zip_code: extractedData.zip_code,
      equipment_types: extractedData.equipment_types || [],
      preferred_lanes: extractedData.preferred_lanes || [],

      // Initial statistics
      total_loads: 0,
      active_loads: 0,
      on_time_percentage: 100, // Start at 100%
      lifetime_revenue: 0,

      // Metadata
      source: 'carrier_call',
      first_contact_date: extractedData.call_date,
      last_contact_date: extractedData.call_date,
      created_from_call_id: extractedData.call_id,
    };

    const { data, error } = await supabase
      .from('carriers')
      .insert(carrierData)
      .select()
      .single();

    if (error) {
      console.error('Error creating carrier:', error);
      throw error;
    }

    return data as Carrier;
  }

  /**
   * Update existing carrier with new information from call
   */
  private async updateCarrierFromCall(
    carrierId: string,
    extractedData: ExtractedCarrierData
  ): Promise<Carrier> {
    const updates: Partial<Carrier> = {
      last_used_date: extractedData.call_date,
    };

    // Update contact info if provided and newer
    if (extractedData.contact_name) {
      updates.primary_contact = extractedData.contact_name;
    }
    if (extractedData.email) {
      updates.email = extractedData.email;
    }
    if (extractedData.phone) {
      updates.secondary_phone = extractedData.phone; // Store as alternate if different
    }

    // Update address if more complete
    if (extractedData.address && extractedData.city && extractedData.state) {
      updates.address_line1 = extractedData.address;
      updates.city = extractedData.city;
      updates.state = extractedData.state;
      updates.zip_code = extractedData.zip_code;
    }

    // Merge equipment types
    if (extractedData.equipment_types && extractedData.equipment_types.length > 0) {
      const { data: current } = await supabase
        .from('carriers')
        .select('equipment_types')
        .eq('id', carrierId)
        .single();

      const existingEquipment = current?.equipment_types || [];
      const newEquipment = [...new Set([...existingEquipment, ...extractedData.equipment_types])];
      updates.equipment_types = newEquipment;
    }

    // Merge preferred lanes
    if (extractedData.preferred_lanes && extractedData.preferred_lanes.length > 0) {
      const { data: current } = await supabase
        .from('carriers')
        .select('preferred_lanes')
        .eq('id', carrierId)
        .single();

      const existingLanes = current?.preferred_lanes || [];
      const newLanes = [...new Set([...existingLanes, ...extractedData.preferred_lanes])];
      updates.preferred_lanes = newLanes;
    }

    const { data, error } = await supabase
      .from('carriers')
      .update(updates)
      .eq('id', carrierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating carrier:', error);
      throw error;
    }

    return data as Carrier;
  }

  /**
   * Link carrier to a load
   */
  private async linkCarrierToLoad(
    carrierId: string,
    loadId: string,
    details: {
      quoted_rate?: number;
      driver_name?: string;
      driver_phone?: string;
    }
  ): Promise<void> {
    // Update load with carrier assignment
    const { error: loadError } = await supabase
      .from('loads')
      .update({
        carrier_id: carrierId,
        rate_to_carrier: details.quoted_rate,
        driver_name: details.driver_name,
        driver_phone: details.driver_phone,
        carrier_assigned_at: new Date().toISOString(),
      })
      .eq('id', loadId);

    if (loadError) {
      console.error('Error linking carrier to load:', loadError);
      throw loadError;
    }

    // Create carrier-load relationship record
    const { error: relationError } = await supabase
      .from('carrier_loads')
      .insert({
        carrier_id: carrierId,
        load_id: loadId,
        quoted_rate: details.quoted_rate,
        status: 'quoted',
        quoted_at: new Date().toISOString(),
      });

    if (relationError && relationError.code !== '23505') { // Ignore duplicate key
      console.error('Error creating carrier-load relationship:', relationError);
    }
  }

  /**
   * Update carrier statistics based on their load history
   */
  async updateCarrierStatistics(carrierId: string): Promise<CarrierStatistics> {
    try {
      // Get all loads for this carrier
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq('carrier_id', carrierId);

      if (loadsError) {
        console.error('Error fetching carrier loads:', loadsError);
        throw loadsError;
      }

      if (!loads || loads.length === 0) {
        return {
          total_loads: 0,
          completed_loads: 0,
          cancelled_loads: 0,
          on_time_percentage: 100,
          average_rate: 0,
          average_margin: 0,
          lifetime_revenue: 0,
          preferred_equipment: [],
          common_lanes: [],
        };
      }

      // Calculate statistics
      const stats = this.calculateStatistics(loads);

      // Update carrier record with new statistics
      const { error: updateError } = await supabase
        .from('carriers')
        .update({
          total_loads: stats.total_loads,
          completed_loads: stats.completed_loads,
          on_time_percentage: stats.on_time_percentage,
          average_rate: stats.average_rate,
          lifetime_revenue: stats.lifetime_revenue,
          performance_score: stats.performance_score,
          last_load_date: stats.last_load_date,
          statistics_updated_at: new Date().toISOString(),
        })
        .eq('id', carrierId);

      if (updateError) {
        console.error('Error updating carrier statistics:', updateError);
        throw updateError;
      }

      return stats;
    } catch (error) {
      console.error('Error updating carrier statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate statistics from load history
   */
  private calculateStatistics(loads: any[]): CarrierStatistics {
    const totalLoads = loads.length;
    const completedLoads = loads.filter(l => l.status === 'completed').length;
    const cancelledLoads = loads.filter(l => l.status === 'cancelled').length;

    // Calculate on-time percentage
    const deliveredLoads = loads.filter(l =>
      l.status === 'delivered' || l.status === 'completed'
    );
    const onTimeLoads = deliveredLoads.filter(l => {
      if (!l.delivery_date || !l.actual_delivery_date) return true;
      const scheduled = new Date(l.delivery_date);
      const actual = new Date(l.actual_delivery_date);
      return actual <= scheduled;
    });
    const onTimePercentage = deliveredLoads.length > 0
      ? Math.round((onTimeLoads.length / deliveredLoads.length) * 100)
      : 100;

    // Calculate average rate and total revenue
    const ratesArray = loads
      .filter(l => l.rate_to_carrier)
      .map(l => l.rate_to_carrier);
    const averageRate = ratesArray.length > 0
      ? Math.round(ratesArray.reduce((sum, rate) => sum + rate, 0) / ratesArray.length)
      : 0;
    const lifetimeRevenue = ratesArray.reduce((sum, rate) => sum + rate, 0);

    // Calculate average margin
    const marginsArray = loads
      .filter(l => l.margin)
      .map(l => l.margin);
    const averageMargin = marginsArray.length > 0
      ? Math.round(marginsArray.reduce((sum, margin) => sum + margin, 0) / marginsArray.length)
      : 0;

    // Find common equipment types
    const equipmentCounts: Record<string, number> = {};
    loads.forEach(load => {
      if (load.equipment_type) {
        equipmentCounts[load.equipment_type] = (equipmentCounts[load.equipment_type] || 0) + 1;
      }
    });
    const preferredEquipment = Object.entries(equipmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    // Find common lanes
    const laneCounts: Record<string, number> = {};
    loads.forEach(load => {
      if (load.origin_state && load.destination_state) {
        const lane = `${load.origin_state}-${load.destination_state}`;
        laneCounts[lane] = (laneCounts[lane] || 0) + 1;
      }
    });
    const commonLanes = Object.entries(laneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lane, count]) => ({ lane, count }));

    // Get last load date
    const sortedByDate = loads
      .filter(l => l.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastLoadDate = sortedByDate.length > 0 ? sortedByDate[0].created_at : undefined;

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      onTimePercentage,
      completionRate: totalLoads > 0 ? (completedLoads / totalLoads) * 100 : 100,
      cancellationRate: totalLoads > 0 ? (cancelledLoads / totalLoads) * 100 : 0,
      totalLoads,
    });

    return {
      total_loads: totalLoads,
      completed_loads: completedLoads,
      cancelled_loads: cancelledLoads,
      on_time_percentage: onTimePercentage,
      average_rate: averageRate,
      average_margin: averageMargin,
      lifetime_revenue: lifetimeRevenue,
      preferred_equipment: preferredEquipment,
      common_lanes: commonLanes,
      last_load_date: lastLoadDate,
      performance_score: performanceScore,
    };
  }

  /**
   * Calculate carrier performance score
   */
  private calculatePerformanceScore(metrics: {
    onTimePercentage: number;
    completionRate: number;
    cancellationRate: number;
    totalLoads: number;
  }): number {
    // Weighted scoring
    const weights = {
      onTime: 0.4,
      completion: 0.3,
      cancellation: 0.2,
      experience: 0.1,
    };

    // On-time score (0-100)
    const onTimeScore = metrics.onTimePercentage;

    // Completion score (0-100)
    const completionScore = metrics.completionRate;

    // Cancellation score (100-0, lower is better)
    const cancellationScore = Math.max(0, 100 - metrics.cancellationRate * 10);

    // Experience score based on total loads (0-100)
    const experienceScore = Math.min(100, metrics.totalLoads * 2);

    // Calculate weighted score
    const score =
      onTimeScore * weights.onTime +
      completionScore * weights.completion +
      cancellationScore * weights.cancellation +
      experienceScore * weights.experience;

    return Math.round(score);
  }

  /**
   * Record carrier call interaction for history tracking
   */
  private async recordCarrierCall(
    carrierId: string,
    extractedData: ExtractedCarrierData
  ): Promise<void> {
    const { error } = await supabase
      .from('carrier_calls')
      .insert({
        carrier_id: carrierId,
        call_id: extractedData.call_id,
        call_date: extractedData.call_date,
        quoted_rate: extractedData.quoted_rate,
        available_date: extractedData.available_date,
        equipment_mentioned: extractedData.equipment_types,
        lanes_mentioned: extractedData.preferred_lanes,
        contact_name: extractedData.contact_name,
        contact_phone: extractedData.phone,
      });

    if (error && error.code !== '23505') { // Ignore duplicate key
      console.error('Error recording carrier call:', error);
    }
  }

  /**
   * Get carrier with full statistics
   */
  async getCarrierWithStats(carrierId: string): Promise<Carrier & { statistics: CarrierStatistics }> {
    const { data: carrier, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('id', carrierId)
      .single();

    if (error) {
      console.error('Error fetching carrier:', error);
      throw error;
    }

    const statistics = await this.updateCarrierStatistics(carrierId);

    return {
      ...carrier,
      statistics,
    };
  }

  /**
   * Search carriers by various criteria
   */
  async searchCarriers(params: {
    organizationId: string;
    query?: string;
    equipment?: string[];
    lanes?: string[];
    minPerformanceScore?: number;
  }): Promise<Carrier[]> {
    let query = supabase
      .from('carriers')
      .select('*')
      .eq('organization_id', params.organizationId);

    if (params.query) {
      query = query.or(
        `name.ilike.%${params.query}%,mc_number.ilike.%${params.query}%,dot_number.ilike.%${params.query}%`
      );
    }

    if (params.equipment && params.equipment.length > 0) {
      query = query.contains('equipment_types', params.equipment);
    }

    if (params.lanes && params.lanes.length > 0) {
      query = query.contains('preferred_lanes', params.lanes);
    }

    if (params.minPerformanceScore) {
      query = query.gte('performance_score', params.minPerformanceScore);
    }

    const { data, error } = await query
      .order('performance_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching carriers:', error);
      throw error;
    }

    return data as Carrier[];
  }
}

// Export singleton instance
export const carrierService = new CarrierService();