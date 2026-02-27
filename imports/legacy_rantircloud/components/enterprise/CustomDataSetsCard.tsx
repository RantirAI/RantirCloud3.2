import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Upload, Trash2, CheckCircle, AlertCircle, Zap, Globe, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomDataSetsCardProps {
  workspaceId: string;
}

interface DataUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_status: string;
  file_type: string;
  metadata: any;
  created_at: string;
}

export function CustomDataSetsCard({ workspaceId }: CustomDataSetsCardProps) {
  const [datasets, setDatasets] = useState<DataUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadDatasets();
  }, [workspaceId]);

  const loadDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprise_uploads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('file_type', ['dataset', 'api'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatasets((data || []) as DataUpload[]);
    } catch (error) {
      console.error('Error loading datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .zip file containing datasets or .json file with API configurations.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 200MB for datasets)
    if (file.size > 200 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 200MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Determine file type based on extension
      const fileType = file.name.endsWith('.json') ? 'api' : 'dataset';
      
      // Upload to Supabase Storage
      const fileName = `${workspaceId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('enterprise-datasets')
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
            mime_type: file.type,
            source: fileType === 'api' ? 'api_configuration' : 'dataset_collection'
          }
        });

      if (dbError) throw dbError;

      toast({
        title: `${fileType === 'api' ? 'API Configuration' : 'Dataset'} Uploaded`,
        description: `Your ${fileType === 'api' ? 'API configuration' : 'dataset'} has been uploaded successfully.`,
      });

      await loadDatasets();
    } catch (error: any) {
      console.error('Error uploading dataset:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload dataset.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [workspaceId, user?.id, toast]);

  const handleDeleteDataset = async (datasetId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('enterprise-datasets')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .delete()
        .eq('id', datasetId);

      if (dbError) throw dbError;

      toast({
        title: "Dataset Deleted",
        description: "The dataset has been removed successfully.",
      });

      await loadDatasets();
    } catch (error: any) {
      console.error('Error deleting dataset:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete dataset.",
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
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    return fileType === 'api' ? <Globe className="h-4 w-4" /> : <FileJson className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Tiempos font */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Custom Data Collections</h2>
          <p className="text-muted-foreground">
            Upload and manage dataset collections and API configurations from services like RapidAPI
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Data Collections & APIs
          </CardTitle>
          <CardDescription>
            Import custom data collections and API configurations for your enterprise workspace
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
                    accept=".zip,.json"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  {uploading ? 'Uploading...' : 'Choose Dataset ZIP or API JSON file'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload .zip files with data collections or .json files with API configurations (max 200MB)
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

          {/* Datasets List */}
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading data collections...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No data collections uploaded yet</p>
              <p className="text-xs text-muted-foreground">Upload your first dataset or API configuration</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Uploaded Data Collections</h4>
              <div className="space-y-2">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(dataset.upload_status)}
                      <div className="flex items-center gap-2">
                        {getFileTypeIcon(dataset.file_type)}
                        <div>
                          <p className="font-medium text-sm">{dataset.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(dataset.file_size)}</span>
                            <Badge variant="outline" className="text-xs">
                              {dataset.file_type === 'api' ? 'API Config' : 'Dataset'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {dataset.upload_status}
                            </Badge>
                            <span>{new Date(dataset.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteDataset(dataset.id, dataset.file_path)}
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
            <h4 className="text-sm font-medium">Data Collection Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Dataset ZIP Files</h5>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• JSON, CSV, or SQL files</li>
                  <li>• Include metadata.json with schema</li>
                  <li>• Maximum file size: 200MB</li>
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">API JSON Configurations</h5>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• RapidAPI or custom API configs</li>
                  <li>• Include endpoints and auth details</li>
                  <li>• Support for REST and GraphQL</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}