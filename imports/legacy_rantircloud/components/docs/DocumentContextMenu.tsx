import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, ExternalLink, Copy, FolderInput, Trash2 } from 'lucide-react';
import { Document, DocumentFolder } from '@/services/documentService';

interface DocumentContextMenuProps {
  document: Document;
  folders: DocumentFolder[];
  onOpen: (doc: Document) => void;
  onDuplicate: (doc: Document) => void;
  onMoveToFolder: (doc: Document, folderId: string | null) => void;
  onDelete: (doc: Document) => void;
}

export function DocumentContextMenu({
  document,
  folders,
  onOpen,
  onDuplicate,
  onMoveToFolder,
  onDelete,
}: DocumentContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onOpen(document);
        }}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onDuplicate(document);
        }}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput className="h-4 w-4 mr-2" />
            Move to folder
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onMoveToFolder(document, null);
            }}>
              Root (no folder)
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem key={folder.id} onClick={(e) => {
                e.stopPropagation();
                onMoveToFolder(document, folder.id);
              }}>
                {folder.icon && <span className="mr-2">{folder.icon}</span>}
                {folder.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(document);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
