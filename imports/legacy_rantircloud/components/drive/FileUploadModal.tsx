import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileIcon } from 'lucide-react';
import { driveService, DriveFolder } from '@/services/driveService';
import { toast } from 'sonner';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  databaseId: string;
  folders: DriveFolder[];
  onUploadComplete: () => void;
  onStartUpload?: (files: File[], folderId: string | null, makePublic: boolean) => void;
  activeFolder?: string | null;
}

export function FileUploadModal({ open, onClose, databaseId, folders, onUploadComplete, onStartUpload, activeFolder }: FileUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>(activeFolder || 'root');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [makePublic, setMakePublic] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  // Update selected folder when activeFolder changes
  useEffect(() => {
    if (open) {
      console.log('FileUploadModal opened - Folders:', folders);
      console.log('Active folder:', activeFolder);
      setSelectedFolder(activeFolder || 'root');
    }
  }, [open, activeFolder, folders]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const folderId = selectedFolder === 'root' ? null : selectedFolder || null;
    
    // Close modal immediately and trigger upload in background
    if (onStartUpload) {
      onStartUpload(selectedFiles, folderId, makePublic);
      setSelectedFiles([]);
      setSelectedFolder('root');
      setMakePublic(false);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to your database drive. Supports 60+ file types including images, videos, PDFs, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-3">
          {/* Folder Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Upload to folder</label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Root folder" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="root">Root folder</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Support for images, videos, PDFs, documents, and 60+ file types
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button variant="outline" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium">{selectedFiles.length} file(s) selected</p>
              {selectedFiles.map((file, index) => {
                const fileInfo = getFileTypeInfo(file.name);
                const FileIcon = fileInfo.icon;
                return (
                  <div key={index} className="flex items-center gap-3 p-2 border rounded-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: `${fileInfo.color}20` }}>
                      <FileIcon className="h-4 w-4" style={{ color: fileInfo.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Share Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="make-public"
              checked={makePublic}
              onChange={(e) => setMakePublic(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="make-public" className="text-sm cursor-pointer">
              Make files publicly shareable
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0}
            >
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
