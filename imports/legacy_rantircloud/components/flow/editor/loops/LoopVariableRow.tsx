import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoopDataSourceSelect } from './LoopDataSourceSelect';
import { Edge } from '@xyflow/react';
import { FlowNode } from '@/types/flowTypes';
import { CodeEditorModal } from '@/components/flow/editor/CodeEditorModal';

export interface LoopVariable {
  id: string;
  variableName: string;
  sourceNodeId: string;
  sourceField: string;
}

interface LoopVariableRowProps {
  variable: LoopVariable;
  nodes: FlowNode[];
  edges: Edge[];
  currentNodeId: string;
  onChange: (variable: LoopVariable) => void;
  onDelete: () => void;
  isOnly: boolean; // Can't delete if it's the only row
}

export function LoopVariableRow({
  variable,
  nodes,
  edges,
  currentNodeId,
  onChange,
  onDelete,
  isOnly
}: LoopVariableRowProps) {
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);

  const handleVariableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize variable name: remove spaces and special characters
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    onChange({
      ...variable,
      variableName: sanitized
    });
  };

  const handleDataSourceChange = (sourceNodeId: string, sourceField: string) => {
    onChange({
      ...variable,
      sourceNodeId,
      sourceField
    });
  };

  // Get current value as a code string for the editor
  const getCurrentCodeValue = () => {
    if (variable.sourceNodeId && variable.sourceField) {
      return `{{${variable.sourceNodeId}.${variable.sourceField}}}`;
    }
    return '';
  };

  // Handle code editor save
  const handleCodeEditorSave = (value: string) => {
    // Parse the value - expects format like {{nodeId.field}} or nodeId.field
    let cleanValue = value.trim();
    // Remove {{ and }} if present
    cleanValue = cleanValue.replace(/^\{\{/, '').replace(/\}\}$/, '');
    
    const parts = cleanValue.split('.');
    if (parts.length >= 2) {
      const nodeId = parts[0];
      const field = parts.slice(1).join('.'); // Handle nested fields
      onChange({
        ...variable,
        sourceNodeId: nodeId,
        sourceField: field
      });
    }
    setIsCodeEditorOpen(false);
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-card hover:bg-accent/50 transition-colors">
      {/* Variable Name Input */}
      <div className="flex-shrink-0 w-28">
        <Input
          value={variable.variableName}
          onChange={handleVariableNameChange}
          placeholder="item"
          className="h-8 text-sm font-mono"
        />
      </div>
      
      {/* Data Source Selector */}
      <div className="flex-1 min-w-0">
        <LoopDataSourceSelect
          value={`${variable.sourceNodeId}.${variable.sourceField}`}
          nodes={nodes}
          edges={edges}
          currentNodeId={currentNodeId}
          onChange={handleDataSourceChange}
        />
      </div>
      
      {/* Edit in Code Editor Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
        onClick={() => setIsCodeEditorOpen(true)}
        title="Edit in code editor"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={isOnly}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Code Editor Modal */}
      <CodeEditorModal
        isOpen={isCodeEditorOpen}
        onClose={() => setIsCodeEditorOpen(false)}
        value={getCurrentCodeValue()}
        onChange={handleCodeEditorSave}
        title={`Edit Data Source for "${variable.variableName}"`}
        description="Enter a variable path like {{nodeId.fieldName}} or {{nodeId.body.data}}"
        nodeId={currentNodeId}
      />
    </div>
  );
}
