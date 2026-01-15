'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Route,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Calendar,
  BarChart3,
  Filter,
  MapPin,
  Activity,
  Info,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Lane } from '@/lib/types';
import { laneService, type LaneStatistics, type LanePrediction } from '@/lib/lanes/laneService';
import { toast } from '@/components/ui/use-toast';

// Mock data
const mockLanes: Lane[] = [
  {
    id: 'lane-001',
    organization_id: 'org-123',
    origin_city: 'Chicago',
    origin_state: 'IL',
    destination_city: 'Nashville',
    destination_state: 'TN',
    load_count: 47,
    average_rate_shipper: 2400,
    average_rate_carrier: 2050,
    average_margin: 350,
    rate_trend: 'up' as const,
    last_load_date: '2024-01-22',
    created_at: '2023-06-15T00:00:00Z',
    distance_miles: 473,
  },
  {
    id: 'lane-002',
    organization_id: 'org-123',
    origin_city: 'Atlanta',
    origin_state: 'GA',
    destination_city: 'Miami',
    destination_state: 'FL',
    load_count: 32,
    average_rate_shipper: 1800,
    average_rate_carrier: 1550,
    average_margin: 250,
    rate_trend: 'stable' as const,
    last_load_date: '2024-01-21',
    created_at: '2023-07-20T00:00:00Z',
    distance_miles: 662,
  },
  {
    id: 'lane-003',
    organization_id: 'org-123',
    origin_city: 'Dallas',
    origin_state: 'TX',
    destination_city: 'Phoenix',
    destination_state: 'AZ',
    load_count: 28,
    average_rate_shipper: 3200,
    average_rate_carrier: 2800,
    average_margin: 400,
    rate_trend: 'down' as const,
    last_load_date: '2024-01-20',
    created_at: '2023-08-10T00:00:00Z',
    distance_miles: 1064,
  },
];

// Mock lane statistics
const mockStatistics: LaneStatistics = {
  totalLoads: 47,
  averageRate: 2400,
  minRate: 2100,
  maxRate: 2800,
  averageMargin: 350,
  averageDistance: 473,
  topCarriers: [
    { carrierId: 'c1', carrierName: 'Swift Transport', loadCount: 12, averageRate: 2350, onTimePercentage: 92 },
    { carrierId: 'c2', carrierName: 'Knight Transport', loadCount: 8, averageRate: 2400, onTimePercentage: 95 },
    { carrierId: 'c3', carrierName: 'JB Hunt', loadCount: 6, averageRate: 2450, onTimePercentage: 88 },
  ],
  volumeTrend: [
    { month: '2023-10', loadCount: 3, revenue: 7200 },
    { month: '2023-11', loadCount: 4, revenue: 9600 },
    { month: '2023-12', loadCount: 5, revenue: 12000 },
    { month: '2024-01', loadCount: 6, revenue: 14400 },
  ],
  seasonalFactors: { q1: 0.95, q2: 1.05, q3: 1.10, q4: 0.90 },
  rateHistory: [
    { date: '2024-01-15', rate: 2300, margin: 300 },
    { date: '2024-01-16', rate: 2400, margin: 350 },
    { date: '2024-01-18', rate: 2500, margin: 400 },
    { date: '2024-01-20', rate: 2450, margin: 375 },
    { date: '2024-01-22', rate: 2400, margin: 350 },
  ],
};

