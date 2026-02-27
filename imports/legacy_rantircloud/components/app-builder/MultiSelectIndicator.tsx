import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Copy, Trash2, Group, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MultiSelectIndicator() {
  const { 
    selectedComponents, 
    clearSelection,
    copySelectedComponents,
    deleteSelectedComponents,
    groupSelectedComponents
  } = useAppBuilderStore();

  if (selectedComponents.length <= 1) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
            {selectedComponents.length} selected
          </Badge>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copySelectedComponents}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
              title="Copy selected components"
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={groupSelectedComponents}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
              title="Group selected components"
            >
              <Group className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedComponents}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20 hover:bg-destructive/80"
              title="Delete selected components"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}