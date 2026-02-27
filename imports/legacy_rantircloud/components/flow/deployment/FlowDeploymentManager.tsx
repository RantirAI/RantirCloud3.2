import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, Webhook, Code2, Key, RefreshCw, Copy, Check, Eye, EyeOff, BookOpen, Trash2, Bot, MessageSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { EndpointConfiguration } from './EndpointConfiguration';
import { WebhookConfiguration } from './WebhookConfiguration';
import { ApiDocumentation } from './ApiDocumentation';
import { WebhookKnowledgeBase } from './WebhookKnowledgeBase';
import { McpConfiguration } from './McpConfiguration';
import { ChatEmbedConfiguration } from './ChatEmbedConfiguration';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
interface FlowDeploymentManagerProps {
  flowProjectId: string;
  flowName: string;
  onClose?: () => void;
}

export interface DeploymentData {
  is_deployed: boolean;
  endpoint_slug: string | null;
  webhook_secret: string | null;
  deployment_status: string;
  last_deployed_at: string | null;
  deployed_version: number | null;
  signature_provider: string | null;
  signature_header_name: string | null;
  signature_algorithm: string | null;
  external_webhook_secret: string | null;
  signature_timestamp_tolerance: number | null;
  primary_endpoint_type: string | null;
  allowed_methods: string[] | null;
  api_parameters: any[] | null;
  api_headers: any[] | null;
  api_description: string | null;
  rate_limit_enabled: boolean | null;
  rate_limit_requests: number | null;
  rate_limit_window_seconds: number | null;
}

