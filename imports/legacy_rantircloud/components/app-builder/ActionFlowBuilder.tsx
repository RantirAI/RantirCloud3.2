import React, { useState, useCallback, useRef, useMemo, useEffect, DragEvent } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  NodeTypes,
  ConnectionMode,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './HorizontalFlowStyles.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HorizontalActionNode } from './HorizontalActionNode';
import { NodePickerPopover } from './NodePickerPopover';
import { ActionNodeSettingsPanel } from './ActionNodeSettingsPanel';
import { FlowBuilderActionsSidebar } from './FlowBuilderActionsSidebar';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAppBuilderVariableResolver } from '@/hooks/useAppBuilderVariableResolver';
import { Play, Save, X, ChevronRight, Workflow, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ActionFlowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  componentId: string;
  trigger: string;
  existingFlow?: any;
  onSave: (flow: any) => void;
}

const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 100;
const START_X = 100;
const START_Y = 250;

function ActionFlowBuilderContent({ 
  isOpen, 
  onClose, 
  componentId, 
  trigger, 
  existingFlow,
  onSave 
}: ActionFlowBuilderProps) {
  const getInitialNodes = (): Node[] => existingFlow?.nodes || [
    {
      id: 'start',
      type: 'horizontalNode',
      position: { x: START_X, y: START_Y },
      data: { 
        type: 'start',
        label: 'Start',
        config: {},
        isStart: true
      },
      draggable: true,
    },
  ];
  
  const getInitialEdges = (): Edge[] => existingFlow?.edges || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());
  
  // Update nodes/edges when existingFlow changes (e.g., when re-opening dialog)
  useEffect(() => {
    if (existingFlow) {
      setNodes(existingFlow.nodes || getInitialNodes());
      setEdges(existingFlow.edges || []);
    }
  }, [existingFlow]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionErrors, setExecutionErrors] = useState<string[]>([]);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  const [addNodeState, setAddNodeState] = useState<{ nodeId: string; handleId?: string } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { resolveAllVariables } = useAppBuilderVariableResolver();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const nodeTypes: NodeTypes = useMemo(() => ({
    horizontalNode: HorizontalActionNode,
  }), []);

  // Center view on mount
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 });
    }, 100);
  }, [fitView]);

  // Handle drag over for dropping nodes
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop to add new node
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const actionType = event.dataTransfer.getData('application/action-node');
      if (!actionType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${actionType}-${Date.now()}`,
        type: 'horizontalNode',
        position,
        data: {
          type: actionType,
          label: getActionLabel(actionType),
          config: getDefaultConfig(actionType),
        },
        draggable: true,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);

      // Auto-connect to closest node if nearby
      const closestNode = nodes.find(n => {
        const dx = Math.abs(n.position.x - position.x);
        const dy = Math.abs(n.position.y - position.y);
        return dx < HORIZONTAL_SPACING * 1.5 && dy < VERTICAL_SPACING * 1.5 && n.position.x < position.x;
      });

      if (closestNode) {
        const newEdge: Edge = {
          id: `${closestNode.id}-${newNode.id}`,
          source: closestNode.id,
          target: newNode.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
          style: { strokeWidth: 2 },
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      setTimeout(() => {
        fitView({ padding: 0.3, duration: 300 });
      }, 50);
    },
    [screenToFlowPosition, setNodes, setEdges, nodes, fitView]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      style: { strokeWidth: 2 },
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Calculate position for new node
  const calculateNewNodePosition = useCallback((afterNodeId: string, handleId?: string) => {
    const sourceNode = nodes.find(n => n.id === afterNodeId);
    if (!sourceNode) return { x: START_X + HORIZONTAL_SPACING, y: START_Y };

    // Find all edges from this node
    const existingEdges = edges.filter(e => e.source === afterNodeId);
    
    // For condition nodes
    if (handleId === 'true') {
      return {
        x: sourceNode.position.x + HORIZONTAL_SPACING,
        y: sourceNode.position.y - VERTICAL_SPACING / 2
      };
    } else if (handleId === 'false') {
      return {
        x: sourceNode.position.x + HORIZONTAL_SPACING,
        y: sourceNode.position.y + VERTICAL_SPACING
      };
    }

    // For regular nodes - place to the right
    // If there are already edges, offset vertically
    const yOffset = existingEdges.length * VERTICAL_SPACING;
    
    return {
      x: sourceNode.position.x + HORIZONTAL_SPACING,
      y: sourceNode.position.y + yOffset
    };
  }, [nodes, edges]);

  // Add node after clicking + button
  const handleAddNodeFromButton = useCallback((afterNodeId: string, handleId?: string) => {
    setAddNodeState({ nodeId: afterNodeId, handleId });
  }, []);

  // Actually add the node
  const addNodeAfter = useCallback((actionType: string) => {
    if (!addNodeState) return;

    const { nodeId: afterNodeId, handleId } = addNodeState;
    const position = calculateNewNodePosition(afterNodeId, handleId);

    const newNode: Node = {
      id: `${actionType}-${Date.now()}`,
      type: 'horizontalNode',
      position,
      data: {
        type: actionType,
        label: getActionLabel(actionType),
        config: getDefaultConfig(actionType),
      },
      draggable: true,
    };

    setNodes((nds) => nds.concat(newNode));

    // Create edge from source to new node
    const newEdge: Edge = {
      id: `${afterNodeId}-${newNode.id}${handleId ? `-${handleId}` : ''}`,
      source: afterNodeId,
      target: newNode.id,
      sourceHandle: handleId || undefined,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      style: { strokeWidth: 2 },
    };

    setEdges((eds) => [...eds, newEdge]);
    setAddNodeState(null);
    setSelectedNodeId(newNode.id);
    
    // Re-fit view after adding node
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 });
    }, 50);
  }, [addNodeState, calculateNewNodePosition, setNodes, setEdges, fitView]);

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'start') return;
    
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const handleSave = () => {
    const flowData = {
      nodes,
      edges,
      trigger,
      componentId,
    };
    
    onSave(flowData);
    toast.success('Action flow saved successfully!');
    onClose();
  };

  // Execute the flow
  const executeFlow = async () => {
    setIsExecuting(true);
    setExecutionErrors([]);
    setExecutionResults({});
    
    try {
      toast.info('Executing flow...');
      
      const startNode = nodes.find(n => n.data.isStart);
      if (!startNode) {
        throw new Error('No start node found');
      }
      
      await executeNodeChain(startNode.id, {});
      
      toast.success('Flow executed successfully!');
    } catch (error: any) {
      toast.error(`Flow execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeNodeChain = async (nodeId: string, context: any): Promise<void> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    try {
      const result = await executeNode(node, context);
      setExecutionResults(prev => ({ ...prev, [nodeId]: result }));
      
      const connectedEdges = edges.filter(e => e.source === nodeId);
      
      if (node.data.type === 'condition') {
        const conditionResult = result?.success === true;
        const targetEdge = connectedEdges.find(e => 
          e.sourceHandle === (conditionResult ? 'true' : 'false')
        );
        
        if (targetEdge) {
          await executeNodeChain(targetEdge.target, { ...context, ...result });
        }
      } else {
        for (const edge of connectedEdges) {
          await executeNodeChain(edge.target, { ...context, ...result });
        }
      }
    } catch (error: any) {
      setExecutionErrors(prev => [...prev, nodeId]);
      throw error;
    }
  };

  const executeNode = async (node: any, context: any): Promise<any> => {
    const { type, config } = node.data;
    
    const resolvedConfig = resolveAllVariables(config, node.id, `${componentId}-${trigger}`, context);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (type) {
      case 'start':
        return { success: true, data: context };
        
      case 'navigate':
        if (!resolvedConfig.url) throw new Error('URL is required');
        if (resolvedConfig.target === '_blank') {
          window.open(resolvedConfig.url, '_blank');
        } else {
          window.location.href = resolvedConfig.url;
        }
        return { success: true, url: resolvedConfig.url };
        
      case 'navigateToPage':
        if (!resolvedConfig.pageId) throw new Error('Page is required');
        return { success: true, pageId: resolvedConfig.pageId };
        
      case 'openUrl':
        if (!resolvedConfig.url) throw new Error('URL is required');
        window.open(resolvedConfig.url, resolvedConfig.target || '_blank');
        return { success: true, url: resolvedConfig.url };
        
      case 'redirect':
        if (!resolvedConfig.url) throw new Error('URL is required');
        window.location.href = resolvedConfig.url;
        return { success: true, url: resolvedConfig.url };
        
      case 'showAlert':
        if (!resolvedConfig.message) throw new Error('Message is required');
        const alertType = resolvedConfig.type || 'info';
        switch (alertType) {
          case 'success': toast.success(resolvedConfig.message); break;
          case 'error': toast.error(resolvedConfig.message); break;
          case 'warning': toast.warning(resolvedConfig.message); break;
          default: toast.info(resolvedConfig.message);
        }
        return { success: true, message: resolvedConfig.message };
        
      case 'openModal':
        return { success: true, modalId: resolvedConfig.modalId, action: 'open' };
        
      case 'closeModal':
        return { success: true, modalId: resolvedConfig.modalId, action: 'close' };
        
      case 'showComponent':
        return { success: true, componentId: resolvedConfig.componentId, visible: true };
        
      case 'hideComponent':
        return { success: true, componentId: resolvedConfig.componentId, visible: false };
        
      case 'apiCall':
        if (!resolvedConfig.url) throw new Error('API URL is required');
        try {
          const response = await fetch(resolvedConfig.url, {
            method: resolvedConfig.method || 'GET',
            headers: resolvedConfig.headers || {},
            body: resolvedConfig.method !== 'GET' && resolvedConfig.body 
              ? JSON.stringify(resolvedConfig.body) 
              : undefined,
          });
          const data = await response.json().catch(() => ({}));
          return { 
            success: response.ok, 
            data,
            status: response.status,
            statusText: response.statusText
          };
        } catch (error: any) {
          throw new Error(`API call failed: ${error.message}`);
        }
        
      case 'webhook':
        if (!resolvedConfig.url) throw new Error('Webhook URL is required');
        try {
          const response = await fetch(resolvedConfig.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...resolvedConfig.headers },
            body: JSON.stringify(resolvedConfig.payload || {}),
          });
          return { success: response.ok, status: response.status };
        } catch (error: any) {
          throw new Error(`Webhook failed: ${error.message}`);
        }
        
      case 'sendEmail':
        toast.info(`Email would be sent to: ${resolvedConfig.to || 'No recipient'}`);
        return { 
          success: true, 
          to: resolvedConfig.to,
          subject: resolvedConfig.subject,
          simulated: true 
        };
        
      case 'condition':
        const { leftValue, operator, rightValue } = resolvedConfig;
        if (!leftValue || !operator) throw new Error('Condition configuration incomplete');
        
        let result = false;
        const left = String(leftValue).trim();
        const right = String(rightValue || '').trim();
        
        switch (operator) {
          case 'equals': result = left === right; break;
          case 'notEquals': result = left !== right; break;
          case 'greaterThan': result = parseFloat(left) > parseFloat(right); break;
          case 'lessThan': result = parseFloat(left) < parseFloat(right); break;
          case 'greaterOrEqual': result = parseFloat(left) >= parseFloat(right); break;
          case 'lessOrEqual': result = parseFloat(left) <= parseFloat(right); break;
          case 'contains': result = left.includes(right); break;
          case 'startsWith': result = left.startsWith(right); break;
          case 'endsWith': result = left.endsWith(right); break;
          case 'isEmpty': result = left === ''; break;
          case 'isNotEmpty': result = left !== ''; break;
          default: result = false;
        }
        
        return { success: result, condition: { leftValue, operator, rightValue, result } };
        
      case 'delay':
        const duration = resolvedConfig.duration || 1000;
        const unit = resolvedConfig.unit || 'ms';
        let ms = duration;
        if (unit === 's') ms = duration * 1000;
        if (unit === 'm') ms = duration * 60000;
        await new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000)));
        return { success: true, delayed: ms };
        
      case 'setVariable':
        // Support both 'name' and 'variableName' for backward compatibility
        const varName = resolvedConfig.variableName || resolvedConfig.name;
        if (!varName) throw new Error('Variable name is required');
        return { 
          success: true, 
          variable: { name: varName, value: resolvedConfig.value },
          [varName]: resolvedConfig.value 
        };
        
      case 'calculate':
        if (!resolvedConfig.expression) throw new Error('Expression is required');
        try {
          const calcResult = Function('"use strict"; return (' + resolvedConfig.expression + ')')();
          return { success: true, result: calcResult };
        } catch (e: any) {
          throw new Error(`Calculation error: ${e.message}`);
        }
        
      case 'filterData':
        return { success: true, filtered: true, field: resolvedConfig.field };
        
      case 'copyToClipboard':
        if (!resolvedConfig.text) throw new Error('Text is required');
        await navigator.clipboard.writeText(resolvedConfig.text);
        toast.success('Copied to clipboard!');
        return { success: true, copied: resolvedConfig.text };
        
      case 'executeCode':
        if (!resolvedConfig.code) throw new Error('Code is required');
        try {
          const codeResult = Function('"use strict"; ' + resolvedConfig.code)();
          return { success: true, result: codeResult };
        } catch (e: any) {
          throw new Error(`Code execution error: ${e.message}`);
        }
        
      case 'triggerEvent':
        if (!resolvedConfig.eventName) throw new Error('Event name is required');
        window.dispatchEvent(new CustomEvent(resolvedConfig.eventName, { 
          detail: resolvedConfig.eventData 
        }));
        return { success: true, event: resolvedConfig.eventName };
        
      case 'createRecord':
        toast.info('Create record action executed');
        return { success: true, action: 'create', table: resolvedConfig.table };
        
      case 'updateRecord':
        toast.info('Update record action executed');
        return { success: true, action: 'update', table: resolvedConfig.table };
        
      case 'deleteRecord':
        toast.info('Delete record action executed');
        return { success: true, action: 'delete', table: resolvedConfig.table };
        
      case 'database':
        toast.info('Database query executed');
        return { success: true, action: 'query', table: resolvedConfig.table };
        
      case 'formSubmit':
        toast.info('Form submission triggered');
        return { success: true, formId: resolvedConfig.formId };
        
      case 'uploadFile':
        toast.info('File upload triggered');
        return { success: true, uploaded: true };
        
      case 'downloadFile':
        if (resolvedConfig.url) {
          const link = document.createElement('a');
          link.href = resolvedConfig.url;
          link.download = resolvedConfig.filename || 'download';
          link.click();
        }
        return { success: true, downloaded: true };
        
      case 'authenticate':
        toast.info('Authentication flow triggered');
        return { success: true, authenticated: true };
        
      case 'authorize':
        toast.info('Authorization check triggered');
        return { success: true, authorized: true };
        
      case 'scheduleAction':
        toast.info(`Action scheduled for ${resolvedConfig.scheduledTime || 'later'}`);
        return { success: true, scheduled: true };
        
      default:
        return { success: true, type };
    }
  };

  // Check if a node has outgoing connections
  const getNodeConnections = useCallback((nodeId: string) => {
    const nodeEdges = edges.filter(e => e.source === nodeId);
    return {
      isConnected: nodeEdges.length > 0,
      isTrueConnected: nodeEdges.some(e => e.sourceHandle === 'true'),
      isFalseConnected: nodeEdges.some(e => e.sourceHandle === 'false'),
    };
  }, [edges]);

  // Enhanced nodes with all props
  const enhancedNodes = nodes.map((node: Node) => {
    const connections = getNodeConnections(node.id);
    return {
      ...node,
      draggable: true,
      selectable: true,
      className: executionErrors.includes(node.id) ? 'error-node group' : 'group',
      data: {
        ...node.data,
        onUpdateConfig: updateNodeConfig,
        onDelete: deleteNode,
        onOpenSettings: setSelectedNodeId,
        onAddNode: handleAddNodeFromButton,
        hasError: executionErrors.includes(node.id),
        executionResult: executionResults[node.id],
        isExecuting: isExecuting,
        isConnected: connections.isConnected,
        isTrueConnected: connections.isTrueConnected,
        isFalseConnected: connections.isFalseConnected,
      },
    };
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Left sidebar - Actions Panel for Flow Builder */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-card border-r border-border"
      >
        <FlowBuilderActionsSidebar />
      </div>

      {/* Right sidebar overlay - Disables interaction but keeps visible */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-[300px] z-40 pointer-events-auto bg-background/60 backdrop-blur-[1px]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Flow Builder - Positioned over the canvas area only */}
      <div 
        className="fixed z-50 flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden"
        style={{ left: '296px', top: '16px', right: '16px', bottom: '16px' }}
      >
        {/* Flow Builder Header Banner */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <Workflow className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Flow Builder</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
              {trigger}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={executeFlow} disabled={isExecuting} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              {isExecuting ? 'Running...' : 'Test'}
            </Button>

            <Button size="sm" onClick={handleSave} className="gap-1.5 bg-primary hover:bg-primary/90">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>

            <Button size="sm" variant="ghost" onClick={onClose} className="ml-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Flow Canvas - Full Width */}
          <div
            className="flex-1 relative horizontal-flow-builder"
            ref={reactFlowWrapper}
          >
            <ReactFlow
              nodes={enhancedNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              panOnDrag={true}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { stroke: 'hsl(var(--muted-foreground) / 0.4)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
              }}
              className="bg-muted/30"
            >
              <Background
                color="hsl(var(--muted-foreground) / 0.15)"
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
              />
              <Controls showZoom={true} showFitView={true} showInteractive={false} className="!left-4 !bottom-4" />
            </ReactFlow>

            {/* Node picker popover - positioned based on addNodeState */}
            {addNodeState && (
              <NodePickerPopover
                open={!!addNodeState}
                onOpenChange={(open) => !open && setAddNodeState(null)}
                onSelect={addNodeAfter}
              >
                <div className="hidden" />
              </NodePickerPopover>
            )}
          </div>

          {/* Settings Panel */}
          {selectedNodeId && (
            <div className="w-72 border-l border-border bg-card overflow-y-auto">
              <ActionNodeSettingsPanel
                nodeId={selectedNodeId}
                nodeData={nodes.find(n => n.id === selectedNodeId)?.data}
                flowId={`${componentId}-${trigger}`}
                currentNodes={nodes}
                currentEdges={edges}
                onUpdateConfig={updateNodeConfig}
                onDelete={deleteNode}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Wrapper component with ReactFlowProvider
export function ActionFlowBuilder(props: ActionFlowBuilderProps) {
  if (!props.isOpen) return null;
  
  return (
    <ReactFlowProvider>
      <ActionFlowBuilderContent {...props} />
    </ReactFlowProvider>
  );
}

// Helper functions
function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    navigate: 'Navigate to URL',
    navigateToPage: 'Navigate to Page',
    openUrl: 'Open URL',
    redirect: 'Redirect',
    showAlert: 'Show Alert',
    openModal: 'Open Modal',
    closeModal: 'Close Modal',
    showComponent: 'Show Component',
    hideComponent: 'Hide Component',
    apiCall: 'API Call',
    webhook: 'Webhook',
    sendEmail: 'Send Email',
    condition: 'Condition',
    delay: 'Delay',
    executeCode: 'Execute Code',
    triggerEvent: 'Trigger Event',
    setVariable: 'Set Variable',
    calculate: 'Calculate',
    filterData: 'Filter Data',
    copyToClipboard: 'Copy to Clipboard',
    createRecord: 'Create Record',
    updateRecord: 'Update Record',
    deleteRecord: 'Delete Record',
    database: 'Database Query',
    formSubmit: 'Form Submit',
    uploadFile: 'Upload File',
    downloadFile: 'Download File',
    authenticate: 'Authenticate',
    authorize: 'Authorize',
    scheduleAction: 'Schedule Action',
  };
  return labels[actionType] || actionType;
}

function getDefaultConfig(actionType: string): any {
  const configs: Record<string, any> = {
    navigate: { url: '', target: '_self' },
    navigateToPage: { pageId: '', parameters: {} },
    openUrl: { url: '', target: '_blank' },
    redirect: { url: '' },
    showAlert: { message: '', type: 'info' },
    openModal: { modalId: '' },
    closeModal: { modalId: '' },
    showComponent: { componentId: '' },
    hideComponent: { componentId: '' },
    apiCall: { url: '', method: 'GET', headers: {}, body: {} },
    webhook: { url: '', payload: {} },
    sendEmail: { to: '', subject: '', body: '' },
    condition: { leftValue: '', operator: 'equals', rightValue: '' },
    delay: { duration: 1000, unit: 'ms' },
    executeCode: { code: '// Your code here' },
    triggerEvent: { eventName: '', eventData: {} },
    setVariable: { name: '', value: '', valueType: 'string' },
    calculate: { expression: '' },
    filterData: { field: '', operator: 'equals', value: '' },
    copyToClipboard: { text: '' },
    createRecord: { table: '', data: {} },
    updateRecord: { table: '', recordId: '', data: {} },
    deleteRecord: { table: '', recordId: '' },
    database: { table: '', query: '' },
    formSubmit: { formId: '' },
    uploadFile: { accept: '*/*' },
    downloadFile: { url: '', filename: '' },
    authenticate: { provider: 'email' },
    authorize: { permission: '' },
    scheduleAction: { scheduledTime: '', action: '' },
  };
  return configs[actionType] || {};
}
