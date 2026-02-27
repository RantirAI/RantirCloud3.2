import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { 
  Bold, 
  Italic, 
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Copy,
  Printer,
  Maximize2,
  Minimize2,
  Settings,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';
import { cn } from '@/lib/utils';

interface BottomToolbarProps {
  onSave?: () => void;
  onDuplicate?: () => void;
  onTogglePrintView?: () => void;
  onToggleWidth?: () => void;
  onSettings?: () => void;
  onExport?: () => void;
  isSaving?: boolean;
  showPrintView?: boolean;
  widthMode?: 'narrow' | 'full';
}

export function BottomToolbar({
  onSave,
  onDuplicate,
  onTogglePrintView,
  onToggleWidth,
  onSettings,
  onExport,
  isSaving,
  showPrintView,
  widthMode,
}: BottomToolbarProps) {
  const [editor] = useLexicalComposerContext();

  const handleFormat = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatAlignment = (alignment: 'left' | 'center' | 'right') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-background border shadow-lg rounded-full">
        {/* Action Buttons */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettings}
          title="Document Settings"
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          disabled={isSaving}
          title="Save"
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          title="Duplicate"
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePrintView}
          title="Print View"
          className={cn("h-7 w-7 rounded-md hover:bg-accent border-0", showPrintView && "bg-muted")}
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExport}
          title="Export as PDF"
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleWidth}
          title={widthMode === 'narrow' ? 'Full Width' : 'Narrow Width'}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          {widthMode === 'narrow' ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFormat('bold')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFormat('italic')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFormat('underline')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Headings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatHeading('h1')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatHeading('h2')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatHeading('h3')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatList('bullet')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatList('number')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Alignment */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatAlignment('left')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatAlignment('center')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => formatAlignment('right')}
          className="h-7 w-7 rounded-md hover:bg-accent border-0"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
