import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Upload, Download, Trash2, CheckCircle, AlertCircle, Book, Github, FileText, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomNodesCardProps {
  workspaceId: string;
}

interface NodeUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_status: string;
  metadata: any;
  created_at: string;
}

export function CustomNodesCard({ workspaceId }: CustomNodesCardProps) {
  const [nodes, setNodes] = useState<NodeUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadNodes();
  }, [workspaceId]);

  const loadNodes = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprise_uploads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('file_type', 'node')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNodes((data || []) as NodeUpload[]);
    } catch (error) {
      console.error('Error loading nodes:', error);
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
        description: "Please upload a .zip file containing custom node packages.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 75MB)
    if (file.size > 75 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 75MB.",
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
        .from('enterprise-nodes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Record upload in database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .insert({
          workspace_id: workspaceId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: 'node',
          file_size: file.size,
          uploaded_by: user?.id,
          metadata: {
            original_name: file.name,
            mime_type: file.type
          }
        });

      if (dbError) throw dbError;

      toast({
        title: "Node Package Uploaded",
        description: "Your custom node package has been uploaded successfully.",
      });

      await loadNodes();
    } catch (error: any) {
      console.error('Error uploading node:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload node package.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [workspaceId, user?.id, toast]);

  const handleDeleteNode = async (nodeId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('enterprise-nodes')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('enterprise_uploads')
        .delete()
        .eq('id', nodeId);

      if (dbError) throw dbError;

      toast({
        title: "Node Package Deleted",
        description: "The node package has been removed successfully.",
      });

      await loadNodes();
    } catch (error: any) {
      console.error('Error deleting node:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete node package.",
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
        return <Code className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Custom Nodes</h2>
          <p className="text-muted-foreground">
            Create and manage custom nodes for the Flow Builder
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-10 p-1">
          <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <Upload className="h-3.5 w-3.5" />
            Upload Nodes
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <Book className="h-3.5 w-3.5" />
            Development Guide
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center gap-1.5 text-xs h-8 px-3">
            <FileText className="h-3.5 w-3.5" />
            Examples
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4" />
                Custom Node Packages
              </CardTitle>
              <CardDescription>
                Upload and manage custom node packages for your enterprise workspace
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
                      {uploading ? 'Uploading...' : 'Choose Node Package ZIP file'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload .zip files containing custom node packages (max 75MB)
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

              {/* Nodes List */}
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading custom nodes...</p>
                </div>
              ) : nodes.length === 0 ? (
                <div className="text-center py-8">
                  <Code className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No custom nodes uploaded yet</p>
                  <p className="text-xs text-muted-foreground">Upload your first custom node package</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Node Packages</h4>
                  <div className="space-y-2">
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(node.upload_status)}
                          <div>
                            <p className="font-medium text-sm">{node.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(node.file_size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {node.upload_status}
                              </Badge>
                              <span>{new Date(node.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteNode(node.id, node.file_path)}
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
                <h4 className="text-sm font-medium">Node Package Requirements</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Must be a .zip file containing TypeScript node implementations</li>
                  <li>• Include package.json with node metadata and dependencies</li>
                  <li>• Follow the NodePlugin interface specification</li>
                  <li>• Maximum file size: 75MB</li>
                  <li>• Nodes will be available in the Flow Builder palette</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">What are Custom Nodes?</CardTitle>
              <CardDescription>
                Custom nodes extend the Flow Builder with new functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Custom nodes allow you to create reusable components that can be used in your flows. 
                Each node can have inputs, outputs, and custom execution logic.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/docs" className="flex items-center gap-3">
                    <Book className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold text-sm">Documentation</div>
                      <div className="text-xs text-muted-foreground">
                        Complete guide to the Flow Builder system
                      </div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/docs/development-guide" className="flex items-center gap-3">
                    <Code className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold text-sm">Development Guide</div>
                      <div className="text-xs text-muted-foreground">
                        Step-by-step guide to creating custom nodes
                      </div>
                    </div>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Creating Your First Node</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Follow these steps to create a custom node for your flows.
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold text-sm">Step 1: Define the Node Interface</h3>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
{`export const myCustomNode: NodePlugin = {
  type: 'my-custom-node',
  name: 'My Custom Node',
  description: 'Does something amazing',
  category: 'action',
  icon: Star,
  color: '#4CAF50',
  inputs: [...],
  outputs: [...],
  async execute(inputs, context) {
    // Your logic here
  }
};`}
                  </pre>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold text-sm">Step 2: Register Your Node</h3>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
{`import { nodeRegistry } from './node-registry';
import { myCustomNode } from './my-custom-node';

nodeRegistry.register(myCustomNode);`}
                  </pre>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold text-sm">Step 3: Test Your Node</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your node will now appear in the Flow Builder palette and can be used in flows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">NodePlugin Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`interface NodePlugin {
  type: string;             // Unique identifier
  name: string;             // Display name
  description: string;      // Description
  category: 'trigger' | 'action' | 'condition' | 'transformer';
  icon?: any;               // Icon component
  color?: string;           // Node color
  inputs?: InputField[];    // Input configuration
  outputs?: OutputField[];  // Output configuration
  execute?: (inputs: Record<string, any>, context: Context) => Promise<Record<string, any>>;
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Input Field Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><code>text</code> - Text input field</div>
                  <div><code>select</code> - Dropdown selection</div>
                  <div><code>number</code> - Numeric input</div>
                  <div><code>code</code> - Code editor</div>
                  <div><code>variable</code> - Variable selector</div>
                  <div><code>boolean</code> - Checkbox input</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start h-auto p-3">
                  <div className="flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium text-xs">Documentation</div>
                      <div className="text-xs text-muted-foreground">Complete API reference</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium text-xs">Examples Repository</div>
                      <div className="text-xs text-muted-foreground">Sample node implementations</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Weather API Node</CardTitle>
                <CardDescription>Fetch weather data from external API</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full text-xs">
                  <FileText className="h-3 w-3 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Data Transform Node</CardTitle>
                <CardDescription>Transform data with custom JavaScript</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full text-xs">
                  <FileText className="h-3 w-3 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}