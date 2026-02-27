import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Undo2, 
  Redo2, 
  Copy, 
  Scissors, 
  Clipboard, 
  Trash2, 
  Group, 
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  Save,
  Download
} from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { toast } from 'sonner';

interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignJustify: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  selectedCount: number;
}

export function EditorToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onGroup,
  onUngroup,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignJustify,
  hasSelection,
  hasClipboard,
  selectedCount
}: EditorToolbarProps) {
  const { saveProject } = useAppBuilderStore();

  const handleSave = async () => {
    try {
      await saveProject();
      toast.success('Project saved successfully');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const handleExport = () => {
    // Placeholder for export functionality
    toast.info('Export functionality coming soon');
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-background border-b border-border">
      {/* History Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Clipboard Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Copy (Ctrl+C)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCut}
          disabled={!hasSelection}
          title="Cut (Ctrl+X)"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPaste}
          disabled={!hasClipboard}
          title="Paste (Ctrl+V)"
        >
          <Clipboard className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Delete (Del)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Grouping Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGroup}
          disabled={selectedCount < 2}
          title="Group Components (Ctrl+G)"
        >
          <Group className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUngroup}
          disabled={!hasSelection}
          title="Ungroup Components (Ctrl+Shift+G)"
        >
          <Ungroup className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignLeft}
          disabled={selectedCount < 2}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignCenter}
          disabled={selectedCount < 2}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignRight}
          disabled={selectedCount < 2}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAlignJustify}
          disabled={selectedCount < 2}
          title="Distribute Evenly"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Project Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          title="Save Project (Ctrl+S)"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="Export Project"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection Info */}
      {selectedCount > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedCount} selected
        </div>
      )}
    </div>
  );
}