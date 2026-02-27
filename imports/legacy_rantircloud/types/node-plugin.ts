
// If the file doesn't exist, we will create it
export type NodeInputType = 'text' | 'select' | 'number' | 'code' | 'variable' | 'textarea' | 'boolean' | 'databaseSelector' | 'tableSelector' | 'webflowFieldMapping' | 'webflowSelect' | 'clicdataSelect' | 'loopVariables' | 'queryParamsEditor' | 'hidden';

export interface NodeInputOption {
  label: string;
  value: string;
  description?: string;
}

export interface NodeInput {
  name: string;
  label: string;
  type: NodeInputType;
  required?: boolean;
  default?: any;
  options?: NodeInputOption[];
  description?: string;
  placeholder?: string;
  language?: 'javascript' | 'json';
  dynamic?: boolean;
  jsonSchema?: any; // Added jsonSchema property
  webflowField?: boolean; // Added this property
  optionType?: 'sites' | 'collections' | 'items'; // Added for webflowSelect type
  clicdataOptionType?: 'dataSets' | 'dashboards'; // Added for clicdataSelect type
  isApiKey?: boolean; // Mark field as API key
  dependsOnApiKey?: boolean; // Field should be disabled until API key is entered
  showWhen?: { // Conditional visibility based on another field's value
    field: string;
    values: any[];
  };
  dynamicOptions?: (
    nodes: any[],
    edges: any[],
    currentNodeId: string,
    currentInputs: Record<string, any>
  ) => Promise<NodeInputOption[]> | NodeInputOption[];
}

export interface NodeOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  jsonSchema?: any; // Added jsonSchema property
}

export interface NodePlugin {
  type: string;
  name: string;
  description: string;
  category: 'trigger' | 'action' | 'condition' | 'transformer';
  icon?: any;
  color?: string;
  inputs?: NodeInput[];
  outputs?: NodeOutput[];
  getDynamicInputs?: (currentInputs: Record<string, any>) => NodeInput[];
  getDynamicOutputs?: (currentInputs: Record<string, any>) => NodeOutput[];
  execute?: (inputs: Record<string, any>, context: ExecutionContext) => Promise<Record<string, any>>;
}

// Additional types to enhance the Node Plugin system
export type NodeCategory = 'trigger' | 'action' | 'condition' | 'transformer';

// Updated ExecutionContext interface with loop node support
export interface ExecutionContext {
  nodeId: string;
  flowId: string;
  envVars?: Record<string, string>;
  executionId?: string;
  variables: Record<string, any>;
  
  // Added for loop node support
  getChildNodes?: (nodeId: string) => any[];
  executeNode?: (node: any, context: ExecutionContext) => Promise<any>;
}
