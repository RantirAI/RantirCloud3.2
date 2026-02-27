import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Workflow, 
  Layout, 
  Puzzle, 
  Palette,
  Library,
  Lock,
  Grid3X3,
  List,
  Presentation,
  Expand,
  Minimize2,
  ExternalLink,
  ArrowLeft,
  Globe,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { workspaceService } from '@/services/workspaceService';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

// Import plugin images - using new Rantir branded images
import dataDocumentsImg from '@/assets/rantir_data_and_documents.jpg';
import logicFlowsImg from '@/assets/rantir_integrations_and_logic.jpg';
import appBuilderImg from '@/assets/rantir_websites_and_apps.jpg';
import presentationsImg from '@/assets/rantir_presentation.jpg';
import pluginsImg from '@/assets/rantir_plugins.jpg';

// Import category background images
import bgCommunityImg from '@/assets/plugins/bg-community.jpg';
import dataOverImg from '@/assets/rantir_data_and_documents.jpg';
import integrationsOverImg from '@/assets/rantir_integrations_and_logic.jpg';
import websitesOverImg from '@/assets/rantir_websites_and_apps.jpg';
import pluginsOverImg from '@/assets/rantir_plugins.jpg';

interface CommunityPluginsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EnabledPlugins {
  data_documents: boolean;
  logic_flows: boolean;
  app_builder: boolean;
  plugins: boolean;
  presentations: boolean;
}

interface CommunityPlugin {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  image_url: string | null;
  author_name: string | null;
  is_featured: boolean;
  install_count: number;
  metadata: any;
}

const defaultPlugins: EnabledPlugins = {
  data_documents: true,
  logic_flows: true,
  app_builder: true,
  plugins: true,
  presentations: false
};

// Category images mapping
const categoryImages: Record<string, string> = {
  data_documents: dataOverImg,
  logic_flows: integrationsOverImg,
  app_builder: websitesOverImg,
  plugins: pluginsOverImg,
  presentations: presentationsImg,
  websites: websitesOverImg
};

const pluginsList = [
  {
    id: 'data_documents',
    name: 'Data & Documents',
    description: 'Manage databases, tables, and document storage',
    icon: Database,
    color: 'bg-amber-500',
    textColor: 'text-amber-500',
    image: dataDocumentsImg,
    headerImage: dataOverImg,
    comingSoon: false,
    disabled: false
  },
  {
    id: 'logic_flows',
    name: 'Logic & AI',
    description: 'Build automated workflows and integrations',
    icon: Workflow,
    color: 'bg-purple-500',
    textColor: 'text-purple-500',
    image: logicFlowsImg,
    headerImage: integrationsOverImg,
    comingSoon: false,
    disabled: false
  },
  {
    id: 'app_builder',
    name: 'Websites & Apps',
    description: 'Create web applications with visual builder',
    icon: Layout,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    image: appBuilderImg,
    headerImage: websitesOverImg,
    comingSoon: false,
    disabled: false
  },
  {
    id: 'plugins',
    name: 'Plugins',
    description: 'Extend functionality with third-party plugins',
    icon: Puzzle,
    color: 'bg-pink-500',
    textColor: 'text-pink-500',
    image: pluginsImg,
    headerImage: pluginsOverImg,
    comingSoon: false,
    disabled: false
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Create beautiful presentations and slides',
    icon: Presentation,
    color: 'bg-slate-700',
    textColor: 'text-slate-400',
    image: presentationsImg,
    headerImage: presentationsImg,
    comingSoon: true,
    disabled: true
  }
];

