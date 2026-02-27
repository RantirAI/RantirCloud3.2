import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Get pasted HTML content
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    // Use HTML if available, otherwise fall back to plain text
    const content = html || text;
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const div = document.createElement('div');
      div.innerHTML = content;
      
      const frag = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        frag.appendChild(node);
      }
      
      range.insertNode(frag);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      className={cn(
        "min-h-[80px] w-full rounded-form border border-input bg-background px-3 py-2 text-sm",
        "shadow-[var(--form-shadow),var(--form-shadow-inner)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        "transition-all duration-150",
        "overflow-auto max-h-[300px]",
        !value && "text-muted-foreground"
      )}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    >
      {!value && placeholder}
    </div>
  );
}
