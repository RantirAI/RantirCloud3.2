
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogContentInner,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SimpleAiMapper } from './SimpleAiMapper';
import { toast } from '@/components/ui/sonner';

interface AiMapperDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  sourceNodeId: string;
  targetNodeId: string;
  targetField?: string;
  targetInputField?: string;
  onFieldsGenerated?: (jsonStructure: any) => void;
  onSaveMapping?: (mapping: string) => void;
}

export function AiMapperDialog({
  open,
  onClose,
  onOpenChange,
  sourceNodeId,
  targetNodeId,
  targetField,
  targetInputField,
  onFieldsGenerated,
  onSaveMapping,
}: AiMapperDialogProps) {
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const handleFieldsGenerated = (jsonStructure: any) => {
    if (onFieldsGenerated) {
      onFieldsGenerated(jsonStructure);
    }
    
    if (onSaveMapping) {
      try {
        // Convert to string with proper formatting
        const jsonString = JSON.stringify(jsonStructure, null, 2);
        onSaveMapping(jsonString);
        toast.success("JSON structure generated successfully");
      } catch (error) {
        console.error("Error processing JSON structure:", error);
        toast.error("Failed to generate JSON structure");
      }
    }
  };

  // Use either targetField or targetInputField, with targetInputField taking precedence
  const finalTargetField = targetInputField || targetField || '';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>AI-Assisted Data Mapping</DialogTitle>
        </DialogHeader>

        <DialogContentInner className="text-sm">
          <SimpleAiMapper
            sourceNodeId={sourceNodeId}
            targetNodeId={targetNodeId}
            targetField={finalTargetField}
            onFieldsGenerated={handleFieldsGenerated}
          />
        </DialogContentInner>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
