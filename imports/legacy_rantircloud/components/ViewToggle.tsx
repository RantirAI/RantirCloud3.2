import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg p-1">
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="h-7 px-2"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="h-7 px-2"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}