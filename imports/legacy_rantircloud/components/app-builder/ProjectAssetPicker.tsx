/**
 * Project Asset Picker
 * 
 * Allows selecting images from the project's local asset folder,
 * or uploading new images directly to the project (no database required).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Image, 
  Loader2, 
  Upload, 
  Check,
  FolderOpen,
  Link2,
  Trash2
} from 'lucide-react';
import { projectAssetService, ProjectAsset } from '@/services/projectAssetService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectAssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, name: string) => void;
  filterType?: 'image' | 'video' | 'all';
  projectId?: string;
}

export function ProjectAssetPicker({ 
  open, 
  onOpenChange, 
  onSelect,
  filterType = 'image',
  projectId: propProjectId
}: ProjectAssetPickerProps) {
  const { id: routeProjectId } = useParams<{ id: string }>();
  const projectId = propProjectId || routeProjectId;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ProjectAsset | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'upload' | 'url'>('assets');
  const [urlInput, setUrlInput] = useState('');

  // Load assets when dialog opens
  useEffect(() => {
    if (!open || !projectId) return;

    const loadAssets = async () => {
      setLoading(true);
      try {
        const data = await projectAssetService.getProjectAssets(projectId);
        setAssets(data);
      } catch (error) {
        console.error('Failed to load project assets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [open, projectId]);

  // Filter assets based on search and type
  const filteredAssets = useMemo(() => {
    let result = assets;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(asset => {
        const category = projectAssetService.getAssetCategory(asset);
        if (filterType === 'image') return category === 'Images';
        if (filterType === 'video') return category === 'Videos';
        return true;
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(asset => 
        asset.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [assets, filterType, searchQuery]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !projectId) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await projectAssetService.uploadAsset(projectId, file);
        setAssets(prev => [asset, ...prev]);
      }
      toast.success('Assets uploaded successfully');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectAsset = () => {
    if (selectedAsset) {
      onSelect(selectedAsset.file_path, selectedAsset.name);
      handleClose();
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim(), urlInput.split('/').pop() || 'external-image');
      handleClose();
    }
  };

  const handleDeleteAsset = async (asset: ProjectAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!projectId) return;

    try {
      await projectAssetService.deleteAsset(projectId, asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
      toast.success('Asset deleted');
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const handleClose = () => {
    setSelectedAsset(null);
    setSearchQuery('');
    setUrlInput('');
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Project Assets
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={filterType === 'image' ? 'image/*' : filterType === 'video' ? 'video/*' : '*/*'}
          className="hidden"
          onChange={handleFileUpload}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="assets" className="text-xs">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="flex-1 flex flex-col mt-4">
            {/* Assets grid - removed search icon */}
            <ScrollArea className="flex-1" style={{ height: '300px' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No assets match your search' : 'No assets yet'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Upload images to use as backgrounds
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUploadClick}
                    className="mt-3 h-7 text-xs gap-1.5"
                    disabled={uploading}
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 py-1 px-1">
                  {filteredAssets.map(asset => {
                    const category = projectAssetService.getAssetCategory(asset);
                    const isImage = category === 'Images';
                    const isSelected = selectedAsset?.id === asset.id;
                    const info = getFileTypeInfo(asset.name);
                    const FileIcon = info.icon;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "group relative aspect-square rounded-lg border-2 overflow-hidden",
                          "flex items-center justify-center bg-muted/30 cursor-pointer",
                          "hover:border-primary/50 transition-colors",
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                        )}
                      >
                        {isImage ? (
                          <img
                            src={asset.file_path}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <FileIcon 
                            className="h-8 w-8 text-muted-foreground"
                            style={{ color: info.color }}
                          />
                        )}
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteAsset(asset, e)}
                          className="absolute top-1 left-1 w-5 h-5 bg-destructive/80 rounded-full 
                                   flex items-center justify-center opacity-0 group-hover:opacity-100 
                                   transition-opacity hover:bg-destructive"
                        >
                          <Trash2 className="h-2.5 w-2.5 text-white" />
                        </button>
                        
                        {/* File name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                          <p className="text-[10px] text-white truncate">{asset.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
                "hover:border-primary/50 transition-colors",
                uploading && "opacity-50 pointer-events-none"
              )}
              onClick={handleUploadClick}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm font-medium">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or drag and drop files here
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Supports: JPG, PNG, GIF, WebP, SVG, MP4, WebM
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-3 space-y-3">
            <div className="space-y-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="h-9"
              />
              {urlInput && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img 
                    src={urlInput} 
                    alt="Preview" 
                    className="max-h-40 mx-auto rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <Button 
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="w-full"
            >
              Use This URL
            </Button>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t mt-3">
          <div className="text-xs text-muted-foreground">
            {selectedAsset 
              ? `Selected: ${selectedAsset.name}` 
              : `${filteredAssets.length} assets`
            }
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            {activeTab === 'assets' && (
              <Button 
                size="sm" 
                onClick={handleSelectAsset}
                disabled={!selectedAsset}
              >
                Select Asset
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
