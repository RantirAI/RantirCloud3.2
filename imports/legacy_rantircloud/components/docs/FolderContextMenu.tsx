import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit2, FolderPlus, Copy, Trash2 } from 'lucide-react';
import { DocumentFolder } from '@/services/documentService';

interface FolderContextMenuProps {
  folder: DocumentFolder;
  onRename: (folder: DocumentFolder) => void;
  onCreateSubfolder: (folder: DocumentFolder) => void;
  onDuplicate: (folder: DocumentFolder, withDocs: boolean) => void;
  onDelete: (folder: DocumentFolder, withDocs: boolean) => void;
}

export function FolderContextMenu({
  folder,
  onRename,
  onCreateSubfolder,
  onDuplicate,
  onDelete,
}: FolderContextMenuProps) {
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
          onRename(folder);
        }}>
          <Edit2 className="h-4 w-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onCreateSubfolder(folder);
        }}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Subfolder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onDuplicate(folder, false);
        }}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate (empty)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onDuplicate(folder, true);
        }}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate with documents
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(folder, false);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete (keep documents)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(folder, true);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete with documents
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
