
import { NodePlugin } from '@/types/node-plugin';
import { Filter } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';

export const dataFilterNode: NodePlugin = {
  type: 'data-filter',
  name: 'Data Filter',
  description: 'Filter or transform data from previous nodes',
  category: 'transformer', // Changed from 'data' to 'transformer'
  icon: Filter,
  color: '#9C27B0',
  inputs: [
    {
      name: 'sourceNodeId',
      label: 'Data Source',
      type: 'select',
      required: true,
      description: 'Select the node to get data from',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId) => {
        // Get all nodes that are connected to this node as inputs
        const connectedNodeIds = edges
          .filter(edge => edge.target === currentNodeId)
          .map(edge => edge.source);

        // Get the actual nodes and their details
        return nodes
          .filter(node => connectedNodeIds.includes(node.id))
          .map(node => ({
            label: node.data.label,
            value: node.id,
            description: `Output from ${node.data.type}`,
          }));
      },
    },
    {
      name: 'outputField',
      label: 'Output Field',
      type: 'select',
      required: true,
      description: 'Select which data field to process',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, inputs) => {
        if (!inputs.sourceNodeId) return [];
        
        // Find the source node
        const sourceNode = nodes.find(n => n.id === inputs.sourceNodeId);
        if (!sourceNode) return [];

        // Get the plugin for the source node
        const sourceNodeType = sourceNode.data.type;
        const plugin = nodeRegistry.getPlugin(sourceNodeType);
        if (!plugin || !plugin.outputs) return [];

        // Return the available output fields
        return plugin.outputs.map(output => ({
          label: output.name,
          value: output.name,
          description: output.description,
        }));
      },
    },
    {
      name: 'transformation',
      label: 'Transformation',
      type: 'code',
      language: 'javascript',
      required: true,
      placeholder: `// Available variables:\n// data: The input data to process\n// context: Flow execution context\n\n// Example:\nreturn data.toUpperCase();`,
      description: 'JavaScript code to transform the data',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if filter executed successfully, false on error. Use in Condition nodes to route on success/failure.',
    },
    {
      name: 'result',
      type: 'object',
      description: 'The processed data',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if transformation failed, null otherwise',
    },
  ],
  async execute(inputs, context) {
    const { sourceNodeId, outputField, transformation } = inputs;
    
    // Validate inputs
    if (!sourceNodeId || !outputField || !transformation) {
      return {
        success: false,
        result: null,
        error: 'All inputs are required',
      };
    }
    
    try {
      // Get data from variables in context
      const data = context.variables?.[`${sourceNodeId}.${outputField}`] || {};
      
      // Execute the transformation code
      const transformFn = new Function('data', 'context', transformation);
      const result = transformFn(data, context);
      
      return { 
        success: true,
        result,
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        result: null,
        error: `Transformation error: ${errorMessage}`,
      };
    }
  }
};
