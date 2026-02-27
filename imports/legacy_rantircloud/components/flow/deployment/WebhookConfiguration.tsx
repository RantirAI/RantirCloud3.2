import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  Loader2,
  Rocket,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Check,
  Webhook,
  Settings2,
  AlertCircle,
  Hash,
  Lock,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeploymentData } from './FlowDeploymentManager';
import { WebflowIcon } from '@/components/flow/icons/WebflowIcon';
import { GitHubIcon } from '@/components/app-builder/brand-icons';
import { WebhookTester } from '@/components/flow/webhook/WebhookTester';
import { useFlowStore } from '@/lib/flow-store';

// Provider logo components
const StripeIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#635BFF"/>
    <path d="M11.5 8.5C11.5 7.67 12.26 7.35 13.37 7.35C15.06 7.35 17.17 7.91 18.86 8.82V4.45C17 3.7 15.14 3.4 13.37 3.4C9.56 3.4 6.97 5.45 6.97 8.76C6.97 13.84 14.1 13.07 14.1 15.24C14.1 16.2 13.17 16.52 12 16.52C10.15 16.52 7.8 15.74 5.93 14.71V19.17C8.01 20.08 10.11 20.46 12 20.46C15.9 20.46 18.65 18.47 18.65 15.11C18.64 9.57 11.5 10.52 11.5 8.5Z" fill="white"/>
  </svg>
);

const ShopifyIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15.337 4.267c-.04-.007-.35-.053-.35-.053l-.35-.35s-.243-.243-.65-.243c-.087 0-.18.013-.277.04l-.15-.387c-.23-.6-.633-1.15-1.693-1.15h-.107c-.26-.327-.58-.497-.86-.497-2.12 0-3.137 2.65-3.453 4l-1.487.46c-.463.147-.477.16-.537.6-.047.333-1.267 9.77-1.267 9.77L12.123 19l6.35-1.373s-2.76-12.647-2.8-12.907c-.04-.247-.217-.417-.337-.453zm-2.59.387c-.43.133-.91.28-1.397.433l.003-.167c0-.723-.1-1.3-.26-1.757.65.087 1.073.833 1.297 1.49l.357-.003v.003zm-2.08-1.233c.167.44.277.963.277 1.747 0 .057 0 .107-.003.163-.91.28-1.9.587-2.89.893.56-2.13 1.613-3.157 2.617-2.803zm-.937-.757c.097 0 .193.033.287.093-.603.283-1.257.997-1.67 2.247-.77.237-1.52.47-2.137.66.47-1.563 1.553-3 3.52-3z" fill="#95BF47"/>
    <path d="M14.987 4.213c-.087.027-.187.053-.293.08l-.003.003v-.057c0-.723-.1-1.303-.26-1.76.643.093 1.067.833 1.29 1.493.153-.047.303-.093.437-.14l.357-.003c-.097-.243-.253-.537-.45-.813-.413-.573-.953-.89-1.52-.89h-.107c-.26-.33-.58-.5-.86-.5-2.12 0-3.137 2.653-3.453 4.003l-1.487.46c-.463.147-.477.16-.537.6-.047.333-1.267 9.77-1.267 9.77L12.127 19l6.35-1.373s-2.76-12.647-2.8-12.907c-.04-.247-.217-.417-.337-.453l-.353-.053z" fill="#5E8E3E"/>
    <path d="M11.733 7.847l-.66 2.467s-.73-.33-1.607-.277c-1.273.08-1.287.88-1.273 1.08.07 1.087 2.93 1.323 3.09 3.87.127 2.003-1.063 3.37-2.777 3.48-2.053.133-3.183-1.083-3.183-1.083l.437-1.853s1.133.853 2.037.797c.593-.037.803-.52.783-.86-.09-1.413-2.42-1.33-2.567-3.663-.12-1.963 1.167-3.957 4.017-4.137.917-.057 1.703.173 1.703.173v.003z" fill="white"/>
  </svg>
);

interface WebhookConfigurationProps {
  deploymentData: DeploymentData | null;
  webhookUrl: string | null;
  isDeploying: boolean;
  flowProjectId: string;
  onDeploy: (config: Partial<DeploymentData>) => Promise<void>;
  onUpdateConfig: (config: Partial<DeploymentData>) => Promise<void>;
}

