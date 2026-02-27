import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisualVariableBuilder } from './VisualVariableBuilder';

interface VisualVariableBuilderTriggerProps {
  appProjectId: string;
  onVariableCreated?: () => void;
  fullWidth?: boolean;
}

export function VisualVariableBuilderTrigger({ 
  appProjectId, 
  onVariableCreated,
  fullWidth = false
}: VisualVariableBuilderTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setIsOpen(false);
    onVariableCreated?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className={fullWidth ? 'w-full' : ''}>
          Data Variables
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[98vw] h-[95vh] p-0 max-w-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Visual Variable Builder</DialogTitle>
        </DialogHeader>
        <VisualVariableBuilder
          appProjectId={appProjectId}
          onSave={handleSave}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}