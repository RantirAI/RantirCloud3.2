import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, X } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { toast } from 'sonner';

interface ShareFileDialogProps {
  open: boolean;
  onClose: () => void;
  file: DriveFile | null;
  onShare: (userIds: string[]) => void;
}

export function ShareFileDialog({ open, onClose, file, onShare }: ShareFileDialogProps) {
  const [shareWith, setShareWith] = useState<string[]>(file?.shared_with || []);
  const [emailInput, setEmailInput] = useState('');

  if (!file) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.file_path);
    toast.success('Link copied to clipboard');
  };

  const handleAddEmail = () => {
    if (emailInput && !shareWith.includes(emailInput)) {
      const updated = [...shareWith, emailInput];
      setShareWith(updated);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setShareWith(prev => prev.filter(e => e !== email));
  };

  const handleShare = () => {
    onShare(shareWith);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{file.name}"</DialogTitle>
          <DialogDescription>
            Share this file with specific users or copy the public link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-3">
          {/* Public Link */}
          {file.is_public && (
            <div className="space-y-2">
              <Label>Public Link</Label>
              <div className="flex gap-2">
                <Input value={file.file_path} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Share with Users */}
          <div className="space-y-2">
            <Label>Share with users</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
              />
              <Button onClick={handleAddEmail}>Add</Button>
            </div>
          </div>

          {/* Shared With List */}
          {shareWith.length > 0 && (
            <div className="space-y-2">
              <Label>Shared with ({shareWith.length})</Label>
              <div className="flex flex-wrap gap-2">
                {shareWith.map(email => (
                  <Badge key={email} variant="secondary" className="gap-2">
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleShare}>
              <Link2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
