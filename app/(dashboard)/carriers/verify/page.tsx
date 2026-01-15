'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Search,
  Shield,
  AlertCircle,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Building,
  Truck,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { CarrierVerificationCard } from '@/components/carriers/CarrierVerificationCard';
import { toast } from '@/components/ui/use-toast';

// Recent searches stored in localStorage
const RECENT_SEARCHES_KEY = 'carrier_verification_recent';
const MAX_RECENT_SEARCHES = 10;

interface RecentSearch {
  mcNumber?: string;
  dotNumber?: string;
  carrierName?: string;
  timestamp: string;
  riskLevel?: string;
}

export default function CarrierVerifyPage() {
  const [mcNumber, setMcNumber] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    mcNumber?: string;
    dotNumber?: string;
  } | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const handleSearch = () => {
    // Validation
    if (!mcNumber && !dotNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please enter either an MC number or DOT number',
        variant: 'destructive',
      });
      return;
    }

    // Clean up the numbers
    const cleanMC = mcNumber.replace(/^MC-?/i, '').replace(/\D/g, '');
    const cleanDOT = dotNumber.replace(/^DOT-?/i, '').replace(/\D/g, '');

    // Set the search result to trigger the verification card
    setSearchResult({
      mcNumber: cleanMC ? `MC-${cleanMC}` : undefined,
      dotNumber: cleanDOT || undefined,
    });

    // Add to recent searches
    const newSearch: RecentSearch = {
      mcNumber: cleanMC ? `MC-${cleanMC}` : undefined,
      dotNumber: cleanDOT || undefined,
      timestamp: new Date().toISOString(),
    };

    const updatedSearches = [
      newSearch,
      ...recentSearches.filter(
        s => s.mcNumber !== newSearch.mcNumber && s.dotNumber !== newSearch.dotNumber
      ).slice(0, MAX_RECENT_SEARCHES - 1),
    ];

    setRecentSearches(updatedSearches);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
  };

  const handleRecentSearch = (search: RecentSearch) => {
    setMcNumber(search.mcNumber?.replace(/^MC-/i, '') || '');
    setDotNumber(search.dotNumber || '');
    setSearchResult({
      mcNumber: search.mcNumber,
      dotNumber: search.dotNumber,
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    toast({
      title: 'Cleared',
      description: 'Recent search history has been cleared',
    });
  };

  const handleVerified = (data: any) => {
    // Update the recent search with verification data
    if (searchResult) {
      const updatedSearches = recentSearches.map(s => {
        if (
          (searchResult.mcNumber && s.mcNumber === searchResult.mcNumber) ||
          (searchResult.dotNumber && s.dotNumber === searchResult.dotNumber)
        ) {
          return {
            ...s,
            carrierName: data.legal_name || s.carrierName,
            riskLevel: data.risk_level,
          };
        }
        return s;
      });
      setRecentSearches(updatedSearches);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/carriers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Carrier Verification</h1>
            <p className="text-muted-foreground">
              Check any carrier against the FMCSA SAFER database
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-muted-foreground">
            Real-time FMCSA verification
          </span>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">About FMCSA Verification</AlertTitle>
        <AlertDescription className="text-blue-800">
          This tool verifies carriers against the Federal Motor Carrier Safety Administration (FMCSA)
          SAFER database. It checks operating authority, insurance status, safety ratings, and
          identifies potential risks. Enter either an MC number or DOT number to get started.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lookup Carrier</CardTitle>
              <CardDescription>
                Enter the carrier's MC or DOT number to verify their status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mc-number">MC Number</Label>
                  <div className="relative">
                    <Input
                      id="mc-number"
                      placeholder="123456"
                      value={mcNumber}
                      onChange={(e) => setMcNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      MC-
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Motor Carrier number (without MC- prefix)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dot-number">DOT Number</Label>
                  <Input
                    id="dot-number"
                    placeholder="1234567"
                    value={dotNumber}
                    onChange={(e) => setDotNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Department of Transportation number
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSearch}
                  disabled={(!mcNumber && !dotNumber) || isSearching}
                  className="flex-1"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify Carrier
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMcNumber('');
                    setDotNumber('');
                    setSearchResult(null);
                  }}
                >
                  Clear
                </Button>
              </div>

              {/* Tips */}
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Search Tips:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>You only need to provide either MC or DOT number, not both</li>
                  <li>Don't include prefixes like "MC-" or "DOT-" - just the numbers</li>
                  <li>Results are cached for 24 hours to reduce API calls</li>
                  <li>Click refresh on the result card to force a new check</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {searchResult && (
            <div className="mt-6">
              <CarrierVerificationCard
                mcNumber={searchResult.mcNumber}
                dotNumber={searchResult.dotNumber}
                onVerified={handleVerified}
              />
            </div>
          )}
        </div>

        {/* Recent Searches */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Searches</CardTitle>
                <CardDescription className="text-xs">
                  Click to search again
                </CardDescription>
              </div>
              {recentSearches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent searches
                </p>
              ) : (
                <div className="space-y-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentSearch(search)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          {search.carrierName && (
                            <p className="text-sm font-medium">{search.carrierName}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {search.mcNumber && (
                              <span className="text-xs text-muted-foreground">
                                {search.mcNumber}
                              </span>
                            )}
                            {search.dotNumber && (
                              <span className="text-xs text-muted-foreground">
                                DOT# {search.dotNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        {search.riskLevel && (
                          <div className="flex items-center">
                            {search.riskLevel === 'LOW' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {search.riskLevel === 'MEDIUM' && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            {search.riskLevel === 'HIGH' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(search.timestamp).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">FMCSA SAFER System</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="https://ai.fmcsa.dot.gov/SMS/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">Safety Measurement System</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="https://li-public.fmcsa.dot.gov/LIVIEW/pkg_html.prc_index"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">Licensing & Insurance</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* What We Check Section */}
      <Card>
        <CardHeader>
          <CardTitle>What We Verify</CardTitle>
          <CardDescription>
            Understanding the verification process and risk assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Authority Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Authority Status</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Operating authority</li>
                <li>• Active/inactive status</li>
                <li>• Out of service flags</li>
                <li>• Authority age</li>
              </ul>
            </div>

            {/* Insurance Coverage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Insurance Coverage</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Liability insurance</li>
                <li>• Cargo insurance</li>
                <li>• Coverage amounts</li>
                <li>• Filing status</li>
              </ul>
            </div>

            {/* Safety Performance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium">Safety Performance</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Safety rating</li>
                <li>• Out-of-service rates</li>
                <li>• Crash history</li>
                <li>• Inspection results</li>
              </ul>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium">Risk Assessment</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Overall risk score</li>
                <li>• Risk level (Low/Med/High)</li>
                <li>• Warning flags</li>
                <li>• Recommendations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}