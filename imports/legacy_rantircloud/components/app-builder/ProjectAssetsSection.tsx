/**
 * Project Assets Section for the Assets Panel
 * Shows assets uploaded directly to the project (no database required)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Image, 
  Video, 
  FileText, 
  File, 
  ChevronDown,
  Upload,
  Loader2,
  Link2,
  Eye,
  Check,
  Trash2
} from 'lucide-react';
import { projectAssetService, ProjectAsset } from '@/services/projectAssetService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectAssetsSectionProps {
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

export function ProjectAssetsSection({ searchFilter = '' }: ProjectAssetsSectionProps) {
  const { id: projectId } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Images: true,
    Videos: true,
    Documents: true,
    Other: true,
  });

  // Load project assets
  useEffect(() => {
    const loadAssets = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        const data = await projectAssetService.getProjectAssets(projectId);
        setAssets(data);
      } catch (error) {
        console.error('Failed to load project assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [projectId]);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const categories: Record<string, ProjectAsset[]> = {
      Images: [],
      Videos: [],
      Documents: [],
      Other: [],
    };

    const filteredAssets = assets.filter(asset => 
      asset.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

    filteredAssets.forEach(asset => {
      const category = projectAssetService.getAssetCategory(asset);
      if (category === 'Images') {
        categories.Images.push(asset);
      } else if (category === 'Videos') {
        categories.Videos.push(asset);
      } else if (['Documents', 'Spreadsheets', 'Presentations', 'Data/Code'].includes(category)) {
        categories.Documents.push(asset);
      } else {
        categories.Other.push(asset);
      }
    });

    return categories;
  }, [assets, searchFilter]);

  const toggleSection = (category: string) => {
    setOpenSections(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !projectId) return;

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
        
        const uploadedAsset = await projectAssetService.uploadAsset(projectId, file);
        
        // Mark as complete
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 100, status: 'complete' as const } : f
        ));
        
        // Add to assets list
        setAssets(prev => [uploadedAsset, ...prev]);
        
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

  const handleDeleteAsset = async (asset: ProjectAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!projectId) return;

    try {
      await projectAssetService.deleteAsset(projectId, asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      toast.success('Asset deleted');
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const handleCopyUrl = async (asset: ProjectAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset.file_path) {
      await navigator.clipboard.writeText(asset.file_path);
      toast.success('URL copied to clipboard');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalAssets = Object.values(assetsByCategory).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header with upload button */}
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Project Assets</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUploadClick}
            className="h-6 px-2 text-xs gap-1"
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
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

      {isLoading ? (
        <div className="h-full flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading assets...</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-0 space-y-0">
            {totalAssets === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No project assets</p>
                <p className="text-xs mt-1 text-muted-foreground/70 mb-3">
                  Upload files to use in your app
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
              Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
                if (categoryAssets.length === 0) return null;
                
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
                          <span className="text-[10px] text-muted-foreground">({categoryAssets.length})</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-3 gap-2 mt-2 mb-4 px-3">
                        {categoryAssets.map((asset) => {
                          const fileInfo = getFileTypeInfo(asset.name);
                          const FileIcon = fileInfo.icon;
                          const isImage = projectAssetService.getAssetCategory(asset) === 'Images';
                          const isVideo = projectAssetService.getAssetCategory(asset) === 'Videos';
                          
                          return (
                            <div
                              key={asset.id}
                              className="group relative flex flex-col items-center gap-1 p-2 rounded-md border border-border/30 hover:border-border hover:bg-accent/50 dark:bg-zinc-700/50 cursor-grab active:cursor-grabbing transition-all duration-200"
                              title={asset.name}
                              draggable
                              onDragStart={(e) => {
                                const assetData = {
                                  type: isImage ? 'image' : isVideo ? 'video' : 'file',
                                  url: asset.file_path,
                                  name: asset.name,
                                  altText: asset.name,
                                };
                                e.dataTransfer.setData('text/plain', asset.file_path);
                                e.dataTransfer.setData('application/x-asset', JSON.stringify(assetData));
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                            >
                              {/* Preview */}
                              <div className="w-6 h-6 flex items-center justify-center rounded bg-muted/50 group-hover:bg-primary/10 relative overflow-hidden">
                                {isImage ? (
                                  <img
                                    src={asset.file_path}
                                    alt={asset.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <FileIcon 
                                    className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" 
                                    style={{ color: isVideo ? undefined : fileInfo.color }}
                                  />
                                )}
                              </div>
                              
                              {/* Name */}
                              <span className="text-[10px] text-center truncate max-w-full">
                                {asset.name.length > 12 ? asset.name.slice(0, 10) + '...' : asset.name}
                              </span>
                              
                              {/* Actions overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                                <button
                                  onClick={(e) => handleCopyUrl(asset, e)}
                                  className="p-1 bg-white/20 rounded hover:bg-white/40 transition-colors"
                                  title="Copy URL"
                                >
                                  <Link2 className="h-3 w-3 text-white" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteAsset(asset, e)}
                                  className="p-1 bg-destructive/50 rounded hover:bg-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3 text-white" />
                                </button>
                              </div>
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
    </div>
  );
}
