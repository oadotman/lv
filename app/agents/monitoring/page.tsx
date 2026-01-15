'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';

export default function AgentMonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedTab, timeRange, autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(
        `/api/agents/monitoring?type=${selectedTab}&timeRange=${timeRange}`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (config: any) => {
    try {
      const response = await fetch('/api/agents/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateConfig', config })
      });

      if (response.ok) {
        await fetchMonitoringData();
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  const handlePhaseActivation = async (phaseId: string) => {
    try {
      const response = await fetch('/api/agents/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activatePhase', phaseId })
      });

      if (response.ok) {
        await fetchMonitoringData();
      }
    } catch (error) {
      console.error('Failed to activate phase:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Agent System Monitoring</h1>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button onClick={fetchMonitoringData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="rollout">Rollout</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab data={data} onConfigUpdate={handleConfigUpdate} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <PerformanceTab data={data} />
        </TabsContent>

        <TabsContent value="rollout" className="mt-6">
          <RolloutTab data={data} onPhaseActivate={handlePhaseActivation} />
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <ErrorsTab data={data} />
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <OptimizationTab data={data} />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <HealthTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ data, onConfigUpdate }: any) {
  if (!data) return null;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Multi-Agent Status</p>
              <p className="text-2xl font-bold">
                {data.config?.multiAgentEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <Activity className={`h-8 w-8 ${data.config?.multiAgentEnabled ? 'text-green-500' : 'text-gray-400'}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rollout Percentage</p>
              <p className="text-2xl font-bold">{data.config?.rolloutPercentage || 0}%</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">
                {data.performance?.successRate || 0}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">
                {data.performance?.averageLatency || 0}ms
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {data.config && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Comparison Mode</span>
              <Button
                variant={data.config.comparisonMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => onConfigUpdate({ ...data.config, comparisonMode: !data.config.comparisonMode })}
              >
                {data.config.comparisonMode ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span>Legacy Fallback</span>
              <Button
                variant={data.config.fallbackEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onConfigUpdate({ ...data.config, fallbackToLegacy: !data.config.fallbackEnabled })}
              >
                {data.config.fallbackEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {data.database && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Database Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-xl font-bold">{data.database.totalExecutions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-xl font-bold">{data.database.successfulExecutions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-xl font-bold">{data.database.successRate || 0}%</p>
            </div>
          </div>

          {data.database.recentErrors && data.database.recentErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Recent Errors</h4>
              <div className="space-y-2">
                {data.database.recentErrors.slice(0, 3).map((error: any, idx: number) => (
                  <Alert key={idx} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">{error.agent_name}</p>
                      <p className="text-sm">{error.error_message}</p>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function PerformanceTab({ data }: any) {
  if (!data) return null;

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
        <div className="space-y-4">
          {Object.entries(data.agentMetrics || {}).map(([agent, metrics]: any) => (
            <div key={agent} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{agent}</h4>
                <span className={`px-2 py-1 rounded text-sm ${
                  metrics.successRate > 95 ? 'bg-green-100 text-green-800' :
                  metrics.successRate > 90 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {metrics.successRate}% Success
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Executions</p>
                  <p className="font-semibold">{metrics.executions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Time</p>
                  <p className="font-semibold">{metrics.averageTime}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Tokens</p>
                  <p className="font-semibold">{metrics.averageTokens}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Errors</p>
                  <p className="font-semibold">{metrics.errors}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {data.systemMetrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Metrics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-xl font-bold">{data.systemMetrics.totalExecutions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cache Hits</p>
              <p className="text-xl font-bold">{data.systemMetrics.cacheHits}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cache Misses</p>
              <p className="text-xl font-bold">{data.systemMetrics.cacheMisses}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-xl font-bold">{data.systemMetrics.averageLatency}ms</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function RolloutTab({ data, onPhaseActivate }: any) {
  if (!data) return null;

  return (
    <div className="grid gap-6">
      {data.currentPhase && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Phase</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Phase</p>
              <p className="text-xl font-bold">{data.currentPhase.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Percentage</p>
              <p className="text-xl font-bold">{data.currentPhase.percentage}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-xl font-bold capitalize">{data.currentPhase.status}</p>
            </div>
          </div>

          {data.metrics && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold mb-2">Phase Metrics</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-semibold">{(data.metrics.successRate * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Error Rate</p>
                  <p className="font-semibold">{(data.metrics.errorRate * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Latency</p>
                  <p className="font-semibold">{data.metrics.averageLatencyMs}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Calls Processed</p>
                  <p className="font-semibold">{data.metrics.callsProcessed}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {data.history && data.history.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rollout History</h3>
          <div className="space-y-2">
            {data.history.map((phase: any) => (
              <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`h-3 w-3 rounded-full ${
                    phase.status === 'active' ? 'bg-green-500' :
                    phase.status === 'completed' ? 'bg-blue-500' :
                    phase.status === 'rolled_back' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-semibold">{phase.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {phase.percentage}% rollout • {phase.status}
                    </p>
                  </div>
                </div>
                {phase.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => onPhaseActivate(phase.id)}
                  >
                    Activate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-2">
            {data.recommendations.map((rec: any, idx: number) => (
              <Alert key={idx} variant={rec.type === 'expand' ? 'default' : 'destructive'}>
                {rec.type === 'expand' ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <p>{rec.message}</p>
              </Alert>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ErrorsTab({ data }: any) {
  if (!data) return null;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Errors</p>
            <p className="text-2xl font-bold">{data.totalErrors || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Successful Recoveries</p>
            <p className="text-2xl font-bold">{data.recovery?.successfulRecoveries || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Failed Recoveries</p>
            <p className="text-2xl font-bold">{data.recovery?.failedRecoveries || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Recovery Rate</p>
            <p className="text-2xl font-bold">{data.recovery?.recoveryRate || 0}%</p>
          </div>
        </Card>
      </div>

      {data.errorsByType && Object.keys(data.errorsByType).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Errors by Type</h3>
          <div className="space-y-2">
            {Object.entries(data.errorsByType).map(([type, count]: any) => (
              <div key={type} className="flex justify-between items-center">
                <span>{type}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.recentErrors && data.recentErrors.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
          <div className="space-y-2">
            {data.recentErrors.map((error: any, idx: number) => (
              <Alert key={idx} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <p className="font-semibold">{error.agent_name} - {error.error_type}</p>
                  <p className="text-sm">{error.error_message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(error.created_at).toLocaleString()}
                  </p>
                </div>
              </Alert>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function OptimizationTab({ data }: any) {
  if (!data) return null;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
              <p className="text-2xl font-bold">{data.cache?.hitRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.cache?.totalHits || 0} hits / {data.cache?.totalMisses || 0} misses
              </p>
            </div>
            <Database className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Batched Requests</p>
              <p className="text-2xl font-bold">{data.batching?.batchedRequests || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Avg size: {data.batching?.averageBatchSize || 0}
              </p>
            </div>
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cost Saved</p>
              <p className="text-2xl font-bold">${data.savings?.costSaved || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.savings?.tokensSaved || 0} tokens
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Optimization Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Cache Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Memory Usage</span>
                <span className="font-semibold">{data.cache?.memorySizeMB || 0} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Hit Rate</span>
                <span className="font-semibold">{data.cache?.hitRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Total Entries</span>
                <span className="font-semibold">
                  {(data.cache?.totalHits || 0) + (data.cache?.totalMisses || 0)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Resource Savings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Time Saved</span>
                <span className="font-semibold">
                  {((data.savings?.timeSavedMs || 0) / 1000).toFixed(2)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tokens Saved</span>
                <span className="font-semibold">{data.savings?.tokensSaved || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Cost Reduction</span>
                <span className="font-semibold">${data.savings?.costSaved || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function HealthTab({ data }: any) {
  if (!data) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-6 w-6" />;
      case 'degraded': return <AlertTriangle className="h-6 w-6" />;
      case 'critical': return <AlertCircle className="h-6 w-6" />;
      default: return <AlertCircle className="h-6 w-6" />;
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Overall Health</h3>
          <div className={`flex items-center gap-2 ${getStatusColor(data.status)}`}>
            {getStatusIcon(data.status)}
            <span className="font-semibold capitalize">{data.status}</span>
          </div>
        </div>

        {data.issues && data.issues.length > 0 && (
          <div className="space-y-2">
            {data.issues.map((issue: any, idx: number) => (
              <Alert key={idx} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <p>{issue.message}</p>
              </Alert>
            ))}
          </div>
        )}
      </Card>

      {data.components && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(data.components).map(([component, health]: any) => (
            <Card key={component} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold capitalize">{component}</h4>
                <div className={getStatusColor(health.status || 'unknown')}>
                  {getStatusIcon(health.status || 'unknown')}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-semibold capitalize">{health.status || 'Unknown'}</span>
              </p>
              {health.issues && health.issues.length > 0 && (
                <p className="text-sm text-red-500 mt-1">
                  {health.issues.length} issue(s)
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Multi-Agent Version</p>
            <p className="font-semibold">1.0.0</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Check</p>
            <p className="font-semibold">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}