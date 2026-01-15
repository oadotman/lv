'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Phone,
  Copy,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { LoadStatusBadge, LoadStatusFilter, QuickStatusFilters } from '@/components/loads';
import { QuickRateConfirmationButton, QuickEnhancedRateConfirmation } from '@/components/loads';
import type { Load, LoadStatus, Carrier } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// Mock data - replace with actual API calls
const mockLoads: Load[] = [
  {
    id: 'load-001',
    organization_id: 'org-123',
    status: 'in_transit',
    origin_city: 'Chicago',
    origin_state: 'IL',
    destination_city: 'Nashville',
    destination_state: 'TN',
    rate_to_shipper: 2800,
    rate_to_carrier: 2400,
    margin: 400,
    margin_percentage: 14.3,
    pickup_date: '2024-01-22',
    delivery_date: '2024-01-23',
    equipment_type: 'dry_van',
    commodity: 'General Merchandise',
    weight_lbs:42000,
    distance_miles: 473,
    shipper_id: 'shipper-001',
    carrier_id: 'carrier-001',
    reference_number: 'REF-2024-001',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 'load-002',
    organization_id: 'org-123',
    status: 'needs_carrier',
    origin_city: 'Atlanta',
    origin_state: 'GA',
    destination_city: 'Miami',
    destination_state: 'FL',
    rate_to_shipper: 1800,
    pickup_date: '2024-01-23',
    delivery_date: '2024-01-24',
    equipment_type: 'reefer',
    commodity: 'Produce',
    weight_lbs:38000,
    distance_miles: 662,
    shipper_id: 'shipper-002',
    reference_number: 'REF-2024-002',
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-01-20T11:00:00Z',
  },
  {
    id: 'load-003',
    organization_id: 'org-123',
    status: 'delivered',
    origin_city: 'Dallas',
    origin_state: 'TX',
    destination_city: 'Phoenix',
    destination_state: 'AZ',
    rate_to_shipper: 3200,
    rate_to_carrier: 2850,
    margin: 350,
    margin_percentage: 10.9,
    pickup_date: '2024-01-19',
    delivery_date: '2024-01-21',
    equipment_type: 'flatbed',
    commodity: 'Steel Coils',
    weight_lbs:45000,
    distance_miles: 1064,
    shipper_id: 'shipper-003',
    carrier_id: 'carrier-002',
    reference_number: 'REF-2024-003',
    created_at: '2024-01-18T09:00:00Z',
    updated_at: '2024-01-21T14:00:00Z',
  },
];

