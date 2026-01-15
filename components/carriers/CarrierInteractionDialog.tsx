'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from '@/components/ui/use-toast';
import { Loader2, Phone, Mail, MessageSquare, DollarSign } from 'lucide-react';

interface CarrierInteractionDialogProps {
  carrierId: string;
  carrierName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CarrierInteractionDialog({
  carrierId,
  carrierName,
  open,
  onOpenChange,
  onSuccess
}: CarrierInteractionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [interactionType, setInteractionType] = useState('call');
  const [notes, setNotes] = useState('');
  const [rateDiscussed, setRateDiscussed] = useState('');
  const [laneDiscussed, setLaneDiscussed] = useState('');

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter notes for this interaction',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/carriers/${carrierId}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interaction_type: interactionType,
          notes: notes.trim(),
          rate_discussed: rateDiscussed ? parseFloat(rateDiscussed) : undefined,
          lane_discussed: laneDiscussed.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record interaction');
      }

      toast({
        title: 'Success',
        description: 'Interaction recorded successfully',
      });

      // Reset form
      setNotes('');
      setRateDiscussed('');
      setLaneDiscussed('');
      setInteractionType('call');

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error recording interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to record interaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInteractionIcon = () => {
    switch (interactionType) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'rate_update':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Carrier Interaction</DialogTitle>
          <DialogDescription>
            Document your interaction with {carrierName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interaction Type</Label>
            <Select value={interactionType} onValueChange={setInteractionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Call
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="note">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
                <SelectItem value="rate_update">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Rate Update
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Enter details about this interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              required
            />
          </div>

          {(interactionType === 'call' || interactionType === 'rate_update') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate Discussed (optional)</Label>
                <Input
                  id="rate"
                  type="number"
                  placeholder="e.g., 2500.00"
                  value={rateDiscussed}
                  onChange={(e) => setRateDiscussed(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lane">Lane Discussed (optional)</Label>
                <Input
                  id="lane"
                  placeholder="e.g., Chicago, IL to Nashville, TN"
                  value={laneDiscussed}
                  onChange={(e) => setLaneDiscussed(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                {getInteractionIcon()}
                <span className="ml-2">Record Interaction</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}