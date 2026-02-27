import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Rocket, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Shield,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Webhook,
  Code2,
} from 'lucide-react';

interface FlowDeploymentPanelProps {
  flowProjectId: string;
  flowName: string;
  onDeploymentChange?: () => void;
}

interface DeploymentData {
  is_deployed: boolean;
  endpoint_slug: string | null;
  webhook_secret: string | null;
  deployment_status: string;
  last_deployed_at: string | null;
  deployed_version: number | null;
}

export function FlowDeploymentPanel({ 
  flowProjectId, 
  flowName,
  onDeploymentChange 
}: FlowDeploymentPanelProps) {
  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [requireSignature, setRequireSignature] = useState(true);

  const supabaseUrl = 'https://appdmmjexevclmpyvtss.supabase.co';
  
  useEffect(() => {
    loadDeploymentData();
  }, [flowProjectId]);

  const loadDeploymentData = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_projects')
        .select('is_deployed, endpoint_slug, webhook_secret, deployment_status, last_deployed_at, deployed_version')
        .eq('id', flowProjectId)
        .single();

      if (error) throw error;
      setDeploymentData(data);
    } catch (error) {
      console.error('Failed to load deployment data:', error);
    } finally {
      setIsLoading(false);
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

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      // Get current flow data version
      const { data: flowData, error: flowDataError } = await supabase
        .from('flow_data')
        .select('id, version')
        .eq('flow_project_id', flowProjectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (flowDataError) throw flowDataError;

      // Mark current version as published
      await supabase
        .from('flow_data')
        .update({ is_published: true })
        .eq('id', flowData.id);

      // Generate endpoint slug and secret if not exists
      const slug = deploymentData?.endpoint_slug || generateSlug(flowName);
      const secret = deploymentData?.webhook_secret || (requireSignature ? generateSecret() : null);

      // Update flow project deployment info
      const { error: updateError } = await supabase
        .from('flow_projects')
        .update({
          is_deployed: true,
          endpoint_slug: slug,
          webhook_secret: secret,
          deployment_status: 'deployed',
          last_deployed_at: new Date().toISOString(),
          deployed_version: flowData.version,
        })
        .eq('id', flowProjectId);

      if (updateError) throw updateError;

      toast.success('Flow deployed successfully!');
      await loadDeploymentData();
      onDeploymentChange?.();
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
      onDeploymentChange?.();
    } catch (error: any) {
      toast.error(`Failed to undeploy: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRegenerateSecret = async () => {
    try {
      const newSecret = generateSecret();
      
      const { error } = await supabase
        .from('flow_projects')
        .update({ webhook_secret: newSecret })
        .eq('id', flowProjectId);

      if (error) throw error;

      toast.success('Webhook secret regenerated');
      await loadDeploymentData();
    } catch (error: any) {
      toast.error(`Failed to regenerate secret: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const webhookUrl = deploymentData?.endpoint_slug 
    ? `${supabaseUrl}/functions/v1/flow-executor/${deploymentData.endpoint_slug}`
    : null;

  const getStatusBadge = () => {
    if (!deploymentData) return null;
    
    switch (deploymentData.deployment_status) {
      case 'deployed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Deployed
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {deploymentData.deployment_status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Deployment Status</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Deploy your flow as an API endpoint or webhook handler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deploymentData?.is_deployed ? (
            <>
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Webhook className="w-4 h-4" />
                  Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl || ''} 
                    readOnly 
                    className="font-mono text-xs bg-muted"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => webhookUrl && copyToClipboard(webhookUrl, 'Webhook URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Webhook Secret */}
              {deploymentData.webhook_secret && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Webhook Secret
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      type={showSecret ? 'text' : 'password'}
                      value={deploymentData.webhook_secret} 
                      readOnly 
                      className="font-mono text-xs bg-muted"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(deploymentData.webhook_secret!, 'Secret')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={handleRegenerateSecret}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate Secret
                  </Button>
                </div>
              )}

              <Separator />

              {/* Deployment Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">v{deploymentData.deployed_version || 1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Deployed</p>
                  <p className="font-medium">
                    {deploymentData.last_deployed_at 
                      ? new Date(deploymentData.last_deployed_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="flex-1"
                >
                  {isDeploying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Redeploy
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleUndeploy}
                  disabled={isDeploying}
                >
                  Undeploy
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Pre-deployment Settings */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Signature Validation</Label>
                  <p className="text-xs text-muted-foreground">
                    Verify X-Webhook-Signature header for security
                  </p>
                </div>
                <Switch 
                  checked={requireSignature}
                  onCheckedChange={setRequireSignature}
                />
              </div>

              <Button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className="w-full"
                size="lg"
              >
                {isDeploying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                Deploy Flow
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Example */}
      {deploymentData?.is_deployed && webhookUrl && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Usage Example</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\${deploymentData.webhook_secret ? `
  -H "X-Webhook-Signature: sha256=..." \\` : ''}
  -d '{"data": "your payload"}'`}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
