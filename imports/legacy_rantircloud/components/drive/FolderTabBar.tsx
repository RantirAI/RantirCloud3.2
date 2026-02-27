import { Button } from '@/components/ui/button';
import { X, Plus, Folder } from 'lucide-react';
import { DriveFolder } from '@/services/driveService';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FolderTabBarProps {
  folders: DriveFolder[];
  activeFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
}

export function FolderTabBar({ folders, activeFolder, onSelectFolder, onCreateFolder }: FolderTabBarProps) {
  return (
    <div className="border-b">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-1 p-1">
          {/* All Files Tab */}
          <Button
            variant={activeFolder === null ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => onSelectFolder(null)}
          >
            <Folder className="h-4 w-4" />
            All Files
          </Button>

          {/* Folder Tabs */}
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center">
              <Button
                variant={activeFolder === folder.id ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 rounded-r-none"
                onClick={() => onSelectFolder(folder.id)}
              >
                <Folder className="h-4 w-4" style={{ color: folder.color }} />
                {folder.name}
              </Button>
              {activeFolder === folder.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-none border-l"
                  onClick={() => onSelectFolder(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Add Folder Button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={onCreateFolder}
          >
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
