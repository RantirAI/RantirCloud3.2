import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Copy,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  Rocket,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Check,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeploymentData } from './FlowDeploymentManager';

interface EndpointConfigurationProps {
  deploymentData: DeploymentData | null;
  webhookUrl: string | null;
  isDeploying: boolean;
  onDeploy: (config: Partial<DeploymentData>) => Promise<void>;
  onUndeploy: () => Promise<void>;
  onUpdateConfig: (config: Partial<DeploymentData>) => Promise<void>;
}

interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: string;
  in: 'query' | 'body' | 'header';
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function EndpointConfiguration({
  deploymentData,
  webhookUrl,
  isDeploying,
  onDeploy,
  onUndeploy,
  onUpdateConfig,
}: EndpointConfigurationProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [parametersOpen, setParametersOpen] = useState(false);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  
  // Local state for configuration
  const [allowedMethods, setAllowedMethods] = useState<string[]>(['POST']);
  const [apiDescription, setApiDescription] = useState('');
  const [parameters, setParameters] = useState<ApiParameter[]>([]);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [rateLimitRequests, setRateLimitRequests] = useState(100);
  const [rateLimitWindow, setRateLimitWindow] = useState(60);

  useEffect(() => {
    if (deploymentData) {
      setAllowedMethods(deploymentData.allowed_methods || ['POST']);
      setApiDescription(deploymentData.api_description || '');
      setParameters((deploymentData.api_parameters as ApiParameter[]) || []);
      setRateLimitEnabled(deploymentData.rate_limit_enabled || false);
      setRateLimitRequests(deploymentData.rate_limit_requests || 100);
      setRateLimitWindow(deploymentData.rate_limit_window_seconds || 60);
    }
  }, [deploymentData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  const toggleMethod = (method: string) => {
    setAllowedMethods(prev => 
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const addParameter = () => {
    setParameters(prev => [
      ...prev,
      {
        name: '',
        type: 'string',
        required: false,
        description: '',
        in: 'body',
      },
    ]);
  };

  const updateParameter = (index: number, updates: Partial<ApiParameter>) => {
    setParameters(prev => 
      prev.map((p, i) => i === index ? { ...p, ...updates } : p)
    );
  };

  const removeParameter = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveConfig = async () => {
    await onUpdateConfig({
      allowed_methods: allowedMethods,
      api_description: apiDescription,
      api_parameters: parameters as any,
      rate_limit_enabled: rateLimitEnabled,
      rate_limit_requests: rateLimitRequests,
      rate_limit_window_seconds: rateLimitWindow,
      primary_endpoint_type: 'api',
    });
  };

  const handleDeploy = async () => {
    await onDeploy({
      allowed_methods: allowedMethods,
      api_description: apiDescription,
      api_parameters: parameters as any,
      rate_limit_enabled: rateLimitEnabled,
      rate_limit_requests: rateLimitRequests,
      rate_limit_window_seconds: rateLimitWindow,
      primary_endpoint_type: 'api',
    });
  };

  return (
    <div className="space-y-4">
      {/* Endpoint URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            API Endpoint
          </CardTitle>
          <CardDescription>
            Deploy your flow as a REST API endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deploymentData?.is_deployed && webhookUrl ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 bg-muted rounded-md border font-mono text-xs truncate">
                    {webhookUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => copyToClipboard(webhookUrl, 'URL')}
                  >
                    {copied === 'URL' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(webhookUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {deploymentData.webhook_secret && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    API Secret
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2.5 bg-muted rounded-md border font-mono text-xs truncate">
                      {showSecret ? deploymentData.webhook_secret : '••••••••••••••••••••'}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(deploymentData.webhook_secret!, 'Secret')}
                    >
                      {copied === 'Secret' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Rocket className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Configure and deploy your endpoint below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HTTP Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Allowed HTTP Methods</CardTitle>
          <CardDescription>
            Select which HTTP methods this endpoint accepts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {HTTP_METHODS.map(method => (
              <Badge
                key={method}
                variant={allowedMethods.includes(method) ? 'default' : 'outline'}
                className="cursor-pointer select-none px-3 py-1"
                onClick={() => toggleMethod(method)}
              >
                {method}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Description</CardTitle>
          <CardDescription>
            Describe what this API endpoint does
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={apiDescription}
            onChange={(e) => setApiDescription(e.target.value)}
            placeholder="This endpoint handles incoming requests and..."
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Parameters Configuration */}
      <Collapsible open={parametersOpen} onOpenChange={setParametersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">API Parameters</CardTitle>
                  <CardDescription>
                    Define the parameters this endpoint accepts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {parameters.length > 0 && (
                    <Badge variant="secondary">{parameters.length}</Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${parametersOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {parameters.map((param, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={param.name}
                        onChange={(e) => updateParameter(index, { name: e.target.value })}
                        placeholder="parameter_name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={param.type}
                        onValueChange={(value: any) => updateParameter(index, { type: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Select
                        value={param.in}
                        onValueChange={(value: any) => updateParameter(index, { in: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="query">Query Parameter</SelectItem>
                          <SelectItem value="body">Request Body</SelectItem>
                          <SelectItem value="header">Header</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={param.required}
                          onCheckedChange={(checked) => updateParameter(index, { required: checked })}
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={param.description}
                      onChange={(e) => updateParameter(index, { description: e.target.value })}
                      placeholder="Describe this parameter..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addParameter}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Rate Limiting */}
      <Collapsible open={rateLimitOpen} onOpenChange={setRateLimitOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Rate Limiting</CardTitle>
                  <CardDescription>
                    Protect your API from abuse
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {rateLimitEnabled && (
                    <Badge variant="secondary">{rateLimitRequests}/{rateLimitWindow}s</Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${rateLimitOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Rate Limiting</Label>
                  <p className="text-xs text-muted-foreground">Limit the number of requests</p>
                </div>
                <Switch
                  checked={rateLimitEnabled}
                  onCheckedChange={setRateLimitEnabled}
                />
              </div>
              {rateLimitEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Max Requests</Label>
                    <Input
                      type="number"
                      value={rateLimitRequests}
                      onChange={(e) => setRateLimitRequests(parseInt(e.target.value) || 100)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Window (seconds)</Label>
                    <Input
                      type="number"
                      value={rateLimitWindow}
                      onChange={(e) => setRateLimitWindow(parseInt(e.target.value) || 60)}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex gap-2">
        {deploymentData?.is_deployed ? (
          <>
            <Button 
              className="flex-1" 
              onClick={handleDeploy}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Redeploy
            </Button>
            <Button 
              variant="outline"
              onClick={handleSaveConfig}
            >
              Save Config
            </Button>
            <Button 
              variant="outline"
              onClick={onUndeploy}
              disabled={isDeploying}
            >
              Undeploy
            </Button>
          </>
        ) : (
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleDeploy}
            disabled={isDeploying}
          >
            {isDeploying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Deploy API Endpoint
          </Button>
        )}
      </div>
    </div>
  );
}
