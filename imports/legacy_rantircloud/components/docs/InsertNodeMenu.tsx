import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered,
  Image,
  Code,
  Table as TableIcon,
  Quote,
  Plus,
  PenTool
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SignatureWidget } from './SignatureWidget';

interface InsertNodeMenuProps {
  onInsert?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InsertNodeMenu({ onInsert, open, onOpenChange }: InsertNodeMenuProps) {
  const [editor] = useLexicalComposerContext();

  const insertNode = (type: string) => {
    if (type === 'signature') {
      // For signature, we'll just insert it as a custom component placeholder
      // In a real app, you'd create a custom Lexical node
      onInsert?.();
      return;
    }

    editor.focus();
    editor.update(() => {
      const selection = $getSelection();

      switch (type) {
        case 'text':
          const paragraph = $createParagraphNode();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([paragraph]);
            paragraph.select();
          }
          break;
        case 'h1':
          const h1 = $createHeadingNode('h1');
          if ($isRangeSelection(selection)) {
            selection.insertNodes([h1]);
            h1.select();
          }
          break;
        case 'h2':
          const h2 = $createHeadingNode('h2');
          if ($isRangeSelection(selection)) {
            selection.insertNodes([h2]);
            h2.select();
          }
          break;
        case 'h3':
          const h3 = $createHeadingNode('h3');
          if ($isRangeSelection(selection)) {
            selection.insertNodes([h3]);
            h3.select();
          }
          break;
        case 'bulletList':
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          break;
        case 'numberedList':
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          break;
      }
    });
    
    onInsert?.();
  };

  const menuItems = [
    { icon: Type, label: 'Text', value: 'text' },
    { icon: Heading1, label: 'Heading 1', value: 'h1' },
    { icon: Heading2, label: 'Heading 2', value: 'h2' },
    { icon: Heading3, label: 'Heading 3', value: 'h3' },
    { icon: List, label: 'Bullet List', value: 'bulletList' },
    { icon: ListOrdered, label: 'Numbered List', value: 'numberedList' },
    { icon: PenTool, label: 'Signature', value: 'signature' },
    { icon: Quote, label: 'Quote', value: 'quote', disabled: true },
    { icon: Code, label: 'Code Block', value: 'code', disabled: true },
    { icon: Image, label: 'Image', value: 'image', disabled: true },
    { icon: TableIcon, label: 'Table', value: 'table', disabled: true },
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 hover:bg-transparent opacity-50 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          title="Insert block"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom"
        align="start" 
        className="w-64 p-2"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Insert Block
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                onClick={() => !item.disabled && insertNode(item.value)}
                disabled={item.disabled}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
