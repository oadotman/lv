'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { LoadStatus } from '@/lib/types';
import { LoadStatusBadge, LoadStatusProgress, LOAD_STATUS_CONFIG } from './LoadStatusBadge';
import { LoadStatusFilter, QuickStatusFilters, StatusStatistics } from './LoadStatusFilter';
import {
  isValidTransition,
  getAvailableTransitions,
  transitionStatus,
  getPreviousStatus,
  canReverseStatus,
  getStatusProgress
} from '@/lib/loads/statusWorkflow';

/**
 * Demo component showing load status workflow in action
 * This can be used as a reference for implementing status management in actual load components
 */
export function LoadStatusDemo() {
  // Demo load state
  const [currentStatus, setCurrentStatus] = useState<LoadStatus>('quoted');
  const [selectedFilters, setSelectedFilters] = useState<LoadStatus[]>([]);

  // Demo data for filter counts
  const statusCounts: Record<LoadStatus, number> = {
    quoted: 12,
    needs_carrier: 8,
    dispatched: 15,
    in_transit: 23,
    delivered: 5,
    completed: 47,
    cancelled: 3
  };

  // Demo load data for validation
  const demoLoadData = {
    carrier_id: 'carrier-123',
    pickup_date: '2024-01-15',
    delivery_date: '2024-01-17',
    rate_to_carrier: 1500,
    rate_to_shipper: 1800
  };

  // Handle status change with validation
  const handleStatusChange = (newStatus: LoadStatus) => {
    const result = transitionStatus(currentStatus, newStatus, demoLoadData);

    if (result.success) {
      setCurrentStatus(newStatus);
      toast({
        title: 'Status Updated',
        description: `Load status changed to ${LOAD_STATUS_CONFIG[newStatus].label}`,
      });
    } else {
      toast({
        title: 'Invalid Transition',
        description: result.error,
        variant: 'destructive',
      });

      if (result.requiredFields && result.requiredFields.length > 0) {
        toast({
          title: 'Missing Required Fields',
          description: `Please provide: ${result.requiredFields.join(', ')}`,
          variant: 'destructive',
        });
      }
    }
  };

  // Handle status reversal (undo)
  const handleReverseStatus = () => {
    const previousStatus = getPreviousStatus(currentStatus);
    if (previousStatus) {
      setCurrentStatus(previousStatus);
      toast({
        title: 'Status Reversed',
        description: `Load status changed back to ${LOAD_STATUS_CONFIG[previousStatus].label}`,
      });
    }
  };

  const availableTransitions = getAvailableTransitions(currentStatus);
  const canReverse = canReverseStatus(currentStatus);
  const progress = getStatusProgress(currentStatus);

  return (
    <div className="space-y-6">
      {/* Status Badge Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Status Badge Components</CardTitle>
          <CardDescription>
            Different ways to display load status with customizable sizes and styles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Badge Sizes</h3>
            <div className="flex gap-3 items-center">
              <LoadStatusBadge status="quoted" size="sm" />
              <LoadStatusBadge status="needs_carrier" size="md" />
              <LoadStatusBadge status="in_transit" size="lg" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">All Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LOAD_STATUS_CONFIG) as LoadStatus[]).map(status => (
                <LoadStatusBadge key={status} status={status} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">With Descriptions</h3>
            <div className="grid grid-cols-2 gap-3">
              <LoadStatusBadge status="needs_carrier" showDescription />
              <LoadStatusBadge status="in_transit" showDescription />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Workflow Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Status Workflow Management</CardTitle>
          <CardDescription>
            Interactive demo of load status transitions with validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Status</p>
              <LoadStatusBadge status={currentStatus} size="lg" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Progress</p>
              <p className="text-2xl font-bold">{progress}%</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <LoadStatusProgress currentStatus={currentStatus} />

          {/* Available Transitions */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Available Actions</h3>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map(status => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Change to {LOAD_STATUS_CONFIG[status].label}
                </Button>
              ))}
              {canReverse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReverseStatus}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Undo
                </Button>
              )}
            </div>
          </div>

          {/* Validation Example */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Status transitions are validated. For example, you cannot
              move to "Dispatched" without a carrier assigned, or to "Completed" without
              financial data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter Components */}
      <Card>
        <CardHeader>
          <CardTitle>Status Filter Components</CardTitle>
          <CardDescription>
            Different filter styles for load list views
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Dropdown Filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Dropdown Filter</h3>
            <LoadStatusFilter
              selectedStatuses={selectedFilters}
              onStatusChange={setSelectedFilters}
              statusCounts={statusCounts}
            />
          </div>

          {/* Pills Filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Pills Filter</h3>
            <LoadStatusFilter
              selectedStatuses={selectedFilters}
              onStatusChange={setSelectedFilters}
              statusCounts={statusCounts}
              variant="pills"
            />
          </div>

          {/* Compact Filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Compact Filter</h3>
            <LoadStatusFilter
              selectedStatuses={selectedFilters}
              onStatusChange={setSelectedFilters}
              variant="compact"
            />
          </div>

          {/* Quick Filters */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Quick Filter Groups</h3>
            <QuickStatusFilters
              currentFilter={selectedFilters}
              onFilterChange={setSelectedFilters}
            />
          </div>

          {/* Current Selection Display */}
          {selectedFilters.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Selected Filters:</strong>{' '}
                {selectedFilters.map(s => LOAD_STATUS_CONFIG[s].label).join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Status Statistics</CardTitle>
          <CardDescription>
            Visual representation of load distribution across statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusStatistics statusCounts={statusCounts} />
        </CardContent>
      </Card>
    </div>
  );
}