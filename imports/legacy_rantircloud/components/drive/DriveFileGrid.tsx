import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Download, Share2, Trash2, FolderInput } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';

interface DriveFileGridProps {
  files: DriveFile[];
  onShare: (file: DriveFile) => void;
  onDelete: (fileId: string) => void;
  onMove: (fileId: string) => void;
  gridSize?: 'xs' | 'sm' | 'md' | 'lg';
  onPreview?: (file: DriveFile) => void;
}

export function DriveFileGrid({ files, onShare, onDelete, onMove, gridSize = 'sm', onPreview }: DriveFileGridProps) {
  const sizeClasses = {
    xs: 'grid-cols-6',
    sm: 'grid-cols-4',
    md: 'grid-cols-3',
    lg: 'grid-cols-2',
  };

  const cardSizeClasses = {
    xs: 'h-24',
    sm: 'h-32',
    md: 'h-40',
    lg: 'h-48',
  };
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (file: DriveFile) => {
    window.open(file.file_path, '_blank');
  };

  const isImage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderInput className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No files yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className={`grid ${sizeClasses[gridSize]} gap-4`}>
      {files.map(file => {
        const fileInfo = getFileTypeInfo(file.name);
        const FileIcon = fileInfo.icon;

        return (
          <Card 
            key={file.id} 
            className="group relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onPreview?.(file)}
          >
            <CardContent className="p-0">
              {/* File Preview/Icon */}
              <div className={`${cardSizeClasses[gridSize]} bg-muted flex items-center justify-center relative`}>
                {isImage(file.name) ? (
                  <img
                    src={file.file_path}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${fileInfo.color}20` }}
                  >
                    <FileIcon className="h-10 w-10" style={{ color: fileInfo.color }} />
                  </div>
                )}
                
                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare(file)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMove(file.id)}>
                        <FolderInput className="h-4 w-4 mr-2" />
                        Move
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(file.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* File Info */}
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
