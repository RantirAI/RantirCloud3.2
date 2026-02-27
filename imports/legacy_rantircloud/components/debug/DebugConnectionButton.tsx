
import React from 'react';
import { Button } from '@/components/ui/button';
import { Wifi } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface DebugConnectionButtonProps {
  flowProjectId: string | undefined;
  isConnecting: boolean;
  environmentVariables: Record<string, string>;
  onConnectionResult: (result: any) => void;
  onSetConnecting: (isConnecting: boolean) => void;
  onOpenDrawer: () => void;
  testBotpressConnection: (flowProjectId: string, environmentVariables: Record<string, string>) => Promise<any>;
}

export const DebugConnectionButton: React.FC<DebugConnectionButtonProps> = ({
  flowProjectId,
  isConnecting,
  environmentVariables,
  onConnectionResult,
  onSetConnecting,
  onOpenDrawer,
  testBotpressConnection
}) => {
  const handleTestConnection = async () => {
    if (!flowProjectId) {
      toast("Error", {
        description: "No flow project ID provided"
      });
      return;
    }

    onSetConnecting(true);
    console.log("Testing Rantir Core API connection...");
    
    try {
      const botpressApiKey = environmentVariables['BOTPRESS_API_KEY'];
      
      if (botpressApiKey) {
        console.log("Using BOTPRESS_API_KEY from environment variables");
      } else {
        console.log("No BOTPRESS_API_KEY found in environment variables");
      }
      
      const result = await testBotpressConnection(flowProjectId, environmentVariables);
      
      if (result.status === 'success' && result.bots && result.bots.length > 0) {
        onConnectionResult({ bots: result.bots });
        toast("Connection Successful", {
          description: `Connected to ${result.bots.length} Rantir Core bot(s)`
        });
      } else if (result.bots && result.bots.length === 0) {
        toast("Warning", {
          description: "Connected but no bots found"
        });
      } else {
        toast("Connection Failed", {
          description: result.error || "Failed to connect to Rantir Core API"
        });
      }
      
      if (result.logs && result.logs.length > 0) {
        onConnectionResult((prev: any) => ({
          ...prev,
          execution: {
            logs: result.logs
          }
        }));
        onOpenDrawer();
      }
    } catch (error: any) {
      console.error("Error testing Rantir Core connection:", error);
      toast("Connection Failed", {
        description: error.message || "Failed to connect to Rantir Core API"
      });
    } finally {
      onSetConnecting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="xs" 
      onClick={handleTestConnection}
      className="text-xs gap-0.5"
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3" />
          Test
        </>
      )}
    </Button>
  );
};
