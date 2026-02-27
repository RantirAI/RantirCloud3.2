
import { NodeInputType } from "@/types/node-plugin";
import NodeInputField from "@/components/flow/editor/NodeInputField";
import { VariableBindingButton } from "@/components/flow/editor/VariableBindingButton"; 

// Map of input type to component or renderer
const inputComponentMap: Record<string, any> = {
  text: NodeInputField,
  select: NodeInputField,
  number: NodeInputField,
  textarea: NodeInputField, 
  code: NodeInputField,
  boolean: NodeInputField,
  variable: NodeInputField,
  databaseSelector: NodeInputField,
  tableSelector: NodeInputField,
  webflowFieldMapping: NodeInputField,
  variableBinding: VariableBindingButton,
};

export const getNodeInputComponent = (type: NodeInputType) => {
  return inputComponentMap[type] || null;
};
