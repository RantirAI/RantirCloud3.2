
import { NodePlugin } from '@/types/node-plugin';
import { Wand } from 'lucide-react';

export const aiMapperNode: NodePlugin = {
  type: 'ai-mapper',
  name: 'AI Mapper',
  description: 'Use AI to transform and map data between nodes',
  category: 'transformer', // Changed from 'data' to 'transformer'
  icon: Wand,
  color: '#9333EA',
  inputs: [
    {
      name: 'sourceNodeId',
      label: 'Source Node',
      type: 'select',
      required: true,
      description: 'Node to get data from',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId) => {
        // Get incoming connections to this node
        const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
        
        if (incomingEdges.length === 0) {
          return [{ label: 'Connect a node first', value: 'none' }];
        }
        
        // Return connected nodes as options
        return incomingEdges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (!sourceNode) return { label: 'Unknown node', value: edge.source };
          
          return {
            label: sourceNode.data.label,
            value: edge.source,
            description: `${sourceNode.data.type} node`
          };
        });
      }
    },
    {
      name: 'sourceField',
      label: 'Source Field',
      type: 'select',
      required: true,
      description: 'Field from source node to map',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, inputs) => {
        if (!inputs.sourceNodeId || inputs.sourceNodeId === 'none') {
          return null;
        }
        
        const sourceNode = nodes.find(n => n.id === inputs.sourceNodeId);
        if (!sourceNode) return null;
        
        // Find node plugin to get outputs
        const nodeType = sourceNode.data.type;
        const { nodeRegistry } = require('@/lib/node-registry');
        const plugin = nodeRegistry.getPlugin(nodeType);
        
        if (!plugin || !plugin.outputs) {
          return [{ label: 'No outputs available', value: 'none' }];
        }
        
        // Return outputs as options
        return plugin.outputs.map(output => ({
          label: output.name,
          value: output.name,
          description: output.description || `${output.type} output`
        }));
      }
    },
    {
      name: 'instructions',
      label: 'Instructions for AI',
      type: 'textarea',
      required: false,
      description: 'Describe how to transform the data',
      placeholder: 'e.g., Extract the first name and capitalize it',
    },
    {
      name: 'outputSchema',
      label: 'Output Schema',
      type: 'code',
      language: 'json',
      description: 'JSON schema of expected output',
      default: JSON.stringify({
        type: 'object',
        properties: {
          result: {
            type: 'string',
            description: 'Transformed result'
          }
        }
      }, null, 2)
    }
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Transformed data',
      jsonSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'string'
          }
        },
        items: {
          type: 'string'
        }
      }
    }
  ],
  async execute(inputs, context) {
    const { sourceNodeId, sourceField, instructions } = inputs;
    const { variables } = context;
    
    // Get data from the source node
    const sourceData = variables[`${sourceNodeId}.${sourceField}`];
    if (sourceData === undefined) {
      throw new Error(`No data available from source node (${sourceNodeId}.${sourceField})`);
    }
    
    try {
      // In a real implementation, this would call an AI service
      // For now, we'll simulate a basic transformation
      
      // Parse output schema
      let outputSchema;
      try {
        outputSchema = JSON.parse(inputs.outputSchema || '{}');
      } catch (error) {
        console.error('Invalid output schema JSON:', error);
        outputSchema = { type: 'object', properties: { result: { type: 'string' } } };
      }
      
      // Simple transformation based on the type of data
      let result;
      if (typeof sourceData === 'string') {
        // For strings, we might capitalize or extract parts
        if (instructions?.toLowerCase().includes('capitalize')) {
          result = sourceData.toUpperCase();
        } else {
          result = sourceData;
        }
      } else if (typeof sourceData === 'object' && sourceData !== null) {
        // For objects, we might extract specific fields
        result = JSON.stringify(sourceData);
      } else {
        result = String(sourceData);
      }
      
      return {
        result: {
          transformedData: result,
          originalData: sourceData,
          instructions
        }
      };
      
    } catch (error) {
      console.error('Error in AI Mapper:', error);
      throw new Error(`AI Mapper error: ${error.message}`);
    }
  }
};
