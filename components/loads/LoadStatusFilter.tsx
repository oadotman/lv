'use client';

import React, { useState } from 'react';
import { Check, Filter, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { LoadStatus } from '@/lib/types';
import { LOAD_STATUS_CONFIG, LoadStatusBadge, LoadStatusDot } from './LoadStatusBadge';

interface LoadStatusFilterProps {
  selectedStatuses: LoadStatus[];
  onStatusChange: (statuses: LoadStatus[]) => void;
  showCounts?: boolean;
  statusCounts?: Partial<Record<LoadStatus, number>>;
  className?: string;
  variant?: 'default' | 'compact' | 'pills';
}

export function LoadStatusFilter({
  selectedStatuses,
  onStatusChange,
  showCounts = true,
  statusCounts = {},
  className,
  variant = 'default'
}: LoadStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allStatuses = Object.keys(LOAD_STATUS_CONFIG) as LoadStatus[];
  const activeCount = selectedStatuses.length;
  const isAllSelected = activeCount === allStatuses.length || activeCount === 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onStatusChange([]);
    } else {
      onStatusChange(allStatuses);
    }
  };

  const handleToggleStatus = (status: LoadStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleClearFilters = () => {
    onStatusChange([]);
  };

  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <Button
          variant={isAllSelected ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleAll}
          className="h-8"
        >
          All
          {showCounts && (
            <Badge variant="secondary" className="ml-2 px-1 min-w-[20px]">
              {Object.values(statusCounts).reduce((sum, count) => sum + count, 0)}
            </Badge>
          )}
        </Button>
        {allStatuses.map(status => {
          const config = LOAD_STATUS_CONFIG[status];
          const isSelected = selectedStatuses.includes(status) || isAllSelected;
          const count = statusCounts[status] || 0;

          return (
            <Button
              key={status}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleStatus(status)}
              className={cn(
                'h-8 gap-1',
                isSelected && config.bgColor,
                isSelected && config.color,
                isSelected && config.borderColor,
                isSelected && 'border-2'
              )}
            >
              <LoadStatusDot status={status} size="sm" showTooltip={false} />
              <span>{config.label}</span>
              {showCounts && count > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 min-w-[20px]">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex gap-1">
          {allStatuses.map(status => {
            const isSelected = selectedStatuses.includes(status) || isAllSelected;
            return (
              <button
                key={status}
                onClick={() => handleToggleStatus(status)}
                className={cn(
                  'p-1 rounded transition-all',
                  isSelected ? 'bg-gray-100 ring-2 ring-gray-300' : 'hover:bg-gray-50'
                )}
                title={LOAD_STATUS_CONFIG[status].label}
              >
                <LoadStatusDot status={status} size="sm" />
              </button>
            );
          })}
        </div>
        {activeCount > 0 && activeCount < allStatuses.length && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    );
  }

  // Default variant - Dropdown filter
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between min-w-[180px]',
            activeCount > 0 && activeCount < allStatuses.length && 'border-blue-500',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>
              {isAllSelected
                ? 'All Statuses'
                : activeCount === 1
                ? LOAD_STATUS_CONFIG[selectedStatuses[0]].label
                : `${activeCount} Statuses`}
            </span>
          </div>
          {activeCount > 0 && activeCount < allStatuses.length && (
            <Badge variant="secondary" className="ml-2">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter by Status</h4>
            {activeCount > 0 && activeCount < allStatuses.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2">
            {/* Select All Option */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleToggleAll}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="flex-1 font-medium">All Statuses</span>
              {showCounts && (
                <span className="text-sm text-gray-500">
                  {Object.values(statusCounts).reduce((sum, count) => sum + count, 0)}
                </span>
              )}
            </label>

            <Separator className="my-2" />

            {/* Individual Status Options */}
            {allStatuses.map(status => {
              const config = LOAD_STATUS_CONFIG[status];
              const isSelected = selectedStatuses.includes(status) || isAllSelected;
              const count = statusCounts[status] || 0;

              return (
                <label
                  key={status}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleStatus(status)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <div className="flex-1">
                    <LoadStatusBadge
                      status={status}
                      size="sm"
                      showIcon={true}
                      className="pointer-events-none"
                    />
                  </div>
                  {showCounts && (
                    <span className="text-sm text-gray-500">
                      {count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {isAllSelected
                ? 'Showing all statuses'
                : `${activeCount} of ${allStatuses.length} selected`}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quick filter buttons for common status groups
interface QuickStatusFiltersProps {
  onFilterChange: (statuses: LoadStatus[]) => void;
  currentFilter: LoadStatus[];
  className?: string;
}

export function QuickStatusFilters({
  onFilterChange,
  currentFilter,
  className
}: QuickStatusFiltersProps) {
  const filterGroups = {
    active: ['needs_carrier', 'dispatched', 'in_transit'] as LoadStatus[],
    pending: ['quoted', 'needs_carrier'] as LoadStatus[],
    inProgress: ['dispatched', 'in_transit', 'delivered'] as LoadStatus[],
    completed: ['completed'] as LoadStatus[],
    cancelled: ['cancelled'] as LoadStatus[]
  };

  const isGroupActive = (group: LoadStatus[]) => {
    return group.every(status => currentFilter.includes(status));
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        variant={currentFilter.length === 0 ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange([])}
      >
        All
      </Button>
      <Button
        variant={isGroupActive(filterGroups.active) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange(filterGroups.active)}
      >
        Active
      </Button>
      <Button
        variant={isGroupActive(filterGroups.pending) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange(filterGroups.pending)}
      >
        Pending
      </Button>
      <Button
        variant={isGroupActive(filterGroups.inProgress) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange(filterGroups.inProgress)}
      >
        In Progress
      </Button>
      <Button
        variant={isGroupActive(filterGroups.completed) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange(filterGroups.completed)}
      >
        Completed
      </Button>
      <Button
        variant={isGroupActive(filterGroups.cancelled) ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange(filterGroups.cancelled)}
        className={isGroupActive(filterGroups.cancelled) ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        Cancelled
      </Button>
    </div>
  );
}

// Status statistics display
interface StatusStatisticsProps {
  statusCounts: Record<LoadStatus, number>;
  className?: string;
}

export function StatusStatistics({ statusCounts, className }: StatusStatisticsProps) {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3', className)}>
      {(Object.keys(LOAD_STATUS_CONFIG) as LoadStatus[]).map(status => {
        const config = LOAD_STATUS_CONFIG[status];
        const count = statusCounts[status] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const Icon = config.icon;

        return (
          <div
            key={status}
            className={cn(
              'p-3 rounded-lg border-2',
              config.bgColor,
              config.borderColor
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className={cn('w-4 h-4', config.color)} />
              <span className={cn('text-2xl font-bold', config.color)}>
                {count}
              </span>
            </div>
            <div className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {percentage.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}