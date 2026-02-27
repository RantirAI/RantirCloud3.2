import React, { useState, useEffect } from 'react';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NodeInput } from '@/types/node-plugin';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Eye, Info, Radio } from 'lucide-react';
import { useDebugData } from '@/components/debug/DebugData';
import { useParams } from 'react-router-dom';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MonacoEditorField } from '@/components/flow/MonacoEditorField';
import { databaseService } from '@/services/databaseService';
import { tableService } from '@/services/tableService';
import { toast } from 'sonner';
import { DatabaseSelectorField } from './node-types/DatabaseSelectorField';
import { TableSelectorField } from './node-types/TableSelectorField';
import NodeInputField from './editor/NodeInputField';
import { WebflowSelectField } from './node-types/WebflowSelectField';
import { ClicDataSelectField } from './node-types/ClicDataSelectField';
import { WebflowFieldMappingButton } from './editor/WebflowFieldMappingButton';
import { Separator } from '@/components/ui/separator';
import { ConditionCaseEditor } from './condition/ConditionCaseEditor';
import { DataTableFieldMapper } from './editor/DataTableFieldMapper';
import { ResponseChecker, UpstreamNode } from './condition/ResponseChecker';
import { ConditionCase } from '@/nodes/condition';
import { treeLayoutManager } from '@/lib/tree-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualJsonBuilder } from './editor/VisualJsonBuilder';
import { LoopVariablesEditor } from './editor/loops/LoopVariablesEditor';
import { LoopVariable } from './editor/loops/LoopVariableRow';
import { LoopConfigurationPanel } from './editor/loops/LoopConfigurationPanel';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PayloadPreviewPopover } from './webhook/PayloadPreviewPopover';
import { NodeFileUploader, KnowledgeFile } from './editor/NodeFileUploader';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap } from 'lucide-react';
import { LogoIcon } from '@/components/flow/LogoIcon';

// Clickable badge component that shows payload preview
function SamplePayloadBadge({ 
  payload, 
  selectedFields 
}: { 
  payload: any; 
  selectedFields?: { paths: string[]; autoNames: Record<string, string> } 
}) {
  const [showPreview, setShowPreview] = useState(false);
  const fieldCount = selectedFields?.paths?.length || 0;
  
  return (
    <>
      <div 
        className="rounded-lg border border-emerald-500/30 p-3 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10 transition-colors"
        onClick={() => setShowPreview(true)}
      >
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-500" />
          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
            Sample Payload Ready
          </Badge>
          <Eye className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {fieldCount > 0 
            ? `${fieldCount} field${fieldCount !== 1 ? 's' : ''} selected. Click to preview.`
            : 'Click to preview captured payload structure.'}
        </p>
      </div>
      
      <PayloadPreviewPopover
        payload={payload}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        selectedPaths={selectedFields?.paths}
        autoNames={selectedFields?.autoNames}
      />
    </>
  );
}