export function CommunityPluginsModal({ open, onOpenChange }: CommunityPluginsModalProps) {
  const [enabledPlugins, setEnabledPlugins] = useState<EnabledPlugins>(defaultPlugins);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPlugins, setCategoryPlugins] = useState<CommunityPlugin[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);

  useEffect(() => {
    if (open) {
      loadPluginSettings();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryPlugins(selectedCategory);
    }
  }, [selectedCategory]);

  const loadPluginSettings = async () => {
    try {
      setLoading(true);
      const workspace = await workspaceService.getCurrentWorkspace();
      if (!workspace) return;

      const { data, error } = await supabase
        .from('workspace_customization')
        .select('enabled_plugins')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (data?.enabled_plugins) {
        setEnabledPlugins({ ...defaultPlugins, ...(data.enabled_plugins as unknown as EnabledPlugins) });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('workspace_customization')
            .insert({
              workspace_id: workspace.id,
              enabled_plugins: JSON.parse(JSON.stringify(defaultPlugins))
            });
        }
        setEnabledPlugins(defaultPlugins);
      }
    } catch (error) {
      console.error('Error loading plugin settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryPlugins = async (category: string) => {
    try {
      setLoadingPlugins(true);
      const { data, error } = await supabase
        .from('community_plugins')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('install_count', { ascending: false });

      if (error) throw error;
      setCategoryPlugins(data || []);
    } catch (error) {
      console.error('Error loading category plugins:', error);
      setCategoryPlugins([]);
    } finally {
      setLoadingPlugins(false);
    }
  };

  const handleTogglePlugin = async (pluginId: keyof EnabledPlugins) => {
    const plugin = pluginsList.find(p => p.id === pluginId);
    if (plugin?.comingSoon || plugin?.disabled) return;

    const workspace = await workspaceService.getCurrentWorkspace();
    if (!workspace) return;

    const newPlugins = {
      ...enabledPlugins,
      [pluginId]: !enabledPlugins[pluginId]
    };

    setEnabledPlugins(newPlugins);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('workspace_customization')
        .update({
          enabled_plugins: JSON.parse(JSON.stringify(newPlugins)),
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspace.id);

      if (error) throw error;
      toast.success('Plugin settings updated');
    } catch (error: any) {
      console.error('Error saving plugin settings:', error);
      toast.error('Failed to save settings');
      setEnabledPlugins(enabledPlugins);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryClick = (pluginId: string) => {
    const plugin = pluginsList.find(p => p.id === pluginId);
    if (plugin?.disabled) return;
    setSelectedCategory(pluginId);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setCategoryPlugins([]);
  };

  const installPlugin = async (pluginId: string) => {
    try {
      const workspace = await workspaceService.getCurrentWorkspace();
      if (!workspace) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('community_plugin_installations')
        .upsert({
          workspace_id: workspace.id,
          plugin_id: pluginId,
          installed_by: user.id,
          is_active: true
        }, {
          onConflict: 'workspace_id,plugin_id'
        });

      if (error) throw error;
      toast.success('Plugin installed successfully');
      loadCategoryPlugins(selectedCategory!);
    } catch (error) {
      console.error('Error installing plugin:', error);
      toast.error('Failed to install plugin');
    }
  };

  // Get current header image based on selected category
  const getCurrentHeaderImage = () => {
    if (selectedCategory) {
      const plugin = pluginsList.find(p => p.id === selectedCategory);
      return plugin?.headerImage || bgCommunityImg;
    }
    return bgCommunityImg;
  };

  // Get current category info
  const getCurrentCategory = () => {
    return pluginsList.find(p => p.id === selectedCategory);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "overflow-hidden p-0 transition-all duration-200 border-border",
          isFullscreen 
            ? "max-w-[95vw] w-[95vw] h-[95vh]" 
            : "max-w-6xl w-full h-[80vh]"
        )}
      >
        <DialogTitle className="sr-only">Community Plugins</DialogTitle>
        
        {/* Dots pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="flex h-full relative z-10">
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header Section with Background Image */}
            <div className="relative flex-shrink-0 border-b border-border">
              {/* Background image with dark mode filter */}
              <div 
                className="absolute inset-0 dark:opacity-30 dark:mix-blend-luminosity"
                style={{
                  backgroundImage: `url(${getCurrentHeaderImage()})`,
                  backgroundPosition: 'right center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'auto 100%',
                }}
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/10 dark:via-background/95 dark:to-background/85" />
              
              <div className="relative z-10">
                <div className="p-6 pb-5">
                  {/* Back button when viewing category */}
                  {selectedCategory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-3 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={handleBackToCategories}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Categories
                    </Button>
                  )}

                  {/* Title */}
                  <h1 className="text-2xl font-tiempos font-light text-foreground mb-3">
                    {selectedCategory 
                      ? getCurrentCategory()?.name 
                      : 'Discover community-made plugins, data sets, and more'
                    }
                  </h1>
                  
                  {/* Subtitle */}
                  <p className="text-[13px] text-muted-foreground/70 leading-relaxed font-normal max-w-[85%] mb-5">
                    {selectedCategory 
                      ? getCurrentCategory()?.description
                      : <>
                          Rantir is a broad and opensource community that builds on top of Rantir Cloud with our plugin architecture. 
                          Ready to be a part of the community and build on top of Rantir? Reach out to{' '}
                          <a href="mailto:hello@rantir.com" className="text-primary hover:underline">hello@rantir.com</a>
                          {' '}or join our Discord.
                        </>
                    }
                  </p>

                  {/* Action Buttons */}
                  {!selectedCategory && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open('https://discord.gg/lovable-dev', '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Join Discord
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open('https://rantir.store/partner-program', '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Partner Program
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-70 hover:opacity-100"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plugins Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {selectedCategory ? (
                // Inner Category View
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {loadingPlugins ? (
                      <div className="text-center py-8 text-muted-foreground">Loading plugins...</div>
                    ) : categoryPlugins.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {categoryPlugins.map((plugin) => (
                          <div 
                            key={plugin.id} 
                            className="relative rounded-xl overflow-hidden transition-all group border border-border hover:border-primary/30 bg-card"
                          >
                            {/* Plugin Card */}
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                  plugin.color || 'bg-primary'
                                )}>
                                  <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium text-foreground">{plugin.name}</h3>
                                    {plugin.is_featured && (
                                      <Badge variant="secondary" className="text-[10px]">Featured</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {plugin.description}
                                  </p>
                                  {plugin.author_name && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                                      by {plugin.author_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-4">
                                <span className="text-[10px] text-muted-foreground">
                                  {plugin.install_count} installs
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => installPlugin(plugin.id)}
                                >
                                  Install
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Puzzle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-2 text-foreground">No plugins yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Plugins for this category are coming soon. Check back later!
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                // Main Categories View
                <Tabs defaultValue="plugins" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <TabsList className="h-9 bg-transparent p-0 gap-4 border-0 border-b border-transparent shadow-none">
                        <TabsTrigger 
                          value="plugins" 
                          className="px-0 py-2 text-sm font-medium rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-all bg-transparent"
                        >
                          <Puzzle className="h-4 w-4 mr-2" />
                          Plugins + widgets
                        </TabsTrigger>
                        <TabsTrigger 
                          value="themes" 
                          className="px-0 py-2 text-sm font-medium rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-all bg-transparent"
                        >
                          <Palette className="h-4 w-4 mr-2" />
                          Themes
                        </TabsTrigger>
                        <TabsTrigger 
                          value="libraries" 
                          className="px-0 py-2 text-sm font-medium rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-all bg-transparent"
                        >
                          <Library className="h-4 w-4 mr-2" />
                          Libraries
                        </TabsTrigger>
                      </TabsList>

                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 rounded-full",
                            viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setViewMode('grid')}
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 rounded-full",
                            viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setViewMode('list')}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <TabsContent value="plugins" className="p-6 pt-4 m-0">
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                      ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 gap-4">
                          {pluginsList.map((plugin) => {
                            const Icon = plugin.icon;
                            const isEnabled = enabledPlugins[plugin.id as keyof EnabledPlugins];
                            const isDisabled = plugin.disabled;
                            
                            return (
                              <div 
                                key={plugin.id} 
                                className={cn(
                                  "relative rounded-xl overflow-hidden transition-all group border border-border bg-card cursor-pointer hover:border-primary/30"
                                )}
                                onClick={() => handleCategoryClick(plugin.id)}
                              >
                                {/* Image */}
                                <div className="h-32 overflow-hidden relative">
                                  <img 
                                    src={plugin.image} 
                                    alt={plugin.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                </div>

                                {/* Icon overlapping the image */}
                                <div className={cn(
                                  "absolute top-24 left-3 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg",
                                  plugin.color
                                )}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>

                                {/* Content */}
                                <div className="p-3 pt-6 bg-card">
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-foreground">{plugin.name}</h3>
                                    {plugin.comingSoon ? (
                                      <Badge variant="outline" className="text-[10px]">
                                        <Lock className="h-2.5 w-2.5 mr-1" />
                                        Soon
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Installed
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {plugin.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pluginsList.map((plugin) => {
                            const Icon = plugin.icon;
                            const isEnabled = enabledPlugins[plugin.id as keyof EnabledPlugins];
                            const isDisabled = plugin.disabled;
                            
                            return (
                              <div 
                                key={plugin.id} 
                                className="flex items-center gap-4 p-3 rounded-lg transition-all border border-border bg-card cursor-pointer hover:border-primary/30"
                                onClick={() => handleCategoryClick(plugin.id)}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                  plugin.color
                                )}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium text-foreground">{plugin.name}</h3>
                                    {!plugin.comingSoon && !isDisabled && (
                                      <Badge variant="secondary" className="text-[10px]">Core</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {plugin.description}
                                  </p>
                                </div>
                                {plugin.comingSoon || isDisabled ? (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    <Lock className="h-2.5 w-2.5 mr-1" />
                                    Coming Soon
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    Installed
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="themes" className="p-6 pt-4 m-0">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Palette className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-2 text-foreground">Themes Coming Soon</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Customize your workspace with beautiful themes. This feature is currently in development.
                        </p>
                        <Badge variant="outline" className="mt-4">
                          <Lock className="h-3 w-3 mr-1" />
                          Coming Soon
                        </Badge>
                      </div>
                    </TabsContent>

                    <TabsContent value="libraries" className="p-6 pt-4 m-0">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Library className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-2 text-foreground">API Libraries Coming Soon</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Connect to public APIs and extend your applications with third-party services.
                        </p>
                        <Badge variant="outline" className="mt-4">
                          <Lock className="h-3 w-3 mr-1" />
                          Coming Soon
                        </Badge>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
