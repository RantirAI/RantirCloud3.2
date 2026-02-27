
import { NodePlugin } from '@/types/node-plugin';
import { Repeat } from 'lucide-react';

export const loopNode: NodePlugin = {
  type: 'loop-node',
  name: 'Loop',
  description: 'Loop through items in an array and process each item',
  category: 'transformer',
  icon: Repeat,
  color: '#9333ea', // Purple color
  inputs: [
    {
      name: 'sourceNodeId',
      label: 'Data Source',
      type: 'select',
      required: true,
      description: 'Select the node to get array data from',
      dynamic: true,
      dynamicOptions: async (nodes, edges, currentNodeId, currentInputs) => {
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
      name: 'sourceOutputField',
      label: 'Array Field',
      type: 'select',
      required: true,
      description: 'Select which array field to loop through',
      dynamic: true,
      dynamicOptions: async (nodes, edges, currentNodeId, currentInputs) => {
        if (!currentInputs.sourceNodeId) return [];
        
        // Find the source node
        const sourceNode = nodes.find(n => n.id === currentInputs.sourceNodeId);
        if (!sourceNode) return [];

        // Get the node type to find its outputs
        const nodeType = sourceNode.data.type;
        
        // If window.flow exists and nodeRegistry is available, use it
        if (typeof window !== 'undefined' && window.flow?.nodeRegistry) {
          const plugin = window.flow.nodeRegistry.getPlugin(nodeType);
          if (!plugin || !plugin.outputs) return [];

          // Filter only array type outputs
          return plugin.outputs
            .filter(output => output.type === 'array')
            .map(output => ({
              label: output.name,
              value: output.name,
              description: output.description || 'Array field',
            }));
        }
        
        return [];
      },
    },
    {
      name: 'loopVariableName',
      label: 'Loop Variable Name',
      type: 'text',
      required: true,
      default: 'item',
      description: 'Name to use for the current item in the loop',
    },
    {
      name: 'indexVariableName',
      label: 'Index Variable Name',
      type: 'text',
      required: false,
      default: 'index',
      description: 'Name to use for the current index in the loop (optional)',
    },
    {
      name: 'maxIterations',
      label: 'Maximum Iterations',
      type: 'number',
      required: false,
      description: 'Maximum number of iterations (leave empty for no limit)',
    }
  ],
  outputs: [
    {
      name: 'currentItem',
      type: 'object',
      description: 'The current item being processed',
    },
    {
      name: 'currentIndex',
      type: 'number',
      description: 'The current index in the loop',
    },
    {
      name: 'results',
      type: 'array',
      description: 'Array of all results from the loop iterations',
    }
  ],
  async execute(inputs, context) {
    const { sourceNodeId, sourceOutputField, loopVariableName, indexVariableName, maxIterations } = inputs;
    
    // Get array data from the source node
    const arrayData = context.variables[`${sourceNodeId}.${sourceOutputField}`];
    
    if (!Array.isArray(arrayData)) {
      throw new Error(`Source data is not an array: ${sourceOutputField}`);
    }
    
    console.log(`Loop node executing with ${arrayData.length} items`);
    
    // Get any child nodes that need to be executed for each item
    // Check if getChildNodes function is available in the context
    const childNodes = context.getChildNodes ? context.getChildNodes(context.nodeId) : [];
    
    const results = [];
    const iterations = maxIterations ? Math.min(arrayData.length, Number(maxIterations)) : arrayData.length;
    
    // Process each item in the array
    for (let i = 0; i < iterations; i++) {
      const item = arrayData[i];
      
      console.log(`Loop iteration ${i}: Processing item`, item);
      
      // Create a new context for this iteration with the current item and index
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          [loopVariableName]: item,
          [indexVariableName || 'index']: i,
          currentItem: item,
          currentIndex: i
        }
      };
      
      // Execute each child node with this iteration's context if executeNode is available
      if (childNodes.length > 0 && context.executeNode) {
        console.log(`Loop node has ${childNodes.length} child nodes to execute`);
        
        for (const childNode of childNodes) {
          try {
            const childResult = await context.executeNode(childNode, iterationContext);
            if (childResult) {
              results.push(childResult);
            }
          } catch (error) {
            console.error(`Error executing child node in loop:`, error);
          }
        }
      }
    }
    
    // Return the results
    return {
      currentItem: arrayData[iterations - 1],
      currentIndex: iterations - 1,
      results: results
    };
  }
};
