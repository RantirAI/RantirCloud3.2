import { NodePlugin } from '@/types/node-plugin';
import { GitBranch } from 'lucide-react';

// Comparison operators for structured conditions
export const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals', description: 'Exact match (==)' },
  { value: 'notEquals', label: 'Not Equals', description: 'Does not match (!=)' },
  { value: 'greaterThan', label: 'Greater Than', description: 'Numeric comparison (>)' },
  { value: 'greaterThanOrEqual', label: 'Greater or Equal', description: '>=' },
  { value: 'lessThan', label: 'Less Than', description: '<' },
  { value: 'lessThanOrEqual', label: 'Less or Equal', description: '<=' },
  { value: 'contains', label: 'Contains', description: 'String contains substring' },
  { value: 'notContains', label: 'Does Not Contain', description: 'String doesn\'t contain' },
  { value: 'startsWith', label: 'Starts With', description: 'String starts with' },
  { value: 'endsWith', label: 'Ends With', description: 'String ends with' },
  { value: 'isEmpty', label: 'Is Empty', description: 'Null, undefined, or empty string' },
  { value: 'isNotEmpty', label: 'Is Not Empty', description: 'Has a value' },
  { value: 'isTrue', label: 'Is True', description: 'Boolean true' },
  { value: 'isFalse', label: 'Is False', description: 'Boolean false' },
] as const;

export type ConditionOperator = typeof CONDITION_OPERATORS[number]['value'];

// Condition case for multi-condition mode
export interface ConditionCase {
  id: string;
  // Structured condition parts (NEW)
  leftOperand: string;      // Variable binding: {{nodeId.field}}
  operator: ConditionOperator; // Comparison operator
  rightOperand: string;     // Static value OR variable binding
  rightOperandType: 'static' | 'variable'; // How to interpret rightOperand
  
  // Existing fields
  returnValue: string;      // Value to return when condition matches
  label?: string;           // Optional user-friendly name
  
  // Legacy support for advanced users
  useCustomExpression?: boolean;
  condition?: string;       // Legacy raw JavaScript condition expression (kept for backwards compatibility)
}

// Evaluate a structured condition using operators
const evaluateStructuredCondition = (
  leftValue: any,
  operator: ConditionOperator,
  rightValue: any
): boolean => {
  switch (operator) {
    case 'equals':
      return leftValue == rightValue;
    case 'notEquals':
      return leftValue != rightValue;
    case 'greaterThan':
      return Number(leftValue) > Number(rightValue);
    case 'greaterThanOrEqual':
      return Number(leftValue) >= Number(rightValue);
    case 'lessThan':
      return Number(leftValue) < Number(rightValue);
    case 'lessThanOrEqual':
      return Number(leftValue) <= Number(rightValue);
    case 'contains':
      return String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
    case 'notContains':
      return !String(leftValue || '').toLowerCase().includes(String(rightValue || '').toLowerCase());
    case 'startsWith':
      return String(leftValue || '').toLowerCase().startsWith(String(rightValue || '').toLowerCase());
    case 'endsWith':
      return String(leftValue || '').toLowerCase().endsWith(String(rightValue || '').toLowerCase());
    case 'isEmpty':
      return leftValue == null || leftValue === '' || (Array.isArray(leftValue) && leftValue.length === 0);
    case 'isNotEmpty':
      return leftValue != null && leftValue !== '' && !(Array.isArray(leftValue) && leftValue.length === 0);
    case 'isTrue':
      return leftValue === true || leftValue === 'true' || leftValue === 1 || leftValue === '1';
    case 'isFalse':
      return leftValue === false || leftValue === 'false' || leftValue === 0 || leftValue === '0';
    default:
      return false;
  }
};

// Resolve a variable binding like {{nodeId.field}} from context
const resolveBinding = (binding: string, context: { variables: Record<string, any> }): any => {
  if (!binding) return undefined;
  
  // Check if it's a variable binding {{...}}
  const match = binding.match(/^\{\{(.+?)\}\}$/);
  if (match) {
    const path = match[1].trim();
    // Try direct lookup first
    if (context.variables[path] !== undefined) {
      return context.variables[path];
    }
    // Try nested path lookup (e.g., "nodeId.body.field")
    const parts = path.split('.');
    let value: any = context.variables;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }
  
  // Return as-is if not a binding (static value)
  return binding;
};