export function NodeProperties() {
  const { id: flowProjectId } = useParams<{ id: string }>();
  const { nodes, edges, updateNode, setNodes, currentSelectedNodeId } = useFlowStore();
  const { environmentVariables } = useDebugData(flowProjectId);
  const { flowVariables: dbFlowVariables, vaultSecrets } = useVariableResolver();
  const [expandedEditor, setExpandedEditor] = useState<{
    isOpen: boolean;
    fieldName: string;
    value: string;
    language: string;
  }>({
    isOpen: false,
    fieldName: '',
    value: '',
    language: 'javascript'
  });
  
  
  // Track if we're attempting to connect to Webflow API
  const [isConnectingToWebflow, setIsConnectingToWebflow] = useState(false);
  
  // Function to get available variables for binding
  const getAvailableVariables = () => {
    if (!currentSelectedNodeId) return [];
    
    const variables: { label: string; value: string; description?: string }[] = [];
    
    // Add vault secrets
    vaultSecrets.forEach(s => {
      variables.push({
        label: `🔒 Secret > ${s.name}`,
        value: `{{env.${s.name}}}`,
        description: 'Encrypted secret (Vault)',
      });
    });

    // Add flow variables from database
    dbFlowVariables.forEach(v => {
      variables.push({
        label: `Flow Variable > ${v.name}`,
        value: `{{${v.name}}}`,
        description: v.description || `Flow variable ${v.name}`,
      });
    });
    
    // Add environment variables
    if (environmentVariables) {
      Object.keys(environmentVariables).forEach(key => {
        // Skip if already added as a vault secret
        if (vaultSecrets.some(s => s.name === key)) return;
        variables.push({
          label: `Environment > ${key}`,
          value: `{{env.${key}}}`,
          description: `Environment variable ${key}`
        });
      });
    }
    
    // Get connected nodes to this node (incoming connections only)
    const connectedNodeIds = edges
      .filter(edge => edge.target === currentSelectedNodeId)
      .map(edge => edge.source);
    
    // Get outputs from connected nodes
    connectedNodeIds.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;
      
      const nodeType = sourceNode.data.type as string;
      const sourcePlugin = nodeRegistry.getPlugin(nodeType);
      if (!sourcePlugin) return;
      
      // Get static outputs
      const staticOutputs = sourcePlugin.outputs || [];
      
      // Get dynamic outputs (e.g., from webhook sample payload)
      const dynamicOutputs = sourcePlugin.getDynamicOutputs?.(sourceNode.data.inputs || {}) || [];
      
      // Combine and dedupe outputs
      const allOutputs = [...staticOutputs, ...dynamicOutputs];
      
      allOutputs.forEach(output => {
        variables.push({
          label: `${sourceNode.data.label} > ${output.name}`,
          value: `{{${sourceId}.${output.name}}}`,
          description: output.description || `Output from ${sourceNode.data.label}`
        });
      });
    });
    
    return variables;
  };
  
  // Ensure databases are loaded for data-table nodes (moved above to keep hooks order stable)
  useEffect(() => {
    const loadDatabasesIfNeeded = async () => {
      if (!currentSelectedNodeId) return;
      
      const node = nodes.find(n => n.id === currentSelectedNodeId);
      if (!node || node.data.type !== 'data-table') return;
      
      try {
        // Get the user ID
        const userDataStr = localStorage.getItem('supabase.auth.token');
        if (!userDataStr) return;
        
        const userData = JSON.parse(userDataStr);
        const userId = userData.currentSession?.user?.id;
        if (!userId) return;
        
        console.log('Actively loading databases for data-table node in NodeProperties');
        
        // Force clear any loading flags
        if (typeof window !== 'undefined') {
          window.fetchingDatabases = false;
          if (window.fetchingTables) {
            Object.keys(window.fetchingTables).forEach(key => {
              window.fetchingTables[key] = false;
            });
          }
        }
        
        // Always force a fresh fetch when a data-table node is selected
        const databases = await databaseService.getUserDatabases(userId);
        
        // Store in window cache
        if (typeof window !== 'undefined') {
          if (!window.flowDatabases) {
            window.flowDatabases = {};
          }
          window.flowDatabases[userId] = databases;
          console.log('Databases loaded into cache in NodeProperties:', databases);
          
          if (databases.length === 0) {
            console.log('No databases found for user');
            toast.info('No databases found', {
              description: 'You need to create a database first'
            });
          } else {
            // Force a refresh of the node properties
            updateNode(currentSelectedNodeId, {});
          }
        }
        
        // If database is selected, also load tables
        const databaseId = node.data.inputs?.databaseId;
        if (databaseId && databaseId !== 'loading') {
          const tables = await tableService.getUserTableProjects(userId, databaseId);
          
          // Store in window cache
          if (typeof window !== 'undefined') {
            if (!window.flowDataTables) {
              window.flowDataTables = {};
            }
            window.flowDataTables[databaseId] = tables;
            console.log('Tables loaded into cache:', tables);
            
            // Force a refresh if tables were loaded
            if (tables.length > 0) {
              updateNode(currentSelectedNodeId, {});
            }
          }
        }
      } catch (error) {
        console.error('Error loading databases for data-table node:', error);
        // Reset loading flags on error
        if (typeof window !== 'undefined') {
          window.fetchingDatabases = false;
        }
      }
    };
    
    loadDatabasesIfNeeded();
  }, [currentSelectedNodeId, nodes, updateNode]);
  
  if (!currentSelectedNodeId) {
    console.log("NodeProperties: No node selected");
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a node to view its properties
      </div>
    );
  }

  console.log("NodeProperties: Selected node ID:", currentSelectedNodeId);

  const node = nodes.find(n => n.id === currentSelectedNodeId);
  console.log("NodeProperties: Found node:", node?.data?.type);
  
  if (!node) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Node not found. It may have been deleted or corrupted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Validate node structure
  if (!node.data || !node.data.type) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This node has corrupted data. Please delete it and create a new one.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const nodeType = node.data.type as string;
  const plugin = nodeRegistry.getPlugin(nodeType);
  console.log("NodeProperties: Found plugin:", plugin?.name);
  
  if (!plugin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Node type "{nodeType}" not found. This node may be from an unavailable integration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For APITemplate.io nodes, ensure default action is persisted
  if (nodeType === 'apitemplate-io' && (!node.data.inputs?.action)) {
    updateNode(currentSelectedNodeId, {
      inputs: {
        ...(node.data.inputs || {}),
        action: 'getAccountInformation',
      },
    });
  }

  // Get the available input fields (static + dynamic)
  const staticInputs = plugin?.inputs || [];
  const dynamicInputs = plugin?.getDynamicInputs ? plugin.getDynamicInputs(node.data.inputs || {}) : [];
  const availableInputs = [...staticInputs, ...dynamicInputs];

  const handleInputChange = (name: string, value: any) => {
    // When action or operation changes, clear dynamic fields to prevent stale data
    const isActionField = name === 'action' || name === 'operation';
    
    if (isActionField && plugin?.getDynamicInputs) {
      // Get the names of static inputs that should be preserved
      const staticInputNames = new Set((plugin.inputs || []).map(input => input.name));
      
      // Build new inputs with only static fields + the new action value
      const preservedInputs: Record<string, any> = {};
      Object.entries(node.data.inputs || {}).forEach(([key, val]) => {
        if (staticInputNames.has(key)) {
          preservedInputs[key] = val;
        }
      });
      preservedInputs[name] = value;
      
      updateNode(currentSelectedNodeId, {
        inputs: preservedInputs,
      });
    } else {
      updateNode(currentSelectedNodeId, {
        inputs: {
          ...(node.data.inputs || {}),
          [name]: value,
        },
      });
    }
  };

  const handleLabelChange = (value: string) => {
    updateNode(currentSelectedNodeId, {
      label: value,
    });
  };


  // Handle connecting to Webflow API
  const handleConnectToWebflow = async () => {
    // Clear any existing site/collection data in the node to force reload
    const apiKey = node.data.inputs?.apiKey;
    
    if (!apiKey) {
      toast.error("Please enter a Webflow API key first");
      return;
    }
    
    setIsConnectingToWebflow(true);
    
    // Clear existing cache for this API key to force refresh
    if (typeof window !== 'undefined' && window.webflowCache) {
      const cacheKey = apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 5);
      if (window.webflowCache.sites) {
        window.webflowCache.sites.delete(cacheKey);
      }
    }
    
    // Clear site, collection, and item selection
    updateNode(currentSelectedNodeId, {
      inputs: {
        ...node.data.inputs,
        siteId: '',
        collectionId: '',
        itemId: ''
      },
    });
    
    // Force refresh of the sites dropdown
    setTimeout(() => {
      setIsConnectingToWebflow(false);
      toast.success("Ready to select Webflow site");
    }, 500);
  };

  // Extract the action/operation value for use in the shouldShowField function
  const inputsObj = node.data.inputs || {};
  const actionValue = nodeType === 'webflow' 
    ? inputsObj.action
    : nodeType === 'data-table' 
    ? inputsObj.operation
    : null;

  // Helper function to render webflow-specific API key validation message
  const renderWebflowApiKeyHelp = () => {
    if (nodeType !== 'webflow') return null;
    
    const apiKeyValue = node.data.inputs?.apiKey;
    
    // Check if API key is empty
    if (!apiKeyValue) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Webflow API key is required to connect to Webflow.
          </AlertDescription>
        </Alert>
      );
    }
    
    // If it's a flow variable reference, check if it exists
    if (apiKeyValue.startsWith('{{') && apiKeyValue.endsWith('}}') && !apiKeyValue.startsWith('{{env.')) {
      const varName = apiKeyValue.substring(2, apiKeyValue.length - 2);
      
      // Check if flow variable exists
      if (flowProjectId) {
        const storageKey = `flow-variables-${flowProjectId}`;
        const storedVariables = localStorage.getItem(storageKey);
        
        if (storedVariables) {
          try {
            const flowVariables = JSON.parse(storedVariables);
            const variable = flowVariables.find((v: any) => v.name === varName);
            
            if (!variable) {
              return (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Flow variable <code>{varName}</code> not found. Please create it in Flow Variables.
                  </AlertDescription>
                </Alert>
              );
            }
            
            return (
              <Alert className="mt-2 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Using flow variable <code>{varName}</code> for Webflow API key.
                </AlertDescription>
              </Alert>
            );
          } catch (error) {
            return (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error reading flow variables. Please check Flow Variables configuration.
                </AlertDescription>
              </Alert>
            );
          }
        }
      }
    }
    
    // If it's an environment variable reference, check if it exists
    if (apiKeyValue.startsWith('{{env.') && apiKeyValue.endsWith('}}')) {
      const envVarName = apiKeyValue.substring(6, apiKeyValue.length - 2);
      if (!environmentVariables || !environmentVariables[envVarName]) {
        return (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Environment variable <code>{envVarName}</code> not found. Please add it to your environment variables.
            </AlertDescription>
          </Alert>
        );
      }
      
      return (
        <Alert className="mt-2 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Using environment variable <code>{envVarName}</code> for Webflow API key.
          </AlertDescription>
        </Alert>
      );
    }
    
    // For direct API keys, check format
    if (apiKeyValue.length < 20) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid API key format. Webflow API keys are typically long tokens.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert className="mt-2 bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          API key format looks valid. Remember that your API key needs to have the correct permissions.
        </AlertDescription>
      </Alert>
    );
  };
  
  // Helper function to determine if a field should be shown based on dependencies
  const shouldShowField = (input: NodeInput) => {
    // Check if field has showWhen condition
    if (input.showWhen) {
      const dependentFieldValue = inputsObj[input.showWhen.field];
      // Show field only if the dependent field has one of the specified values
      return input.showWhen.values.includes(dependentFieldValue);
    }
    
    // For data-table node, handle dynamic fields based on operation and database selection
    if (nodeType === 'data-table') {
      // Database is always shown
      if (input.name === 'databaseId') return true;
      
      // Show tableId only if databaseId is selected
      if (input.name === 'tableId') return !!inputsObj.databaseId;
      
      // Show operation only if tableId is selected
      if (input.name === 'operation') return !!inputsObj.tableId;
      
      // For other fields, only show if operation is selected
      if (!inputsObj.operation) return false;
      
      // Show recordId for update and delete operations
      if (input.name === 'recordId' && ['update', 'delete'].includes(inputsObj.operation)) return true;
      
      // Show filter, sort, and limit for get operations
      if ((input.name === 'filter' || input.name === 'sort' || input.name === 'limit') && inputsObj.operation === 'get') return true;
      
      // Hide raw data field for create/update — the DataTableFieldMapper replaces it
      if (input.name === 'data' && ['create', 'update'].includes(inputsObj.operation)) return false;
      
      // fieldMap.* inputs are handled by DataTableFieldMapper, never render them individually
      if (input.name.startsWith('fieldMap.')) return false;
      
      // Show returnReadableFields for all operations
      if (input.name === 'returnReadableFields') return true;
      
      // Don't show this field for this operation
      return false;
    }
    
    // For all other node types, show all fields
    return true;
  };

  // Handle opening code editor in dialog
  const openCodeEditor = (input: NodeInput, value: string) => {
    setExpandedEditor({
      isOpen: true,
      fieldName: input.name,
      value: value || '',
      language: input.language || 'javascript'
    });
  };

  // Handle saving code from expanded editor
  const handleSaveExpandedCode = (value: string) => {
    // Check if we have a condition case editor callback
    const conditionCaseCallback = (window as any).__conditionCaseEditorOnSave;
    if (conditionCaseCallback && expandedEditor.fieldName.startsWith('conditionCase.')) {
      conditionCaseCallback(value);
      (window as any).__conditionCaseEditorOnSave = null;
    } else if (expandedEditor.fieldName.startsWith('fieldMap.') && currentSelectedNodeId) {
      // For fieldMap fields, recompose the data JSON like the mapper does
      const newInputs = { ...(node?.data?.inputs || {}) };
      newInputs[expandedEditor.fieldName] = value;
      const updatedFieldMap: Record<string, any> = {};
      for (const [k, v] of Object.entries(newInputs)) {
        if (k.startsWith('fieldMap.') && v !== undefined && v !== '') {
          updatedFieldMap[k.substring('fieldMap.'.length)] = v;
        }
      }
      newInputs.data = Object.keys(updatedFieldMap).length > 0
        ? JSON.stringify(updatedFieldMap)
        : '';
      updateNode(currentSelectedNodeId, { inputs: newInputs });
    } else {
      handleInputChange(expandedEditor.fieldName, value);
    }
    setExpandedEditor(prev => ({ ...prev, isOpen: false }));
  };

  const renderInputField = (input: NodeInput, _index: number) => {
    console.log(`NodeProperties: Rendering field ${input.name} of type ${input.type}`);
    
    // Skip hidden fields — they are rendered via custom UI (e.g. NodeFileUploader)
    if (input.type === 'hidden') return null;
    
    // Don't render if this field shouldn't be shown for the current action
    if (!shouldShowField(input)) return null;

    // fieldMap.* inputs are handled by the inline DataTableFieldMapper below, skip here
    if (input.name.startsWith('fieldMap.')) return null;
    
    const value = node.data.inputs?.[input.name] ?? input.default ?? '';
    const variables = getAvailableVariables();
    
    // Special handling for webflowSelect input type
    if (input.type === 'webflowSelect') {
      const apiKey = node.data.inputs?.apiKey || '';
      const siteId = node.data.inputs?.siteId || '';
      const collectionId = node.data.inputs?.collectionId || '';
      
      return (
        <div className="border rounded-md mb-4">
          <div className="p-2 bg-muted">
            <Label htmlFor={`input-${input.name}`} className="flex items-center">
              {input.label}
              {input.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          <div className="p-2">
            <WebflowSelectField 
              value={String(value)}
              onChange={(val) => handleInputChange(input.name, val)}
              apiKey={apiKey}
              siteId={siteId}
              collectionId={collectionId}
              optionType={input.optionType || 'sites'}
              placeholder={`Select a ${input.optionType || 'site'}`}
            />
            {input.description && (
              <p className="text-xs text-muted-foreground mt-2">{input.description}</p>
            )}
          </div>
        </div>
      );
    }
      
    // Special handling for webflowFieldMapping type
    if (input.type === 'webflowFieldMapping') {
      const apiKey = node.data.inputs?.apiKey || '';
      const collectionId = node.data.inputs?.collectionId || '';
      
      return (
        <div className="border rounded-md mb-4">
          <div className="p-2 bg-muted">
            <Label htmlFor={`input-${input.name}`} className="flex items-center">
              {input.label}
              {input.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          <div className="p-2">
            <WebflowFieldMappingButton
              collectionId={collectionId}
              apiKey={apiKey}
              value={value || '{}'}
              onChange={(val) => handleInputChange(input.name, val)}
            />
            {input.description && (
              <p className="text-xs text-muted-foreground mt-2">{input.description}</p>
            )}
          </div>
        </div>
      );
    }
    
    // Special handling for loopVariables input type (Zapier-style loop config)
    if (input.type === 'loopVariables') {
      // Parse the value - it could be an array or a JSON string
      let loopVariables: LoopVariable[] = [];
      if (Array.isArray(value)) {
        loopVariables = value;
      } else if (typeof value === 'string') {
        try {
          loopVariables = JSON.parse(value);
        } catch (e) {
          loopVariables = [];
        }
      }
      
      // If empty, initialize with default variable
      if (loopVariables.length === 0) {
        loopVariables = [{
          id: 'default-1',
          variableName: 'item',
          sourceNodeId: '',
          sourceField: ''
        }];
      }
      
      return (
        <div className="border rounded-md mb-4">
          <div className="p-3">
            <LoopVariablesEditor
              nodeId={currentSelectedNodeId}
              value={loopVariables}
              onChange={(val) => handleInputChange(input.name, val)}
              nodes={nodes}
              edges={edges}
            />
          </div>
        </div>
      );
    }
    
    if (input.type === 'tableSelector') {
      const databaseId = node.data.inputs?.databaseId;
      return (
        <div className="border rounded-md mb-4">
          <div className="p-2 bg-muted">
            <Label htmlFor={`input-${input.name}`} className="flex items-center">
              {input.label}
              {input.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          <div className="p-2">
            <TableSelectorField 
              value={String(value)}
              onChange={(val) => handleInputChange(input.name, val)}
              databaseId={databaseId}
            />
          </div>
        </div>
      );
    }
    
    if (input.type === 'databaseSelector') {
      return (
        <div className="border rounded-md mb-4">
          <div className="p-2 bg-muted">
            <Label htmlFor={`input-${input.name}`} className="flex items-center">
              {input.label}
              {input.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          <div className="p-2">
            <DatabaseSelectorField 
              value={String(value)}
              onChange={(val) => handleInputChange(input.name, val)}
            />
          </div>
        </div>
      );
    }
    
    // Special handling for clicdataSelect input type
    if (input.type === 'clicdataSelect') {
      const apiKey = node.data.inputs?.apiKey || '';
      const apiVersion = node.data.inputs?.apiVersion || '';
      
      return (
        <div className="border rounded-md mb-4">
          <div className="p-2 bg-muted">
            <Label htmlFor={`input-${input.name}`} className="flex items-center">
              {input.label}
              {input.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          <div className="p-2">
            <ClicDataSelectField 
              value={String(value)}
              onChange={(val) => handleInputChange(input.name, val)}
              apiKey={apiKey}
              apiVersion={apiVersion}
              optionType={input.clicdataOptionType || 'dataSets'}
              placeholder={input.placeholder || 'Select a table'}
              loadOnMount={!!apiKey}
            />
            {input.description && (
              <p className="text-xs text-muted-foreground mt-2">{input.description}</p>
            )}
          </div>
        </div>
      );
    }
    
    // Default input field rendering
    return (
      <div className="border rounded-md mb-4">
        <div className="p-2 bg-muted">
          <Label htmlFor={`input-${input.name}`} className="flex items-center">
            {input.label}
            {input.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <div className="p-2">
          <NodeInputField
            input={input}
            value={value}
            nodeId={currentSelectedNodeId}
            onChange={(val) => handleInputChange(input.name, val)}
            onExpandCode={openCodeEditor}
            variables={variables}
            node={node}
            onConnect={input.name === 'apiKey' && nodeType === 'webflow' ? handleConnectToWebflow : undefined}
            onOpenCodeEditor={(nodeId, fieldName, currentValue) => {
              setExpandedEditor({
                isOpen: true,
                fieldName: fieldName || '',
                value: currentValue || '',
                language: 'javascript'
              });
            }}
          />
          
          {input.description && (
            <p className="text-xs text-muted-foreground mt-2">{input.description}</p>
          )}
          
          {/* Special validation for Webflow API key */}
          {nodeType === 'webflow' && input.name === 'apiKey' && renderWebflowApiKeyHelp()}
        </div>
      </div>
    );
  };
  
  // useEffect moved above to maintain stable hooks order

  // Compute ALL upstream nodes for Response Checker
  const getUpstreamNodes = (): UpstreamNode[] => {
    if (!currentSelectedNodeId) return [];
    
    const visited = new Set<string>();
    const result: UpstreamNode[] = [];
    
    // Traverse edges backwards to find all upstream nodes
    const traverse = (currentNodeId: string) => {
      const incomingEdges = edges.filter(e => e.target === currentNodeId);
      for (const edge of incomingEdges) {
        if (visited.has(edge.source)) continue;
        visited.add(edge.source);
        
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) continue;
        
        const sourceNodeType = sourceNode.data.type as string;
        const sourcePlugin = nodeRegistry.getPlugin(sourceNodeType);
        
        result.push({
          nodeId: sourceNode.id,
          label: (sourceNode.data.label as string) || sourceNode.id,
          nodeType: sourceNodeType,
          hasErrorHandling: sourceNode.data.errorBehavior === 'continue',
          outputs: sourcePlugin?.outputs || []
        });
        
        traverse(edge.source);
      }
    };
    
    traverse(currentSelectedNodeId);
    return result;
  };
  
  // Get upstream nodes for condition node Response Checker
  const upstreamNodes = nodeType === 'condition' ? getUpstreamNodes() : [];


  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 min-h-0" scrollbarVariant="hover-show">
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Node Properties</h3>
            </div>

            <div>
              <Label htmlFor="node-label">Node Name</Label>
              <Input
                id="node-label"
                value={node.data.label || ''}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Enter node name"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Node Type</h3>
              <div className="flex items-center gap-2">
                {plugin.type === 'firecrawl' ? (
                  <svg fill="none" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
                      fill="#FF6600"
                    />
                  </svg>
                ) : plugin.type === 'snowflake' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" role="img" aria-label="Snowflake mark">
                    <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="m27 12.094-3.3 1.908 3.3 1.902a1.739 1.739 0 1 1-1.737 3.012l-5.911-3.412a1.718 1.718 0 0 1-.79-.993 1.7 1.7 0 0 1-.078-.565c.004-.137.024-.274.06-.411a1.75 1.75 0 0 1 .806-1.045l5.909-3.408a1.737 1.737 0 0 1 2.373.638A1.73 1.73 0 0 1 27 12.093Zm-3.125 9.246-5.906-3.406a1.708 1.708 0 0 0-1.007-.228 1.735 1.735 0 0 0-1.608 1.734v6.82a1.739 1.739 0 1 0 3.477 0v-3.815l3.307 1.909a1.734 1.734 0 0 0 2.374-.634 1.744 1.744 0 0 0-.637-2.38Zm-6.816-6.672-2.456 2.453a.486.486 0 0 1-.308.13H13.574a.495.495 0 0 1-.308-.13l-2.456-2.453a.492.492 0 0 1-.127-.306V13.64c0-.1.056-.239.127-.31l2.454-2.452a.492.492 0 0 1 .308-.128H14.295c.1 0 .237.056.308.128l2.456 2.453c.07.07.127.209.127.31v.722a.501.501 0 0 1-.127.306Zm-1.963-.68a.517.517 0 0 0-.131-.31l-.71-.709a.5.5 0 0 0-.309-.129h-.028a.494.494 0 0 0-.306.13l-.71.708a.51.51 0 0 0-.125.31v.028c0 .099.054.236.124.306l.711.71c.07.071.207.13.306.13h.028a.504.504 0 0 0 .308-.13l.711-.71a.5.5 0 0 0 .13-.306v-.028ZM3.993 6.656l5.909 3.41c.318.183.67.256 1.008.228a1.74 1.74 0 0 0 1.609-1.736v-6.82a1.739 1.739 0 0 0-3.477 0v3.816l-3.31-1.912a1.74 1.74 0 0 0-1.74 3.014Zm12.97 3.638a1.72 1.72 0 0 0 1.006-.228l5.906-3.41a1.742 1.742 0 0 0 .637-2.378 1.738 1.738 0 0 0-2.374-.636L18.83 5.555V1.736a1.738 1.738 0 0 0-3.476 0v6.821a1.737 1.737 0 0 0 1.608 1.736Zm-6.053 7.412a1.708 1.708 0 0 0-1.008.228l-5.91 3.406a1.745 1.745 0 0 0-.635 2.38 1.738 1.738 0 0 0 2.373.634l3.31-1.909v3.816a1.737 1.737 0 1 0 3.477 0V19.44a1.734 1.734 0 0 0-1.607-1.734Zm-1.602-3.195c.058-.185.082-.376.078-.565a1.733 1.733 0 0 0-.872-1.456L2.61 9.082a1.736 1.736 0 0 0-2.374.638 1.733 1.733 0 0 0 .636 2.373l3.3 1.909L.87 15.904a1.739 1.739 0 1 0 1.738 3.012l5.905-3.412c.4-.228.67-.588.795-.993Z"/>
                  </svg>
                ) : plugin.type === 'apollo' ? (
                  <img 
                    src="https://cdn.activepieces.com/pieces/apollo.png" 
                    alt="Apollo" 
                    className="h-4 w-4 object-cover"
                  />
                ) : (typeof plugin.icon === 'string') ? (
                  <img 
                    src={plugin.icon} 
                    alt={plugin.name} 
                    className="h-4 w-4 object-cover"
                  />
                ) : (
                  plugin.icon && <plugin.icon className="h-4 w-4" style={{ color: plugin.color }} />
                )}
                <span>{plugin.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{plugin.description}</p>
            </div>

            {/* Webhook Info - only for webhook-trigger nodes */}
            {nodeType === 'webhook-trigger' && node.data.inputs?.samplePayload && (
              <SamplePayloadBadge 
                payload={node.data.inputs.samplePayload} 
                selectedFields={node.data.inputs.selectedPayloadFields}
              />
            )}

            {/* Error Handling Section - hidden for triggers and condition nodes (condition can check _failedNode) */}
            {nodeType !== 'webhook-trigger' && nodeType !== 'condition' && (
              <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="continue-on-error" className="text-sm font-medium">
                      Continue on Error
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, errors from this node will be logged but won't stop the flow
                    </p>
                  </div>
                  <Switch
                    id="continue-on-error"
                    checked={node.data.errorBehavior === 'continue'}
                    onCheckedChange={(checked) => {
                      updateNode(currentSelectedNodeId, {
                        errorBehavior: checked ? 'continue' : 'stop',
                      });
                    }}
                  />
                </div>
                {node.data.errorBehavior === 'continue' && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Downstream nodes will receive an error object instead of normal output if this node fails.</span>
                  </div>
                )}
              </div>
            )}

            <Separator />


            {/* Special rendering for for-each-loop node */}
            {nodeType === 'for-each-loop' ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Loop Configuration</h3>
                <LoopConfigurationPanel
                  nodeId={currentSelectedNodeId}
                  inputs={node.data.inputs || {}}
                  onInputChange={handleInputChange}
                  nodes={nodes}
                  edges={edges}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Properties</h3>
                </div>

                {/* Response Checker for simple condition mode */}
                {nodeType === 'condition' && !node.data.inputs?.multipleConditions && upstreamNodes.length > 0 && (
                  <ResponseChecker
                    upstreamNodes={upstreamNodes}
                    currentExpression={node.data.inputs?.condition || ''}
                    onApplyExpression={(expression, description) => {
                      // Update both condition and description fields
                      updateNode(currentSelectedNodeId, {
                        inputs: {
                          ...node.data.inputs,
                          condition: expression,
                          description: description || '',
                        },
                      });
                    }}
                  />
                )}

                {availableInputs.map((input, index) => {
                  // Special handling for condition node's 'cases' field - render custom case editor
                  if (nodeType === 'condition' && input.name === 'cases' && node.data.inputs?.multipleConditions) {
                    const returnType = node.data.inputs?.returnType || 'boolean';
                    let cases: ConditionCase[] = [];
                    try {
                      const casesValue = node.data.inputs?.cases;
                      cases = typeof casesValue === 'string' ? JSON.parse(casesValue || '[]') : (casesValue || []);
                    } catch (e) {
                      cases = [];
                    }
                    
                    return (
                      <div key={input.name} className="space-y-2">
                        <Label>Condition Cases</Label>
                        <ConditionCaseEditor
                          cases={cases}
                          returnType={returnType as 'boolean' | 'string' | 'integer'}
                          onChange={(newCases) => {
                            const nextCasesValue = JSON.stringify(newCases);

                            // 1) Update the node inputs (source of truth)
                            handleInputChange('cases', nextCasesValue);

                            // 2) Immediately run the layout pass with the *next* node data,
                            // so adding a branch pushes neighboring nodes away instead of overlapping.
                            const nextNodes = nodes.map((n) => {
                              if (n.id !== currentSelectedNodeId) return n;
                              return {
                                ...n,
                                data: {
                                  ...n.data,
                                  inputs: {
                                    ...(n.data.inputs || {}),
                                    cases: nextCasesValue,
                                  },
                                },
                              };
                            });

                            const laidOut = treeLayoutManager.expandBranchesToPreventOverlap(
                              nextNodes,
                              edges
                            );

                            // Only commit if something actually moved.
                            const hasPositionChanges = laidOut.some((n, i) => {
                              const before = nextNodes[i];
                              return !!before && (before.position.x !== n.position.x || before.position.y !== n.position.y);
                            });

                            if (hasPositionChanges) {
                              setNodes(laidOut);
                            }
                          }}
                          nodeId={currentSelectedNodeId}
                          onOpenCodeEditor={(nodeId, fieldName, currentValue, onSave) => {
                            setExpandedEditor({
                              isOpen: true,
                              fieldName: fieldName,
                              value: currentValue || '',
                              language: 'javascript'
                            });
                            // Store the callback for when we save
                            (window as any).__conditionCaseEditorOnSave = onSave;
                          }}
                          upstreamErrorNodes={upstreamNodes.filter(n => n.hasErrorHandling)}
                        />
                      </div>
                    );
                  }
                  
                  return renderInputField(input, index);
                })}

                {/* Inline DataTableFieldMapper for data-table create/update — rendered independently of getDynamicInputs */}
                {nodeType === 'data-table' && ['create', 'update'].includes(inputsObj.operation) && inputsObj.tableId && (() => {
                  const fieldValues: Record<string, string> = {};
                  for (const [key, val] of Object.entries(node.data.inputs || {})) {
                    if (key.startsWith('fieldMap.')) {
                      fieldValues[key] = String(val || '');
                    }
                  }
                  return (
                    <div className="border rounded-md mb-4">
                      <div className="p-2 bg-muted">
                        <Label className="flex items-center">Record Fields</Label>
                      </div>
                      <div className="p-2">
                        <DataTableFieldMapper
                          tableId={inputsObj.tableId || ''}
                          databaseId={inputsObj.databaseId || ''}
                          fieldValues={fieldValues}
                          onChange={(fieldKey, value) => {
                            const isRemove = value === '__REMOVE__';
                            const newInputs = { ...(node.data.inputs || {}) };
                            if (isRemove) {
                              delete newInputs[fieldKey];
                            } else {
                              newInputs[fieldKey] = value;
                            }
                            // Recompose data JSON from remaining fieldMap entries
                            const updatedFieldMap: Record<string, any> = {};
                            for (const [k, v] of Object.entries(newInputs)) {
                              if (k.startsWith('fieldMap.') && v !== undefined && v !== '' &&
                                  !(typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}'))) {
                                updatedFieldMap[k.substring('fieldMap.'.length)] = v;
                              }
                            }
                            newInputs.data = Object.keys(updatedFieldMap).length > 0
                              ? JSON.stringify(updatedFieldMap)
                              : '';
                            updateNode(currentSelectedNodeId, { inputs: newInputs });
                          }}
                          variables={getAvailableVariables()}
                          nodeId={currentSelectedNodeId}
                          onOpenSidebar={(nId, fieldName) => {
                            setExpandedEditor({
                              isOpen: true,
                              fieldName: fieldName || '',
                              value: node.data.inputs?.[fieldName || ''] || '',
                              language: 'javascript'
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
                {nodeType === 'ai-agent' && flowProjectId && (
                  <NodeFileUploader
                    flowProjectId={flowProjectId}
                    nodeId={currentSelectedNodeId}
                    value={(node.data.inputs?.knowledgeFiles as KnowledgeFile[]) || []}
                    onChange={(files) => handleInputChange('knowledgeFiles', files)}
                  />
                )}

                {/* Post-Response Hooks selector for ai-agent nodes */}
                {nodeType === 'ai-agent' && (() => {
                  const selectedHooks: string[] = Array.isArray(node.data.inputs?.postResponseHooks) 
                    ? node.data.inputs.postResponseHooks 
                    : [];
                  const availableNodes = nodes.filter(
                    n => n.id !== currentSelectedNodeId && n.data?.type !== 'ai-agent' && n.data?.type !== 'webhook-trigger'
                  );
                  
                  if (availableNodes.length === 0) return null;
                  
                  return (
                    <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/30 mt-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          <Label className="text-sm font-medium">Post-Response Hooks</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          These nodes run automatically after every AI response — they are NOT AI tools.
                          Use them to log conversations, check keywords, send webhooks, etc.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {availableNodes.map(n => {
                          const nPlugin = nodeRegistry.getPlugin(n.data.type as string);
                          const isChecked = selectedHooks.includes(n.id);
                          return (
                            <label
                              key={n.id}
                              className="flex items-center gap-3 p-2 rounded-md border border-border/40 cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...selectedHooks, n.id]
                                    : selectedHooks.filter(id => id !== n.id);
                                  handleInputChange('postResponseHooks', next);
                                }}
                              />
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${nPlugin?.color || '#888'}20` }}
                              >
                                {nPlugin?.icon && <LogoIcon icon={nPlugin.icon} alt={n.data.label || ''} size="sm" color={nPlugin.color} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm truncate block">{n.data.label}</span>
                              </div>
                              <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                {n.data.type as string}
                              </Badge>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={expandedEditor.isOpen} onOpenChange={(open) => !open && setExpandedEditor(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col bg-background resize overflow-auto" style={{ resize: 'both', minWidth: '600px', minHeight: '400px' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Code
              <span className="text-xs text-muted-foreground font-normal">(drag corner to resize)</span>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-fit">
              <TabsTrigger value="code">Code Editor</TabsTrigger>
              <TabsTrigger value="mapper">Visual Mapper</TabsTrigger>
            </TabsList>
            
            <TabsContent value="code" className="flex-1 min-h-0 mt-4">
              <MonacoEditorField 
                value={expandedEditor.value} 
                onChange={(value) => setExpandedEditor(prev => ({ ...prev, value }))}
                language={expandedEditor.language}
                nodeId={currentSelectedNodeId}
                height="100%"
              />
            </TabsContent>
            
            <TabsContent value="mapper" className="flex-1 min-h-0 mt-4 overflow-auto">
              <VisualJsonBuilder 
                initialValue={(() => {
                  try {
                    return JSON.parse(expandedEditor.value);
                  } catch {
                    return {};
                  }
                })()}
                availableVariables={(() => {
                  // Build available variables from connected nodes
                  const vars: { label: string; value: string }[] = [];
                  if (currentSelectedNodeId) {
                    const incomingEdges = edges.filter(e => e.target === currentSelectedNodeId);
                    incomingEdges.forEach(edge => {
                      const sourceNode = nodes.find(n => n.id === edge.source);
                      if (!sourceNode) return;
                      const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
                      plugin?.outputs?.forEach(output => {
                        vars.push({
                          label: `${sourceNode.data.label} → ${output.name}`,
                          value: `{{${edge.source}.${output.name}}}`
                        });
                      });
                    });
                  }
                  return vars;
                })()}
                onChange={(value) => setExpandedEditor(prev => ({ 
                  ...prev, 
                  value: JSON.stringify(value, null, 2) 
                }))}
              />
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setExpandedEditor(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSaveExpandedCode(expandedEditor.value)}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
