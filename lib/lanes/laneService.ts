import type { Load, Lane } from '@/lib/types';

/**
 * Lane Intelligence Service
 * Automatically builds lane database from loads and provides analytics
 */

export interface LaneStatistics {
  totalLoads: number;
  averageRate: number;
  minRate: number;
  maxRate: number;
  averageMargin: number;
  averageDistance: number;
  topCarriers: Array<{
    carrierId: string;
    carrierName: string;
    loadCount: number;
    averageRate: number;
    onTimePercentage: number;
  }>;
  volumeTrend: Array<{
    month: string;
    loadCount: number;
    revenue: number;
  }>;
  seasonalFactors: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  rateHistory: Array<{
    date: string;
    rate: number;
    margin: number;
  }>;
}

export interface LanePrediction {
  predictedRate: number;
  confidence: number;
  factors: {
    historical: number;
    seasonal: number;
    demand: number;
  };
}

export class LaneService {
  /**
   * Get or create lane from load data
   */
  async getOrCreateLane(load: Load): Promise<Lane> {
    const laneKey = `${load.origin_state}-${load.destination_state}`;

    // Check if lane exists
    let lane = await this.findLaneByKey(laneKey);

    if (!lane) {
      // Create new lane
      lane = {
        id: this.generateLaneId(),
        organization_id: load.organization_id,
        origin_city: load.origin_city,
        origin_state: load.origin_state,
        destination_city: load.destination_city,
        destination_state: load.destination_state,
        distance: load.distance || 0,
        load_count: 1,
        total_revenue: load.rate_to_shipper || 0,
        average_rate: load.rate_to_shipper || 0,
        average_rate_shipper: load.rate_to_shipper || 0,
        average_rate_carrier: load.rate_to_carrier || 0,
        rate_trend: 'stable',
        min_rate: load.rate_to_shipper || 0,
        max_rate: load.rate_to_shipper || 0,
        average_margin: load.margin || 0,
        average_margin_percentage: load.margin_percentage || 0,
        last_load_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    } else {
      // Update existing lane
      lane = this.updateLaneMetrics(lane, load);
    }

    return lane;
  }

  /**
   * Update lane metrics with new load data
   */
  private updateLaneMetrics(lane: Lane, load: Load): Lane {
    const newLoadCount = (lane.load_count || 0) + 1;
    const newTotalRevenue = (lane.total_revenue || 0) + (load.rate_to_shipper || 0);
    const newAverageRate = newTotalRevenue / newLoadCount;

    // Update margin calculations
    const currentTotalMargin = (lane.average_margin || 0) * (lane.load_count || 0);
    const newTotalMargin = currentTotalMargin + (load.margin || 0);
    const newAverageMargin = newTotalMargin / newLoadCount;

    return {
      ...lane,
      load_count: newLoadCount,
      total_revenue: newTotalRevenue,
      average_rate: Math.round(newAverageRate),
      min_rate: Math.min(lane.min_rate || Infinity, load.rate_to_shipper || Infinity),
      max_rate: Math.max(lane.max_rate || 0, load.rate_to_shipper || 0),
      average_margin: Math.round(newAverageMargin),
      average_margin_percentage: load.margin_percentage
        ? ((lane.average_margin_percentage || 0) * (lane.load_count || 0) + load.margin_percentage) / newLoadCount
        : lane.average_margin_percentage,
      last_load_date: new Date().toISOString(),
    };
  }

  /**
   * Get lane statistics with full analytics
   */
  async getLaneStatistics(laneId: string): Promise<LaneStatistics> {
    // Get all loads for this lane
    const loads = await this.getLoadsForLane(laneId);

    if (!loads || loads.length === 0) {
      return this.getEmptyStatistics();
    }

    // Calculate basic statistics
    const totalLoads = loads.length;
    const rates = loads.map(l => l.rate_to_shipper || 0).filter(r => r > 0);
    const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    // Calculate margin statistics
    const margins = loads.map(l => l.margin || 0).filter(m => m > 0);
    const averageMargin = margins.length > 0
      ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length
      : 0;

    // Calculate distance
    const distances = loads.map(l => l.distance || 0).filter(d => d > 0);
    const averageDistance = distances.length > 0
      ? distances.reduce((sum, dist) => sum + dist, 0) / distances.length
      : 0;

    // Get top carriers
    const topCarriers = this.calculateTopCarriers(loads);

    // Calculate volume trends
    const volumeTrend = this.calculateVolumeTrends(loads);

    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors(loads);

    // Get rate history
    const rateHistory = this.getRateHistory(loads);

    return {
      totalLoads,
      averageRate: Math.round(averageRate),
      minRate,
      maxRate,
      averageMargin: Math.round(averageMargin),
      averageDistance: Math.round(averageDistance),
      topCarriers,
      volumeTrend,
      seasonalFactors,
      rateHistory,
    };
  }

  /**
   * Calculate top performing carriers for a lane
   */
  private calculateTopCarriers(loads: Load[]): LaneStatistics['topCarriers'] {
    const carrierMap = new Map<string, {
      name: string;
      loads: Load[];
      totalRate: number;
      onTimeCount: number;
    }>();

    // Group loads by carrier
    loads.forEach(load => {
      if (!load.carrier_id) return;

      if (!carrierMap.has(load.carrier_id)) {
        carrierMap.set(load.carrier_id, {
          name: '', // Would be fetched from carrier service
          loads: [],
          totalRate: 0,
          onTimeCount: 0,
        });
      }

      const carrier = carrierMap.get(load.carrier_id)!;
      carrier.loads.push(load);
      carrier.totalRate += load.rate_to_carrier || 0;

      // Check if delivered on time (simplified logic)
      if (load.status === 'completed' || load.status === 'delivered') {
        carrier.onTimeCount++;
      }
    });

    // Convert to array and calculate metrics
    const carriers = Array.from(carrierMap.entries()).map(([carrierId, data]) => ({
      carrierId,
      carrierName: data.name || `Carrier ${carrierId.slice(-4)}`,
      loadCount: data.loads.length,
      averageRate: Math.round(data.totalRate / data.loads.length),
      onTimePercentage: Math.round((data.onTimeCount / data.loads.length) * 100),
    }));

    // Sort by load count and return top 5
    return carriers
      .sort((a, b) => b.loadCount - a.loadCount)
      .slice(0, 5);
  }

  /**
   * Calculate volume trends over time
   */
  private calculateVolumeTrends(loads: Load[]): LaneStatistics['volumeTrend'] {
    const monthMap = new Map<string, { count: number; revenue: number }>();

    loads.forEach(load => {
      const date = new Date(load.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { count: 0, revenue: 0 });
      }

      const month = monthMap.get(monthKey)!;
      month.count++;
      month.revenue += load.rate_to_shipper || 0;
    });

    // Convert to array and sort by date
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        loadCount: data.count,
        revenue: Math.round(data.revenue),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  /**
   * Calculate seasonal factors (Q1-Q4)
   */
  private calculateSeasonalFactors(loads: Load[]): LaneStatistics['seasonalFactors'] {
    const quarters = { q1: 0, q2: 0, q3: 0, q4: 0 };
    const quarterCounts = { q1: 0, q2: 0, q3: 0, q4: 0 };

    loads.forEach(load => {
      const month = new Date(load.created_at).getMonth() + 1;
      const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
      const key = `q${quarter}` as keyof typeof quarters;

      quarters[key] += load.rate_to_shipper || 0;
      quarterCounts[key]++;
    });

    // Calculate average rate per quarter
    const avgRates = {
      q1: quarterCounts.q1 > 0 ? quarters.q1 / quarterCounts.q1 : 0,
      q2: quarterCounts.q2 > 0 ? quarters.q2 / quarterCounts.q2 : 0,
      q3: quarterCounts.q3 > 0 ? quarters.q3 / quarterCounts.q3 : 0,
      q4: quarterCounts.q4 > 0 ? quarters.q4 / quarterCounts.q4 : 0,
    };

    // Calculate overall average
    const totalRate = quarters.q1 + quarters.q2 + quarters.q3 + quarters.q4;
    const totalCount = quarterCounts.q1 + quarterCounts.q2 + quarterCounts.q3 + quarterCounts.q4;
    const overallAvg = totalCount > 0 ? totalRate / totalCount : 1;

    // Calculate factors (1.0 = average, >1.0 = above average)
    return {
      q1: overallAvg > 0 ? Number((avgRates.q1 / overallAvg).toFixed(2)) : 1,
      q2: overallAvg > 0 ? Number((avgRates.q2 / overallAvg).toFixed(2)) : 1,
      q3: overallAvg > 0 ? Number((avgRates.q3 / overallAvg).toFixed(2)) : 1,
      q4: overallAvg > 0 ? Number((avgRates.q4 / overallAvg).toFixed(2)) : 1,
    };
  }

  /**
   * Get rate history for chart
   */
  private getRateHistory(loads: Load[]): LaneStatistics['rateHistory'] {
    return loads
      .filter(load => load.rate_to_shipper)
      .map(load => ({
        date: load.created_at.split('T')[0],
        rate: load.rate_to_shipper || 0,
        margin: load.margin || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 loads
  }

  /**
   * Predict rate for a lane based on historical data and factors
   */
  async predictLaneRate(
    laneId: string,
    date?: string,
    equipmentType?: string
  ): Promise<LanePrediction> {
    const stats = await this.getLaneStatistics(laneId);

    if (stats.totalLoads < 3) {
      // Not enough data for prediction
      return {
        predictedRate: stats.averageRate,
        confidence: 30,
        factors: {
          historical: 1.0,
          seasonal: 1.0,
          demand: 1.0,
        },
      };
    }

    // Base rate from historical average
    let predictedRate = stats.averageRate;

    // Apply seasonal factor
    const requestDate = date ? new Date(date) : new Date();
    const quarter = Math.ceil((requestDate.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
    const seasonalFactor = stats.seasonalFactors[`q${quarter}` as keyof typeof stats.seasonalFactors];
    predictedRate *= seasonalFactor;

    // Apply trend factor (simplified)
    const recentTrend = this.calculateRecentTrend(stats.rateHistory);
    predictedRate *= recentTrend;

    // Calculate confidence based on data volume
    const confidence = Math.min(90, 30 + Math.min(60, stats.totalLoads * 2));

    return {
      predictedRate: Math.round(predictedRate),
      confidence,
      factors: {
        historical: 1.0,
        seasonal: seasonalFactor,
        demand: recentTrend,
      },
    };
  }

  /**
   * Calculate recent pricing trend
   */
  private calculateRecentTrend(rateHistory: LaneStatistics['rateHistory']): number {
    if (rateHistory.length < 5) return 1.0;

    const recentRates = rateHistory.slice(-5);
    const olderRates = rateHistory.slice(-10, -5);

    if (olderRates.length === 0) return 1.0;

    const recentAvg = recentRates.reduce((sum, h) => sum + h.rate, 0) / recentRates.length;
    const olderAvg = olderRates.reduce((sum, h) => sum + h.rate, 0) / olderRates.length;

    const trendFactor = recentAvg / olderAvg;

    // Cap the trend factor to reasonable bounds (80% to 120%)
    return Math.max(0.8, Math.min(1.2, trendFactor));
  }

  /**
   * Get all lanes for an organization
   */
  async getLanesForOrganization(organizationId: string): Promise<Lane[]> {
    // In production, this would query the database
    // For now, return mock data
    return [];
  }

  /**
   * Search lanes by criteria
   */
  async searchLanes(params: {
    organizationId: string;
    originState?: string;
    destinationState?: string;
    minVolume?: number;
    minMargin?: number;
  }): Promise<Lane[]> {
    // In production, this would query the database with filters
    return [];
  }

  // Helper methods (would interact with database in production)
  private async findLaneByKey(laneKey: string): Promise<Lane | null> {
    // Mock implementation
    return null;
  }

  private async getLoadsForLane(laneId: string): Promise<Load[]> {
    // Mock implementation
    return [];
  }

  private generateLaneId(): string {
    return `lane-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private getEmptyStatistics(): LaneStatistics {
    return {
      totalLoads: 0,
      averageRate: 0,
      minRate: 0,
      maxRate: 0,
      averageMargin: 0,
      averageDistance: 0,
      topCarriers: [],
      volumeTrend: [],
      seasonalFactors: { q1: 1, q2: 1, q3: 1, q4: 1 },
      rateHistory: [],
    };
  }
}

// Export singleton instance
export const laneService = new LaneService();