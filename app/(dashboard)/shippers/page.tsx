'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Building2, DollarSign, Package, TrendingUp, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'

interface Shipper {
  id: string
  organization_id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  facility_hours?: string
  appointment_required?: boolean
  lumper_required?: boolean
  preferred_carriers?: string[]
  credit_status?: 'good' | 'warning' | 'hold'
  payment_terms?: string
  total_loads?: number
  active_loads?: number
  lifetime_revenue?: number
  avg_rate_per_mile?: number
  most_common_lanes?: string[]
  notes?: string
  last_load_date?: string
  created_at: string
  updated_at: string
}

export default function ShippersPage() {
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShipper, setSelectedShipper] = useState<Shipper | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Shipper>>({})
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchShippers()
  }, [])

  const fetchShippers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shippers')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setShippers(data || [])
    } catch (error) {
      console.error('Error fetching shippers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shippers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveShipper = async () => {
    try {
      if (!formData.name) {
        toast({
          title: 'Error',
          description: 'Shipper name is required',
          variant: 'destructive',
        })
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single()

      const shipperData = {
        ...formData,
        organization_id: profile?.organization_id,
        preferred_carriers: formData.preferred_carriers || [],
        most_common_lanes: formData.most_common_lanes || [],
      }

      if (selectedShipper) {
        // Update existing shipper
        const { error } = await supabase
          .from('shippers')
          .update(shipperData)
          .eq('id', selectedShipper.id)

        if (error) throw error
        toast({ title: 'Success', description: 'Shipper updated successfully' })
      } else {
        // Create new shipper
        const { error } = await supabase
          .from('shippers')
          .insert([shipperData])

        if (error) throw error
        toast({ title: 'Success', description: 'Shipper created successfully' })
      }

      setIsAddDialogOpen(false)
      setSelectedShipper(null)
      setFormData({})
      fetchShippers()
    } catch (error) {
      console.error('Error saving shipper:', error)
      toast({
        title: 'Error',
        description: 'Failed to save shipper',
        variant: 'destructive',
      })
    }
  }

  const filteredShippers = shippers.filter(shipper =>
    shipper.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipper.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipper.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCreditStatusColor = (status?: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'hold': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatRevenue = (amount?: number) => {
    if (!amount) return '$0'
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  // Calculate stats
  const totalShippers = shippers.length
  const activeShippers = shippers.filter(s => s.active_loads && s.active_loads > 0).length
  const totalRevenue = shippers.reduce((sum, s) => sum + (s.lifetime_revenue || 0), 0)
  const avgRate = shippers.reduce((sum, s) => sum + (s.avg_rate_per_mile || 0), 0) / (shippers.length || 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p>Loading shippers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Shippers</h1>
          <p className="text-gray-600 mt-1">Your customer database, auto-built from calls</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setFormData({}); setSelectedShipper(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shipper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedShipper ? 'Edit' : 'Add'} Shipper</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Company Name*</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Manufacturing Inc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name || ''}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="shipping@company.com"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Industrial Blvd"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Chicago"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="IL"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip || ''}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="60601"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facility_hours">Facility Hours</Label>
                  <Input
                    id="facility_hours"
                    value={formData.facility_hours || ''}
                    onChange={(e) => setFormData({ ...formData, facility_hours: e.target.value })}
                    placeholder="M-F 7AM-3PM"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms || ''}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="Net 30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions, requirements, etc."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveShipper}>
                {selectedShipper ? 'Update' : 'Create'} Shipper
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Shippers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalShippers}</p>
            <p className="text-xs text-gray-500">In your database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Shippers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeShippers}</p>
            <p className="text-xs text-gray-500">With current loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRevenue(totalRevenue)}</p>
            <p className="text-xs text-gray-500">Lifetime value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Rate/Mile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${avgRate.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Across all shippers</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by company name, contact, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Shippers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipper</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Loads</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShippers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No shippers found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredShippers.map((shipper) => (
                <TableRow key={shipper.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{shipper.name}</p>
                      {shipper.facility_hours && (
                        <p className="text-sm text-gray-500">Hours: {shipper.facility_hours}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {shipper.contact_name && <p>{shipper.contact_name}</p>}
                      {shipper.phone && (
                        <p className="text-gray-500">
                          <Phone className="inline h-3 w-3 mr-1" />
                          {shipper.phone}
                        </p>
                      )}
                      {shipper.email && (
                        <p className="text-gray-500">
                          <Mail className="inline h-3 w-3 mr-1" />
                          {shipper.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {shipper.city && shipper.state && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                        {shipper.city}, {shipper.state}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{shipper.total_loads || 0} total</p>
                      {shipper.active_loads ? (
                        <p className="text-green-600">{shipper.active_loads} active</p>
                      ) : (
                        <p className="text-gray-500">0 active</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatRevenue(shipper.lifetime_revenue)}</p>
                    {shipper.avg_rate_per_mile && (
                      <p className="text-sm text-gray-500">${shipper.avg_rate_per_mile}/mi</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getCreditStatusColor(shipper.credit_status)}>
                      {shipper.credit_status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {shipper.last_load_date ? (
                      <div className="text-sm">
                        <Calendar className="inline h-3 w-3 mr-1 text-gray-400" />
                        {new Date(shipper.last_load_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedShipper(shipper)
                        setFormData(shipper)
                        setIsAddDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}