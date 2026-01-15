'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  Filter,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// Mock data - replace with actual API calls
const mockRateConfirmations = [
  {
    id: 'RC-2024-001',
    loadId: 'LD-2024-847',
    carrierName: 'Swift Transportation',
    origin: 'Chicago, IL',
    destination: 'Nashville, TN',
    rate: 2800,
    status: 'signed',
    createdAt: new Date('2024-01-10'),
    signedAt: new Date('2024-01-10T14:30:00'),
    commodity: 'Steel Coils'
  },
  {
    id: 'RC-2024-002',
    loadId: 'LD-2024-848',
    carrierName: 'Knight Transport',
    origin: 'Dallas, TX',
    destination: 'Phoenix, AZ',
    rate: 1950,
    status: 'pending',
    createdAt: new Date('2024-01-11'),
    signedAt: null,
    commodity: 'Electronics'
  },
  {
    id: 'RC-2024-003',
    loadId: 'LD-2024-849',
    carrierName: 'Werner Enterprises',
    origin: 'Atlanta, GA',
    destination: 'Miami, FL',
    rate: 1650,
    status: 'expired',
    createdAt: new Date('2024-01-09'),
    signedAt: null,
    commodity: 'Produce'
  },
];

export default function RateConfirmationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rateConfirmations, setRateConfirmations] = useState(mockRateConfirmations);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      signed: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      expired: { variant: 'destructive', icon: AlertCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredConfirmations = rateConfirmations.filter(rc => {
    const matchesSearch =
      rc.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.loadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.destination.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || rc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Rate Confirmations</h1>
          <p className="text-gray-600 mt-2">
            Manage and track all your rate confirmation documents
          </p>
        </div>
        <Link href="/loads">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            New Rate Confirmation
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Confirmations</CardDescription>
            <CardTitle className="text-2xl">{rateConfirmations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Signed</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {rateConfirmations.filter(rc => rc.status === 'signed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Signature</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {rateConfirmations.filter(rc => rc.status === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {rateConfirmations.filter(rc => rc.status === 'expired').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by carrier, load ID, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'signed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('signed')}
                size="sm"
              >
                Signed
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('expired')}
                size="sm"
              >
                Expired
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Confirmations List */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Confirmations</CardTitle>
          <CardDescription>
            Click on any confirmation to view details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confirmation #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commodity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfirmations.length > 0 ? (
                  filteredConfirmations.map((rc) => (
                    <tr key={rc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rc.id}</div>
                          <div className="text-xs text-gray-500">Load: {rc.loadId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rc.carrierName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{rc.origin}</div>
                          <div className="text-gray-500">→ {rc.destination}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rc.commodity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${rc.rate.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(rc.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(rc.createdAt, 'MMM d, yyyy')}
                        </div>
                        {rc.signedAt && (
                          <div className="text-xs text-gray-500">
                            Signed: {format(rc.signedAt, 'h:mm a')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {rc.status === 'pending' && (
                            <Button variant="ghost" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No rate confirmations found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search or filter criteria
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}