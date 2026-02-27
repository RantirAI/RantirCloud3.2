import { NodePlugin, NodeOutput } from '@/types/node-plugin';
import { Webhook } from 'lucide-react';

// Helper to infer type from value
function inferType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';
}

// Helper to get value at a nested path
function getValueAtPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[')) {
      const [arrKey, indexStr] = key.split(/[\[\]]/);
      const index = parseInt(indexStr);
      return current?.[arrKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

// Helper to generate a friendly name from a path
function generateFriendlyName(path: string): string {
  const lastPart = path.split('.').pop() || path;
  // Remove array indices
  const cleanPart = lastPart.replace(/\[\d+\]/g, '');
  // Convert camelCase/snake_case/kebab-case to Title Case
  return cleanPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper to extract fields from sample payload for dynamic outputs
function extractFieldsAsOutputs(payload: any, prefix = ''): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  
  if (!payload || typeof payload !== 'object') return outputs;
  
  const processValue = (key: string, value: any, path: string) => {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (value === null || value === undefined) {
      outputs.push({ name: fullPath, type: 'string', description: generateFriendlyName(fullPath) });
    } else if (typeof value === 'string') {
      outputs.push({ name: fullPath, type: 'string', description: generateFriendlyName(fullPath) });
    } else if (typeof value === 'number') {
      outputs.push({ name: fullPath, type: 'number', description: generateFriendlyName(fullPath) });
    } else if (typeof value === 'boolean') {
      outputs.push({ name: fullPath, type: 'boolean', description: generateFriendlyName(fullPath) });
    } else if (Array.isArray(value)) {
      outputs.push({ name: fullPath, type: 'array', description: generateFriendlyName(fullPath) });
      // Also add first item fields if it's an array of objects
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        Object.entries(value[0]).forEach(([k, v]) => {
          processValue(k, v, `${fullPath}[0]`);
        });
      }
    } else if (typeof value === 'object') {
      outputs.push({ name: fullPath, type: 'object', description: generateFriendlyName(fullPath) });
      // Recursively process nested objects (limit depth)
      const depth = fullPath.split('.').length;
      if (depth < 4) {
        Object.entries(value).forEach(([k, v]) => {
          processValue(k, v, fullPath);
        });
      }
    }
  };
  
  // Process top-level sections
  ['body', 'headers', 'query'].forEach(section => {
    if (payload[section] && typeof payload[section] === 'object') {
      outputs.push({ 
        name: section, 
        type: 'object', 
        description: `Request ${section}` 
      });
      Object.entries(payload[section]).forEach(([key, value]) => {
        processValue(key, value, section);
      });
    }
  });
  
  return outputs;
}

export interface ExpectedParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string;
}

