import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Bug, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FlowNodeDebuggerProps {
  nodeId: string;
  nodeData: any;
  onClose: () => void;
}

export function FlowNodeDebugger({ nodeId, nodeData, onClose }: FlowNodeDebuggerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const executeNode = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      // Simulate node execution based on type
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = simulateNodeExecution(nodeData);
      setExecutionResult(result);
      toast.success(`Node "${nodeData.label}" executed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExecutionError(errorMessage);
      toast.error(`Failed to execute node: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateNodeExecution = (data: any) => {
    switch (data.type) {
      case 'showAlert':
        return {
          message: data.config?.message || 'Default alert message',
          type: 'info',
          timestamp: new Date().toISOString()
        };
      case 'navigateToPage':
        return {
          targetPage: data.config?.pageId || 'unknown',
          success: true,
          timestamp: new Date().toISOString()
        };
      case 'apiCall':
        return {
          url: data.config?.url || 'https://api.example.com',
          method: data.config?.method || 'GET',
          statusCode: 200,
          response: { success: true, data: 'Mock response' },
          timestamp: new Date().toISOString()
        };
      case 'setVariable':
        return {
          variableName: data.config?.name || 'variable',
          value: data.config?.value || 'value',
          timestamp: new Date().toISOString()
        };
      case 'delay':
        return {
          duration: data.config?.duration || 1000,
          timestamp: new Date().toISOString()
        };
      case 'condition':
        return {
          condition: data.config?.expression || 'true',
          result: Math.random() > 0.5,
          timestamp: new Date().toISOString()
        };
      default:
        return {
          nodeType: data.type,
          config: data.config,
          timestamp: new Date().toISOString()
        };
    }
  };

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <CardTitle className="text-sm">Node Debugger</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Node Info */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Node Information</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>ID:</span>
                <Badge variant="outline" className="text-xs">{nodeId}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>Type:</span>
                <Badge variant="outline" className="text-xs">{nodeData?.type}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>Label:</span>
                <span className="text-xs">{nodeData?.label}</span>
              </div>
            </div>
          </div>

          {/* Configuration */}
          {nodeData?.config && Object.keys(nodeData.config).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Configuration</div>
              <div className="bg-muted rounded p-2 text-xs">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(nodeData.config, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <Button 
            onClick={executeNode} 
            disabled={isExecuting}
            className="w-full"
            size="sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-2" />
                Execute Node
              </>
            )}
          </Button>

          {/* Execution Result */}
          {executionResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                Execution Result
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-xs">
                <pre className="whitespace-pre-wrap text-foreground">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Execution Error */}
          {executionError && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                <XCircle className="h-3 w-3" />
                Execution Error
              </div>
              <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs text-foreground">
                {executionError}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}