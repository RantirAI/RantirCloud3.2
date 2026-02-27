import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartSetupWizard } from './ChartSetupWizard';

interface ChartSetupModalProps {
  component: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ChartSetupModal({ component, isOpen, onClose }: ChartSetupModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Chart Setup Wizard</DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-6 pt-0">
          <ChartSetupWizard component={component} onComplete={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}