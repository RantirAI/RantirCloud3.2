import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, MessageCircle, Code2, Eye, Plus, Trash2, Rocket, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ChatEmbedConfigurationProps {
  flowProjectId: string;
}

interface QuickLink {
  label: string;
  url: string;
  icon?: string;
}

interface ChatWidgetConfig {
  mode: 'widget' | 'fullpage';
  theme: 'light' | 'dark' | 'transparent' | 'custom';
  accent: string;
  customBg: string;
  title: string;
  welcomeMessage: string;
  position: 'bottom-right' | 'bottom-left';
  showWelcomeScreen: boolean;
  avatarUrl: string;
  brandName: string;
  statusText: string;
  gradientColors: string[];
  quickLinks: QuickLink[];
  askQuestionTitle: string;
  askQuestionSubtitle: string;
  startChatButtonText: string;
}

const DEFAULT_CONFIG: ChatWidgetConfig = {
  mode: 'widget',
  theme: 'light',
  accent: '4A9BD9',
  customBg: '',
  title: 'Chat with us',
  welcomeMessage: 'Hi, Hope you have a great day!',
  position: 'bottom-right',
  showWelcomeScreen: true,
  avatarUrl: '',
  brandName: '',
  statusText: 'Online now',
  gradientColors: ['#4A9BD9', '#74b9ff', '#a29bfe'],
  quickLinks: [],
  askQuestionTitle: 'Ask a question',
  askQuestionSubtitle: 'The AI agent will answer it with blazing speed',
  startChatButtonText: 'Start Chat',
};

