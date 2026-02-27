import { Button } from '@/components/ui/button';
import { Trash2, Settings } from 'lucide-react';

interface DocumentToolbarProps {
  onDelete: () => void;
  onToggleSettings: () => void;
}

export function DocumentToolbar({
  onDelete,
  onToggleSettings,
}: DocumentToolbarProps) {
  return (
    <div className="h-12 border-b bg-background flex items-center justify-end px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSettings}
          title="Document Settings"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title="Delete Document"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