const mockCarriers: Record<string, Carrier> = {
  'carrier-001': {
    id: 'carrier-001',
    organization_id: 'org-123',
    carrier_name: 'Swift Transport LLC',
    mc_number: 'MC-123456',
    phone: '(555) 123-4567',
    equipment_types: ['dry_van', 'reefer'],
    total_loads: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  'carrier-002': {
    id: 'carrier-002',
    organization_id: 'org-123',
    carrier_name: 'Knight Transportation',
    mc_number: 'MC-234567',
    phone: '(555) 234-5678',
    equipment_types: ['dry_van', 'flatbed'],
    total_loads: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export default function LoadsPage() {
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<LoadStatus[]>([]);
  const [sortBy, setSortBy] = useState<'pickup' | 'delivery' | 'created'>('pickup');
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter loads based on search and status
  const filteredLoads = loads.filter(load => {
    const matchesSearch = searchQuery === '' ||
      load.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.origin_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.destination_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.commodity?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatuses.length === 0 ||
      selectedStatuses.includes(load.status);

    return matchesSearch && matchesStatus;
  });

  // Sort loads
  const sortedLoads = [...filteredLoads].sort((a, b) => {
    switch (sortBy) {
      case 'pickup':
        return new Date(b.pickup_date || 0).getTime() - new Date(a.pickup_date || 0).getTime();
      case 'delivery':
        return new Date(b.delivery_date || 0).getTime() - new Date(a.delivery_date || 0).getTime();
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const handleStatusChange = (loadId: string, newStatus: LoadStatus) => {
    setLoads(loads.map(load =>
      load.id === loadId ? { ...load, status: newStatus } : load
    ));
    toast({
      title: 'Status Updated',
      description: `Load status changed to ${newStatus}`,
    });
  };

  const handleDeleteLoad = (loadId: string) => {
    setLoads(loads.filter(load => load.id !== loadId));
    toast({
      title: 'Load Deleted',
      description: 'Load has been removed from the system',
    });
  };

  const handleCopyLoad = (load: Load) => {
    const loadText = `${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}\nPickup: ${load.pickup_date}\nRate: $${load.rate_to_shipper}`;
    navigator.clipboard.writeText(loadText);
    toast({
      title: 'Copied to Clipboard',
      description: 'Load details copied successfully',
    });
  };

  const statusCounts = loads.reduce((acc, load) => {
    acc[load.status] = (acc[load.status] || 0) + 1;
    return acc;
  }, {} as Record<LoadStatus, number>);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loads</h1>
          <p className="text-muted-foreground">
            Manage all your shipments in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/extraction/new">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Call
            </Button>
          </Link>
          <Link href="/loads/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Load
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loads.filter(l => !['completed', 'cancelled'].includes(l.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Loads in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Carrier</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loads.filter(l => l.status === 'needs_carrier').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting dispatch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${loads.reduce((sum, load) => sum + (load.rate_to_shipper || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loads.filter(l => l.margin_percentage).length > 0
                ? (loads.reduce((sum, load) => sum + (load.margin_percentage || 0), 0) /
                   loads.filter(l => l.margin_percentage).length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all loads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by reference, city, or commodity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <LoadStatusFilter
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
                statusCounts={statusCounts}
                variant="default"
              />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup Date</SelectItem>
                  <SelectItem value="delivery">Delivery Date</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <QuickStatusFilters
              currentFilter={selectedStatuses}
              onFilterChange={setSelectedStatuses}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Loads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLoads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No loads found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                sortedLoads.map((load) => {
                  const carrier = load.carrier_id ? mockCarriers[load.carrier_id] : null;

                  return (
                    <TableRow key={load.id}>
                      <TableCell>
                        <LoadStatusBadge status={load.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{load.reference_number || load.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">{load.equipment_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              → {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>PU: {load.pickup_date ? formatDate(load.pickup_date) : 'TBD'}</p>
                          <p>DL: {load.delivery_date ? formatDate(load.delivery_date) : 'TBD'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {carrier ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{carrier.carrier_name}</p>
                              {/* Verification Status Icon */}
                              {carrier.verification_status && (
                                <>
                                  {carrier.verification_status === 'VERIFIED_LOW_RISK' && (
                                    <span title="Verified - Low Risk">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    </span>
                                  )}
                                  {carrier.verification_status === 'VERIFIED_MEDIUM_RISK' && (
                                    <span title="Verified - Medium Risk">
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    </span>
                                  )}
                                  {carrier.verification_status === 'VERIFIED_HIGH_RISK' && (
                                    <span title="Verified - High Risk">
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    </span>
                                  )}
                                  {carrier.verification_status === 'VERIFICATION_FAILED' && (
                                    <span title="Verification Failed">
                                      <HelpCircle className="h-4 w-4 text-gray-500" />
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{carrier.mc_number}</p>
                            {/* Show critical warnings if any */}
                            {/* TODO: Uncomment when verification_warnings is added to Carrier interface
                            {carrier.verification_warnings &&
                             Array.isArray(carrier.verification_warnings) &&
                             carrier.verification_warnings.some((w: any) => w.type === 'CRITICAL') && (
                              <p className="text-xs text-red-600 font-medium mt-1">
                                ⚠️ {carrier.verification_warnings.find((w: any) => w.type === 'CRITICAL')?.message}
                              </p>
                            )}
                            */}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            Needs Carrier
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">${load.rate_to_shipper?.toLocaleString()}</p>
                          {load.rate_to_carrier && (
                            <p className="text-xs text-muted-foreground">
                              C: ${load.rate_to_carrier.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {load.margin ? (
                          <div>
                            <p className="text-sm font-medium text-green-600">
                              ${load.margin.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {load.margin_percentage?.toFixed(1)}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {carrier && (
                            <>
                              <QuickEnhancedRateConfirmation
                                load={load}
                                carrier={carrier}
                              />
                              <QuickRateConfirmationButton
                                load={load}
                                carrier={carrier}
                              />
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <Link href={`/loads/${load.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/loads/${load.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Load
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem onClick={() => handleCopyLoad(load)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Details
                              </DropdownMenuItem>
                              {carrier && (
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Generate Rate Con
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteLoad(load.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Load
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions are imported from @/lib/utils

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}