// Provider icon mapping
const getProviderIcon = (value: string, size = 16) => {
  switch (value) {
    case 'webflow':
      return <WebflowIcon size={size} />;
    case 'stripe':
      return <StripeIcon size={size} />;
    case 'github':
      return <GitHubIcon size={size} />;
    case 'shopify':
      return <ShopifyIcon size={size} />;
    case 'generic':
      return <Hash className="w-4 h-4 text-muted-foreground" />;
    case 'custom':
      return <Lock className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const SIGNATURE_PROVIDERS = [
  { value: 'none', label: 'None', description: 'No signature verification' },
  { value: 'generic', label: 'Generic HMAC', description: 'Standard HMAC-SHA256' },
  { value: 'webflow', label: 'Webflow', description: 'Webflow webhook signature' },
  { value: 'stripe', label: 'Stripe', description: 'Stripe webhook signature' },
  { value: 'github', label: 'GitHub', description: 'GitHub webhook signature' },
  { value: 'shopify', label: 'Shopify', description: 'Shopify webhook signature' },
  { value: 'custom', label: 'Custom', description: 'Custom signature header' },
];

const PROVIDER_HELP: Record<string, { secretLabel: string; helpText: string }> = {
  webflow: {
    secretLabel: 'Webflow Signing Key',
    helpText: 'Find this in Webflow Site Settings → Integrations → Webhooks',
  },
  stripe: {
    secretLabel: 'Stripe Webhook Secret',
    helpText: 'Find this in Stripe Dashboard → Developers → Webhooks (starts with whsec_)',
  },
  github: {
    secretLabel: 'GitHub Secret',
    helpText: 'The secret you configured when creating the webhook',
  },
  shopify: {
    secretLabel: 'Shopify Webhook Secret',
    helpText: 'Find this in Shopify Admin → Settings → Notifications',
  },
  generic: {
    secretLabel: 'Webhook Secret',
    helpText: 'The secret key used to sign webhook requests',
  },
  custom: {
    secretLabel: 'Signing Secret',
    helpText: 'Enter the secret key used by your webhook provider',
  },
};

export function WebhookConfiguration({
  deploymentData,
  webhookUrl,
  isDeploying,
  flowProjectId,
  onDeploy,
  onUpdateConfig,
}: WebhookConfigurationProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [showExternalSecret, setShowExternalSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [signatureSettingsOpen, setSignatureSettingsOpen] = useState(false);
  const [showWebhookTester, setShowWebhookTester] = useState(false);
  const [samplePayload, setSamplePayload] = useState<any>(null);
  
  // Get flow store to update the webhook-trigger node
  const { nodes, updateNode } = useFlowStore();
  
  // Find the webhook-trigger node
  const webhookTriggerNode = nodes.find(n => n.data?.type === 'webhook-trigger');

  // Local state
  const [signatureProvider, setSignatureProvider] = useState('none');
  const [externalSecret, setExternalSecret] = useState('');
  const [customHeaderName, setCustomHeaderName] = useState('');

  useEffect(() => {
    if (deploymentData) {
      setSignatureProvider(deploymentData.signature_provider || 'none');
      setExternalSecret(deploymentData.external_webhook_secret || '');
      setCustomHeaderName(deploymentData.signature_header_name || '');
    }
  }, [deploymentData]);

  // Initialize samplePayload from the webhook-trigger node's saved data
  useEffect(() => {
    if (webhookTriggerNode?.data?.inputs?.samplePayload && !samplePayload) {
      setSamplePayload(webhookTriggerNode.data.inputs.samplePayload);
    }
  }, [webhookTriggerNode]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  const handleSaveSignatureConfig = async () => {
    await onUpdateConfig({
      signature_provider: signatureProvider,
      external_webhook_secret: externalSecret || null,
      signature_header_name: customHeaderName || null,
      primary_endpoint_type: 'webhook',
    });
  };

  const handleDeploy = async () => {
    await onDeploy({
      signature_provider: signatureProvider,
      external_webhook_secret: externalSecret || null,
      signature_header_name: customHeaderName || null,
      primary_endpoint_type: 'webhook',
    });
  };

  const providerHelp = PROVIDER_HELP[signatureProvider];

  const handleRegenerateSecret = async () => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const newSecret = 'rflow_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    
    await onUpdateConfig({ webhook_secret: newSecret } as any);
    toast.success('Secret regenerated');
  };

  return (
    <div className="space-y-4">
      {/* Webhook URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            Webhook Handler
          </CardTitle>
          <CardDescription>
            Receive webhooks from external services like Webflow, Stripe, GitHub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deploymentData?.is_deployed && webhookUrl ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Internal Webhook Secret
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleRegenerateSecret}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerate
                    </Button>
                  </div>
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

              {/* Test Webhook Button */}
              {deploymentData?.is_deployed && webhookUrl && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => setShowWebhookTester(true)}
                  >
                    <Radio className="h-4 w-4 mr-2 text-emerald-500" />
                    Test Webhook
                  </Button>
                  {samplePayload && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Sample payload captured</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Deploy to receive webhooks from external services</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Verification */}
      <Collapsible open={signatureSettingsOpen} onOpenChange={setSignatureSettingsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    External Provider Verification
                  </CardTitle>
                  <CardDescription>
                    Verify signatures from webhook providers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {signatureProvider !== 'none' && (
                    <Badge variant="secondary" className="flex items-center gap-1.5">
                      {getProviderIcon(signatureProvider, 14)}
                      {SIGNATURE_PROVIDERS.find(p => p.value === signatureProvider)?.label}
                    </Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${signatureSettingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Provider Select */}
              <div className="space-y-2">
                <Label className="text-sm">Provider</Label>
                <Select value={signatureProvider} onValueChange={setSignatureProvider}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(signatureProvider, 16)}
                        <span>{SIGNATURE_PROVIDERS.find(p => p.value === signatureProvider)?.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNATURE_PROVIDERS.map(provider => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div className="flex items-center gap-2">
                          {getProviderIcon(provider.value, 16)}
                          <div className="flex flex-col">
                            <span>{provider.label}</span>
                            <span className="text-xs text-muted-foreground">{provider.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {signatureProvider !== 'none' && (
                <>
                  {/* External Secret Input */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {providerHelp?.secretLabel || 'Webhook Secret'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showExternalSecret ? 'text' : 'password'}
                        value={externalSecret}
                        onChange={(e) => setExternalSecret(e.target.value)}
                        placeholder="Enter the provider's webhook secret"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowExternalSecret(!showExternalSecret)}
                      >
                        {showExternalSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {providerHelp && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        {providerHelp.helpText}
                      </p>
                    )}
                  </div>

                  {/* Custom Header Name */}
                  {signatureProvider === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-sm">Custom Header Name</Label>
                      <Input
                        value={customHeaderName}
                        onChange={(e) => setCustomHeaderName(e.target.value)}
                        placeholder="X-Custom-Signature"
                      />
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleSaveSignatureConfig}
                  >
                    Save Signature Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">1</span>
              <span>Deploy this flow to get your webhook URL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">2</span>
              <span>Copy the URL and paste it in your external service's webhook settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">3</span>
              <span>Configure signature verification for security (recommended)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">4</span>
              <span>Use the Webhook Trigger node to access incoming data</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
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
        {deploymentData?.is_deployed ? 'Redeploy Webhook Handler' : 'Deploy Webhook Handler'}
      </Button>

      {/* Webhook Tester Modal */}
      <WebhookTester
        isOpen={showWebhookTester}
        onClose={() => setShowWebhookTester(false)}
        flowProjectId={flowProjectId}
        webhookUrl={webhookUrl}
        currentPayload={samplePayload}
        onPayloadCapture={(payload, selectedFields) => {
          setSamplePayload(payload);
          
          // Save the payload AND selected fields to the webhook-trigger node
          if (webhookTriggerNode) {
            updateNode(webhookTriggerNode.id, {
              inputs: {
                ...webhookTriggerNode.data.inputs,
                samplePayload: payload,
                selectedPayloadFields: selectedFields || null
              }
            });
          }
          
          toast.success('Payload saved - variables are now available for binding');
        }}
      />
    </div>
  );
}