export const webhookTriggerNode: NodePlugin = {
  type: 'webhook-trigger',
  name: 'Webhook Handler',
  description: 'Handle incoming HTTP requests and expose the request data (body, headers, query parameters) to downstream nodes.',
  category: 'trigger',
  icon: Webhook,
  color: '#10B981',
  inputs: [
    {
      name: 'httpMethod',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      default: 'POST',
      options: [
        { label: 'POST', value: 'POST', description: 'Accept POST requests' },
        { label: 'GET', value: 'GET', description: 'Accept GET requests' },
        { label: 'PUT', value: 'PUT', description: 'Accept PUT requests' },
        { label: 'PATCH', value: 'PATCH', description: 'Accept PATCH requests' },
        { label: 'DELETE', value: 'DELETE', description: 'Accept DELETE requests' },
        { label: 'ANY', value: 'ANY', description: 'Accept any HTTP method' },
      ],
      description: 'The HTTP method to accept for this webhook',
    },
    {
      name: 'expectedParams',
      label: 'Expected Query Parameters',
      type: 'queryParamsEditor',
      default: [],
      description: 'Define URL parameters your webhook expects (?userId=123&action=subscribe)',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe what this webhook handles...',
      description: 'Optional description for documentation purposes',
    },
    {
      name: 'transformPayload',
      label: 'Transform Incoming Data',
      type: 'boolean',
      default: false,
      description: 'Enable to transform/map the incoming webhook payload',
    },
    {
      name: 'transformCode',
      label: 'Transformation Code',
      type: 'code',
      language: 'javascript',
      placeholder: `// Available variables:
// body - parsed request body
// headers - request headers  
// query - URL query parameters
// method - HTTP method

// Example: Extract and reshape Webflow form data
return {
  email: body.payload?.data?.email,
  name: body.payload?.data?.name,
  formId: body.payload?.formId,
  submittedAt: body.payload?.submittedAt
};`,
      description: 'JavaScript code to transform the incoming payload. Return an object with the fields you want to use in subsequent nodes.',
      showWhen: {
        field: 'transformPayload',
        values: [true],
      },
    },
    {
      name: 'samplePayload',
      label: 'Sample Payload',
      type: 'hidden',
      description: 'Captured or selected sample payload for variable binding',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if webhook was received successfully. Use in Condition nodes to validate request.',
    },
    {
      name: 'body',
      type: 'object',
      description: 'Complete request body - use {{nodeId.body.fieldName}} to access nested fields',
    },
    {
      name: 'payload',
      type: 'object',
      description: 'Alias for body - the main data payload from the request',
    },
    {
      name: 'headers',
      type: 'object',
      description: 'HTTP request headers',
    },
    {
      name: 'query',
      type: 'object',
      description: 'URL query parameters (?key=value)',
    },
    {
      name: 'method',
      type: 'string',
      description: 'HTTP method (POST, GET, etc.)',
    },
    {
      name: 'transformed',
      type: 'object',
      description: 'Custom transformed data (if transformation is enabled)',
    },
  ],
  // Dynamic outputs based on sample payload - filtered by user selection
  getDynamicOutputs: (inputs: Record<string, any>): NodeOutput[] => {
    if (!inputs.samplePayload) return [];
    
    // If user selected specific fields, only return those
    if (inputs.selectedPayloadFields?.paths?.length > 0) {
      return inputs.selectedPayloadFields.paths.map((path: string) => {
        const autoName = inputs.selectedPayloadFields.autoNames?.[path];
        const value = getValueAtPath(inputs.samplePayload, path);
        return {
          name: path,
          type: inferType(value),
          description: autoName || generateFriendlyName(path)
        };
      });
    }
    
    // Fallback: extract all fields
    return extractFieldsAsOutputs(inputs.samplePayload);
  },
  execute: async (inputs, context) => {
    // In client-side execution, return mock data
    // In server-side execution, the flow-executor provides real request data
    const requestData = {
      headers: context.variables?.request?.headers || {},
      body: context.variables?.request?.body || {},
      query: context.variables?.request?.query || {},
      method: context.variables?.request?.method || inputs.httpMethod || 'POST',
    };

    // Validate expected query parameters
    if (inputs.expectedParams && Array.isArray(inputs.expectedParams)) {
      for (const param of inputs.expectedParams) {
        const value = requestData.query[param.name];
        
        // Check required parameters
        if (param.required && (value === undefined || value === null || value === '')) {
          console.warn(`Missing required query parameter: ${param.name}`);
        }
        
        // Apply default values
        if ((value === undefined || value === null || value === '') && param.defaultValue) {
          requestData.query[param.name] = param.defaultValue;
        }
      }
    }

    // If transformation is enabled and code is provided, simulate transformation
    let transformed = null;
    if (inputs.transformPayload && inputs.transformCode) {
      try {
        // In client-side, we can simulate the transformation with mock data
        const fn = new Function('body', 'headers', 'query', 'method', inputs.transformCode);
        transformed = fn(requestData.body, requestData.headers, requestData.query, requestData.method);
      } catch (error: any) {
        console.error('Transform code error:', error);
        transformed = { error: error.message };
      }
    }

    return {
      success: true, // Webhook received successfully
      body: requestData.body,
      payload: requestData.body, // Alias for convenience
      headers: requestData.headers,
      query: requestData.query,
      method: requestData.method,
      transformed,
    };
  },
};
