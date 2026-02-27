
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  XCircle,
  BarChart3,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { flowMonitoringService, FlowHealthData, FlowExecutionHistory, FlowMonitoringLog } from '@/services/flowMonitoringService';
import { format } from 'date-fns';

interface FlowMonitoringDashboardProps {
  flowProjectId: string;
}

export function FlowMonitoringDashboard({ flowProjectId }: FlowMonitoringDashboardProps) {
  const [healthData, setHealthData] = useState<FlowHealthData | null>(null);
  const [executionHistory, setExecutionHistory] = useState<FlowExecutionHistory[]>([]);
  const [monitoringLogs, setMonitoringLogs] = useState<FlowMonitoringLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const [health, history, logs] = await Promise.all([
        flowMonitoringService.getFlowHealth(flowProjectId),
        flowMonitoringService.getFlowExecutionHistory(flowProjectId),
        flowMonitoringService.getFlowMonitoringLogs(flowProjectId)
      ]);

      setHealthData(health);
      setExecutionHistory(history);
      setMonitoringLogs(logs);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, [flowProjectId]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'debug': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Flow Monitoring</h2>
        <Button onClick={loadMonitoringData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Health Score</CardTitle>
            {healthData && getHealthIcon(healthData.health_status)}
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg font-bold">
              {healthData?.health_score || 0}%
            </div>
            <Badge className={`mt-2 ${healthData ? getHealthStatusColor(healthData.health_status) : ''}`}>
              {healthData?.health_status || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Total Executions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg font-bold">
              {healthData?.total_executions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg font-bold">
              {healthData?.error_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.failed_executions || 0} failed executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Avg. Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-lg font-bold">
              {healthData?.avg_execution_time_ms ? 
                `${(healthData.avg_execution_time_ms / 1000).toFixed(1)}s` : 
                '0s'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="all-logs">All Logs</TabsTrigger>
          <TabsTrigger value="logs">Error Logs</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {executionHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No execution history available
                    </p>
                  ) : (
                    executionHistory.map((execution) => (
                      <div 
                        key={execution.id} 
                        className={`p-3 border rounded-lg ${
                          execution.status === 'failed' 
                            ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' 
                            : execution.status === 'completed' 
                              ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' 
                              : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(execution.status)}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium capitalize">{execution.status}</p>
                                <Badge 
                                  variant={execution.status === 'completed' ? 'default' : execution.status === 'failed' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {execution.status === 'completed' ? 'Success' : execution.status === 'failed' ? 'Error' : 'Running'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(execution.started_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {execution.execution_time_ms && (
                              <p className="text-sm font-medium">
                                {(execution.execution_time_ms / 1000).toFixed(2)}s
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Error message display */}
                        {execution.error_message && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Error Details:</p>
                                <p className="text-xs break-all">{execution.error_message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Execution ID */}
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          ID: {execution.id.slice(0, 8)}...
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-logs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All Monitoring Logs</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {monitoringLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No logs found. Use the Logger node to record data during flow execution.
                    </p>
                  ) : (
                    monitoringLogs.map((log) => (
                      <div key={log.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'PPp')}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.node_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Node: {log.node_id}
                          </p>
                        )}
                        {log.metadata && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error & Warning Logs</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {monitoringLogs.filter(log => log.level === 'error' || log.level === 'warning').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No error or warning logs found
                    </p>
                  ) : (
                    monitoringLogs
                      .filter(log => log.level === 'error' || log.level === 'warning')
                      .map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getLevelColor(log.level)}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'PPp')}
                            </span>
                          </div>
                          <p className="text-sm">{log.message}</p>
                          {log.node_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Node: {log.node_id}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {healthData ? (100 - healthData.error_rate).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Response Time</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {healthData?.avg_execution_time_ms ? 
                        `${healthData.avg_execution_time_ms}ms` : 
                        '0ms'
                      }
                    </div>
                  </div>
                </div>
                
                {healthData && healthData.total_executions === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No metrics available yet. Run your flow to see performance data.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
