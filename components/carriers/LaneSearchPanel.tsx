'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  MapPin,
  Truck,
  Phone,
  DollarSign,
  Star,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const EQUIPMENT_TYPES = [
  { value: 'all', label: 'All Equipment' },
  { value: 'dry_van', label: 'Dry Van' },
  { value: 'reefer', label: 'Reefer' },
  { value: 'flatbed', label: 'Flatbed' },
  { value: 'step_deck', label: 'Step Deck' },
  { value: 'lowboy', label: 'Lowboy' },
  { value: 'power_only', label: 'Power Only' },
  { value: 'hotshot', label: 'Hotshot' },
  { value: 'box_truck', label: 'Box Truck' },
];

interface LaneSearchResult {
  id: string;
  carrier_name: string;
  mc_number?: string;
  dispatch_phone?: string;
  internal_rating?: number;
  equipment_types?: string[];
  laneScore: number;
  hasExactLane: boolean;
  hasSimilarLane: boolean;
  matchingLoads: number;
  matchingInteractions: number;
  averageRate?: number;
  performanceRate?: number;
  equipmentMatch: boolean;
  lastContactedForLane?: string;
}

interface MarketStats {
  averageRate?: number;
  minRate?: number;
  maxRate?: number;
  medianRate?: number;
  totalCarriers: number;
  carriersWithExactLane: number;
  carriersWithSimilarLane: number;
}

export function LaneSearchPanel() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [equipment, setEquipment] = useState('all');
  const [results, setResults] = useState<LaneSearchResult[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!origin || !destination) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both origin and destination',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch('/api/carriers/lane-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          equipment: equipment === 'all' ? null : equipment,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.carriers || []);
        setMarketStats(data.marketStats || null);

        if (data.carriers?.length === 0) {
          toast({
            title: 'No Carriers Found',
            description: 'No carriers found for this lane. Try adjusting your search criteria.',
          });
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching lanes:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search for carriers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Find Carriers for a Lane</CardTitle>
          <CardDescription>
            Search for carriers who have experience running specific routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                placeholder="e.g., Atlanta, GA"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Miami, FL"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label htmlFor="equipment">Equipment Type</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger id="equipment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="w-full"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Statistics */}
      {marketStats && (
        <Card>
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>
              {origin} → {destination}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Average Rate</p>
                <p className="text-2xl font-bold">{formatCurrency(marketStats.averageRate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate Range</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(marketStats.minRate)} - {formatCurrency(marketStats.maxRate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Carriers</p>
                <p className="text-2xl font-bold">{marketStats.totalCarriers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exact Lane Match</p>
                <p className="text-2xl font-bold">{marketStats.carriersWithExactLane}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {results.length > 0
                ? `Found ${results.length} carrier${results.length === 1 ? '' : 's'} for this lane`
                : 'No carriers found for this lane'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No carriers found for this lane. Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((carrier) => (
                  <div
                    key={carrier.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/carriers/${carrier.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{carrier.carrier_name}</h4>
                          {carrier.mc_number && (
                            <span className="text-sm text-muted-foreground">
                              {carrier.mc_number}
                            </span>
                          )}
                          <Badge
                            className={`${getScoreBadgeColor(carrier.laneScore)} text-white`}
                          >
                            {carrier.laneScore}% Match
                          </Badge>
                          {carrier.hasExactLane && (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Exact Lane
                            </Badge>
                          )}
                          {carrier.hasSimilarLane && !carrier.hasExactLane && (
                            <Badge variant="outline" className="border-blue-500 text-blue-700">
                              Similar Lane
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{carrier.dispatch_phone || 'No phone'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{carrier.internal_rating || 'Not rated'}/5</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span>{carrier.matchingLoads} loads on lane</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{carrier.averageRate ? formatCurrency(carrier.averageRate) : 'No rate data'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          {carrier.performanceRate && (
                            <div className="flex items-center gap-1">
                              {carrier.performanceRate >= 90 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-yellow-500" />
                              )}
                              <span>{carrier.performanceRate.toFixed(0)}% on-time</span>
                            </div>
                          )}

                          {carrier.lastContactedForLane && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Last discussed: {format(new Date(carrier.lastContactedForLane), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}

                          {carrier.equipment_types && carrier.equipment_types.length > 0 && (
                            <div className="flex gap-1">
                              {carrier.equipment_types.map(eq => (
                                <Badge key={eq} variant="secondary" className="text-xs">
                                  {eq.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}