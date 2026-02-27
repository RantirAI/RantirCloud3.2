import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  MessageSquare, 
  Sparkles, 
  FunctionSquare, 
  Send, 
  Workflow, 
  Copy, 
  Trash2 
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface CellContextMenuProps {
  children: React.ReactNode;
  rowId: string;
  fieldId: string;
  value: any;
  onDelete?: (rowId: string) => void;
}

export function CellContextMenu({ 
  children, 
  rowId, 
  fieldId, 
  value,
  onDelete 
}: CellContextMenuProps) {
  
  const handleAIAssist = () => {
    toast({
      title: "AI Assist",
      description: "Starting AI chat for this cell...",
    });
    // TODO: Implement AI chat functionality
  };

  const handleAIAutoGenerate = () => {
    toast({
      title: "AI Auto Generate",
      description: "Generating content based on cell data...",
    });
    // TODO: Implement AI auto-generation
  };

  const handleAIFunction = () => {
    toast({
      title: "AI Function",
      description: "Opening AI function builder...",
    });
    // TODO: Implement AI function builder
  };

  const handleSendToApp = () => {
    toast({
      title: "Send to Application",
      description: "Sending data to application...",
    });
    // TODO: Implement send to application
  };

  const handleSendToFlow = () => {
    toast({
      title: "Send to Logic Flow",
      description: "Sending data to logic flow...",
    });
    // TODO: Implement send to flow
  };

  const handleCopy = async () => {
    try {
      const textValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
      await navigator.clipboard.writeText(textValue);
      toast({
        title: "Copied",
        description: "Cell content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm("Are you sure you want to delete this record?")) {
      onDelete(rowId);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleAIAssist} className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          AI Assist
        </ContextMenuItem>
        <ContextMenuItem onClick={handleAIAutoGenerate} className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Auto Generate
        </ContextMenuItem>
        <ContextMenuItem onClick={handleAIFunction} className="flex items-center gap-2">
          <FunctionSquare className="h-4 w-4" />
          AI Function - fx
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handleSendToApp} className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Send to Application
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSendToFlow} className="flex items-center gap-2">
          <Workflow className="h-4 w-4" />
          Send to Logic Flow
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handleCopy} className="flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handleDelete} 
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}