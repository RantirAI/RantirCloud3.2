import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Download, Share2, Trash2, FolderInput } from 'lucide-react';
import { DriveFile } from '@/services/driveService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';

interface DriveFileListProps {
  files: DriveFile[];
  onShare: (file: DriveFile) => void;
  onDelete: (fileId: string) => void;
  onMove: (fileId: string) => void;
  onPreview?: (file: DriveFile) => void;
}

export function DriveFileList({ files, onShare, onDelete, onMove, onPreview }: DriveFileListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (file: DriveFile) => {
    window.open(file.file_path, '_blank');
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map(file => {
            const fileInfo = getFileTypeInfo(file.name);
            const FileIcon = fileInfo.icon;
            const uploadDate = new Date(file.created_at).toLocaleDateString();

            return (
              <TableRow key={file.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onPreview?.(file)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${fileInfo.color}20` }}
                    >
                      <FileIcon className="h-4 w-4" style={{ color: fileInfo.color }} />
                    </div>
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(file.file_size)}
                </TableCell>
                <TableCell className="text-muted-foreground">{uploadDate}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
