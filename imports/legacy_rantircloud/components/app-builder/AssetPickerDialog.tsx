import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Video, FileText, Loader2, Search, Database, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { driveService, DriveFile } from '@/services/driveService';
import { getFileTypeInfo } from '@/lib/fileTypeIcons';

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, name: string) => void;
  filterType?: 'image' | 'video' | 'all';
}

interface DatabaseInfo {
  id: string;
  name: string;
  color: string | null;
}

export function AssetPickerDialog({ 
  open, 
  onOpenChange, 
  onSelect,
  filterType = 'all'
}: AssetPickerDialogProps) {
  const { user } = useAuth();
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  // Load databases
  useEffect(() => {
    if (!open || !user) return;

    const loadDatabases = async () => {
      setLoadingDatabases(true);
      try {
        const { data, error } = await supabase
          .from('databases')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setDatabases(data || []);
        
        // Auto-select first database if available
        if (data && data.length > 0 && !selectedDatabase) {
          setSelectedDatabase(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load databases:', error);
      } finally {
        setLoadingDatabases(false);
      }
    };

    loadDatabases();
  }, [open, user]);

  // Load files when database changes
  useEffect(() => {
    if (!selectedDatabase) {
      setFiles([]);
      return;
    }

    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const filesData = await driveService.getDatabaseFiles(selectedDatabase);
        setFiles(filesData);
      } catch (error) {
        console.error('Failed to load files:', error);
      } finally {
        setLoadingFiles(false);
      }
    };

    loadFiles();
  }, [selectedDatabase]);

  // Filter files based on search and type
  const filteredFiles = useMemo(() => {
    let result = files;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(file => {
        const info = getFileTypeInfo(file.name);
        if (filterType === 'image') return info.category === 'Images';
        if (filterType === 'video') return info.category === 'Videos';
        return true;
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [files, filterType, searchQuery]);

  const handleSelect = () => {
    if (selectedFile) {
      onSelect(selectedFile.file_path, selectedFile.name);
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Select Asset
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-3 border-b">
          {/* Database selector */}
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select database..." />
              </SelectTrigger>
              <SelectContent>
                {databases.map(db => (
                  <SelectItem key={db.id} value={db.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: db.color || '#6B7280' }}
                      />
                      {db.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Files grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loadingDatabases || loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedDatabase ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Select a database to view assets</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No assets match your search' : 'No assets found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 py-3">
              {filteredFiles.map(file => {
                const info = getFileTypeInfo(file.name);
                const isImage = info.category === 'Images';
                const isSelected = selectedFile?.id === file.id;
                const FileIcon = info.icon;

                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`
                      relative aspect-square rounded-lg border-2 overflow-hidden
                      flex items-center justify-center bg-muted/30
                      hover:border-primary/50 transition-colors
                      ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                    `}
                  >
                    {isImage ? (
                      <img
                        src={file.thumbnail_url || file.file_path}
                        alt={file.name}
                        className="w-full h-full object-cover"
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
                    
                    {/* File name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                      <p className="text-[10px] text-white truncate">{file.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {selectedFile ? `Selected: ${selectedFile.name}` : `${filteredFiles.length} assets`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSelect}
              disabled={!selectedFile}
            >
              Select Asset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
