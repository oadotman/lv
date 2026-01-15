'use client';

// =====================================================
// SHARED CALLS VIEW - Team Visibility Component
// =====================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Phone,
  Users,
  User,
  Calendar,
  Clock,
  FileText,
  Search,
  Filter,
  Download,
  Play,
  Loader2,
  PhoneCall,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TeamCall, TeamMember } from '@/lib/types/team';

interface SharedCallsViewProps {
  organizationId: string;
  userId: string;
  teamMembers: TeamMember[];
  isAdmin: boolean;
}

export function SharedCallsView({ organizationId, userId, teamMembers, isAdmin }: SharedCallsViewProps) {
  const [calls, setCalls] = useState<TeamCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7days');
  const [showTeamCalls, setShowTeamCalls] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, [organizationId, viewMode, selectedMember, dateFilter]);

  async function fetchCalls() {
    try {
      const supabase = createClient();
      let query = supabase
        .from('calls')
        .select(`
          *,
          profile:profiles!calls_user_id_fkey(
            id,
            email,
            full_name
          ),
          phone_number:twilio_phone_numbers(
            phone_number,
            friendly_name,
            assignment_type
          ),
          extracted_info
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Apply view mode filter
      if (viewMode === 'mine') {
        query = query.eq('user_id', userId);
      } else if (showTeamCalls) {
        query = query.eq('visibility', 'team');
      }

      // Apply member filter
      if (selectedMember !== 'all') {
        query = query.eq('user_id', selectedMember);
      }

      // Apply date filter
      const now = new Date();
      let startDate: Date;
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      query = query.gte('created_at', startDate.toISOString());

      // Limit results for performance
      query = query.limit(100);

      const { data, error } = await supabase.rpc('get_team_calls', {
        org_id: organizationId,
        user_filter: viewMode === 'mine' ? userId : selectedMember !== 'all' ? selectedMember : null,
        date_from: startDate.toISOString(),
      });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCalls(calls: TeamCall[]) {
    if (!searchQuery) return calls;

    const query = searchQuery.toLowerCase();
    return calls.filter(call =>
      call.from_number?.toLowerCase().includes(query) ||
      call.user_name?.toLowerCase().includes(query) ||
      call.extracted_info?.carrier_name?.toLowerCase().includes(query) ||
      call.extracted_info?.shipper_name?.toLowerCase().includes(query)
    );
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const filteredCalls = filterCalls(calls);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Calls</CardTitle>
              <CardDescription>
                View and access all team call recordings and insights
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="team-calls"
                  checked={showTeamCalls}
                  onCheckedChange={setShowTeamCalls}
                />
                <Label htmlFor="team-calls">Show Team Calls</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'all' | 'mine')} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">
                  <Users className="mr-2 h-4 w-4" />
                  All Team
                </TabsTrigger>
                <TabsTrigger value="mine">
                  <User className="mr-2 h-4 w-4" />
                  My Calls
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number, name, carrier, or shipper..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.profile?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-8">
              <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No calls found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search filters' : 'Start making calls to see them here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead>From Number</TableHead>
                  <TableHead>To/From</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Extracted Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map(call => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {new Date(call.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(call.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {call.user_name || call.user_email}
                        </div>
                        {call.user_id === userId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{call.from_number}</div>
                        {call.number_name && (
                          <div className="text-xs text-muted-foreground">{call.number_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{call.from_number || 'Unknown'}</div>
                        <Badge variant="outline" className="text-xs">
                          {call.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDuration(call.duration || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {call.extracted_info?.carrier_name && (
                          <Badge variant="secondary" className="text-xs">
                            Carrier: {call.extracted_info.carrier_name}
                          </Badge>
                        )}
                        {call.extracted_info?.shipper_name && (
                          <Badge variant="secondary" className="text-xs">
                            Shipper: {call.extracted_info.shipper_name}
                          </Badge>
                        )}
                        {!call.extracted_info?.carrier_name && !call.extracted_info?.shipper_name && (
                          <span className="text-xs text-muted-foreground">No data extracted</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        call.processing_status === 'completed' ? 'success' :
                        call.processing_status === 'failed' ? 'destructive' :
                        call.processing_status === 'processing' ? 'warning' :
                        'secondary'
                      }>
                        {call.processing_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {call.recording_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(call.recording_url, '_blank')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/calls/${call.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}