export function ChatEmbedConfiguration({ flowProjectId }: ChatEmbedConfigurationProps) {
  const [config, setConfig] = useState<ChatWidgetConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'widget' | 'fullpage'>('widget');
  const [loaded, setLoaded] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'none' | 'active' | 'inactive'>('none');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('flow_projects')
        .select('chat_widget_config')
        .eq('id', flowProjectId)
        .single();

      if (data?.chat_widget_config && typeof data.chat_widget_config === 'object') {
        setConfig({ ...DEFAULT_CONFIG, ...(data.chat_widget_config as Partial<ChatWidgetConfig>) });
      }

      // Load deployment status
      const { data: flowData } = await supabase
        .from('flows')
        .select('status')
        .eq('flow_project_id', flowProjectId)
        .maybeSingle();
      setDeploymentStatus(flowData ? (flowData.status as 'active' | 'inactive') : 'none');

      setLoaded(true);
    };
    loadConfig();
  }, [flowProjectId]);

  // Auto-save config only (no deployment)
  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(async () => {
      const { error } = await supabase
        .from('flow_projects')
        .update({ chat_widget_config: config as any })
        .eq('id', flowProjectId);
      if (error) console.error('Failed to save chat widget config:', error);
    }, 600);
    return () => clearTimeout(timeout);
  }, [config, flowProjectId, loaded]);

  const handleDeploy = async () => {
    setDeploying(true);
    // Save config first
    await supabase.from('flow_projects')
      .update({ chat_widget_config: config as any })
      .eq('id', flowProjectId);
    // Activate in flows table
    const { error } = await supabase.from('flows')
      .upsert({ flow_project_id: flowProjectId, status: 'active' },
               { onConflict: 'flow_project_id' });
    if (error) toast.error('Failed to deploy chat widget');
    else { setDeploymentStatus('active'); toast.success('Chat widget deployed!'); }
    setDeploying(false);
  };

  const handleDeactivate = async () => {
    const { error } = await supabase.from('flows')
      .update({ status: 'inactive' })
      .eq('flow_project_id', flowProjectId);
    if (error) toast.error('Failed to deactivate');
    else { setDeploymentStatus('inactive'); toast.success('Chat widget deactivated'); }
  };

  const updateConfig = useCallback(<K extends keyof ChatWidgetConfig>(key: K, value: ChatWidgetConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const addQuickLink = () => {
    updateConfig('quickLinks', [...config.quickLinks, { label: 'Link', url: '', icon: '' }]);
  };

  const updateQuickLink = (index: number, field: keyof QuickLink, value: string) => {
    const updated = [...config.quickLinks];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig('quickLinks', updated);
  };

  const removeQuickLink = (index: number) => {
    updateConfig('quickLinks', config.quickLinks.filter((_, i) => i !== index));
  };

  // Use chatwidget.rantir.cloud custom domain (proxied via Cloudflare worker to Supabase edge function)
  const chatBaseUrl = 'https://chatwidget.rantir.cloud';

  const buildQueryParams = (modeOverride?: 'widget' | 'fullpage') => {
    const params = new URLSearchParams();
    params.set('flow', flowProjectId);
    params.set('mode', modeOverride || config.mode);
    params.set('theme', config.theme);
    params.set('accent', config.accent);
    if (config.title) params.set('title', config.title);
    if (config.welcomeMessage) params.set('welcome', config.welcomeMessage);
    if (config.theme === 'custom' && config.customBg) params.set('bg', config.customBg);
    params.set('ws', config.showWelcomeScreen ? '1' : '0');
    if (config.avatarUrl) params.set('avatar', config.avatarUrl);
    if (config.brandName) params.set('brand', config.brandName);
    if (config.statusText) params.set('status', config.statusText);
    if (config.gradientColors.length) params.set('gradient', config.gradientColors.join(','));
    if (config.quickLinks.length) params.set('links', JSON.stringify(config.quickLinks));
    if (config.askQuestionTitle) params.set('aqTitle', config.askQuestionTitle);
    if (config.askQuestionSubtitle) params.set('aqSub', config.askQuestionSubtitle);
    if (config.startChatButtonText) params.set('startBtn', config.startChatButtonText);
    return params.toString();
  };

  const buildPreviewUrl = (modeOverride?: 'widget' | 'fullpage') => {
    if (!flowProjectId) return '';
    return `${window.location.origin}/embed/chat/${flowProjectId}?${buildQueryParams(modeOverride)}`;
  };

  const buildEmbedUrl = () => {
    if (!flowProjectId) return '';
    return `${chatBaseUrl}?${buildQueryParams()}`;
  };

  const generateEmbedCode = () => {
    if (!flowProjectId) return 'No flow project found.';
    const embedUrl = `${chatBaseUrl}?${buildQueryParams()}`;

    if (config.mode === 'widget') {
      return `<script>
(function(){
  function init(){
    var d=document,s=d.createElement('iframe');
    s.src='${embedUrl}';
    s.style.cssText='border:none;position:fixed;bottom:0;${config.position === 'bottom-left' ? 'left:0' : 'right:0'};width:400px;height:560px;z-index:2147483647;background:transparent;pointer-events:none;';
    s.allow='clipboard-write';
    s.scrolling='no';
    s.allowTransparency=true;
    s.frameBorder='0';
    s.onload=function(){s.style.pointerEvents='auto'};
    d.body.appendChild(s);
  }
  if(document.body){init()}
  else if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}
  else{init()}
})();
</script>`;
    }

    return `<iframe
  src="${embedUrl}"
  width="100%"
  height="100%"
  style="border:none;min-height:500px"
  allow="clipboard-write"
></iframe>`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Embed code copied!');
  };

  const openPreview = () => {
    setPreviewMode(config.mode);
    setShowPreview(true);
  };

  return (
    <div className="space-y-4">
      {deploymentStatus === 'none' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">Not deployed</p>
                <p className="text-[10px] text-muted-foreground">Configure your widget, then deploy to make it live.</p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={handleDeploy} disabled={deploying}>
              {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Deploy
            </Button>
          </CardContent>
        </Card>
      )}

      {deploymentStatus === 'active' && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-green-700">Chat Widget is Live</p>
                <Badge variant="success" className="text-[10px] h-5">Active</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="gap-1.5" onClick={handleDeploy} disabled={deploying} variant="outline">
                {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Re-deploy
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleDeactivate}>
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deploymentStatus === 'inactive' && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 shrink-0" />
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-yellow-700">Chat Widget is Inactive</p>
                <Badge variant="warning" className="text-[10px] h-5">Inactive</Badge>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={handleDeploy} disabled={deploying}>
              {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Re-activate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Basic Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Widget Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Mode</Label>
              <Select value={config.mode} onValueChange={(v: 'widget' | 'fullpage') => updateConfig('mode', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="widget">Corner Widget</SelectItem>
                  <SelectItem value="fullpage">Full Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Theme</Label>
              <Select value={config.theme} onValueChange={(v: any) => updateConfig('theme', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {config.theme === 'custom' && (
            <div className="space-y-2">
              <Label className="text-xs">Custom Background</Label>
              <Input value={config.customBg} onChange={e => updateConfig('customBg', e.target.value)} placeholder="e.g. ff5733 or linear-gradient(...)" className="h-9 text-xs" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Accent Color</Label>
              <div className="flex gap-2">
                <div className="w-9 h-9 rounded-md border shrink-0" style={{ backgroundColor: `#${config.accent}` }} />
                <Input value={config.accent} onChange={e => updateConfig('accent', e.target.value.replace('#', ''))} className="h-9 text-xs font-mono" />
              </div>
            </div>
            {config.mode === 'widget' && (
              <div className="space-y-2">
                <Label className="text-xs">Position</Label>
                <Select value={config.position} onValueChange={(v: any) => updateConfig('position', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Widget Title</Label>
            <Input value={config.title} onChange={e => updateConfig('title', e.target.value)} className="h-9 text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Avatar / Logo URL</Label>
            <Input value={config.avatarUrl} onChange={e => updateConfig('avatarUrl', e.target.value)} placeholder="https://example.com/logo.png" className="h-9 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Brand Name</Label>
              <Input value={config.brandName} onChange={e => updateConfig('brandName', e.target.value)} placeholder="Your Company" className="h-9 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status Text</Label>
              <Input value={config.statusText} onChange={e => updateConfig('statusText', e.target.value)} placeholder="Online now" className="h-9 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Screen */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Welcome Screen</CardTitle>
            <Switch checked={config.showWelcomeScreen} onCheckedChange={(v) => updateConfig('showWelcomeScreen', v)} />
          </div>
          <CardDescription className="text-[10px]">Show a branded welcome screen before the chat</CardDescription>
        </CardHeader>
        {config.showWelcomeScreen && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Welcome Message</Label>
              <Textarea value={config.welcomeMessage} onChange={e => updateConfig('welcomeMessage', e.target.value)} className="text-xs min-h-[50px] resize-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Gradient Colors (comma-separated hex)</Label>
              <Input
                value={config.gradientColors.join(', ')}
                onChange={e => updateConfig('gradientColors', e.target.value.split(',').map(c => c.trim()))}
                placeholder="#4A9BD9, #74b9ff, #a29bfe"
                className="h-9 text-xs font-mono"
              />
              <div className="h-6 rounded-md" style={{ background: `linear-gradient(135deg, ${config.gradientColors.join(', ')})` }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">CTA Title</Label>
                <Input value={config.askQuestionTitle} onChange={e => updateConfig('askQuestionTitle', e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">CTA Subtitle</Label>
                <Input value={config.askQuestionSubtitle} onChange={e => updateConfig('askQuestionSubtitle', e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Start Chat Button Text</Label>
              <Input value={config.startChatButtonText} onChange={e => updateConfig('startChatButtonText', e.target.value)} className="h-9 text-xs" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Quick Links</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addQuickLink}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          <CardDescription className="text-[10px]">Buttons shown on the welcome screen</CardDescription>
        </CardHeader>
        {config.quickLinks.length > 0 && (
          <CardContent className="space-y-3">
            {config.quickLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={link.label} onChange={e => updateQuickLink(i, 'label', e.target.value)} placeholder="Label" className="h-8 text-xs flex-1" />
                <Input value={link.url} onChange={e => updateQuickLink(i, 'url', e.target.value)} placeholder="https://..." className="h-8 text-xs flex-[2]" />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => removeQuickLink(i)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Preview */}
      <Button onClick={openPreview} variant="outline" className="w-full gap-2">
        <Eye className="h-4 w-4" /> Preview Widget
      </Button>

      {/* Embed Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" /> Embed Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[200px]">
              {generateEmbedCode()}
            </pre>
            <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={copyCode}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-sm">Chat Widget Preview</DialogTitle>
            </div>
            <div className="absolute right-10 top-5 -translate-y-1/2 flex items-center gap-1 z-10">
              <Button size="sm" variant={previewMode === 'widget' ? 'default' : 'ghost'} className="h-6 text-[10px] px-2" onClick={() => setPreviewMode('widget')}>Widget</Button>
              <Button size="sm" variant={previewMode === 'fullpage' ? 'default' : 'ghost'} className="h-6 text-[10px] px-2" onClick={() => setPreviewMode('fullpage')}>Full Page</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 relative overflow-hidden rounded-b-lg">
            {previewMode === 'widget' ? (
              <div className="w-full h-full bg-[hsl(var(--muted))] relative">
                <div className="text-xs text-muted-foreground absolute top-4 left-4">
                  Simulated page — widget appears in the {config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right'} corner
                </div>
                <iframe
                  src={buildPreviewUrl('widget')}
                  className="absolute border-none"
                  style={{
                    width: '400px', height: '560px',
                    background: 'transparent',
                    ...(config.position === 'bottom-left' ? { bottom: '0', left: '0' } : { bottom: '0', right: '0' }),
                  }}
                  allow="clipboard-write"
                  title="Chat Widget Preview"
                />
              </div>
            ) : (
              <iframe src={buildPreviewUrl('fullpage')} className="w-full h-full border-none" allow="clipboard-write" title="Chat Widget Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
