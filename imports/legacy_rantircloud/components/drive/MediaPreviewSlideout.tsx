import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import { TextFileViewer } from './TextFileViewer';

interface MediaPreviewSlideoutProps {
  file: DriveFile | null;
  onClose: () => void;
  onShare: (file: DriveFile) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function MediaPreviewSlideout({ file, onClose, onShare, width, onWidthChange }: MediaPreviewSlideoutProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [viewerVersion, setViewerVersion] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 500), 900);
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setViewerVersion((v) => v + 1);
      window.dispatchEvent(new Event('resize'));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  // Text files that should use Monaco Editor
  const isTextFile = useMemo(() => {
    const textExts = ['txt', 'md', 'json', 'xml', 'log', 'csv', 'env', 'yaml', 'yml', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'sql', 'sh', 'bash', 'py', 'rb', 'go', 'rs', 'java', 'php', 'c', 'cpp', 'h'];
    return textExts.includes(fileExtension) || mimeType.startsWith('text/');
  }, [fileExtension, mimeType]);

  const isSpreadsheet = useMemo(() => {
    const sheetExts = ['xls', 'xlsx', 'ods'];
    return sheetExts.includes(fileExtension);
  }, [fileExtension]);

  const isPresentation = useMemo(() => {
    const presExts = ['ppt', 'pptx', 'odp'];
    return presExts.includes(fileExtension);
  }, [fileExtension]);

  const isDocument = useMemo(() => {
    const docExts = ['doc', 'docx', 'rtf', 'odt'];
    return docExts.includes(fileExtension);
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
    <>
      {/* Resize overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-[60] cursor-ew-resize" />
      )}

      <div 
        className="fixed right-0 bottom-0 bg-card border-l shadow-xl z-50 flex"
        style={{ width: `${width}px`, top: '24px' }}
      >
        {/* Resize Handle */}
        <div
          className="w-1 hover:w-2 cursor-ew-resize bg-border hover:bg-primary transition-all"
          onMouseDown={handleMouseDown}
        />

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold truncate flex-1" title={file.name}>
              {file.name}
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview Area */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Preview Controls */}
              {isImage && (
                <div className="flex items-center gap-2">
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
                  <div className="flex items-center justify-center p-4 min-h-[300px] bg-background/50">
                    <img
                      src={file.file_path}
                      alt={file.name}
                      className="max-w-full h-auto rounded object-contain"
                      style={{ 
                        transform: `scale(${zoom / 100})`, 
                        transformOrigin: 'center',
                        maxHeight: '600px'
                      }}
                      onError={(e) => {
                        console.error('Image load error:', file.file_path);
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<div class="text-center text-muted-foreground py-8">Failed to load image. Please check file permissions.</div>';
                        }
                      }}
                      onLoad={() => console.log('Image loaded successfully:', file.file_path)}
                    />
                  </div>
                )}
                
                {isVideo && (
                  <div className="bg-background/50 p-2">
                    <video
                      src={file.file_path}
                      controls
                      className="w-full rounded"
                      style={{ maxHeight: '600px' }}
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
                
              {isTextFile && file && (
                <TextFileViewer filePath={file.file_path} fileName={file.name} />
              )}
              
              {canUseDocViewer && !isTextFile && (
                <div className="doc-viewer-container w-full" style={{ minHeight: '600px' }}>
                  <DocViewer
                    key={`doc-viewer-${viewerVersion}`}
                    documents={docs}
                    pluginRenderers={DocViewerRenderers}
                    config={{
                      header: {
                        disableHeader: true,
                      },
                    }}
                    style={{ height: 'auto', minHeight: '600px', width: '100%' }}
                  />
                </div>
              )}
              
              {!isImage && !isVideo && !isTextFile && !canUseDocViewer && (
                <div className="text-center text-muted-foreground py-8">
                  <p className="mb-2">Preview not available for this file type</p>
                  <p className="text-xs">({fileExtension.toUpperCase()})</p>
                </div>
              )}
              </div>

            </div>
          </ScrollArea>

          {/* Details Tabs - Fixed at bottom */}
          <div className="border-t bg-card">
            <div className="p-4">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="info" className="text-sm">Info</TabsTrigger>
                  <TabsTrigger value="activity" className="text-sm">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-3">
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

                <TabsContent value="activity">
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
          </div>

          {/* Actions Footer */}
          <div className="p-4 border-t flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.open(file.file_path)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button className="flex-1" onClick={() => onShare(file)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