export default function LaneIntelligencePage() {
  const [lanes, setLanes] = useState<Lane[]>(mockLanes);
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [laneStats, setLaneStats] = useState<LaneStatistics | null>(null);
  const [prediction, setPrediction] = useState<LanePrediction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'revenue' | 'margin'>('volume');
  const [filterState, setFilterState] = useState<string>('all');

  // Filter and sort lanes
  const filteredLanes = lanes.filter(lane => {
    const matchesSearch = searchQuery === '' ||
      `${lane.origin_city} ${lane.origin_state}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${lane.destination_city} ${lane.destination_state}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesState = filterState === 'all' ||
      lane.origin_state === filterState ||
      lane.destination_state === filterState;

    return matchesSearch && matchesState;
  });

  const sortedLanes = [...filteredLanes].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return (b.load_count || 0) - (a.load_count || 0);
      case 'revenue':
        return (b.total_revenue || 0) - (a.total_revenue || 0);
      case 'margin':
        return (b.average_margin_percentage || 0) - (a.average_margin_percentage || 0);
      default:
        return 0;
    }
  });

  const handleViewDetails = async (lane: Lane) => {
    setSelectedLane(lane);
    setLaneStats(mockStatistics); // In production, fetch from API

    // Get rate prediction
    const pred = await laneService.predictLaneRate(lane.id);
    setPrediction(pred);

    setDetailsOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  // Calculate aggregate stats
  const totalVolume = lanes.reduce((sum, lane) => sum + (lane.load_count || 0), 0);
  const totalRevenue = lanes.reduce((sum, lane) => sum + (lane.total_revenue || 0), 0);
  const avgMargin = lanes.length > 0
    ? lanes.reduce((sum, lane) => sum + (lane.average_margin_percentage || 0), 0) / lanes.length
    : 0;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Route className="h-8 w-8" />
            Lane Intelligence
          </h1>
          <p className="text-muted-foreground">
            Know your rates before you quote
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lanes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lanes.length}</div>
            <p className="text-xs text-muted-foreground">
              Active routes in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume}</div>
            <p className="text-xs text-muted-foreground">
              Loads across all lanes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime lane value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
            <Progress value={avgMargin} max={30} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search lanes by city or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="IL">Illinois</SelectItem>
                <SelectItem value="TN">Tennessee</SelectItem>
                <SelectItem value="GA">Georgia</SelectItem>
                <SelectItem value="FL">Florida</SelectItem>
                <SelectItem value="TX">Texas</SelectItem>
                <SelectItem value="AZ">Arizona</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Load Volume</SelectItem>
                <SelectItem value="revenue">Total Revenue</SelectItem>
                <SelectItem value="margin">Margin %</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Lanes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lane</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Avg Rate</TableHead>
                <TableHead>Rate Range</TableHead>
                <TableHead>Avg Margin</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Last Load</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLanes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No lanes found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                sortedLanes.map((lane) => (
                  <TableRow key={lane.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell onClick={() => handleViewDetails(lane)}>
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {lane.origin_city}, {lane.origin_state}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            → {lane.destination_city}, {lane.destination_state}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{lane.distance} mi</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lane.load_count}</span>
                        <span className="text-xs text-muted-foreground">loads</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatCurrency(lane.average_rate || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${((lane.average_rate || 0) / (lane.distance || 1)).toFixed(2)}/mi
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatCurrency(lane.min_rate || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          to {formatCurrency(lane.max_rate || 0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-green-600">
                          {formatCurrency(lane.average_margin || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lane.average_margin_percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {formatCurrency(lane.total_revenue || 0)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {lane.last_load_date
                          ? new Date(lane.last_load_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(lane)}
                      >
                        View Details
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lane Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lane Intelligence: {selectedLane?.origin_city}, {selectedLane?.origin_state} → {selectedLane?.destination_city}, {selectedLane?.destination_state}
            </DialogTitle>
            <DialogDescription>
              Historical data and predictive analytics for this lane
            </DialogDescription>
          </DialogHeader>

          {selectedLane && laneStats && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pricing">Pricing Trends</TabsTrigger>
                <TabsTrigger value="carriers">Top Carriers</TabsTrigger>
                <TabsTrigger value="seasonality">Seasonality</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Loads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{laneStats.totalLoads}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Avg Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatCurrency(laneStats.averageRate)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Avg Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatCurrency(laneStats.averageMargin)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Distance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedLane.distance} mi</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Rate Prediction */}
                {prediction && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Rate Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Predicted Rate</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {formatCurrency(prediction.predictedRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Confidence</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={prediction.confidence} className="h-2" />
                            <span className="text-sm font-medium">{prediction.confidence}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Factors</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Seasonal:</span>
                              <span>{(prediction.factors.seasonal * 100 - 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Demand:</span>
                              <span>{(prediction.factors.demand * 100 - 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Volume Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Volume Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={laneStats.volumeTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="loadCount"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Rate History</CardTitle>
                    <CardDescription>
                      Historical pricing trends for this lane
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={laneStats.rateHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="rate"
                          stroke="#3b82f6"
                          name="Rate"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="margin"
                          stroke="#10b981"
                          name="Margin"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Min Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">{formatCurrency(laneStats.minRate)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Average Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">{formatCurrency(laneStats.averageRate)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Max Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">{formatCurrency(laneStats.maxRate)}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="carriers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Carriers</CardTitle>
                    <CardDescription>
                      Best carriers for this lane based on volume and performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Loads</TableHead>
                          <TableHead>Avg Rate</TableHead>
                          <TableHead>On-Time %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laneStats.topCarriers.map((carrier) => (
                          <TableRow key={carrier.carrierId}>
                            <TableCell className="font-medium">
                              {carrier.carrierName}
                            </TableCell>
                            <TableCell>{carrier.loadCount}</TableCell>
                            <TableCell>{formatCurrency(carrier.averageRate)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={carrier.onTimePercentage}
                                  className="h-2 w-20"
                                />
                                <span className="text-sm">{carrier.onTimePercentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seasonality" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Factors</CardTitle>
                    <CardDescription>
                      Rate variations by quarter (1.0 = average)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { quarter: 'Q1', factor: laneStats.seasonalFactors.q1 },
                          { quarter: 'Q2', factor: laneStats.seasonalFactors.q2 },
                          { quarter: 'Q3', factor: laneStats.seasonalFactors.q3 },
                          { quarter: 'Q4', factor: laneStats.seasonalFactors.q4 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
                        <YAxis domain={[0.8, 1.2]} />
                        <Tooltip />
                        <Bar dataKey="factor" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Seasonal Insights</p>
                          <p className="text-xs">
                            Q3 typically shows {((laneStats.seasonalFactors.q3 - 1) * 100).toFixed(0)}% higher rates due to increased demand.
                            Q4 rates are {((1 - laneStats.seasonalFactors.q4) * 100).toFixed(0)}% below average.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}