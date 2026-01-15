'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  LoadStatusDemo,
  LoadStatusBadge,
  LoadStatusFilter,
  RateConfirmationButton,
  QuickRateConfirmationButton
} from '@/components/loads';
import type { Load, Carrier, Shipper } from '@/lib/types';

export default function LoadsDemoPage() {
  // Demo data
  const demoLoad: Load = {
    id: 'load-123456',
    organization_id: 'org-123',
    status: 'dispatched',

    // Origin
    origin_city: 'Chicago',
    origin_state: 'IL',
    origin_zip: '60601',
    pickup_date: '2024-01-15',
    pickup_time_window: '08:00-12:00',
    pickup_address: '123 Warehouse Dr',
    pickup_contact: 'John Smith',
    pickup_phone: '(312) 555-0100',
    pickup_notes: 'Dock 4, bring PPE',

    // Destination
    destination_city: 'Nashville',
    destination_state: 'TN',
    destination_zip: '37201',
    destination_facility: 'ABC Distribution Center',
    delivery_date: '2024-01-16',
    delivery_time_window: '10:00-16:00',
    delivery_address: '456 Distribution Blvd',
    delivery_contact: 'Jane Doe',
    delivery_phone: '(615) 555-0200',
    delivery_notes: 'Call 30 min before arrival',

    // Load details
    commodity: 'General Merchandise',
    weight: 42000,
    weight_lbs: 42000,
    pallets: 26,
    equipment_type: 'dry_van',
    reference_number: 'REF-2024-001',
    special_instructions: 'No tarps needed. Temperature controlled required.',
    distance: 473,

    // Financials
    rate_to_shipper: 2100,
    rate_to_carrier: 1850,
    fuel_surcharge: 150,
    margin: 250,
    margin_percentage: 11.9,
    payment_terms: 'net_30',

    // Relationships
    shipper_id: 'shipper-456',
    carrier_id: 'carrier-789',

    // Driver info
    driver_name: 'Mike Johnson',
    driver_phone: '(555) 123-4567',

    // Metadata
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T14:30:00Z'
  };

  const demoCarrier: Carrier = {
    id: 'carrier-789',
    organization_id: 'org-123',
    carrier_name: 'Swift Transport LLC',
    mc_number: 'MC-987654',
    dot_number: 'DOT-1234567',

    // Contact
    phone: '(800) 555-0300',
    email: 'dispatch@swifttransport.com',
    address_line1: '789 Highway Rd',
    city: 'Memphis',
    state: 'TN',
    zip_code: '38103',

    // Operations
    equipment_types: ['dry_van', 'reefer'],
    preferred_lanes: ['IL-TN', 'TN-GA', 'GA-FL'],

    // Performance
    on_time_percentage: 94,
    total_loads: 156,
    active_loads: 3,
    lifetime_revenue: 287500,

    // Compliance
    insurance_expiry: '2024-12-31',
    authority_status: 'active',
    safety_rating: 'satisfactory',

    // Financial
    payment_terms: 'net_30',

    // Metadata
    created_at: '2023-06-15T08:00:00Z',
    updated_at: '2024-01-14T12:00:00Z'
  };

  const demoShipper: Shipper = {
    id: 'shipper-456',
    organization_id: 'org-123',
    company_name: 'Midwest Manufacturing Inc',

    // Contact
    phone: '(312) 555-0400',
    email: 'logistics@midwestmfg.com',
    primary_contact: 'Sarah Johnson',
    billing_email: 'accounting@midwestmfg.com',

    // Address
    address: {
      line1: '321 Industrial Park',
      city: 'Chicago',
      state: 'IL',
      zip_code: '60605'
    },

    // Business
    credit_status: 'approved',
    credit_limit: 100000,
    payment_terms: 'net_45',
    total_loads: 342,
    total_revenue: 650000,

    // Shipping patterns
    typical_commodities: ['Steel products', 'Industrial equipment'],
    typical_equipment: ['dry_van', 'flatbed'],
    special_requirements: 'All drivers must have TWIC card',

    // Metadata
    created_at: '2023-01-10T09:00:00Z',
    updated_at: '2024-01-14T11:00:00Z'
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Load Management Components</h1>
        <p className="text-muted-foreground mt-2">
          Interactive demo of all load management features and components
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow">Status Workflow</TabsTrigger>
          <TabsTrigger value="confirmation">Rate Confirmations</TabsTrigger>
          <TabsTrigger value="data">Data Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Library</CardTitle>
              <CardDescription>
                Complete set of components for freight broker load management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Status Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Visual indicators for load status throughout the shipping lifecycle
                </p>
                <div className="flex flex-wrap gap-2">
                  <LoadStatusBadge status="quoted" />
                  <LoadStatusBadge status="needs_carrier" />
                  <LoadStatusBadge status="dispatched" />
                  <LoadStatusBadge status="in_transit" />
                  <LoadStatusBadge status="delivered" />
                  <LoadStatusBadge status="completed" />
                  <LoadStatusBadge status="cancelled" />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Rate Confirmation Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate professional rate confirmations for carriers
                </p>
                <div className="flex gap-3">
                  <RateConfirmationButton
                    load={demoLoad}
                    carrier={demoCarrier}
                    shipper={demoShipper}
                  />
                  <QuickRateConfirmationButton
                    load={demoLoad}
                    carrier={demoCarrier}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Filter Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Multiple styles for filtering loads by status
                </p>
                <LoadStatusFilter
                  selectedStatuses={[]}
                  onStatusChange={() => {}}
                  statusCounts={{
                    quoted: 12,
                    needs_carrier: 8,
                    dispatched: 15,
                    in_transit: 23,
                    delivered: 5,
                    completed: 47,
                    cancelled: 3
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <LoadStatusDemo />
        </TabsContent>

        <TabsContent value="confirmation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Confirmation Generator</CardTitle>
              <CardDescription>
                Professional PDF generation for carrier rate confirmations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Load Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Load ID:</span>
                      <span className="font-mono">{demoLoad.id.slice(0, 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <LoadStatusBadge status={demoLoad.status} size="sm" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origin:</span>
                      <span>{demoLoad.origin_city}, {demoLoad.origin_state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination:</span>
                      <span>{demoLoad.destination_city}, {demoLoad.destination_state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span>{demoLoad.distance} miles</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Financial Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate to Shipper:</span>
                      <span className="font-semibold">${demoLoad.rate_to_shipper}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate to Carrier:</span>
                      <span className="font-semibold">${demoLoad.rate_to_carrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Surcharge:</span>
                      <span>${demoLoad.fuel_surcharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin:</span>
                      <span className="text-green-600 font-semibold">
                        ${demoLoad.margin} ({demoLoad.margin_percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms:</span>
                      <span>{demoLoad.payment_terms}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Carrier Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{demoCarrier.carrier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MC Number:</span>
                      <span className="font-mono">{demoCarrier.mc_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact:</span>
                      <span>{demoCarrier.primary_contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{demoCarrier.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Driver Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{demoLoad.driver_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{demoLoad.driver_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equipment:</span>
                      <span>{demoLoad.equipment_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commodity:</span>
                      <span>{demoLoad.commodity}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <RateConfirmationButton
                  load={demoLoad}
                  carrier={demoCarrier}
                  shipper={demoShipper}
                  size="lg"
                  variant="default"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Structure Overview</CardTitle>
              <CardDescription>
                Core data models for the freight broker system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Load Entity</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Central entity representing a shipment from origin to destination
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`interface Load {
  // Identification
  id: string
  organization_id: string
  reference_number?: string

  // Status tracking
  status: LoadStatus

  // Locations
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string

  // Scheduling
  pickup_date?: string
  delivery_date?: string

  // Financials
  rate_to_shipper: number
  rate_to_carrier?: number
  margin?: number
  margin_percentage?: number

  // Relationships
  shipper_id?: string
  carrier_id?: string

  // Load details
  commodity?: string
  weight?: number
  equipment_type?: string
  distance?: number
}`}</pre>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Status Workflow</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Valid transitions and business rules for load statuses
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`type LoadStatus =
  | 'quoted'       // Initial quote to shipper
  | 'needs_carrier' // Booked, finding carrier
  | 'dispatched'    // Carrier assigned
  | 'in_transit'    // Picked up, moving
  | 'delivered'     // At destination
  | 'completed'     // POD received, done
  | 'cancelled'     // Load cancelled

// Valid transitions
quoted → needs_carrier, cancelled
needs_carrier → dispatched, cancelled
dispatched → in_transit, cancelled
in_transit → delivered, cancelled
delivered → completed, cancelled
completed → (terminal)
cancelled → (terminal)`}</pre>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Carrier Entity</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Trucking company that transports loads
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`interface Carrier {
  // Identification
  id: string
  name: string
  mc_number?: string
  dot_number?: string

  // Contact
  phone?: string
  email?: string
  primary_contact?: string

  // Operations
  equipment_types: string[]
  preferred_lanes?: string[]

  // Performance
  on_time_percentage?: number
  safety_rating?: string

  // Compliance
  insurance_expiry?: string
  authority_status?: string
}`}</pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Shipper Entity</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Customer who needs freight transported
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`interface Shipper {
  // Identification
  id: string
  name: string

  // Contact
  phone?: string
  email?: string
  primary_contact?: string

  // Business
  credit_status?: string
  credit_limit?: number
  payment_terms?: string

  // Statistics
  total_loads?: number
  lifetime_revenue?: number
  avg_days_to_pay?: number

  // Preferences
  preferred_equipment?: string[]
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}