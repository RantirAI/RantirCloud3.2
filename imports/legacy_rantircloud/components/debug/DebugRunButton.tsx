
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface DebugRunButtonProps {
  flowProjectId: string | undefined;
  isRunning: boolean;
  environmentVariables: Record<string, string>;
  onRunResult: (result: any) => void;
  onSetRunning: (isRunning: boolean) => void;
  onOpenDrawer: () => void;
  getLatestFlowData: (flowProjectId: string) => Promise<any>;
  executeFlow: (flowProjectId: string, flowData: any, environmentVariables: Record<string, string>) => Promise<any>;
}

export const DebugRunButton: React.FC<DebugRunButtonProps> = ({
  flowProjectId,
  isRunning,
  environmentVariables,
  onRunResult,
  onSetRunning,
  onOpenDrawer,
  getLatestFlowData,
  executeFlow
}) => {
  const handleRun = async () => {
    if (!flowProjectId) {
      toast("Error", {
        description: "No flow project ID provided"
      });
      return;
    }
    
    console.log("Running Rantir Core flow...", { flowProjectId });
    onSetRunning(true);
    
    try {
      const flowData = await getLatestFlowData(flowProjectId);
      if (!flowData) {
        throw new Error("No flow data found");
      }
      
      const botpressNodes = flowData.nodes.filter((node: any) => 
        (node.data?.label === 'text' || node.data?.label === 'ai') && node.data?.connected && node.data?.apiKey
      );
      
      if (botpressNodes.length > 0) {
        const executionResult = await executeFlow(flowProjectId, flowData, environmentVariables);
        
        if (executionResult.execution.status === 'completed') {
          toast("Success", {
            description: "Flow executed successfully"
          });
        } else {
          toast("Warning", {
            description: executionResult.execution.error_message || "Flow executed with warnings"
          });
        }
        
        onRunResult(executionResult);
      } else {
        toast("Warning", {
          description: "No configured Rantir Core nodes found in this flow"
        });
      }
      
      onOpenDrawer();
    } catch (error: any) {
      console.error("Error running flow:", error);
      toast("Error", {
        description: error.message || "Error running flow"
      });
      
      onRunResult((prev: any) => ({
        ...prev,
        execution: {
          logs: [{
            message: `Error running flow: ${error.message || "Unknown error"}`,
            timestamp: new Date().toISOString(),
            level: 'error'
          }]
        }
      }));
      onOpenDrawer();
    } finally {
      onSetRunning(false);
    }
  };

  return (
    <Button 
      variant="default" 
      size="xs" 
      onClick={handleRun}
      className="text-xs gap-0.5"
      disabled={isRunning}
    >
      {isRunning ? (
        <>
          <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running...
        </>
      ) : (
        <>
          <PlayCircle className="h-3 w-3" />
          Run
        </>
      )}
    </Button>
  );
};
