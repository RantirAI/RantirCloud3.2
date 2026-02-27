
export interface EditorVariable {
  name: string;
  value: any;
  type: string;
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}
