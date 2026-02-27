import { useCallback } from 'react';
import { activityService, ActivityType } from '@/services/activityService';
import { useAuth } from './useAuth';

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    type: ActivityType,
    description: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      resourceName?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!user) return;

    try {
      await activityService.logActivity({
        type,
        description,
        resourceType: options?.resourceType,
        resourceId: options?.resourceId,
        resourceName: options?.resourceName,
        metadata: options?.metadata
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [user]);

  return {
    logActivity,
    // Helper methods for common activities
    logProjectCreated: useCallback((type: 'database' | 'flow' | 'app' | 'logic', name: string, id: string) => {
      return activityService.logProjectCreated(type, name, id);
    }, []),
    
    
    logRecordAction: useCallback((action: 'created' | 'updated' | 'deleted', tableName: string, recordId?: string) => {
      return activityService.logRecordAction(action, tableName, recordId);
    }, []),
    
    logFlowExecution: useCallback((flowName: string, flowId: string, success: boolean) => {
      return activityService.logFlowExecution(flowName, flowId, success);
    }, []),
    
    logAIChatStarted: useCallback((pageContext: string, conversationId: string, preview: string) => {
      return activityService.logAIChatStarted(pageContext, conversationId, preview);
    }, []),
    
    logAIChatMessage: useCallback((pageContext: string, conversationId: string, message: string, role: 'user' | 'assistant') => {
      return activityService.logAIChatMessage(pageContext, conversationId, message, role);
    }, [])
  };
}