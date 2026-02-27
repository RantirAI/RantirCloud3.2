import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Image, 
  Video, 
  FileText, 
  File, 
  Folder,
  FolderOpen,
  ChevronDown,
  Upload,
  Loader2,
  Link2,
  Database,
  Eye,
  Plus,
  Check
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { driveService, DriveFile, DriveFolder } from '@/services/driveService';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AssetPreviewModal } from './AssetPreviewModal';
import { ProjectAssetsSection } from './ProjectAssetsSection';

interface AssetsPanelProps {
  searchFilter?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Images: Image,
  Videos: Video,
  Documents: FileText,
  Other: File,
};

export function AssetsPanel({ searchFilter = '' }: AssetsPanelProps) {
  const [assetTab, setAssetTab] = useState<'project' | 'database'>('project');
  const { id: projectId } = useParams<{ id: string }>();
  const { selectedDatabaseId, setSelectedDatabase } = useAppBuilderStore();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Images: true,
    Videos: true,
    Documents: true,
    Other: true,
  });
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load available databases
  useEffect(() => {
    const loadDatabases = async () => {
      if (!user) return;
      
      setIsLoadingDatabases(true);
      try {
        const { data, error } = await supabase
          .from('databases')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setDatabases(data || []);
      } catch (error) {
        console.error('Failed to load databases:', error);
      } finally {
        setIsLoadingDatabases(false);
      }
    };

    loadDatabases();
  }, [user]);

  // Load files from drive when database is selected
  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedDatabaseId) return;
      
      setIsLoading(true);
      try {
        const [filesData, foldersData] = await Promise.all([
          driveService.getDatabaseFiles(selectedDatabaseId),
          driveService.getFolders(selectedDatabaseId)
        ]);
        setFiles(filesData);
        setFolders(foldersData);
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [selectedDatabaseId]);

  // Group files by category
  const filesByCategory = useMemo(() => {
    const categories: Record<string, DriveFile[]> = {
      Images: [],
      Videos: [],
      Documents: [],
      Other: [],
    };

    const filteredFiles = files.filter(file => 
      file.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

    filteredFiles.forEach(file => {
      const fileInfo = getFileTypeInfo(file.name);
      const category = fileInfo.category;
      
      if (category === 'Images') {
        categories.Images.push(file);
      } else if (category === 'Videos') {
        categories.Videos.push(file);
      } else if (['Documents', 'Spreadsheets', 'Presentations', 'Data/Code'].includes(category)) {
        categories.Documents.push(file);
      } else {
        categories.Other.push(file);
      }
    });

    return categories;
  }, [files, searchFilter]);

  const toggleSection = (category: string) => {
    setOpenSections(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleCopyUrl = async (file: DriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.file_path) {
      await navigator.clipboard.writeText(file.file_path);
      toast.success('URL copied to clipboard');
    }
  };

  const handlePreviewFile = (file: DriveFile) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleAltTextSave = (fileId: string, altText: string) => {
    // Update local state
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, metadata: { ...(f.metadata as any || {}), altText } }
        : f
    ));
  };

  const handleDatabaseChange = (databaseId: string) => {
    const db = databases.find(d => d.id === databaseId);
    if (db) {
      setSelectedDatabase(db.id, db.name);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !selectedDatabaseId) return;

    const filesToUpload = Array.from(selectedFiles);
    
    // Add files to uploading state
    const newUploadingFiles: UploadingFile[] = filesToUpload.map(file => ({
      id: `upload-${Date.now()}-${file.name}`,
      name: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload each file
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const uploadId = newUploadingFiles[i].id;
      
      try {
        // Simulate progress (actual upload doesn't give progress)
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 50 } : f
        ));
        
        const uploadedFile = await driveService.uploadFile(selectedDatabaseId, file);
        
        // Mark as complete
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 100, status: 'complete' as const } : f
        ));
        
        // Add to files list
        setFiles(prev => [uploadedFile, ...prev]);
        
        // Remove from uploading after delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 2000);
        
      } catch (error) {
        console.error('Failed to upload file:', error);
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, status: 'error' as const } : f
        ));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalFiles = Object.values(filesByCategory).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Asset source tabs: Project vs Database */}
      <div className="border-b shrink-0">
        <div className="flex">
          <button
            onClick={() => setAssetTab('project')}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              assetTab === 'project'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="h-3 w-3" />
            Project
          </button>
          <button
            onClick={() => setAssetTab('database')}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              assetTab === 'database'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="h-3 w-3" />
            Database
          </button>
        </div>
      </div>

      {/* Project Assets Tab */}
      {assetTab === 'project' && (
        <ProjectAssetsSection searchFilter={searchFilter} />
      )}

      {/* Database Assets Tab */}
      {assetTab === 'database' && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Data Connection Badge Input */}
          <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium">Data Connections</span>
          </div>
          {selectedDatabaseId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUploadClick}
              className="h-6 px-2 text-xs gap-1"
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectedDatabaseId && databases.find(d => d.id === selectedDatabaseId) && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-md text-xs font-medium text-amber-700 dark:text-amber-400">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: databases.find(d => d.id === selectedDatabaseId)?.color || '#F59E0B' }}
              />
              <span className="max-w-[100px] truncate">
                {(databases.find(d => d.id === selectedDatabaseId)?.name || '').slice(0, 24)}
              </span>
              <button 
                onClick={() => setSelectedDatabase('', '')}
                className="ml-0.5 hover:text-amber-900 dark:hover:text-amber-200"
              >
                ×
              </button>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-amber-500/50 rounded-md text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors">
                <Plus className="h-3 w-3" />
                Add...
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
              {databases.filter(db => db.id !== selectedDatabaseId).map(db => (
                <DropdownMenuItem
                  key={db.id}
                  onClick={() => handleDatabaseChange(db.id)}
                  className="text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: db.color || '#F59E0B' }}
                    />
                    <span className="truncate max-w-[150px]">{db.name.slice(0, 24)}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {databases.filter(db => db.id !== selectedDatabaseId).length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No databases available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Uploading Files Progress */}
      {uploadingFiles.length > 0 && (
        <div className="p-2 border-b bg-muted/30 space-y-1">
          {uploadingFiles.map(file => (
            <div key={file.id} className="flex items-center gap-2 text-xs">
              {file.status === 'uploading' && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
              {file.status === 'complete' && (
                <Check className="h-3 w-3 text-green-500" />
              )}
              {file.status === 'error' && (
                <span className="text-destructive">✕</span>
              )}
              <span className="truncate flex-1">{file.name}</span>
              {file.status === 'uploading' && (
                <span className="text-muted-foreground">{file.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!selectedDatabaseId ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
          <Folder className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Select a database to view assets</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Choose from the dropdown above
          </p>
        </div>
      ) : isLoading ? (
        <div className="h-full flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading assets...</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-0 space-y-0">
            {totalFiles === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assets found</p>
                <p className="text-xs mt-1 text-muted-foreground/70 mb-3">
                  Upload files to your drive to use them here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  className="h-7 text-xs gap-1.5"
                >
                  <Upload className="h-3 w-3" />
                  Upload Files
                </Button>
              </div>
            ) : (
              Object.entries(filesByCategory).map(([category, categoryFiles]) => {
                if (categoryFiles.length === 0) return null;
                
                const CategoryIcon = categoryIcons[category] || File;
                
                return (
                  <Collapsible
                    key={category}
                    open={openSections[category]}
                    onOpenChange={() => toggleSection(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                        <div className="flex items-center gap-2">
                          {openSections[category] ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                          )}
                          <span className="font-medium text-xs text-foreground">{category}</span>
                          <span className="text-[10px] text-muted-foreground">({categoryFiles.length})</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {/* Element-style grid for assets - matching ComponentPalette style */}
                      <div className="grid grid-cols-3 gap-2 mt-2 mb-4 px-3">
                        {categoryFiles.map((file) => {
                          const fileInfo = getFileTypeInfo(file.name);
                          const FileIcon = fileInfo.icon;
                          const isImage = fileInfo.category === 'Images';
                          const isVideo = fileInfo.category === 'Videos';
                          const metadata = file.metadata as any || {};
                          
                          return (
                            <div
                              key={file.id}
                              className="group relative flex flex-col items-center gap-1 p-2 rounded-md border border-border/30 hover:border-border hover:bg-accent/50 dark:bg-zinc-700/50 cursor-grab active:cursor-grabbing transition-all duration-200"
                              title={metadata.altText || file.name}
                              draggable
                              onDragStart={(e) => {
                                // Set data for canvas drop handling
                                const assetData = {
                                  type: isImage ? 'image' : isVideo ? 'video' : 'file',
                                  url: file.file_path,
                                  name: file.name,
                                  altText: metadata.altText || file.name,
                                };
                                e.dataTransfer.setData('text/plain', file.file_path);
                                e.dataTransfer.setData('application/x-asset', JSON.stringify(assetData));
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              onClick={() => handlePreviewFile(file)}
                            >
                              {/* Preview - matching ComponentPalette icon style */}
                              <div className="w-6 h-6 flex items-center justify-center rounded bg-muted/50 group-hover:bg-primary/10 relative overflow-hidden">
                                {isImage ? (
                                  <img
                                    src={file.thumbnail_url || file.file_path}
                                    alt={metadata.altText || file.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <FileIcon 
                                    className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" 
                                    style={{ color: isVideo ? undefined : fileInfo.color }}
                                  />
                                )}
                              </div>
                              
                              {/* Name - matching ComponentPalette text style */}
                              <span className="text-[10px] font-medium text-center leading-tight truncate w-full">
                                {file.name.length > 10 ? file.name.slice(0, 10) + '...' : file.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}

          {/* Asset Preview Modal */}
          <AssetPreviewModal
            file={selectedFile}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            onAltTextSave={handleAltTextSave}
          />
        </>
      )}
    </div>
  );
}
