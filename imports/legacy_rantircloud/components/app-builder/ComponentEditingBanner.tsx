import React from 'react';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Component, Save, X, ArrowLeft } from 'lucide-react';

interface ComponentEditingBannerProps {
  projectId: string;
}

export function ComponentEditingBanner({ projectId }: ComponentEditingBannerProps) {
  const { 
    isEditingMode, 
    editingComponentId, 
    editingMetadata,
    exitEditingMode 
  } = useUserComponentStore();

  if (!isEditingMode) return null;

  const handleSave = async () => {
    await exitEditingMode(true, projectId);
  };

  const handleCancel = async () => {
    await exitEditingMode(false);
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Component className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {editingComponentId ? 'Editing' : 'Creating'} Component
              </span>
              <Badge variant="secondary" className="text-xs">
                {editingMetadata.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Design your component, then save to use it anywhere
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="h-8"
        >
          <Save className="h-4 w-4 mr-1" />
          Save Component
        </Button>
      </div>
    </div>
  );
}
