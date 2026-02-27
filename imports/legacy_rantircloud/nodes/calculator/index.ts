
import { NodePlugin } from '@/types/node-plugin';
import { Calculator } from 'lucide-react';

export const calculatorNode: NodePlugin = {
  type: 'calculator',
  name: 'Calculator',
  description: 'Perform arithmetic operations on numbers',
  category: 'transformer', // Changed from 'data' to 'transformer'
  icon: Calculator,
  color: '#FF9800',
  inputs: [
    {
      name: 'number1',
      label: 'First Number',
      type: 'number',
      required: true,
      default: 0,
      description: 'First operand for calculation',
    },
    {
      name: 'number2',
      label: 'Second Number',
      type: 'number',
      required: true,
      default: 0,
      description: 'Second operand for calculation',
    },
    {
      name: 'operation',
      label: 'Operation',
      type: 'select',
      required: true,
      default: 'add',
      options: [
        { label: 'Add', value: 'add' },
        { label: 'Subtract', value: 'subtract' },
        { label: 'Multiply', value: 'multiply' },
        { label: 'Divide', value: 'divide' },
      ],
      description: 'Operation to perform',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if calculation succeeded, false on error (e.g., division by zero). Use in Condition nodes.',
    },
    {
      name: 'result',
      type: 'number',
      description: 'Result of the arithmetic operation',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if calculation failed, null otherwise',
    },
  ],
  execute: async (inputs, context) => {
    const { number1, number2, operation } = inputs;
    let result = 0;
    
    // Convert inputs to numbers
    const num1 = Number(number1);
    const num2 = Number(number2);
    
    // Check for valid numbers
    if (isNaN(num1) || isNaN(num2)) {
      return {
        success: false,
        result: null,
        error: 'Invalid input: both inputs must be valid numbers',
      };
    }
    
    // Perform the operation
    switch (operation) {
      case 'add':
        result = num1 + num2;
        break;
      case 'subtract':
        result = num1 - num2;
        break;
      case 'multiply':
        result = num1 * num2;
        break;
      case 'divide':
        if (num2 === 0) {
          return {
            success: false,
            result: null,
            error: 'Division by zero is not allowed',
          };
        }
        result = num1 / num2;
        break;
      default:
        return {
          success: false,
          result: null,
          error: `Unknown operation: ${operation}`,
        };
    }
    
    return { 
      success: true,
      result,
      error: null,
    };
  }
};
