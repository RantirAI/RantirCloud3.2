import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Plus, LayoutGrid, List, Loader2, X, Folder } from 'lucide-react';
import { driveService, DriveFile, DriveFolder } from '@/services/driveService';
import { FileUploadModal } from './FileUploadModal';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';
import { DriveFileList } from './DriveFileList';
import { DriveFileGrid } from './DriveFileGrid';
import { ShareFileDialog } from './ShareFileDialog';
import { MediaPreviewSlideout } from './MediaPreviewSlideout';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface DriveTabContentProps {
  databaseId: string;
}

export const DriveTabContent = React.forwardRef<
  { openUploadModal: () => void },
  DriveTabContentProps
>(({ databaseId }, ref) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderName, setFolderName] = useState('');
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [gridSize, setGridSize] = useState<'xs' | 'sm' | 'md' | 'lg'>('sm');
  const [uploadQueue, setUploadQueue] = useState<Array<{ file: File; progress: number; id: string; status: 'uploading' | 'completed' | 'failed' }>>([]);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewWidth, setPreviewWidth] = useState(600);

  React.useImperativeHandle(ref, () => ({
    openUploadModal: () => setUploadModalOpen(true)
  }));

  useEffect(() => {
    loadData();
  }, [databaseId, activeFolder]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filesData, foldersData] = await Promise.all([
        driveService.getDatabaseFiles(databaseId, activeFolder),
        driveService.getFolders(databaseId),
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Failed to load drive data:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    try {
      await driveService.createFolder(databaseId, folderName);
      toast.success('Folder created');
      setFolderName('');
      setCreateFolderOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await driveService.deleteFile(fileId);
      toast.success('File deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleShare = (file: DriveFile) => {
    setSelectedFile(file);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async (userIds: string[]) => {
    if (!selectedFile) return;
    
    try {
      await driveService.shareFile(selectedFile.id, userIds);
      toast.success('File shared');
      loadData();
    } catch (error) {
      console.error('Failed to share file:', error);
      toast.error('Failed to share file');
    }
  };

  const handleMove = (fileId: string) => {
    setSelectedFileId(fileId);
    setMoveDialogOpen(true);
  };

  const handleMoveSubmit = async () => {
    if (!selectedFileId) return;
    
    try {
      const folderId = targetFolder === 'root' ? null : targetFolder;
      await driveService.moveFile(selectedFileId, folderId);
      toast.success('File moved');
      setMoveDialogOpen(false);
      setTargetFolder('');
      loadData();
    } catch (error) {
      console.error('Failed to move file:', error);
      toast.error('Failed to move file');
    }
  };

  const handleStartUpload = async (files: File[], folderId: string | null, makePublic: boolean) => {
    const newUploads = files.map(file => ({
      file,
      progress: 0,
      id: Math.random().toString(36).substr(2, 9),
      status: 'uploading' as const,
    }));
    
    setUploadQueue(prev => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      try {
        await driveService.uploadFile(databaseId, upload.file, folderId);
        setUploadQueue(prev => prev.map(u => 
          u.id === upload.id ? { ...u, progress: 100, status: 'completed' } : u
        ));
      } catch (error) {
        setUploadQueue(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'failed' } : u
        ));
      }
    }

    setTimeout(() => {
      setUploadQueue(prev => prev.filter(u => u.status !== 'completed'));
      loadData();
    }, 3000);
  };

  const filteredFiles = searchQuery
    ? files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <div className="w-full space-y-4 p-6" style={{ marginRight: previewFile ? `${previewWidth}px` : 0, transition: 'margin-right 0.2s' }}>
      {/* Consolidated Header with Tabs and Controls */}
      <div className="flex items-center justify-between gap-4">
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-2">
            <Tabs value={activeFolder || 'all'} onValueChange={(v) => setActiveFolder(v === 'all' ? null : v)}>
              <TabsList className="h-auto p-0 bg-transparent border-0">
                <TabsTrigger value="all" className="data-[state=active]:bg-secondary rounded-md">
                  <Folder className="h-4 w-4 mr-2" />
                  All Files
                </TabsTrigger>
                {folders.map(folder => (
                  <TabsTrigger 
                    key={folder.id} 
                    value={folder.id}
                    className="data-[state=active]:bg-secondary rounded-md"
                  >
                    <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
                    {folder.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateFolderOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="flex items-center gap-2">
          <Button onClick={() => setUploadModalOpen(true)} size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>

          <div className="w-[240px]">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {viewMode === 'grid' && (
            <Select value={gridSize} onValueChange={(v: any) => setGridSize(v)}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xs">Extra Small</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList className="h-9">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Gallery
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Files Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'list' ? (
        <DriveFileList
          files={filteredFiles}
          onShare={handleShare}
          onDelete={handleDelete}
          onMove={handleMove}
          onPreview={setPreviewFile}
        />
      ) : (
        <DriveFileGrid
          files={filteredFiles}
          onShare={handleShare}
          onDelete={handleDelete}
          onMove={handleMove}
          gridSize={gridSize}
          onPreview={setPreviewFile}
        />
      )}

      {/* Modals */}
      <FileUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        databaseId={databaseId}
        folders={folders}
        onUploadComplete={loadData}
        onStartUpload={handleStartUpload}
        activeFolder={activeFolder}
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your files
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-3">
            <div>
              <Label>Folder Name</Label>
              <Input
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Select the destination folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-3">
            <div>
              <Label>Move to</Label>
              <Select value={targetFolder} onValueChange={setTargetFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMoveSubmit} disabled={!targetFolder}>
                Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareFileDialog
        open={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onShare={handleShareSubmit}
      />

      {/* Upload Progress Popup */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 w-[400px] bg-card border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Uploads</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setUploadQueue([])}
            >
              Cancel all
            </Button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {uploadQueue.map(upload => {
              const fileInfo = getFileTypeInfo(upload.file.name);
              const FileIcon = fileInfo.icon;
              return (
                <div key={upload.id} className="border rounded p-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${fileInfo.color}20` }}>
                      <FileIcon className="h-3 w-3" style={{ color: fileInfo.color }} />
                    </div>
                    <span className="text-sm truncate flex-1">{upload.file.name}</span>
                    {upload.status === 'completed' && <span className="text-xs text-green-600">✓</span>}
                    {upload.status === 'failed' && <span className="text-xs text-destructive">✗</span>}
                  </div>
                  {upload.status === 'uploading' && (
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            Uploading {uploadQueue.filter(u => u.status === 'uploading').length} of {uploadQueue.length} items
          </div>
        </div>
      )}

      {/* Media Preview Slideout */}
      <MediaPreviewSlideout
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onShare={handleShare}
        width={previewWidth}
        onWidthChange={setPreviewWidth}
      />
    </div>
  );
});

DriveTabContent.displayName = 'DriveTabContent';
