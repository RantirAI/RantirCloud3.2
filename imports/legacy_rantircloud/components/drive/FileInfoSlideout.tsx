import { Button } from '@/components/ui/button';
import { X, Download, Share2, Eye } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileInfoSlideoutProps {
  file: DriveFile | null;
  onClose: () => void;
  onShare: (file: DriveFile) => void;
  onPreview: (file: DriveFile) => void;
}

export function FileInfoSlideout({ file, onClose, onShare, onPreview }: FileInfoSlideoutProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!file) return null;

  return (
    <div 
      className="fixed right-0 bottom-0 bg-card border-l shadow-xl z-50 flex flex-col"
      style={{ width: '400px', top: '24px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold truncate flex-1" title={file.name}>
          {file.name}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="info" className="text-sm">Info</TabsTrigger>
              <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-3 mt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{file.file_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{formatFileSize(file.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span className="font-medium">
                    {new Date(file.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modified</span>
                  <span className="font-medium">
                    {new Date(file.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {file.is_public && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Access</span>
                    <span className="font-medium text-green-600">Public</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div className="flex-1">
                      <p className="font-medium">File uploaded</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {file.created_at !== file.updated_at && (
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                      <div className="flex-1">
                        <p className="font-medium">File modified</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="p-4 border-t space-y-2">
        <Button 
          className="w-full" 
          onClick={() => onPreview(file)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.open(file.file_path)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onShare(file)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