export const conditionNode: NodePlugin = {
  type: 'condition',
  name: 'Condition',
  description: 'Create conditional logic with TRUE/FALSE branches or multiple conditions',
  category: 'condition',
  icon: GitBranch,
  color: '#FF6B35',
  inputs: [
    // Simple mode condition (when multipleConditions is false)
    {
      name: 'condition',
      label: 'Condition Expression',
      type: 'code',
      language: 'javascript',
      required: false, // Not required when using multiple conditions mode
      description: 'JavaScript expression that evaluates to true or false',
      placeholder: `// Examples:
// Simple comparison
data.value > 100

// String contains
data.name.includes("admin")

// Complex logic
data.status === "active" && data.score >= 80

// Return true or false
return data.isValid;`,
      showWhen: {
        field: 'multipleConditions',
        values: [false, undefined, null]
      }
    },
    {
      name: 'description',
      label: 'Condition Description',
      type: 'text',
      description: 'Optional description of what this condition checks',
      placeholder: 'e.g., "Check if user is premium member"',
      showWhen: {
        field: 'multipleConditions',
        values: [false, undefined, null]
      }
    },
    // Multi-condition mode toggle
    {
      name: 'multipleConditions',
      label: 'Multiple Conditions',
      type: 'boolean',
      default: false,
      description: 'Enable to add multiple IF/ELSE IF conditions with custom return values'
    },
    // Return type selector (only shown when multipleConditions is true)
    {
      name: 'returnType',
      label: 'Return Type',
      type: 'select',
      default: 'boolean',
      options: [
        { label: 'Boolean (TRUE/FALSE)', value: 'boolean', description: 'Returns true or false' },
        { label: 'String', value: 'string', description: 'Returns custom string values' },
        { label: 'Integer', value: 'integer', description: 'Returns numeric values' }
      ],
      description: 'The type of value returned when a condition matches',
      showWhen: {
        field: 'multipleConditions',
        values: [true]
      }
    },
    // Cases array (stored as JSON string, handled by custom UI)
    {
      name: 'cases',
      label: 'Condition Cases',
      type: 'textarea', // We'll render this as a custom UI in NodeProperties
      description: 'List of conditions evaluated in order (first match wins)',
      showWhen: {
        field: 'multipleConditions',
        values: [true]
      }
    }
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if condition evaluated without errors. Use to verify the condition node ran successfully.',
    },
    {
      name: 'result',
      type: 'boolean',
      description: 'The result of the condition evaluation (true/false). Use this value to route to TRUE or FALSE branches.'
    },
    {
      name: 'returnValue',
      type: 'string',
      description: 'The return value from the matched condition (for multi-condition mode)'
    },
    {
      name: 'matchedCase',
      type: 'string',
      description: 'ID of the matched case (for multi-condition mode)'
    },
    {
      name: 'matchedLabel',
      type: 'string',
      description: 'Label of the matched case (for multi-condition mode)'
    },
    {
      name: 'conditionText',
      type: 'string',
      description: 'Human-readable description of the condition'
    },
    {
      name: 'evaluatedAt',
      type: 'string',
      description: 'Timestamp when the condition was evaluated'
    }
  ],
  async execute(inputs, context) {
    const { condition, description, multipleConditions, returnType, cases } = inputs;
    
    // Helper function to translate {{variable}} bindings to valid JavaScript
    const translateVariableBindings = (expr: string): string => {
      // Replace {{nodeId.field}} with data["nodeId.field"] for safe bracket notation access
      return expr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const trimmedPath = path.trim();
        return `data["${trimmedPath}"]`;
      });
    };
    
    // Helper function to evaluate a single condition expression (legacy/advanced mode)
    const evaluateLegacyCondition = (conditionExpr: string): boolean => {
      if (!conditionExpr) return false;
      
      try {
        // First, translate any {{variable}} bindings to valid JavaScript
        const translatedExpr = translateVariableBindings(conditionExpr);
        
        const evaluationContext = {
          ...context.variables,
          utils: {
            isArray: Array.isArray,
            isObject: (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value),
            isEmpty: (value: any) => {
              if (value == null) return true;
              if (Array.isArray(value)) return value.length === 0;
              if (typeof value === 'object') return Object.keys(value).length === 0;
              return false;
            },
            now: () => new Date(),
            today: () => new Date().toISOString().split('T')[0],
            random: Math.random,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
          },
          env: context.envVars || {},
          data: context.variables
        };
        
        // Helper to check if a key is a valid JavaScript identifier
        const isValidIdentifier = (key: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
        // Keys that are already function parameters - don't re-declare them
        const reservedParams = new Set(['data', 'utils', 'env', 'context']);
        
        const evaluationFunction = new Function(
          'data', 'utils', 'env', 'context',
          `
          ${Object.keys(evaluationContext)
            .filter(key => isValidIdentifier(key) && !reservedParams.has(key))
            .map(key => `const ${key} = arguments[3]['${key}'];`)
            .join('\n')}
          ${translatedExpr.includes('return') ? translatedExpr : `return ${translatedExpr}`}
          `
        );
        
        return Boolean(evaluationFunction(
          evaluationContext.data,
          evaluationContext.utils,
          evaluationContext.env,
          evaluationContext
        ));
      } catch (error: any) {
        throw new Error(`Condition evaluation failed: ${error.message}`);
      }
    };
    
    // SIMPLE MODE: Single condition with TRUE/FALSE output
    if (!multipleConditions) {
      if (!condition) {
        throw new Error('Condition expression is required');
      }
      
      const result = evaluateLegacyCondition(condition);
      
      return {
        success: true, // Condition evaluated successfully
        result,
        returnValue: String(result),
        matchedCase: result ? 'true' : 'false',
        matchedLabel: result ? 'TRUE' : 'FALSE',
        conditionText: description || condition,
        evaluatedAt: new Date().toISOString()
      };
    }
    
    // MULTI-CONDITION MODE: Evaluate cases in order
    let parsedCases: ConditionCase[] = [];
    
    try {
      parsedCases = typeof cases === 'string' ? JSON.parse(cases || '[]') : (cases || []);
    } catch (e) {
      throw new Error('Invalid cases configuration');
    }
    
    if (!parsedCases.length) {
      throw new Error('At least one condition case is required');
    }
    
    // Evaluate each case in order (first match wins)
    for (let i = 0; i < parsedCases.length; i++) {
      const caseItem = parsedCases[i];
      
      try {
        let conditionResult: boolean;
        
        // Check if using custom expression (advanced mode) or structured condition
        if (caseItem.useCustomExpression && caseItem.condition) {
          // Legacy: evaluate raw JavaScript expression
          conditionResult = evaluateLegacyCondition(caseItem.condition);
        } else {
          // NEW: evaluate structured condition with operators
          const leftValue = resolveBinding(caseItem.leftOperand, context);
          const rightValue = caseItem.rightOperandType === 'variable' 
            ? resolveBinding(caseItem.rightOperand, context)
            : caseItem.rightOperand;
          
          conditionResult = evaluateStructuredCondition(
            leftValue,
            caseItem.operator || 'equals',
            rightValue
          );
        }
        
        if (conditionResult) {
          // Parse return value based on return type
          let finalReturnValue: string | number | boolean = caseItem.returnValue;
          
          if (returnType === 'integer') {
            finalReturnValue = parseInt(caseItem.returnValue, 10) || 0;
          } else if (returnType === 'boolean') {
            finalReturnValue = caseItem.returnValue === 'true' || caseItem.returnValue === '1';
          }
          
          return {
            success: true, // Condition matched successfully
            result: returnType === 'boolean' ? Boolean(finalReturnValue) : true,
            returnValue: String(caseItem.returnValue),
            matchedCase: caseItem.id,
            matchedIndex: i,
            matchedLabel: caseItem.label || `Case ${i + 1}`,
            conditionText: caseItem.label || `${caseItem.leftOperand} ${caseItem.operator} ${caseItem.rightOperand}`,
            evaluatedAt: new Date().toISOString()
          };
        }
      } catch (error: any) {
        console.error(`Case ${caseItem.label || caseItem.id} evaluation failed:`, error);
        // Continue to next case on error
      }
    }
    
    // No match - return ELSE branch
    return {
      success: true, // Condition evaluated, no match found (ELSE)
      result: false,
      returnValue: 'else',
      matchedCase: 'else',
      matchedIndex: -1,
      matchedLabel: 'Else',
      conditionText: 'Default (Else)',
      evaluatedAt: new Date().toISOString()
    };
  }
};
