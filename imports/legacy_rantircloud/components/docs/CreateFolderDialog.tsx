import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (name: string, icon?: string, parentId?: string) => void;
  parentId?: string;
}

export function CreateFolderDialog({ open, onOpenChange, onCreateFolder, parentId }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [icon, setIcon] = useState('📁');

  const handleCreate = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName.trim(), icon, parentId);
      setFolderName('');
      setIcon('📁');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parentId ? 'Create Subfolder' : 'Create New Folder'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Folder Icon</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <span className="text-2xl mr-2">{icon}</span>
                  <span>Pick an emoji</span>
                  <Smile className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <EmojiPicker onEmojiClick={(e) => setIcon(e.emoji)} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!folderName.trim()}>Create Folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
