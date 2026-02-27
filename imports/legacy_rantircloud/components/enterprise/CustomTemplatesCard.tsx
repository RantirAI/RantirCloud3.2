import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomTemplatesCardProps {
  workspaceId: string;
}

interface TemplateUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_status: string;
  metadata: any;
  created_at: string;
}

export function CustomTemplatesCard({ workspaceId }: CustomTemplatesCardProps) {
  const [templates, setTemplates] = useState<TemplateUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, [workspaceId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprise_uploads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('file_type', 'template')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as TemplateUpload[]);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Don't show error for empty state
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .zip file containing TypeScript templates.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Supabase Storage
      const fileName = `${workspaceId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('enterprise-templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Record upload in database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .insert({
          workspace_id: workspaceId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: 'template',
          file_size: file.size,
          uploaded_by: user?.id,
          metadata: {
            original_name: file.name,
            mime_type: file.type
          }
        });

      if (dbError) throw dbError;

      toast({
        title: "Template Uploaded",
        description: "Your custom template has been uploaded successfully.",
      });

      await loadTemplates();
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload template.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [workspaceId, user?.id, toast]);

  const handleDeleteTemplate = async (templateId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('enterprise-templates')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .delete()
        .eq('id', templateId);

      if (dbError) throw dbError;

      toast({
        title: "Template Deleted",
        description: "The template has been removed successfully.",
      });

      await loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete template.",
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          Custom Templates
        </CardTitle>
        <CardDescription>
          Upload and manage TypeScript template packages for your enterprise workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted rounded-lg p-4">
          <div className="text-center space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <Button
                variant="outline"
                className="relative"
                disabled={uploading}
              >
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading ? 'Uploading...' : 'Choose TypeScript ZIP file'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload .zip files containing TypeScript templates (max 50MB)
            </p>
          </div>
          
          {uploading && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No custom templates uploaded yet</p>
            <p className="text-xs text-muted-foreground">Upload your first TypeScript template package</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Templates</h4>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(template.upload_status)}
                    <div>
                      <p className="font-medium text-sm">{template.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(template.file_size)}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.upload_status}
                        </Badge>
                        <span>{new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDeleteTemplate(template.id, template.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium">Template Package Requirements</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Must be a .zip file containing TypeScript files</li>
            <li>• Include package.json with template metadata</li>
            <li>• Maximum file size: 50MB</li>
            <li>• Templates will be available across your workspace</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}