
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { listEnvironmentVariables } from '@/services/environmentService';
import { flowService } from '@/services/flowService';

interface DebugDataProps {
  flowProjectId: string | undefined;
  onUpdateEnvironmentVariables: (vars: Record<string, string>) => void;
}

export const useDebugData = (flowProjectId: string | undefined) => {
  const [environmentVariables, setEnvironmentVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (flowProjectId) {
      loadNodeConfigurations();
      loadEnvironmentVariables();
    }
  }, [flowProjectId]);

  const loadNodeConfigurations = async () => {
    try {
      const configs = await flowService.getNodeConfigurations(flowProjectId!);
      console.log("Node configurations loaded:", configs);
    } catch (error) {
      console.error("Failed to load node configurations:", error);
    }
  };

  const loadEnvironmentVariables = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_environments')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const envId = data[0].id;
        const variables = await listEnvironmentVariables(envId);
        
        const varMap: Record<string, string> = {};
        variables.forEach(v => {
          varMap[v.key] = v.value;
        });
        
        // Sync to localStorage for flow execution
        if (flowProjectId) {
          localStorage.setItem('flow-env-vars', JSON.stringify(varMap));
        }
        
        console.log("Environment variables loaded and synced to localStorage:", Object.keys(varMap));
        setEnvironmentVariables(varMap);
      }
    } catch (error) {
      console.error("Failed to load environment variables:", error);
    }
  };

  return {
    environmentVariables,
    setEnvironmentVariables
  };
};
