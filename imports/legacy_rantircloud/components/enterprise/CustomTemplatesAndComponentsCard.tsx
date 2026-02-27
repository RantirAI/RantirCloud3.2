import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Trash2, CheckCircle, AlertCircle, Package, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomTemplatesAndComponentsCardProps {
  workspaceId: string;
}

interface Upload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_status: string;
  file_type: string;
  metadata: any;
  created_at: string;
}

export function CustomTemplatesAndComponentsCard({ workspaceId }: CustomTemplatesAndComponentsCardProps) {
  const [templates, setTemplates] = useState<Upload[]>([]);
  const [components, setComponents] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeUploadType, setActiveUploadType] = useState<'template' | 'component'>('template');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTemplatesAndComponents();
  }, [workspaceId]);

  const loadTemplatesAndComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprise_uploads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('file_type', ['template', 'component'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const uploadData = (data || []) as Upload[];
      setTemplates(uploadData.filter(item => item.file_type === 'template'));
      setComponents(uploadData.filter(item => item.file_type === 'component'));
    } catch (error) {
      console.error('Error loading templates and components:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'template' | 'component') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a .zip file containing TypeScript ${fileType}s.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 75MB)
    const maxSize = fileType === 'template' ? 50 : 100;
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `Please upload a file smaller than ${maxSize}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setActiveUploadType(fileType);

    try {
      const bucketName = fileType === 'template' ? 'enterprise-templates' : 'enterprise-components';
      const fileName = `${workspaceId}/${Date.now()}_${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Record upload in database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .insert({
          workspace_id: workspaceId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: fileType,
          file_size: file.size,
          uploaded_by: user?.id,
          metadata: {
            original_name: file.name,
            mime_type: file.type
          }
        });

      if (dbError) throw dbError;

      toast({
        title: `${fileType === 'template' ? 'Template' : 'Component'} Uploaded`,
        description: `Your custom ${fileType} has been uploaded successfully.`,
      });

      await loadTemplatesAndComponents();
    } catch (error: any) {
      console.error(`Error uploading ${fileType}:`, error);
      toast({
        title: "Upload Failed",
        description: error.message || `Failed to upload ${fileType}.`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [workspaceId, user?.id, toast]);

  const handleDeleteFile = async (fileId: string, filePath: string, fileType: 'template' | 'component') => {
    try {
      const bucketName = fileType === 'template' ? 'enterprise-templates' : 'enterprise-components';
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: `${fileType === 'template' ? 'Template' : 'Component'} Deleted`,
        description: `The ${fileType} has been removed successfully.`,
      });

      await loadTemplatesAndComponents();
    } catch (error: any) {
      console.error(`Error deleting ${fileType}:`, error);
      toast({
        title: "Delete Failed",
        description: error.message || `Failed to delete ${fileType}.`,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderUploadSection = (fileType: 'template' | 'component', maxSize: number) => (
    <div className="border-2 border-dashed border-muted rounded-lg p-4">
      <div className="text-center space-y-2">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
        <div>
          <Button
            variant="outline"
            className="relative"
            disabled={uploading && activeUploadType === fileType}
          >
            <input
              type="file"
              accept=".zip"
              onChange={(e) => handleFileUpload(e, fileType)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            {uploading && activeUploadType === fileType ? 'Uploading...' : `Choose ${fileType === 'template' ? 'Template' : 'Component'} ZIP file`}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload .zip files containing TypeScript {fileType}s (max {maxSize}MB)
        </p>
      </div>
      
      {uploading && activeUploadType === fileType && (
        <div className="mt-4 space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Uploading... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}
    </div>
  );

  const renderFileList = (files: Upload[], fileType: 'template' | 'component') => (
    loading ? (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Loading {fileType}s...</p>
      </div>
    ) : files.length === 0 ? (
      <div className="text-center py-8">
        {fileType === 'template' ? 
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" /> :
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        }
        <p className="text-muted-foreground">No custom {fileType}s uploaded yet</p>
        <p className="text-xs text-muted-foreground">Upload your first TypeScript {fileType} package</p>
      </div>
    ) : (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Uploaded {fileType === 'template' ? 'Templates' : 'Components'}</h4>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(file.upload_status)}
                <div>
                  <p className="font-medium text-sm">{file.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.upload_status}
                    </Badge>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDeleteFile(file.id, file.file_path, fileType)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      {/* Header with Tiempos font */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Custom Templates & Components</h2>
          <p className="text-muted-foreground">
            Upload and manage TypeScript template and component packages for your enterprise workspace
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      {/* Sub-tabs for Templates and Components */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-10 p-1">
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <FileText className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <Package className="h-3.5 w-3.5" />
            Components
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Custom Templates
              </CardTitle>
              <CardDescription>
                Upload and manage TypeScript template packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderUploadSection('template', 50)}
              {renderFileList(templates, 'template')}
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium">Template Package Requirements</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Must be a .zip file containing TypeScript template files</li>
                  <li>• Include package.json with template metadata</li>
                  <li>• Maximum file size: 50MB</li>
                  <li>• Templates will be available across your workspace</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                Custom Components
              </CardTitle>
              <CardDescription>
                Upload and manage TypeScript component packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderUploadSection('component', 100)}
              {renderFileList(components, 'component')}
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium">Component Package Requirements</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Must be a .zip file containing TypeScript component files</li>
                  <li>• Include package.json with component metadata</li>
                  <li>• Maximum file size: 100MB</li>
                  <li>• Components will be available across your workspace</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}