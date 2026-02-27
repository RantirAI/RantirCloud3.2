
import { useParams, useLocation } from 'react-router-dom';
import { useFlowStore } from '@/lib/flow-store';
import { useDebugData } from '@/components/debug/DebugData';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NodeAliasRegistry } from '@/lib/node-alias-registry';
import { listFlowSecrets, FlowSecret } from '@/services/flowSecretsService';

interface FlowVariable {
  id: string;
  name: string;
  value: string;
  is_secret: boolean;
  description?: string;
}

export function useVariableResolver() {
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const { nodes, edges } = useFlowStore();
  const [flowVariables, setFlowVariables] = useState<FlowVariable[]>([]);
  const [vaultSecrets, setVaultSecrets] = useState<FlowSecret[]>([]);

  // Determine if we're in a flow context (vs app builder context)
  const isFlowContext = location.pathname.startsWith('/flows/');
  const flowProjectId = isFlowContext ? projectId : undefined;

  // Only use debug data in flow context
  const { environmentVariables } = useDebugData(flowProjectId);

  // Create alias registry for display formatting
  const aliasRegistry = useMemo(() => {
    const registry = new NodeAliasRegistry();
    registry.rebuildFromNodes(nodes);
    return registry;
  }, [nodes]);

  // Load flow variables from database - only in flow context
  useEffect(() => {
    if (flowProjectId && isFlowContext) {
      loadFlowVariables();
      loadVaultSecrets();
    }
  }, [flowProjectId, isFlowContext]);

  const loadFlowVariables = async () => {
    if (!flowProjectId) return;
    
    try {
      const { data, error } = await supabase
        .from('flow_variables')
        .select('*')
        .eq('flow_project_id', flowProjectId);

      if (error) {
        console.error('Error loading flow variables:', error);
        return;
      }

      setFlowVariables(data || []);
    } catch (error) {
      console.error('Error loading flow variables:', error);
    }
  };

  const loadVaultSecrets = async () => {
    if (!flowProjectId) return;
    
    try {
      const secrets = await listFlowSecrets(flowProjectId);
      setVaultSecrets(secrets);
    } catch (error) {
      console.error('Error loading vault secrets:', error);
    }
  };

  const resolveVariable = (variableBinding: string, currentNodeId?: string) => {
    // Check if it's a variable binding
    if (!variableBinding || typeof variableBinding !== 'string' || 
        !variableBinding.startsWith('{{') || !variableBinding.endsWith('}}')) {
      return variableBinding;
    }

    const binding = variableBinding.substring(2, variableBinding.length - 2);

    // Handle environment variables
    if (binding.startsWith('env.')) {
      const envVarName = binding.substring(4);
      const resolved = environmentVariables?.[envVarName];
      console.log(`Resolving env variable ${envVarName}:`, resolved);
      return resolved || null;
    }

    // Handle flow variables from database
    if (!binding.includes('.')) {
      const variable = flowVariables.find(v => v.name === binding);
      const resolved = variable?.value;
      console.log(`Resolving flow variable ${binding}:`, resolved);
      return resolved || null;
    }

    // Handle node output variables (nodeId.outputName) or nested paths (nodeId.outputName.nested.path)
    const parts = binding.split('.');
    if (parts.length >= 2) {
      const [nodeId, firstProperty, ...restPath] = parts;
      
      // This would need to be resolved from execution context
      // For now, return null as we don't have runtime values
      // But we can still format the display name correctly
      console.warn(`Cannot resolve node output variable: ${binding} (would need runtime context)`);
      return null;
    }

    return null;
  };

  // New function to resolve all variables in an object
  const resolveAllVariables = (obj: any, currentNodeId?: string): any => {
    if (typeof obj === 'string') {
      return resolveVariable(obj, currentNodeId);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => resolveAllVariables(item, currentNodeId));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = resolveAllVariables(value, currentNodeId);
      }
      return resolved;
    }
    
    return obj;
  };

  const isVariableBinding = (value: any): boolean => {
    return typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}');
  };

  const getVariableDisplayName = (variableBinding: string): string => {
    if (!isVariableBinding(variableBinding)) return '';
    
    const binding = variableBinding.substring(2, variableBinding.length - 2);
    
    // For environment variables (including vault secrets), show a cleaner format
    if (binding.startsWith('env.')) {
      const secretName = binding.substring(4);
      const isVaultSecret = vaultSecrets.some(s => s.name === secretName);
      return isVaultSecret ? `🔒 ${secretName}` : `ENV: ${secretName}`;
    }
    
    // For flow variables, show the name
    if (!binding.includes('.')) {
      const variable = flowVariables.find(v => v.name === binding);
      return variable ? `FLOW: ${variable.name}` : `FLOW: ${binding}`;
    }
    
    // For node outputs, use the alias registry for human-readable names
    const parts = binding.split('.');
    if (parts.length >= 2) {
      const [nodeId, ...rest] = parts;
      const alias = aliasRegistry.getDisplayAlias(nodeId);
      
      // If we got a meaningful alias (not the same as node ID), use it
      if (alias !== nodeId) {
        return `${alias} > ${rest.join('.')}`;
      }
      
      // Fallback to looking up node by ID
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        return `${node.data.label} > ${rest.join('.')}`;
      }
    }
    
    return binding;
  };

  return {
    resolveVariable,
    resolveAllVariables,
    isVariableBinding,
    getVariableDisplayName,
    flowVariables,
    vaultSecrets,
    refreshVariables: loadFlowVariables,
    refreshSecrets: loadVaultSecrets,
  };
}
