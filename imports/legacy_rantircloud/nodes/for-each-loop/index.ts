import { NodePlugin } from '@/types/node-plugin';
import { Repeat } from 'lucide-react';

export const forEachLoopNode: NodePlugin = {
  type: 'for-each-loop',
  name: 'For Each (Loop)',
  description: 'Loop through array items and execute connected nodes for each item',
  category: 'transformer',
  icon: Repeat,
  color: '#9333ea',
  inputs: [
    {
      name: 'loopVariables',
      label: 'Values to Loop',
      type: 'loopVariables',
      required: true,
      description: 'Type loop value name(s) in the field(s) on the left. Map Line Item value(s) to loop through on the right.',
    },
    {
      name: 'trimWhitespace',
      label: 'Trim Whitespace',
      type: 'select',
      required: false,
      default: 'true',
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
      description: 'Remove whitespace surrounding each individual value? Defaults to "True".',
    },
    {
      name: 'loopCounterStart',
      label: 'Loop iteration counter start',
      type: 'number',
      required: false,
      default: 1,
      description: 'A counter value called "loop_iteration" will be added to each iteration of the loop. Does not affect the data to loop.',
    },
    {
      name: 'maxIterations',
      label: 'Maximum number of Loop iterations',
      type: 'number',
      required: false,
      default: 500,
      description: 'Set this value to limit the number of loops performed. Data in iterations past the limit will be ignored.',
    },
    {
      name: 'linkedVariableId',
      label: 'Link to List Count',
      type: 'text',
      required: false,
      description: 'When set, uses the array length of the specified loop variable instead of maxIterations.',
    },
    {
      name: 'delayMs',
      label: 'Delay Between Items (ms)',
      type: 'number',
      required: false,
      default: 0,
      description: 'Delay in milliseconds between processing each item. Useful for rate limiting API calls.',
    },
    {
      name: 'errorHandling',
      label: 'Error Handling',
      type: 'select',
      required: false,
      default: 'continue',
      options: [
        { label: 'Continue on Error', value: 'continue', description: 'Continue processing remaining items if one fails' },
        { label: 'Stop on First Error', value: 'stop', description: 'Stop the entire loop if any iteration fails' },
      ],
      description: 'How to handle errors that occur during loop iterations.',
    },
  ],
  outputs: [
    { 
      name: 'currentItem', 
      type: 'object',
      description: 'Current item being processed (available during iteration)',
    },
    { 
      name: 'currentIndex', 
      type: 'number',
      description: 'Current index (0-based, available during iteration)',
    },
    { 
      name: 'loop_iteration', 
      type: 'number',
      description: 'Human-friendly iteration number (starts from loopCounterStart)',
    },
    { 
      name: 'results', 
      type: 'array',
      description: 'Array of all iteration results (available after loop completes)',
    },
    { 
      name: 'totalProcessed', 
      type: 'number',
      description: 'Total number of items processed (available after loop completes)',
    },
  ],
  // Note: Execution is handled specially in flow-store.ts for for-each-loop nodes
  // This execute function is a fallback that won't be called in normal flow execution
  async execute(inputs, context) {
    // This is handled by the special loop logic in flow-store.ts
    // Return empty result as placeholder
    return {
      currentItem: null,
      currentIndex: 0,
      loop_iteration: 0,
      results: [],
      totalProcessed: 0,
    };
  },
};
