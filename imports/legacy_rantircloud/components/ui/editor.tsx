
import React from 'react';
import { MonacoEditorField } from '@/components/flow/MonacoEditorField';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  nodeId?: string; // Add nodeId prop to the interface
}

export const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  language = 'javascript',
  height = '200px',
  readOnly = false,
  nodeId = 'default' // Provide a default value for nodeId
}) => {
  // Pass nodeId to MonacoEditorField
  return (
    <MonacoEditorField
      value={value}
      onChange={onChange}
      language={language}
      height={height}
      nodeId={nodeId}
    />
  );
};
