import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download,
  ExternalLink,
  Copy,
  Save,
} from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AssetPreviewModalProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAltTextSave?: (fileId: string, altText: string) => void;
}

export function AssetPreviewModal({ 
  file, 
  open, 
  onOpenChange,
  onAltTextSave 
}: AssetPreviewModalProps) {
  const [altText, setAltText] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (file) {
      // Load existing alt text and description from metadata
      const metadata = file.metadata as any || {};
      setAltText(metadata.altText || '');
      setDescription(metadata.description || '');
    }
  }, [file]);

  if (!file) return null;

  const fileInfo = getFileTypeInfo(file.name);
  const FileIcon = fileInfo.icon;
  const isImage = fileInfo.category === 'Images';
  const isVideo = fileInfo.category === 'Videos';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(file.file_path);
    toast.success('URL copied to clipboard');
  };

  const handleDownload = () => {
    window.open(file.file_path, '_blank');
  };

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      const newMetadata = {
        ...(file.metadata as any || {}),
        altText,
        description,
      };

      const { error } = await supabase
        .from('drive_files')
        .update({ metadata: newMetadata })
        .eq('id', file.id);

      if (error) throw error;

      onAltTextSave?.(file.id, altText);
      toast.success('Asset metadata saved');
    } catch (error) {
      console.error('Failed to save metadata:', error);
      toast.error('Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Preview Section */}
          <div className="flex-1 bg-muted/30 flex items-center justify-center p-8 min-h-[500px]">
            {isImage ? (
              <img
                src={file.file_path}
                alt={altText || file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            ) : isVideo ? (
              <video
                src={file.file_path}
                controls
                className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 p-8">
                <FileIcon 
                  className="h-24 w-24" 
                  style={{ color: fileInfo.color }}
                />
                <p className="text-lg font-medium">{file.name}</p>
              </div>
            )}
          </div>

          {/* Combined Settings Panel */}
          <div className="w-96 border-l bg-card flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-sm font-medium truncate pr-8">
                {file.name}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* File Info Section */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    File Info
                  </Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Type</Label>
                      <div className="flex items-center gap-1.5">
                        <FileIcon className="h-3.5 w-3.5" style={{ color: fileInfo.color }} />
                        <span className="text-xs">{fileInfo.category}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Size</Label>
                      <p className="text-xs">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Uploaded</Label>
                    <p className="text-xs">
                      {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">URL</Label>
                    <div className="flex gap-1.5">
                      <Input 
                        value={file.file_path} 
                        readOnly 
                        className="text-[10px] h-7 flex-1"
                      />
                      <Button size="sm" variant="outline" onClick={handleCopyUrl} className="h-7 w-7 p-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1 h-7 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(file.file_path, '_blank')} className="flex-1 h-7 text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>

                {/* Settings Section */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Settings
                  </Label>

                  <div className="space-y-1.5">
                    <Label htmlFor="altText" className="text-xs">
                      Alt Text (SEO)
                    </Label>
                    <Input
                      id="altText"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image for accessibility..."
                      className="text-xs h-7"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Important for SEO and screen readers
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a detailed description..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveMetadata} 
                    disabled={isSaving}
                    size="sm"
                    className="w-full h-8"
                  >
                    <Save className="h-3 w-3 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
