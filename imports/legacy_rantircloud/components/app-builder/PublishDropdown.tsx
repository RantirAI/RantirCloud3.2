import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Rocket, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe,
  Plus,
  FileCode,
  ChevronDown,
  Loader2,
  CheckCircle2,
  LockKeyhole,
  ImageIcon,
  Upload,
  X,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { useUserComponents } from '@/hooks/useUserComponent';
import { generateProject } from '@/lib/reactCodeGenerator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CustomDomainSetup, type CustomDomainData } from './publish/CustomDomainSetup';

interface PublishDropdownProps {
  projectId?: string;
  projectName?: string;
}

interface PublishedApp {
  id: string;
  slug: string;
  custom_domain?: string;
  status: string;
  access_type: 'public' | 'password';
  favicon_url?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  updated_at?: string;
}

export function PublishDropdown({ projectId, projectName }: PublishDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'publish' | 'export'>('publish');
  const [isPublished, setIsPublished] = useState(false);
  const [publishedApp, setPublishedApp] = useState<PublishedApp | null>(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [customDomainData, setCustomDomainData] = useState<CustomDomainData | null>(null);
  
  // Website info fields
  const [websiteInfoOpen, setWebsiteInfoOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingOgImage, setIsUploadingOgImage] = useState(false);
  
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  
  const { currentProject } = useAppBuilderStore();
  const { classes } = useClassStore();
  const { components: userComponents } = useUserComponents(currentProject?.id);

  const baseUrl = 'rantir.cloud';
  const publishedUrl = subdomain ? `${subdomain}.${baseUrl}` : '';
  const maxDescriptionLength = 150;

  useEffect(() => {
    if (projectId && open) {
      loadPublishedApp();
    }
  }, [projectId, open]);

  useEffect(() => {
    if (projectName && !subdomain && !publishedApp) {
      setSubdomain(projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32));
    }
  }, [projectName, subdomain, publishedApp]);

  const isUuidSlug = (slug: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  };

  const generateFriendlySlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'app';
  };

  const loadPublishedApp = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('published_apps')
        .select('*')
        .eq('app_project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPublishedApp(data as PublishedApp);
        setIsPublished(data.status === 'published');
        setIsPasswordProtected(data.access_type === 'password');
        
        if (isUuidSlug(data.slug) && projectName) {
          setSubdomain(generateFriendlySlug(projectName));
        } else {
          setSubdomain(data.slug);
        }
        
        // Load website info
        setMetaTitle(data.meta_title || '');
        setMetaDescription(data.meta_description || '');
        setFaviconUrl(data.favicon_url || '');
        setOgImageUrl(data.og_image_url || '');
        
        // Load custom domains
        if (data.id) {
          const { data: domains } = await supabase
            .from('custom_domains')
            .select('*')
            .eq('published_app_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (domains && domains.length > 0) {
            const domain = domains[0];
            setCustomDomainData({
              id: domain.id,
              domain: domain.domain,
              verification_token: domain.verification_token,
              verification_status: domain.verification_status as 'pending' | 'verified' | 'failed',
              dns_verified: domain.dns_verified,
              ssl_status: domain.ssl_status as 'pending' | 'provisioning' | 'active' | 'failed',
            });
            setShowCustomDomain(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading published app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File, type: 'favicon' | 'og-image'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingFavicon(true);
    const url = await uploadImage(file, 'favicon');
    if (url) setFaviconUrl(url);
    setIsUploadingFavicon(false);
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingOgImage(true);
    const url = await uploadImage(file, 'og-image');
    if (url) setOgImageUrl(url);
    setIsUploadingOgImage(false);
  };

  const handlePublish = async () => {
    if (!projectId || !subdomain) return;
    setIsPublishing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('publish-app', {
        body: {
          appProjectId: projectId,
          slug: subdomain,
          accessType: isPasswordProtected ? 'password' : 'public',
          password: isPasswordProtected ? password : undefined,
          faviconUrl: faviconUrl || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          ogImageUrl: ogImageUrl || undefined,
        }
      });

      if (error) throw error;

      setPublishedApp(data.publishedApp);
      setIsPublished(true);
      toast.success('App published successfully!', {
        description: `Live at ${subdomain}.${baseUrl}`
      });
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Failed to publish app');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copied to clipboard');
  };

  const openPublishedApp = () => {
    window.open(`https://${publishedUrl}`, '_blank');
  };

  const { config: designSystemConfig } = useDesignSystemStore();
  const generatedProject = useMemo(() => {
    if (!currentProject) return null;
    return generateProject(currentProject.pages, classes, userComponents, designSystemConfig || undefined);
  }, [currentProject, classes, userComponents, designSystemConfig]);

  const handleExport = async (format: 'react' | 'html' | 'astro') => {
    if (!generatedProject) return;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const projectFileName = projectName?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'project';
      
      generatedProject.files.forEach(file => {
        zip.file(file.path, file.content);
      });
      
      if (format === 'html') {
        zip.file('README.md', `# ${projectName || 'Project'}\n\nThis project was exported as static HTML.`);
      } else if (format === 'astro') {
        zip.file('astro.config.mjs', `import { defineConfig } from 'astro/config';\nimport react from '@astrojs/react';\n\nexport default defineConfig({\n  integrations: [react()]\n});`);
      }
      
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectFileName}-${format}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Project exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export project');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          size="sm"
          className="h-7 px-2 text-xs font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 gap-1"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span>Publish</span>
          {isPublished && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px] bg-white/20 text-white border-0">
              Live
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={8}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'publish' | 'export')} className="w-full">
          <div className="px-4 pt-3 pb-2 border-b bg-muted/30">
            <TabsList className="w-full h-8 p-1 bg-muted/50">
              <TabsTrigger value="publish" className="flex-1 text-xs gap-1.5 h-6 data-[state=active]:bg-background">
                <Rocket className="h-3.5 w-3.5" />
                Publish
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1 text-xs gap-1.5 h-6 data-[state=active]:bg-background">
                <Download className="h-3.5 w-3.5" />
                Export
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="publish" className="p-4 space-y-4 mt-0 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Status indicator */}
                {isPublished && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">App is live</p>
                        {publishedApp?.updated_at && (
                          <span className="text-[9px] text-emerald-600/60 dark:text-emerald-500/60">
                            • Last published {new Date(publishedApp.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 truncate">
                        {publishedUrl}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`https://${publishedUrl}`)}
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-500 dark:hover:bg-emerald-900/50"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openPublishedApp}
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-500 dark:hover:bg-emerald-900/50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Domain Section */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Published URL</Label>
                    <div className="flex">
                      <Input
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="my-app"
                        className="h-9 text-sm rounded-r-none border-r-0 font-mono"
                      />
                      <div className="h-9 px-3 flex items-center bg-muted border border-l-0 rounded-r-md text-xs text-muted-foreground font-mono">
                        .{baseUrl}
                      </div>
                    </div>
                  </div>
                  
                  {!showCustomDomain ? (
                    <button
                      onClick={() => setShowCustomDomain(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add custom domain
                    </button>
                  ) : (
                    <CustomDomainSetup
                      publishedAppId={publishedApp?.id}
                      existingDomain={customDomainData}
                      onDomainAdded={(data) => {
                        setCustomDomainData(data);
                      }}
                      onDomainRemoved={() => {
                        setCustomDomainData(null);
                        setShowCustomDomain(false);
                      }}
                      onVerificationComplete={(data) => {
                        setCustomDomainData(data);
                      }}
                      addDomain={async (publishedAppId, domain) => {
                        const { data, error } = await supabase.functions.invoke('manage-domains', {
                          body: { publishedAppId, domain, action: 'add' }
                        });
                        if (error) return { success: false, error: error.message };
                        if (!data?.success) return { success: false, error: data?.error || 'Failed to add domain' };
                        return { success: true, data: data.customDomain };
                      }}
                      verifyDomain={async (domain) => {
                        const { data, error } = await supabase.functions.invoke('manage-domains', {
                          body: { publishedAppId: publishedApp?.id, domain, action: 'verify' }
                        });
                        if (error) return { success: false, error: error.message };
                        if (!data?.success) return { success: false, error: data?.error || 'Verification failed' };
                        return { success: true, data: data.customDomain };
                      }}
                      removeDomain={async (publishedAppId, domain) => {
                        const { error } = await supabase.functions.invoke('manage-domains', {
                          body: { publishedAppId, domain, action: 'remove' }
                        });
                        if (error) return { success: false, error: error.message };
                        return { success: true };
                      }}
                    />
                  )}
                </div>

                <Separator />
                
                {/* Who can visit */}
                <div className="space-y-3">
                  <div 
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer",
                      isPasswordProtected ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center",
                        isPasswordProtected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <LockKeyhole className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Password Protection</p>
                        <p className="text-[10px] text-muted-foreground">Require a password to access</p>
                      </div>
                    </div>
                    <Switch
                      checked={isPasswordProtected}
                      onCheckedChange={setIsPasswordProtected}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {isPasswordProtected && (
                    <div className="pl-3 border-l-2 border-primary/30 ml-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter access password"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />
                
                {/* Website Info Section */}
                <Collapsible open={websiteInfoOpen} onOpenChange={setWebsiteInfoOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Website Info</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      websiteInfoOpen && "rotate-180"
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    {/* Icon & Title */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Icon & Title</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">The favicon and title shown in browser tabs</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <div 
                          className="h-10 w-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden shrink-0"
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          {isUploadingFavicon ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : faviconUrl ? (
                            <img src={faviconUrl} alt="Favicon" className="h-6 w-6 object-contain" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*,.ico,.svg"
                          className="hidden"
                          onChange={handleFaviconUpload}
                        />
                        <Input
                          value={metaTitle}
                          onChange={(e) => setMetaTitle(e.target.value)}
                          placeholder={projectName || 'App Title'}
                          className="h-10 text-sm flex-1"
                        />
                        {faviconUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => setFaviconUrl('')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Shown in search results and social shares</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {metaDescription.length} / {maxDescriptionLength}
                        </span>
                      </div>
                      <Textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value.slice(0, maxDescriptionLength))}
                        placeholder="A brief description of your app..."
                        className="text-sm resize-none min-h-[60px]"
                        rows={2}
                      />
                    </div>

                    {/* Share Image (OG Image) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Share Image</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Image shown when sharing on social media</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div 
                        className={cn(
                          "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer overflow-hidden",
                          ogImageUrl ? "border-transparent" : "border-muted-foreground/30 hover:border-primary/50"
                        )}
                        onClick={() => ogImageInputRef.current?.click()}
                      >
                        {isUploadingOgImage ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : ogImageUrl ? (
                          <div className="relative aspect-video">
                            <img src={ogImageUrl} alt="OG Image" className="w-full h-full object-cover rounded-lg" />
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute top-2 right-2 h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOgImageUrl('');
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                            <Upload className="h-5 w-5 mb-2" />
                            <span className="text-xs font-medium">Click to upload</span>
                            <span className="text-[10px]">Recommended: 1200x630px</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={ogImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOgImageUpload}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Publish Button */}
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || !subdomain || (isPasswordProtected && !password)}
                  className="w-full h-10 gap-2 font-medium"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      {isPublished ? 'Update & Publish' : 'Publish App'}
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="export" className="p-4 space-y-3 mt-0">
            <p className="text-xs text-muted-foreground">Download your project as code:</p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleExport('react')}
                className="w-full justify-start gap-3 h-12 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
              >
                <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">React + Vite</div>
                  <div className="text-[10px] text-muted-foreground">Modern React with TypeScript</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('html')}
                className="w-full justify-start gap-3 h-12 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/30"
              >
                <div className="h-8 w-8 rounded-md bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <FileCode className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Static HTML</div>
                  <div className="text-[10px] text-muted-foreground">Plain HTML, CSS, JS</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('astro')}
                className="w-full justify-start gap-3 h-12 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30"
              >
                <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <FileCode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Astro</div>
                  <div className="text-[10px] text-muted-foreground">Fast static site generator</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}