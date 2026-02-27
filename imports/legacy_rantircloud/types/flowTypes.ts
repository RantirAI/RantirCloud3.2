
import { Node, Edge } from '@xyflow/react';

// Extended type for Flow Nodes
export interface FlowNode extends Node {
  data: {
    type: string; // Making type required to match the service definition
    label: string;
    inputs?: Record<string, any>;
    disabled?: boolean;
    isFirstNode?: boolean;
    selectedOutputHandle?: string;
    payloadMappings?: PayloadMapping[]; // Added field for storing payload mappings
    loopConfig?: LoopConfiguration; // Added loop configuration
    [key: string]: any;
  };
}

// New loop configuration interface
export interface LoopConfiguration {
  enabled: boolean;
  sourceNodeId?: string;
  sourceField?: string;
  loopType: 'sync' | 'async';
  batchSize?: number;
  delayMs?: number;
  maxIterations?: number;
  loopVariableName?: string; // Added missing property
  indexVariableName?: string; // Added missing property
  linkedVariableId?: string; // Links max iterations to a loop variable's array length
}

// Export NodeData interface that was referenced but missing
export interface NodeData {
  label: string;
  icon?: string;
  description?: string;
  hasHandle?: boolean;
  connected?: boolean;
  actionType?: string;
  type?: string;
  id?: string;
  inputs?: Record<string, any>;
  disabled?: boolean;
  loopConfig?: LoopConfiguration;
  errorBehavior?: 'stop' | 'continue'; // Controls whether flow stops or continues on node error
  onDelete?: (nodeId: string) => void;
  onAddNode?: (nodeId: string, path?: 'true' | 'false') => void;
  onOpenProperties?: (nodeId: string, data?: any) => void;
  [key: string]: unknown;
}

// Extended type for Flow Edges
export interface FlowEdge extends Edge {
  data?: EdgeData;
}

// Add index signature to EdgeData to make it compatible with Record<string, unknown>
export interface EdgeData {
  label?: string;
  animated?: boolean;
  [key: string]: any; // Adding index signature to fix type compatibility
}

// Flow execution related types
export interface FlowDebugLog {
  id: string;
  nodeId: string;
  nodeName: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  timestamp: number;
  data?: any;
}

export interface FlowExecutionResult {
  success: boolean;
  logs: FlowDebugLog[];
  output?: any;
  error?: string;
  executionTime: number;
}

// JSON mapping related types
export interface JsonMapping {
  sourceNodeId: string;
  sourceField: string;
  targetNodeId: string;
  targetField: string;
  expression?: string;
}

// New type for payload mappings
export interface PayloadMapping {
  sourceNodeId: string;
  sourceOutputField: string;
  targetField: string;
  transformExpression?: string;
}
