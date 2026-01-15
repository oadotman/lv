'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Plus,
  Star,
  TrendingUp,
  Truck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Calendar,
  MessageSquare,
  User,
  Route,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Carrier, EquipmentType } from '@/lib/types';
import { CarrierProfileNew } from '@/components/carriers/CarrierProfileNew';
import { CarrierVerificationBadge } from '@/components/carriers/CarrierVerificationBadge';
import { LaneSearchPanel } from '@/components/carriers/LaneSearchPanel';
import { NaturalLanguageSearch } from '@/components/carriers/NaturalLanguageSearch';
import { toast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDistanceToNow } from 'date-fns';

interface CarrierWithInteractions extends Carrier {
  carrier_interactions?: Array<{
    id: string;
    interaction_type: string;
    interaction_date: string;
    rate_discussed?: number;
    lane_discussed?: string;
    notes: string;
    profiles?: {
      full_name: string;
    };
  }>;
}

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<CarrierWithInteractions[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCarriers: 0,
    activeCarriers: 0,
    averageRating: 0,
    withRecentContact: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [lastContactFilter, setLastContactFilter] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch carriers from API
  const fetchCarriers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (equipmentFilter !== 'all') params.append('equipment', equipmentFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      if (lastContactFilter !== 'all') params.append('lastContact', lastContactFilter);

      const response = await fetch(`/api/carriers?${params}`);
      const data = await response.json();

      if (response.ok) {
        setCarriers(data.carriers);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch carriers',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching carriers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch carriers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, equipmentFilter, statusFilter, ratingFilter, lastContactFilter]);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const handleViewProfile = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setProfileOpen(true);
  };

  const handleCallCarrier = (phone: string) => {
    toast({
      title: 'Calling Carrier',
      description: `Initiating call to ${phone}`,
    });
  };

  const handleEmailCarrier = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return 'text-gray-500';
      case 'blacklisted':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRatingStars = (rating?: number) => {
    return rating || 0;
  };

  const getLastContactColor = (date?: string) => {
    if (!date) return 'text-gray-500';
    const lastContact = new Date(date);
    const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= 7) return 'text-green-600';
    if (daysSince <= 30) return 'text-blue-600';
    if (daysSince <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carriers</h1>
          <p className="text-muted-foreground">
            Your carrier database, built automatically from calls
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Carriers
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Carrier
          </Button>
        </div>
      </div>

      {/* Natural Language Search Bar */}
      <div className="mb-6">
        <NaturalLanguageSearch />
      </div>

      {/* Tabs for Database and Lane Search */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="database" className="gap-2">
            <Truck className="h-4 w-4" />
            Carrier Database
          </TabsTrigger>
          <TabsTrigger value="lanes" className="gap-2">
            <Route className="h-4 w-4" />
            Lane Search
          </TabsTrigger>
        </TabsList>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Carriers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCarriers}</div>
            <p className="text-xs text-muted-foreground">
              In your database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Carriers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeCarriers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(stats.averageRating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Contact</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withRecentContact}</div>
            <p className="text-xs text-muted-foreground">
              Contacted in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search carriers by name, MC#, DOT#, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="reefer">Reefer</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="step_deck">Step Deck</SelectItem>
                  <SelectItem value="lowboy">Lowboy</SelectItem>
                  <SelectItem value="power_only">Power Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lastContactFilter} onValueChange={setLastContactFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Last Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="three_months">3+ Months Ago</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>

              {(equipmentFilter !== 'all' || statusFilter !== 'all' || ratingFilter !== 'all' || lastContactFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEquipmentFilter('all');
                    setStatusFilter('all');
                    setRatingFilter('all');
                    setLastContactFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Carriers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Interactions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No carriers found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  carriers.map((carrier) => (
                    <TableRow key={carrier.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell onClick={() => handleViewProfile(carrier)}>
                        <div>
                          <p className="font-medium">{carrier.carrier_name}</p>
                          <div className="flex gap-2 mt-1">
                            {carrier.mc_number && (
                              <Badge variant="outline" className="text-xs">
                                MC# {carrier.mc_number}
                              </Badge>
                            )}
                            {carrier.dot_number && (
                              <Badge variant="outline" className="text-xs">
                                DOT# {carrier.dot_number}
                              </Badge>
                            )}
                            {carrier.auto_created && (
                              <Badge variant="secondary" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {carrier.primary_contact && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>{carrier.primary_contact}</span>
                            </div>
                          )}
                          {carrier.dispatch_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <button
                                onClick={() => handleCallCarrier(carrier.dispatch_phone || '')}
                                className="hover:text-blue-600"
                              >
                                {carrier.dispatch_phone}
                              </button>
                            </div>
                          )}
                          {carrier.dispatch_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <button
                                onClick={() => handleEmailCarrier(carrier.dispatch_email!)}
                                className="hover:text-blue-600"
                              >
                                {carrier.dispatch_email}
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {carrier.equipment_types?.slice(0, 3).map(type => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                          {carrier.equipment_types && carrier.equipment_types.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{carrier.equipment_types.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {carrier.last_used_date ? (
                          <div className="space-y-1">
                            <p className={`text-sm font-medium ${getLastContactColor(carrier.last_used_date)}`}>
                              {formatDistanceToNow(new Date(carrier.last_used_date), { addSuffix: true })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={carrier.is_blocked ? 'destructive' :
                                  carrier.is_preferred ? 'default' : 'secondary'}
                        >
                          {carrier.is_blocked ? 'blocked' :
                           carrier.is_preferred ? 'preferred' : 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < (carrier.user_rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {carrier.carrier_interactions?.length || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProfile(carrier)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} carriers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Lane Search Tab */}
        <TabsContent value="lanes" className="space-y-4">
          <LaneSearchPanel />
        </TabsContent>
      </Tabs>

      {/* Carrier Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCarrier && (
            <CarrierProfileNew
              carrierId={selectedCarrier.id}
              onClose={() => setProfileOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}