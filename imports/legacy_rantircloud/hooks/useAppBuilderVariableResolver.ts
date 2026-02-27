import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useVariableStore } from '@/stores/variableStore';

interface FlowVariable {
  id: string;
  name: string;
  value: string;
  is_secret: boolean;
}

export function useAppBuilderVariableResolver() {
  const { currentProject } = useAppBuilderStore();
  const { 
    appVariableDefinitions, 
    pageVariableDefinitions, 
    loadAppVariables, 
    loadPageVariables,
    currentPageId 
  } = useVariableStore();
  const [flowVariables, setFlowVariables] = useState<FlowVariable[]>([]);

  const loadFlowVariables = async () => {
    // For now, load from localStorage as a simple implementation
    try {
      const saved = localStorage.getItem(`flow-variables-${currentProject?.id}`) || '[]';
      setFlowVariables(JSON.parse(saved));
    } catch (error) {
      console.error('Error loading flow variables:', error);
      setFlowVariables([]);
    }
  };

  // Load flow variables from database
  useEffect(() => {
    if (currentProject?.id) {
      loadFlowVariables();
      // Also ensure variable store is loaded
      loadAppVariables(currentProject.id);
    }
  }, [currentProject?.id]);

  // Load page variables when page changes
  useEffect(() => {
    if (currentProject?.id && currentPageId) {
      loadPageVariables(currentProject.id, currentPageId);
    }
  }, [currentProject?.id, currentPageId]);

  // Resolve a single variable binding
  const resolveVariable = (variableBinding: string, currentNodeId?: string, flowId?: string, context?: Record<string, any>) => {
    if (!variableBinding || typeof variableBinding !== 'string') {
      return variableBinding;
    }

    // Check if it's a variable binding
    const variableMatch = variableBinding.match(/^\{\{(.+)\}\}$/);
    if (!variableMatch) {
      return variableBinding;
    }

    const variableName = variableMatch[1].trim();

    // Environment variable
    if (variableName.startsWith('env.')) {
      const envKey = variableName.substring(4);
      const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
      return envVars[envKey] || '';
    }

    // Flow variable
    const flowVar = flowVariables.find(v => v.name === variableName);
    if (flowVar) {
      return flowVar.value;
    }

    // Node output variable (e.g., nodeId.outputName)
    if (variableName.includes('.') && context) {
      const [nodeId, outputName] = variableName.split('.', 2);
      const nodeOutput = context[`${nodeId}.${outputName}`] || context[nodeId];
      
      if (nodeOutput && typeof nodeOutput === 'object') {
        return nodeOutput[outputName] || nodeOutput;
      }
      
      return nodeOutput;
    }

    // Direct context variable
    return context?.[variableName] || '';
  };

  // Recursively resolve all variables in an object
  const resolveAllVariables = (obj: any, currentNodeId?: string, flowId?: string, context?: Record<string, any>): any => {
    if (typeof obj === 'string') {
      return resolveVariable(obj, currentNodeId, flowId, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => resolveAllVariables(item, currentNodeId, flowId, context));
    }

    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = resolveAllVariables(value, currentNodeId, flowId, context);
      }
      return resolved;
    }

    return obj;
  };

  // Check if a value is a variable binding
  const isVariableBinding = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return /^\{\{.+\}\}$/.test(value.trim());
  };

  // Get display name for a variable binding
  const getVariableDisplayName = (variableBinding: string): string => {
    if (!isVariableBinding(variableBinding)) {
      return variableBinding;
    }

    const variableMatch = variableBinding.match(/^\{\{(.+)\}\}$/);
    if (!variableMatch) return variableBinding;

    const variableName = variableMatch[1].trim();

    // Environment variable
    if (variableName.startsWith('env.')) {
      const envKey = variableName.substring(4);
      return `ENV > ${envKey}`;
    }

    // App variable
    if (variableName.startsWith('app.')) {
      const varName = variableName.substring(4);
      return `App > ${varName}`;
    }

    // Page variable
    if (variableName.startsWith('page.')) {
      const varName = variableName.substring(5);
      return `Page > ${varName}`;
    }

    // Flow variable
    const flowVar = flowVariables.find(v => v.name === variableName);
    if (flowVar) {
      return `FLOW > ${flowVar.name}`;
    }

    // Node output variable
    if (variableName.includes('.')) {
      const [nodeId, outputName] = variableName.split('.', 2);
      return `${nodeId} > ${outputName}`;
    }

    return variableName;
  };

  // Helper function to find nodes that execute before the current node
  const findPreviousNodes = (currentNodeId: string, nodes: any[], edges: any[]) => {
    const previousNodes: any[] = [];
    const visited = new Set<string>();

    // Start from the 'start' node and traverse to find all nodes that can reach the current node
    const findReachableNodes = (nodeId: string, path: string[]) => {
      if (visited.has(nodeId) || path.includes(nodeId)) return;
      visited.add(nodeId);

      if (nodeId === currentNodeId) {
        // Found path to current node, add all nodes in path (except current) as previous
        path.forEach(pathNodeId => {
          const node = nodes.find(n => n.id === pathNodeId);
          if (node && !previousNodes.find(p => p.id === pathNodeId)) {
            previousNodes.push(node);
          }
        });
        return;
      }

      // Continue traversing outgoing edges
      const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
      outgoingEdges.forEach((edge: any) => {
        findReachableNodes(edge.target, [...path, nodeId]);
      });
    };

    // Start traversal from 'start' node
    const startNode = nodes.find(n => n.id === 'start');
    if (startNode) {
      findReachableNodes('start', []);
    }

    return previousNodes;
  };

  // Get expected outputs for a node type
  const getNodeOutputsByType = (nodeType: string) => {
    const outputMap: Record<string, Array<{name: string; description: string}>> = {
      'navigate': [
        { name: 'success', description: 'Whether navigation was successful' },
        { name: 'url', description: 'The URL navigated to' }
      ],
      'navigateToPage': [
        { name: 'success', description: 'Whether navigation was successful' },
        { name: 'pageId', description: 'The page ID navigated to' }
      ],
      'showAlert': [
        { name: 'success', description: 'Whether alert was shown' },
        { name: 'message', description: 'The alert message' }
      ],
      'apiCall': [
        { name: 'success', description: 'Whether API call was successful' },
        { name: 'data', description: 'API response data' },
        { name: 'status', description: 'HTTP status code' }
      ],
      'condition': [
        { name: 'success', description: 'Condition evaluation result' },
        { name: 'condition', description: 'Condition details' }
      ],
      'setVariable': [
        { name: 'success', description: 'Whether variable was set' },
        { name: 'variable', description: 'Variable details' }
      ],
      'executeCode': [
        { name: 'success', description: 'Whether code executed successfully' },
        { name: 'result', description: 'Code execution result' }
      ],
      'delay': [
        { name: 'success', description: 'Whether delay completed' },
        { name: 'delayed', description: 'Duration of delay' }
      ],
      'database-read': [
        { name: 'data', description: 'Database query results' },
        { name: 'count', description: 'Number of records returned' }
      ],
      'database-write': [
        { name: 'success', description: 'Whether the operation succeeded' },
        { name: 'id', description: 'ID of created/updated record' }
      ],
      'calculation': [
        { name: 'result', description: 'Calculation result' }
      ],
      'data-transform': [
        { name: 'output', description: 'Transformed data' }
      ],
      'file-upload': [
        { name: 'url', description: 'Uploaded file URL' },
        { name: 'filename', description: 'Name of uploaded file' }
      ]
    };

    return outputMap[nodeType] || [
      { name: 'output', description: 'Node output' }
    ];
  };

  // Get all available variables including environment, flow, app, page, and node outputs
  const getAvailableVariables = (currentNodeId?: string, flowId?: string, currentNodes?: any[], currentEdges?: any[]) => {
    const variables: { label: string; value: string; description?: string }[] = [];

    // Environment variables
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    Object.keys(envVars).forEach(key => {
      variables.push({
        label: `ENV > ${key}`,
        value: `{{env.${key}}}`,
        description: 'Environment variable'
      });
    });

    // App variables from variable store
    appVariableDefinitions.forEach(variable => {
      variables.push({
        label: variable.name,
        value: `{{app.${variable.name}}}`,
        description: variable.description || `App variable (${variable.dataType})`
      });
    });

    // Page variables from variable store
    pageVariableDefinitions.forEach(variable => {
      variables.push({
        label: variable.name,
        value: `{{page.${variable.name}}}`,
        description: variable.description || `Page variable (${variable.dataType})`
      });
    });

    // Flow variables (legacy support)
    flowVariables.forEach(variable => {
      variables.push({
        label: `FLOW > ${variable.name}`,
        value: `{{${variable.name}}}`,
        description: 'Flow variable'
      });
    });

    // Node outputs from current flow (use direct flow data if provided)
    const nodesToCheck = currentNodes || [];
    const edgesToCheck = currentEdges || [];

    if (nodesToCheck.length > 0 && currentNodeId) {
      // Find nodes that are "previous" to the current node based on flow execution order
      const previousNodes = findPreviousNodes(currentNodeId, nodesToCheck, edgesToCheck);
      
      previousNodes.forEach((node: any) => {
        const outputs = getNodeOutputsByType(node.data?.type || node.type);
        outputs.forEach(output => {
          variables.push({
            label: `${node.data?.label || node.data?.type || 'Node'} > ${output.name}`,
            value: `{{${node.id}.${output.name}}}`,
            description: output.description
          });
        });
      });
    } else if (currentProject && flowId) {
      // Fallback to project structure if direct flow data not provided
      const component = currentProject.pages?.[0]?.components?.find(comp => {
        const flows = comp.actions || {};
        return Object.keys(flows).some(trigger => {
          const flow = flows[trigger];
          return flow && (flow.id === flowId || `${comp.id}-${trigger}` === flowId);
        });
      });

      if (component) {
        const flows = component.actions || {};
        const targetFlow = Object.values(flows).find((flow: any) => 
          flow && (flow.id === flowId || flow.nodes)
        ) as any;

        if (targetFlow?.nodes) {
          const nodes = targetFlow.nodes as any[];
          const nodeIds = nodes.map((n: any) => n.id);
          const currentIndex = currentNodeId ? nodeIds.indexOf(currentNodeId) : -1;
          
          // Only include nodes that come before the current node
          const previousNodes = currentIndex >= 0 ? nodes.slice(0, currentIndex) : nodes;
          
          previousNodes.forEach((node: any) => {
            const outputs = getNodeOutputsByType(node.data?.type || node.type);
            outputs.forEach(output => {
              variables.push({
                label: `${node.data?.label || node.data?.type || 'Node'} > ${output.name}`,
                value: `{{${node.id}.${output.name}}}`,
                description: output.description
              });
            });
          });
        }
      }
    }

    return variables;
  };

  // Get app variables only (for SetVariable config) - includes dataType for smart operations
  const getAppVariables = () => {
    return appVariableDefinitions.map(variable => ({
      label: variable.name,
      value: `{{app.${variable.name}}}`,
      description: variable.description || `App variable (${variable.dataType})`,
      dataType: variable.dataType
    }));
  };

  // Get page variables only (for SetVariable config) - includes dataType for smart operations
  const getPageVariables = () => {
    return pageVariableDefinitions.map(variable => ({
      label: variable.name,
      value: `{{page.${variable.name}}}`,
      description: variable.description || `Page variable (${variable.dataType})`,
      dataType: variable.dataType
    }));
  };

  return {
    resolveVariable,
    resolveAllVariables,
    isVariableBinding,
    getVariableDisplayName,
    getAvailableVariables,
    getAppVariables,
    getPageVariables,
    flowVariables,
    appVariableDefinitions,
    pageVariableDefinitions,
    refreshVariables: loadFlowVariables
  };
}