export function FlowDeploymentManager({
  flowProjectId,
  flowName,
  onClose: _onClose,
}: FlowDeploymentManagerProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Use clean public URL for display (proxied via Cloudflare Worker)
  const publicBaseUrl = 'https://api.rantir.cloud/flows';

  useEffect(() => {
    loadDeploymentData();
    loadApiKey();
  }, [flowProjectId]);

  // Set active tab based on deployment type
  useEffect(() => {
    if (!isLoading && deploymentData && activeTab === null) {
      if (deploymentData.is_deployed) {
        // Show the active deployment type first
        if (deploymentData.primary_endpoint_type === 'webhook') {
          setActiveTab('webhook');
        } else {
          setActiveTab('endpoint');
        }
      } else {
        setActiveTab('endpoint');
      }
    }
  }, [isLoading, deploymentData, activeTab]);

  const loadDeploymentData = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_projects')
        .select(`
          is_deployed, endpoint_slug, webhook_secret, deployment_status,
          last_deployed_at, deployed_version, signature_provider,
          signature_header_name, signature_algorithm, external_webhook_secret,
          signature_timestamp_tolerance, primary_endpoint_type, allowed_methods,
          api_parameters, api_headers, api_description, rate_limit_enabled,
          rate_limit_requests, rate_limit_window_seconds
        `)
        .eq('id', flowProjectId)
        .single();

      if (error) throw error;
      setDeploymentData(data as unknown as DeploymentData);
    } catch (error) {
      console.error('Failed to load deployment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing API key for this flow
      const { data } = await supabase
        .from('flow_variables')
        .select('value')
        .eq('flow_project_id', flowProjectId)
        .eq('name', 'API_KEY')
        .eq('is_secret', true)
        .maybeSingle();

      if (data) {
        setApiKey(data.value);
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  };

  const generateSlug = (name: string): string => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    return `${baseSlug}-${randomSuffix}`;
  };

  const generateSecret = (): string => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return 'rflow_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  };

  const generateApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newKey = 'rk_' + crypto.randomUUID().replace(/-/g, '');

      // Delete existing key if any
      await supabase
        .from('flow_variables')
        .delete()
        .eq('flow_project_id', flowProjectId)
        .eq('name', 'API_KEY');

      // Create new key
      const { error } = await supabase
        .from('flow_variables')
        .insert({
          flow_project_id: flowProjectId,
          name: 'API_KEY',
          value: newKey,
          is_secret: true,
          description: 'Auto-generated API key for this flow',
        });

      if (error) throw error;

      setApiKey(newKey);
      toast.success('API key generated successfully');
    } catch (error: any) {
      toast.error(`Failed to generate API key: ${error.message}`);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const deleteApiKey = async () => {
    setIsDeletingKey(true);
    try {
      const { error } = await supabase
        .from('flow_variables')
        .delete()
        .eq('flow_project_id', flowProjectId)
        .eq('name', 'API_KEY');

      if (error) throw error;

      setApiKey(null);
      setShowApiKey(false);
      toast.success('API key deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete API key: ${error.message}`);
    } finally {
      setIsDeletingKey(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  const handleDeploy = async (config: Partial<DeploymentData>) => {
    setIsDeploying(true);
    
    try {
      const { data: flowData, error: flowDataError } = await supabase
        .from('flow_data')
        .select('id, version')
        .eq('flow_project_id', flowProjectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (flowDataError) throw flowDataError;

      // First, unpublish all previous versions to ensure only the latest is published
      await supabase
        .from('flow_data')
        .update({ is_published: false })
        .eq('flow_project_id', flowProjectId);

      // Then publish the latest version
      await supabase
        .from('flow_data')
        .update({ is_published: true })
        .eq('id', flowData.id);

      const slug = deploymentData?.endpoint_slug || generateSlug(flowName);
      const secret = deploymentData?.webhook_secret || generateSecret();

      const { error: updateError } = await supabase
        .from('flow_projects')
        .update({
          is_deployed: true,
          endpoint_slug: slug,
          webhook_secret: secret,
          deployment_status: 'deployed',
          last_deployed_at: new Date().toISOString(),
          deployed_version: flowData.version,
          ...config,
        } as any)
        .eq('id', flowProjectId);

      if (updateError) throw updateError;

      toast.success('Flow deployed successfully!');
      await loadDeploymentData();
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUndeploy = async () => {
    setIsDeploying(true);
    
    try {
      const { error } = await supabase
        .from('flow_projects')
        .update({
          is_deployed: false,
          deployment_status: 'draft',
        })
        .eq('id', flowProjectId);

      if (error) throw error;

      toast.success('Flow undeployed');
      await loadDeploymentData();
    } catch (error: any) {
      toast.error(`Failed to undeploy: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUpdateConfig = async (config: Partial<DeploymentData>) => {
    try {
      const { error } = await supabase
        .from('flow_projects')
        .update(config as any)
        .eq('id', flowProjectId);

      if (error) throw error;
      
      toast.success('Configuration saved');
      await loadDeploymentData();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  const webhookUrl = deploymentData?.endpoint_slug
    ? `${publicBaseUrl}/${deploymentData.endpoint_slug}`
    : null;

  if (isLoading || activeTab === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine tab order based on active deployment type
  const isWebhookActive = deploymentData?.is_deployed && deploymentData.primary_endpoint_type === 'webhook';
  const isApiActive = deploymentData?.is_deployed && deploymentData.primary_endpoint_type === 'api';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Deploy Flow</h2>
            <p className="text-sm text-muted-foreground">Configure and deploy your flow as an API or webhook</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deploymentData?.is_deployed ? (
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              {isWebhookActive ? 'Webhook' : 'API'} v{deploymentData.deployed_version}
            </Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </div>
      </div>

      {/* Tabs - order based on active deployment */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto overflow-x-auto shrink-0 shadow-none">
          {isWebhookActive ? (
            <>
              <TabsTrigger
                value="webhook"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
              >
                <Webhook className="w-3.5 h-3.5 mr-1.5" />
                Webhook
                {isWebhookActive && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">Active</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="endpoint"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
              >
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                API
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger
                value="endpoint"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
              >
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                API
                {isApiActive && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">Active</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="webhook"
                className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
              >
                <Webhook className="w-3.5 h-3.5 mr-1.5" />
                Webhook
              </TabsTrigger>
            </>
          )}
          <TabsTrigger
            value="keys"
            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
          >
            <Key className="w-3.5 h-3.5 mr-1.5" />
            Keys
          </TabsTrigger>
          <TabsTrigger
            value="mcp"
            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" />
            MCP
          </TabsTrigger>
          <TabsTrigger
            value="guides"
            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Guides
          </TabsTrigger>
          <TabsTrigger
            value="chat-embed"
            className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Chat Embed
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <TabsContent value="endpoint" className="mt-0">
            <EndpointConfiguration
              deploymentData={deploymentData}
              webhookUrl={webhookUrl}
              isDeploying={isDeploying}
              onDeploy={handleDeploy}
              onUndeploy={handleUndeploy}
              onUpdateConfig={handleUpdateConfig}
            />
          </TabsContent>

          <TabsContent value="webhook" className="mt-0">
            <WebhookConfiguration
              deploymentData={deploymentData}
              webhookUrl={webhookUrl}
              isDeploying={isDeploying}
              flowProjectId={flowProjectId}
              onDeploy={handleDeploy}
              onUpdateConfig={handleUpdateConfig}
            />
          </TabsContent>

          <TabsContent value="keys" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Generate and manage API keys for authenticating requests to your flow
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {apiKey ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Your API Key</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-2.5 bg-muted rounded-md border font-mono text-xs truncate">
                            {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => copyToClipboard(apiKey, 'API Key')}
                          >
                            {copied === 'API Key' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={generateApiKey}
                          disabled={isGeneratingKey || isDeletingKey}
                          className="flex-1"
                        >
                          {isGeneratingKey ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Regenerate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              disabled={isGeneratingKey || isDeletingKey}
                            >
                              {isDeletingKey ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the API key. Any integrations using this key will stop working immediately. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={deleteApiKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Key
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Warning: Regenerating or deleting the API key will invalidate the current key.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground mb-4">
                        No API key generated yet. Create one to authenticate requests.
                      </p>
                      <Button 
                        onClick={generateApiKey}
                        disabled={isGeneratingKey}
                      >
                        {isGeneratingKey ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        Generate API Key
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Include the API key in your requests using the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header:
                  </p>
                  <div className="p-3 bg-muted rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{`curl -X POST "${webhookUrl || 'https://...'}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'your_api_key'}" \\
  -d '{"data": "your payload"}'`}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mcp" className="mt-0">
            <McpConfiguration
              flowProjectId={flowProjectId}
              flowName={flowName}
              deploymentData={deploymentData}
              onUpdateConfig={handleUpdateConfig}
            />
          </TabsContent>

          <TabsContent value="guides" className="mt-0 -m-4">
            <WebhookKnowledgeBase />
          </TabsContent>

          <TabsContent value="chat-embed" className="mt-0">
            <ChatEmbedConfiguration
              flowProjectId={flowProjectId}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
