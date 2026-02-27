import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';

interface FilePreviewModalProps {
  file: DriveFile | null;
  open: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, open, onClose }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(100);

  // Detect file types
  const fileExtension = file?.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file?.mime_type || '';
  
  const isImage = useMemo(() => {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
    return imageExts.includes(fileExtension) || mimeType.startsWith('image/');
  }, [fileExtension, mimeType]);

  const isVideo = useMemo(() => {
    const videoExts = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
    return videoExts.includes(fileExtension) || mimeType.startsWith('video/');
  }, [fileExtension, mimeType]);

  const isPDF = useMemo(() => {
    return fileExtension === 'pdf' || mimeType === 'application/pdf';
  }, [fileExtension, mimeType]);

  const isDocument = useMemo(() => {
    const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt'];
    return docExts.includes(fileExtension);
  }, [fileExtension]);

  const isSpreadsheet = useMemo(() => {
    const sheetExts = ['xls', 'xlsx', 'csv', 'ods'];
    return sheetExts.includes(fileExtension);
  }, [fileExtension]);

  const isPresentation = useMemo(() => {
    const presExts = ['ppt', 'pptx', 'odp'];
    return presExts.includes(fileExtension);
  }, [fileExtension]);

  const canUseDocViewer = useMemo(() => {
    return isPDF || isDocument || isSpreadsheet || isPresentation;
  }, [isPDF, isDocument, isSpreadsheet, isPresentation]);

  // Prepare document for DocViewer
  const docs = useMemo(() => {
    if (!canUseDocViewer || !file) return [];
    
    return [{
      uri: file.file_path,
      fileType: fileExtension,
      fileName: file.name,
    }];
  }, [canUseDocViewer, file, fileExtension]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[80%] p-0 bg-background border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="font-semibold truncate flex-1" title={file.name}>
            {file.name}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview Area */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Preview Controls */}
            {isImage && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Media Preview */}
            <div className="bg-muted rounded-lg overflow-hidden w-full">
              {isImage && (
                <div className="flex items-center justify-center p-4 min-h-[500px] bg-background/50">
                  <img
                    src={file.file_path}
                    alt={file.name}
                    className="max-w-full h-auto rounded object-contain"
                    style={{ 
                      transform: `scale(${zoom / 100})`, 
                      transformOrigin: 'center',
                      maxHeight: '70vh'
                    }}
                    onError={(e) => {
                      console.error('Image load error:', file.file_path);
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="text-center text-muted-foreground py-8">Failed to load image. Please check file permissions.</div>';
                      }
                    }}
                  />
                </div>
              )}
              
              {isVideo && (
                <div className="bg-background/50 p-2">
                  <video
                    src={file.file_path}
                    controls
                    className="w-full rounded"
                    style={{ maxHeight: '70vh' }}
                    onError={(e) => {
                      console.error('Video load error:', file.file_path);
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="text-center text-muted-foreground py-8">Failed to load video. Please check file permissions.</div>';
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
              
              {canUseDocViewer && (
                <div className="doc-viewer-container w-full h-full" style={{ minHeight: '70vh' }}>
                  <DocViewer
                    documents={docs}
                    pluginRenderers={DocViewerRenderers}
                    config={{
                      header: {
                        disableHeader: true,
                      },
                    }}
                    style={{ height: '100%', minHeight: '70vh', width: '100%' }}
                  />
                </div>
              )}
              
              {!isImage && !isVideo && !canUseDocViewer && (
                <div className="text-center text-muted-foreground py-16">
                  <p className="mb-2">Preview not available for this file type</p>
                  <p className="text-xs">({fileExtension.toUpperCase()})</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
