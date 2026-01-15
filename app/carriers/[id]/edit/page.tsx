'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, X } from 'lucide-react';

const EQUIPMENT_TYPES = [
  'dry_van',
  'reefer',
  'flatbed',
  'step_deck',
  'lowboy',
  'power_only',
  'hotshot',
  'box_truck',
];

export default function EditCarrierPage() {
  const params = useParams();
  const router = useRouter();
  const carrierId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    carrier_name: '',
    mc_number: '',
    dot_number: '',
    primary_contact: '',
    dispatch_phone: '',
    dispatch_email: '',
    driver_name: '',
    driver_phone: '',
    equipment_types: [] as string[],
    status: 'active',
    internal_rating: 3,
    notes: '',
    tags: [] as string[],
    average_rate: '',
    average_rate_per_mile: '',
  });

  useEffect(() => {
    fetchCarrier();
  }, [carrierId]);

  const fetchCarrier = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/carriers/${carrierId}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          carrier_name: data.carrier_name || '',
          mc_number: data.mc_number || '',
          dot_number: data.dot_number || '',
          primary_contact: data.primary_contact || '',
          dispatch_phone: data.dispatch_phone || '',
          dispatch_email: data.dispatch_email || '',
          driver_name: data.driver_name || '',
          driver_phone: data.driver_phone || '',
          equipment_types: data.equipment_types || [],
          status: data.status || 'active',
          internal_rating: data.internal_rating || 3,
          notes: data.notes || '',
          tags: data.tags || [],
          average_rate: data.average_rate?.toString() || '',
          average_rate_per_mile: data.average_rate_per_mile?.toString() || '',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load carrier details',
          variant: 'destructive',
        });
        router.push(`/carriers/${carrierId}`);
      }
    } catch (error) {
      console.error('Error fetching carrier:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carrier details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          average_rate: formData.average_rate ? parseFloat(formData.average_rate) : null,
          average_rate_per_mile: formData.average_rate_per_mile ? parseFloat(formData.average_rate_per_mile) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Carrier updated successfully',
        });
        router.push(`/carriers/${carrierId}`);
      } else {
        throw new Error('Failed to update carrier');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update carrier',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEquipmentChange = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_types: prev.equipment_types.includes(equipment)
        ? prev.equipment_types.filter(e => e !== equipment)
        : [...prev.equipment_types, equipment],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Edit Carrier</h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/carriers/${carrierId}`)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier_name">Carrier Name *</Label>
                  <Input
                    id="carrier_name"
                    value={formData.carrier_name}
                    onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mc_number">MC Number</Label>
                  <Input
                    id="mc_number"
                    value={formData.mc_number}
                    onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })}
                    placeholder="MC-123456"
                  />
                </div>
                <div>
                  <Label htmlFor="dot_number">DOT Number</Label>
                  <Input
                    id="dot_number"
                    value={formData.dot_number}
                    onChange={(e) => setFormData({ ...formData, dot_number: e.target.value })}
                    placeholder="DOT-1234567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_contact">Dispatcher Name</Label>
                  <Input
                    id="primary_contact"
                    value={formData.primary_contact}
                    onChange={(e) => setFormData({ ...formData, primary_contact: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dispatch_phone">Dispatcher Phone</Label>
                  <Input
                    id="dispatch_phone"
                    type="tel"
                    value={formData.dispatch_phone}
                    onChange={(e) => setFormData({ ...formData, dispatch_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="dispatch_email">Dispatcher Email</Label>
                  <Input
                    id="dispatch_email"
                    type="email"
                    value={formData.dispatch_email}
                    onChange={(e) => setFormData({ ...formData, dispatch_email: e.target.value })}
                    placeholder="dispatcher@example.com"
                  />
                </div>
                <div />
                <div>
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="driver_phone">Driver Phone</Label>
                  <Input
                    id="driver_phone"
                    type="tel"
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    placeholder="(555) 987-6543"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Types */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Types</CardTitle>
              <CardDescription>Select all equipment types this carrier operates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {EQUIPMENT_TYPES.map(equipment => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={equipment}
                      checked={formData.equipment_types.includes(equipment)}
                      onCheckedChange={() => handleEquipmentChange(equipment)}
                    />
                    <Label
                      htmlFor={equipment}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {equipment.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rating and Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Rating & Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="internal_rating">Internal Rating (1-5)</Label>
                  <Select
                    value={formData.internal_rating.toString()}
                    onValueChange={(value) => setFormData({ ...formData, internal_rating: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>
                          {rating} Star{rating > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="average_rate">Average Rate ($)</Label>
                  <Input
                    id="average_rate"
                    type="number"
                    step="0.01"
                    value={formData.average_rate}
                    onChange={(e) => setFormData({ ...formData, average_rate: e.target.value })}
                    placeholder="2500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="average_rate_per_mile">Rate per Mile ($)</Label>
                  <Input
                    id="average_rate_per_mile"
                    type="number"
                    step="0.01"
                    value={formData.average_rate_per_mile}
                    onChange={(e) => setFormData({ ...formData, average_rate_per_mile: e.target.value })}
                    placeholder="2.15"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
              <CardDescription>Add any notes about this carrier (visible to your team only)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Enter notes about this carrier..."
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}