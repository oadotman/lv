'use client';

// =====================================================
// PHONE NUMBER MANAGEMENT COMPONENT (Admin Only)
// =====================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  Phone,
  Plus,
  UserPlus,
  Users,
  Settings,
  Trash2,
  Power,
  PhoneCall,
  Loader2,
  Check,
  X,
  Edit,
  AlertCircle,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import type { PhoneNumber, TeamMember, PhoneAssignmentType, PhoneNumberStatus } from '@/lib/types/team';

interface PhoneNumberManagementProps {
  organizationId: string;
  isAdmin: boolean;
  teamMembers: TeamMember[];
}

export function PhoneNumberManagement({ organizationId, isAdmin, teamMembers }: PhoneNumberManagementProps) {
  const { toast } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  // Provision dialog state
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [assignmentType, setAssignmentType] = useState<PhoneAssignmentType>('personal');
  const [assignToUser, setAssignToUser] = useState('');

  // Edit dialog state
  const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null);
  const [editFriendlyName, setEditFriendlyName] = useState('');
  const [editAssignmentType, setEditAssignmentType] = useState<PhoneAssignmentType>('personal');
  const [editAssignToUser, setEditAssignToUser] = useState('');

  useEffect(() => {
    fetchPhoneNumbers();
  }, [organizationId]);

  async function fetchPhoneNumbers() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select(`
          *,
          assigned_to_profile:profiles!twilio_phone_numbers_assigned_to_fkey(
            id,
            email,
            full_name
          ),
          assigned_by_profile:profiles!twilio_phone_numbers_assigned_by_fkey(
            id,
            email,
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load phone numbers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function provisionPhoneNumber() {
    if (!friendlyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a friendly name for the number',
        variant: 'destructive',
      });
      return;
    }

    setProvisioning(true);
    try {
      const response = await fetch('/api/team/phone-numbers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_code: areaCode || undefined,
          friendly_name: friendlyName,
          assignment_type: assignmentType,
          assigned_to: assignmentType === 'personal' ? assignToUser : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to provision number');
      }

      const newNumber = await response.json();
      setPhoneNumbers([newNumber, ...phoneNumbers]);

      toast({
        title: 'Success',
        description: `Phone number ${newNumber.phone_number} provisioned successfully`,
      });

      // Reset form
      setShowProvisionDialog(false);
      setAreaCode('');
      setFriendlyName('');
      setAssignmentType('personal');
      setAssignToUser('');
    } catch (error) {
      console.error('Error provisioning number:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to provision phone number',
        variant: 'destructive',
      });
    } finally {
      setProvisioning(false);
    }
  }

  async function updatePhoneNumber() {
    if (!editingNumber) return;

    try {
      const response = await fetch(`/api/team/phone-numbers/${editingNumber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendly_name: editFriendlyName,
          assignment_type: editAssignmentType,
          assigned_to: editAssignmentType === 'personal' ? editAssignToUser : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update phone number');
      }

      const updatedNumber = await response.json();
      setPhoneNumbers(phoneNumbers.map(n => n.id === updatedNumber.id ? updatedNumber : n));

      toast({
        title: 'Success',
        description: 'Phone number updated successfully',
      });

      setEditingNumber(null);
    } catch (error) {
      console.error('Error updating number:', error);
      toast({
        title: 'Error',
        description: 'Failed to update phone number',
        variant: 'destructive',
      });
    }
  }

  async function toggleNumberStatus(number: PhoneNumber) {
    const newStatus: PhoneNumberStatus = number.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch(`/api/team/phone-numbers/${number.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update number status');
      }

      const updatedNumber = await response.json();
      setPhoneNumbers(phoneNumbers.map(n => n.id === updatedNumber.id ? updatedNumber : n));

      toast({
        title: 'Success',
        description: `Phone number ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling number status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update number status',
        variant: 'destructive',
      });
    }
  }

  async function deletePhoneNumber(number: PhoneNumber) {
    if (!confirm(`Are you sure you want to delete ${number.phone_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/team/phone-numbers/${number.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete phone number');
      }

      setPhoneNumbers(phoneNumbers.filter(n => n.id !== number.id));

      toast({
        title: 'Success',
        description: 'Phone number deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting number:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete phone number',
        variant: 'destructive',
      });
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phone Numbers</CardTitle>
          <CardDescription>Your assigned phone numbers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phoneNumbers
              .filter(n => n.assigned_to === teamMembers[0]?.user_id)
              .map(number => (
                <div key={number.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{number.phone_number}</span>
                      {number.friendly_name && (
                        <span className="text-sm text-muted-foreground">({number.friendly_name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={number.status === 'active' ? 'success' : 'secondary'}>
                        {number.status}
                      </Badge>
                      <Badge variant="outline">
                        {number.assignment_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Phone Number Management</CardTitle>
            <CardDescription>Provision and manage phone numbers for your team</CardDescription>
          </div>
          <Dialog open={showProvisionDialog} onOpenChange={setShowProvisionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Provision Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Provision New Phone Number</DialogTitle>
                <DialogDescription>
                  Add a new phone number for your team
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area-code">Area Code (Optional)</Label>
                  <Input
                    id="area-code"
                    placeholder="e.g., 212 for New York"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="friendly-name">Friendly Name</Label>
                  <Input
                    id="friendly-name"
                    placeholder="e.g., Main Sales Line"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-type">Assignment Type</Label>
                  <Select value={assignmentType} onValueChange={(value: PhoneAssignmentType) => setAssignmentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignmentType === 'personal' && (
                  <div className="space-y-2">
                    <Label htmlFor="assign-to">Assign To</Label>
                    <Select value={assignToUser} onValueChange={setAssignToUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name || member.profile?.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProvisionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={provisionPhoneNumber} disabled={provisioning}>
                  {provisioning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    'Provision Number'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : phoneNumbers.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No phone numbers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by provisioning your first phone number.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.map(number => (
                <TableRow key={number.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{number.phone_number}</div>
                      {number.friendly_name && (
                        <div className="text-sm text-muted-foreground">{number.friendly_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={number.assignment_type === 'shared' ? 'secondary' : 'outline'}>
                      {number.assignment_type === 'shared' ? (
                        <Users className="mr-1 h-3 w-3" />
                      ) : (
                        <UserPlus className="mr-1 h-3 w-3" />
                      )}
                      {number.assignment_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {number.assigned_to_profile ? (
                      <div className="text-sm">
                        {number.assigned_to_profile.full_name || number.assigned_to_profile.email}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Team</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={number.status === 'active'}
                        onCheckedChange={() => toggleNumberStatus(number)}
                      />
                      <span className="text-sm">
                        {number.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(number.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingNumber(number);
                            setEditFriendlyName(number.friendly_name || '');
                            setEditAssignmentType(number.assignment_type);
                            setEditAssignToUser(number.assigned_to || '');
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleNumberStatus(number)}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {number.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deletePhoneNumber(number)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingNumber} onOpenChange={(open) => !open && setEditingNumber(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
            <DialogDescription>
              Update phone number settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={editingNumber?.phone_number || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-friendly-name">Friendly Name</Label>
              <Input
                id="edit-friendly-name"
                value={editFriendlyName}
                onChange={(e) => setEditFriendlyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-assignment-type">Assignment Type</Label>
              <Select value={editAssignmentType} onValueChange={(value: PhoneAssignmentType) => setEditAssignmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editAssignmentType === 'personal' && (
              <div className="space-y-2">
                <Label htmlFor="edit-assign-to">Assign To</Label>
                <Select value={editAssignToUser} onValueChange={setEditAssignToUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profile?.full_name || member.profile?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNumber(null)}>
              Cancel
            </Button>
            <Button onClick={updatePhoneNumber}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}