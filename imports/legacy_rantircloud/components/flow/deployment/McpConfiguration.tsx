import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Settings, 
  Code2,
  FileJson,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeploymentData } from './FlowDeploymentManager';
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
} from "@/components/ui/alert-dialog";

interface McpConfigurationProps {
  flowProjectId: string;
  flowName: string;
  deploymentData: DeploymentData | null;
  onUpdateConfig: (config: Partial<DeploymentData>) => Promise<void>;
}

interface McpData {
  mcp_enabled: boolean;
  mcp_tool_name: string | null;
  mcp_tool_description: string | null;
}

interface McpApiKey {
  id: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

// SHA-256 hash function
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function McpConfiguration({
  flowProjectId,
  flowName,
  deploymentData,
  onUpdateConfig,
}: McpConfigurationProps) {
  const [mcpData, setMcpData] = useState<McpData>({
    mcp_enabled: false,
    mcp_tool_name: null,
    mcp_tool_description: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  
  // MCP API Key state
  const [existingKey, setExistingKey] = useState<McpApiKey | null>(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const mcpServerUrl = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/mcp-server';
  const defaultToolName = deploymentData?.endpoint_slug || flowName.toLowerCase().replace(/\s+/g, '-');

  useEffect(() => {
    loadMcpData();
    loadMcpApiKey();
  }, [flowProjectId]);

  const loadMcpData = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_projects')
        .select('mcp_enabled, mcp_tool_name, mcp_tool_description')
        .eq('id', flowProjectId)
        .single();

      if (error) throw error;

      setMcpData(data as McpData);
      setToolName(data.mcp_tool_name || '');
      setToolDescription(data.mcp_tool_description || '');
    } catch (error) {
      console.error('Failed to load MCP data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMcpApiKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('mcp_api_keys')
        .select('id, key_prefix, created_at, last_used_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setExistingKey(data);
    } catch (error) {
      console.error('Failed to load MCP API key:', error);
    }
  };

  const generateMcpApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a new key
      const randomBytes = crypto.getRandomValues(new Uint8Array(24));
      const randomStr = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const newKey = 'rmcp_' + randomStr;
      const keyHash = await hashKey(newKey);
      const keyPrefix = newKey.substring(0, 12) + '...';

      // Deactivate existing keys first
      await supabase
        .from('mcp_api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Insert new key
      const { data, error } = await supabase
        .from('mcp_api_keys')
        .insert({
          user_id: user.id,
          name: 'MCP API Key',
          key_hash: keyHash,
          key_prefix: keyPrefix,
          is_active: true,
        })
        .select('id, key_prefix, created_at, last_used_at, is_active')
        .single();

      if (error) throw error;

      setExistingKey(data);
      setNewlyGeneratedKey(newKey);
      setShowKey(true);
      toast.success('MCP API Key generated! Copy it now - it won\'t be shown again.');
    } catch (error: any) {
      console.error('Failed to generate key:', error);
      toast.error(`Failed to generate key: ${error.message}`);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const revokeMcpApiKey = async () => {
    if (!existingKey) return;
    
    try {
      const { error } = await supabase
        .from('mcp_api_keys')
        .update({ is_active: false })
        .eq('id', existingKey.id);

      if (error) throw error;

      setExistingKey(null);
      setNewlyGeneratedKey(null);
      toast.success('MCP API Key revoked');
    } catch (error: any) {
      toast.error(`Failed to revoke key: ${error.message}`);
    }
  };

  const handleToggleMcp = async (enabled: boolean) => {
    if (!deploymentData?.is_deployed && enabled) {
      toast.error('You must deploy the flow first before enabling MCP');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('flow_projects')
        .update({ mcp_enabled: enabled } as any)
        .eq('id', flowProjectId);

      if (error) throw error;

      setMcpData(prev => ({ ...prev, mcp_enabled: enabled }));
      toast.success(enabled ? 'MCP enabled' : 'MCP disabled');
    } catch (error: any) {
      toast.error(`Failed to update MCP: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('flow_projects')
        .update({
          mcp_tool_name: toolName || null,
          mcp_tool_description: toolDescription || null,
        } as any)
        .eq('id', flowProjectId);

      if (error) throw error;

      setMcpData(prev => ({
        ...prev,
        mcp_tool_name: toolName || null,
        mcp_tool_description: toolDescription || null,
      }));
      toast.success('MCP configuration saved');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  // Generate config with placeholder
  const generateConfig = (keyPlaceholder: string) => JSON.stringify({
    mcpServers: {
      "rantir-flows": {
        serverUrl: mcpServerUrl,
        headers: {
          "Content-Type": "application/json",
          "X-MCP-Key": keyPlaceholder
        }
      }
    }
  }, null, 2);

  const claudeConfig = generateConfig(newlyGeneratedKey || '<YOUR_MCP_API_KEY>');
  const cursorConfig = generateConfig(newlyGeneratedKey || '<YOUR_MCP_API_KEY>');

  // Generate input schema preview
  const inputSchemaPreview = JSON.stringify({
    type: "object",
    properties: deploymentData?.api_parameters?.reduce((acc: any, param: any) => {
      acc[param.name] = {
        type: param.type === 'number' ? 'number' : 'string',
        description: param.description || param.name,
      };
      return acc;
    }, {}) || {},
    required: deploymentData?.api_parameters?.filter((p: any) => p.required).map((p: any) => p.name) || [],
  }, null, 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* MCP API Key Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">MCP API Key</CardTitle>
            </div>
            {existingKey && (
              <Badge variant="outline" className="text-xs">
                {existingKey.key_prefix}
              </Badge>
            )}
          </div>
          <CardDescription>
            Your personal API key for authenticating with the MCP server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!existingKey ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate an API key to connect AI agents (Claude, Cursor, Windsurf) to your flows.
              </p>
              <Button onClick={generateMcpApiKey} disabled={isGeneratingKey} className="w-full">
                {isGeneratingKey ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate MCP API Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {newlyGeneratedKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-600 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Key generated! Copy it now - it won't be shown again.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={showKey ? newlyGeneratedKey : '•'.repeat(40)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newlyGeneratedKey, 'API Key')}
                    >
                      {copied === 'API Key' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 bg-muted rounded-md border font-mono text-xs">
                    {existingKey.key_prefix}
                  </div>
                  {existingKey.last_used_at && (
                    <span className="text-xs text-muted-foreground">
                      Last used: {new Date(existingKey.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Regenerate
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will invalidate your current key. Any AI agents using the old key will need to be updated.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={generateMcpApiKey}>
                        Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately disable the key. Any AI agents using it will lose access.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={revokeMcpApiKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Revoke Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">MCP Server</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {mcpData.mcp_enabled ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              <Switch
                checked={mcpData.mcp_enabled}
                onCheckedChange={handleToggleMcp}
                disabled={isSaving || !deploymentData?.is_deployed}
              />
            </div>
          </div>
          <CardDescription>
            Expose this flow as an AI-callable tool via the Model Context Protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!deploymentData?.is_deployed && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Deploy your flow first to enable MCP</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">MCP Server URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 bg-muted rounded-md border font-mono text-xs truncate">
                  {mcpServerUrl}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(mcpServerUrl, 'MCP URL')}
                >
                  {copied === 'MCP URL' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tool Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Tool Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize how AI agents see and interact with this flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toolName">Tool Name</Label>
            <Input
              id="toolName"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder={defaultToolName}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to: <code className="bg-muted px-1 rounded">{defaultToolName}</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toolDescription">Tool Description</Label>
            <Textarea
              id="toolDescription"
              value={toolDescription}
              onChange={(e) => setToolDescription(e.target.value)}
              placeholder={deploymentData?.api_description || `Execute the ${flowName} flow`}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A clear description helps AI agents understand when to use this tool
            </p>
          </div>

          <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Setup Guides */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Setup Guides</CardTitle>
          </div>
          <CardDescription>
            Connect your flows to AI agents and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="windsurf" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="windsurf" className="text-xs py-2">Windsurf</TabsTrigger>
              <TabsTrigger value="cursor" className="text-xs py-2">Cursor</TabsTrigger>
              <TabsTrigger value="claude" className="text-xs py-2">Claude</TabsTrigger>
              <TabsTrigger value="schema" className="text-xs py-2">Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="windsurf" className="mt-4 space-y-4">
              <div className="text-sm space-y-2">
                <p className="font-medium">1. Open your Windsurf MCP configuration</p>
                <p className="text-muted-foreground text-xs">
                  Edit: <code className="bg-muted px-1 rounded">~/.codeium/windsurf/mcp_config.json</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">2. Add this configuration:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cursorConfig, 'Windsurf config')}
                  >
                    {copied === 'Windsurf config' ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-40 border rounded-md bg-muted/50">
                  <pre className="p-3 text-xs font-mono">{cursorConfig}</pre>
                </ScrollArea>
              </div>
              {!existingKey && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Generate an MCP API Key above first!</span>
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium">3. Reload Windsurf</p>
                <p className="text-muted-foreground text-xs">
                  Your flows will appear as available tools in Cascade
                </p>
              </div>
            </TabsContent>

            <TabsContent value="cursor" className="mt-4 space-y-4">
              <div className="text-sm space-y-2">
                <p className="font-medium">1. Open Cursor Settings</p>
                <p className="text-muted-foreground text-xs">
                  Go to Settings → Features → MCP Servers, or edit <code className="bg-muted px-1 rounded">~/.cursor/mcp.json</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">2. Add this configuration:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cursorConfig, 'Cursor config')}
                  >
                    {copied === 'Cursor config' ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-40 border rounded-md bg-muted/50">
                  <pre className="p-3 text-xs font-mono">{cursorConfig}</pre>
                </ScrollArea>
              </div>
              {!existingKey && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Generate an MCP API Key above first!</span>
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium">3. Restart Cursor</p>
                <p className="text-muted-foreground text-xs">
                  Your flows will be available as tools in Cursor's AI assistant
                </p>
              </div>
            </TabsContent>

            <TabsContent value="claude" className="mt-4 space-y-4">
              <div className="text-sm space-y-2">
                <p className="font-medium">1. Open your Claude Desktop configuration</p>
                <p className="text-muted-foreground text-xs">
                  On macOS: <code className="bg-muted px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                </p>
                <p className="text-muted-foreground text-xs">
                  On Windows: <code className="bg-muted px-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">2. Add this configuration:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(claudeConfig, 'Claude config')}
                  >
                    {copied === 'Claude config' ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-40 border rounded-md bg-muted/50">
                  <pre className="p-3 text-xs font-mono">{claudeConfig}</pre>
                </ScrollArea>
              </div>
              {!existingKey && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Generate an MCP API Key above first!</span>
                </div>
              )}
              <div className="text-sm">
                <p className="font-medium">3. Restart Claude Desktop</p>
                <p className="text-muted-foreground text-xs">
                  Your flows will appear as available tools in Claude
                </p>
              </div>
            </TabsContent>

            <TabsContent value="schema" className="mt-4 space-y-4">
              <div className="text-sm space-y-2">
                <p className="font-medium">Input Schema Preview</p>
                <p className="text-muted-foreground text-xs">
                  This is how AI agents will see your flow's input parameters
                </p>
              </div>
              <ScrollArea className="h-48 border rounded-md bg-muted/50">
                <pre className="p-3 text-xs font-mono">{inputSchemaPreview}</pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileJson className="h-3.5 w-3.5" />
                Define parameters in the API Endpoint tab to customize this schema
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">How It Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Generate API Key</p>
                <p className="text-muted-foreground text-xs">
                  Create your personal MCP API key above to authenticate
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">AI Agent Connects</p>
                <p className="text-muted-foreground text-xs">
                  Claude, Cursor, Windsurf or any MCP client uses your key to authenticate
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Your Flows Discovered</p>
                <p className="text-muted-foreground text-xs">
                  The agent discovers only YOUR MCP-enabled flows as callable tools
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Flow Executed</p>
                <p className="text-muted-foreground text-xs">
                  When the agent calls a tool, your flow runs server-side and returns results
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
