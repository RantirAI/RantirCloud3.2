
import { supabase } from "@/integrations/supabase/client";

export interface FlowHealthData {
  health_score: number;
  health_status: 'healthy' | 'warning' | 'critical';
  total_executions: number;
  failed_executions: number;
  error_rate: number;
  avg_execution_time_ms: number;
}

export interface FlowMonitoringMetric {
  id: string;
  flow_id: string;
  execution_id: string;
  node_count: number;
  edge_count: number;
  execution_time_ms: number;
  status: string;
  error_count: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  created_at: string;
}

export interface FlowMonitoringLog {
  id: string;
  flow_id: string;
  execution_id: string;
  node_id?: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata?: any;
  created_at: string;
}

export interface FlowExecutionHistory {
  id: string;
  flow_data_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  execution_time_ms?: number;
  error_message?: string;
  logs: any[];
}

class FlowMonitoringService {
  async getFlowHealth(flowProjectId: string): Promise<FlowHealthData | null> {
    try {
      // Use a direct query instead of RPC to avoid type issues
      const { data: executions, error } = await supabase
        .from('flow_executions')
        .select(`
          *,
          flow_data!inner(flow_project_id)
        `)
        .eq('flow_data.flow_project_id', flowProjectId)
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error getting flow executions:', error);
        return null;
      }

      const totalExecutions = executions?.length || 0;
      const failedExecutions = executions?.filter(e => e.status === 'failed').length || 0;
      const executionsWithTime = executions?.filter(e => e.execution_time_ms != null) || [];
      const avgExecutionTime = executionsWithTime.length > 0 
        ? executionsWithTime.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executionsWithTime.length
        : 0;

      const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

      // Calculate health score
      let healthScore = 100;
      
      if (errorRate > 50) {
        healthScore -= 60;
      } else if (errorRate > 25) {
        healthScore -= 40;
      } else if (errorRate > 10) {
        healthScore -= 20;
      } else if (errorRate > 5) {
        healthScore -= 10;
      }

      if (avgExecutionTime > 30000) {
        healthScore -= 20;
      } else if (avgExecutionTime > 15000) {
        healthScore -= 10;
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      const healthStatus = healthScore >= 80 ? 'healthy' : 
                          healthScore >= 60 ? 'warning' : 'critical';

      return {
        health_score: healthScore,
        health_status: healthStatus as 'healthy' | 'warning' | 'critical',
        total_executions: totalExecutions,
        failed_executions: failedExecutions,
        error_rate: errorRate,
        avg_execution_time_ms: avgExecutionTime
      };
    } catch (error) {
      console.error('Error calculating flow health:', error);
      return null;
    }
  }

  async getFlowExecutionHistory(flowProjectId: string, limit = 50): Promise<FlowExecutionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('flow_executions')
        .select(`
          id,
          flow_data_id,
          started_at,
          completed_at,
          status,
          execution_time_ms,
          error_message,
          logs,
          flow_data!inner(flow_project_id)
        `)
        .eq('flow_data.flow_project_id', flowProjectId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting execution history:', error);
        return [];
      }

      // Transform the data to match our interface
      return (data || []).map(item => ({
        id: item.id,
        flow_data_id: item.flow_data_id,
        started_at: item.started_at,
        completed_at: item.completed_at,
        status: item.status,
        execution_time_ms: item.execution_time_ms,
        error_message: item.error_message,
        logs: Array.isArray(item.logs) ? item.logs : (item.logs ? [item.logs] : [])
      }));
    } catch (error) {
      console.error('Error fetching execution history:', error);
      return [];
    }
  }

  async getFlowMonitoringLogs(flowProjectId: string, limit = 100): Promise<FlowMonitoringLog[]> {
    try {
      const { data, error } = await supabase
        .from('flow_monitoring_logs')
        .select('*')
        .eq('flow_id', flowProjectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting monitoring logs:', error);
        return [];
      }

      // Transform and validate the data
      return (data || []).map(item => ({
        id: item.id,
        flow_id: item.flow_id,
        execution_id: item.execution_id,
        node_id: item.node_id || undefined,
        level: ['info', 'warning', 'error', 'debug'].includes(item.level) 
          ? item.level as 'info' | 'warning' | 'error' | 'debug'
          : 'info',
        message: item.message || '',
        metadata: item.metadata,
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching monitoring logs:', error);
      return [];
    }
  }

  async getFlowMetrics(flowProjectId: string, days = 7): Promise<FlowMonitoringMetric[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('flow_monitoring_metrics')
        .select('*')
        .eq('flow_id', flowProjectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting flow metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching flow metrics:', error);
      return [];
    }
  }

  async logFlowExecution(flowProjectId: string, executionId: string, metrics: {
    node_count: number;
    edge_count: number;
    execution_time_ms: number;
    status: string;
    error_count?: number;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('flow_monitoring_metrics')
        .insert({
          flow_id: flowProjectId,
          execution_id: executionId,
          ...metrics
        });

      if (error) {
        console.error('Error logging flow execution:', error);
      }
    } catch (error) {
      console.error('Error inserting flow metrics:', error);
    }
  }

  async logFlowMessage(flowProjectId: string, executionId: string, log: {
    node_id?: string;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('flow_monitoring_logs')
        .insert({
          flow_id: flowProjectId,
          execution_id: executionId,
          ...log
        });

      if (error) {
        console.error('Error logging flow message:', error);
      }
    } catch (error) {
      console.error('Error inserting flow log:', error);
    }
  }
}

export const flowMonitoringService = new FlowMonitoringService();
