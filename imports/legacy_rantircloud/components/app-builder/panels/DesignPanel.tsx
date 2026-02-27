import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Palette, Check, Loader2, Sparkles, X, ChevronLeft, Sun, Moon, Save, Copy, Type, Maximize, Circle, Layers, Monitor, MousePointer } from 'lucide-react';
import { designTemplateService, DesignSystemTemplate } from '@/services/designTemplateService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useDesignTokenStore, generateThemeCSS } from '@/stores/designTokenStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';
import { ColorTokenSection } from '@/components/app-builder/design-system/ColorTokenSection';
import { TypographyTokenSection } from '@/components/app-builder/design-system/TypographyTokenSection';
import { EffectsTokenSection } from '@/components/app-builder/design-system/EffectsTokenSection';
import { InputsTokenSection } from '@/components/app-builder/design-system/InputsTokenSection';
import { SpacingTokenSection } from '@/components/app-builder/design-system-panel/sections/SpacingTokenSection';
import { BorderRadiusTokenSection } from '@/components/app-builder/design-system-panel/sections/BorderRadiusTokenSection';
import { ShadowTokenSection } from '@/components/app-builder/design-system-panel/sections/ShadowTokenSection';
import { TypographyTokenSection as TypographyScaleSection } from '@/components/app-builder/design-system-panel/sections/TypographyTokenSection';
import { BreakpointTokenSection } from '@/components/app-builder/design-system-panel/sections/BreakpointTokenSection';
import { InteractionStateSection } from '@/components/app-builder/design-system-panel/sections/InteractionStateSection';

const categoryColors: Record<string, string> = {
  modern: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  minimal: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  creative: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  corporate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function DesignPanel() {
  const { user } = useAuth();
  const { currentProject, toggleDesignPanel } = useAppBuilderStore();
  const { activeTokens, loadProjectTokens, isLoading: tokensLoading } = useDesignTokenStore();
  const { loadDesignSystem } = useDesignSystemStore();
  const [templates, setTemplates] = useState<DesignSystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('colors');
  const [viewMode, setViewMode] = useState<'themes' | 'editor'>('themes');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Load design system when project changes
  useEffect(() => {
    if (currentProject?.id) {
      loadDesignSystem(currentProject.id);
    }
  }, [currentProject?.id, loadDesignSystem]);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Load project tokens when project changes
  useEffect(() => {
    if (currentProject?.id) {
      loadProjectTokens(currentProject.id);
    }
  }, [currentProject?.id, loadProjectTokens]);

  // Auto-switch to editor view if tokens exist
  useEffect(() => {
    if (activeTokens.size > 0) {
      setViewMode('editor');
    }
  }, [activeTokens.size]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await designTemplateService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load design templates');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (template: DesignSystemTemplate) => {
    if (!user || !currentProject) {
      toast.error('Please sign in to apply design templates');
      return;
    }

    setApplying(template.id);
    try {
      const result = await designTemplateService.applyTemplateToProject(
        template.id,
        currentProject.id
      );

      setAppliedTemplate({ id: template.id, name: result.templateName });
      
      // Reload tokens after applying template
      await loadProjectTokens(currentProject.id);
      
      // Switch to editor view after applying
      setViewMode('editor');
      
      toast.success(`Applied "${result.templateName}"`);
    } catch (err: any) {
      console.error('Failed to apply template:', err);
      toast.error(err.message || 'Failed to apply template');
    } finally {
      setApplying(null);
    }
  };

  const handleStartCustom = () => {
    setViewMode('editor');
  };

  // Determine design system status
  const hasActiveTokens = activeTokens.size > 0;
  const activeThemeName = appliedTemplate?.name || (hasActiveTokens ? 'Custom Theme' : null);

  // Theme Selection View
  if (viewMode === 'themes') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design System
          </span>
          <button 
            onClick={toggleDesignPanel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Header */}
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 mx-auto mb-3 flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Choose a Theme</h3>
              <p className="text-xs text-muted-foreground">
                Start with a preset or create your own
              </p>
            </div>

            {/* Active Theme / Custom Theme Option */}
            <button
              onClick={handleStartCustom}
              className={cn(
                "w-full p-3 rounded-lg border-2 transition-colors text-left",
                activeThemeName 
                  ? "border-primary bg-primary/5 hover:bg-primary/10" 
                  : "border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  activeThemeName 
                    ? "bg-primary" 
                    : "bg-gradient-to-br from-green-500 to-teal-500"
                )}>
                  {activeThemeName ? (
                    <Palette className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium block truncate">
                    {activeThemeName || 'Start Custom'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {activeThemeName ? 'Click to edit theme' : 'Build your own design system'}
                  </span>
                </div>
                {activeThemeName && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">or choose a preset</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Template List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No design templates available
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template)}
                    disabled={applying === template.id}
                    className={cn(
                      "w-full relative overflow-hidden rounded-lg border transition-all duration-200 hover:border-primary/50 p-3 text-left",
                      appliedTemplate?.id === template.id && 'border-green-500 bg-green-500/5'
                    )}
                  >
                    <div 
                      className="absolute top-0 left-0 w-1 h-full rounded-l"
                      style={{ backgroundColor: template.preview_color }}
                    />
                    
                    <div className="pl-2 flex items-center gap-3">
                      {/* Color preview circles */}
                      <div className="flex -space-x-1">
                        {template.tokens.colors?.slice(0, 4).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded-full border-2 border-background"
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium truncate">
                            {template.name}
                          </span>
                          {appliedTemplate?.id === template.id && (
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {template.description}
                        </p>
                      </div>

                      {applying === template.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Token Editor View
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('themes')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design System
          </span>
        </div>
        <button 
          onClick={toggleDesignPanel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Active Theme Header */}
      <div className="p-2 border-b border-border space-y-1.5">
        <div className="flex items-center justify-between p-2 rounded bg-primary/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Palette className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xs font-medium block">
                {activeThemeName || 'Custom Theme'}
              </span>
              {hasActiveTokens && (
                <span className="text-[10px] text-muted-foreground">
                  {activeTokens.size} tokens active
                </span>
              )}
            </div>
          </div>
          
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            Auto-saved
          </div>
        </div>
        
        {/* Save reminder hint */}
        <p className="text-[10px] text-muted-foreground/70 px-1 flex items-center gap-1">
          <Save className="h-3 w-3" />
          Changes save automatically when you add or modify tokens
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tab Categories */}
        <div className="px-2 pt-2 space-y-1">
          <div className="text-[10px] text-muted-foreground px-1">Theme</div>
          <TabsList className="w-full h-7 grid grid-cols-4">
            <TabsTrigger value="colors" className="text-[10px] h-6 px-1">
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" className="text-[10px] h-6 px-1">
              Type
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-[10px] h-6 px-1">
              Effects
            </TabsTrigger>
            <TabsTrigger value="inputs" className="text-[10px] h-6 px-1">
              Inputs
            </TabsTrigger>
          </TabsList>
          
          <div className="text-[10px] text-muted-foreground px-1 pt-1">Variables</div>
          <TabsList className="w-full h-7 grid grid-cols-3">
            <TabsTrigger value="spacing" className="text-[10px] h-6 px-1">
              <Maximize className="h-3 w-3 mr-1" />
              Spacing
            </TabsTrigger>
            <TabsTrigger value="radius" className="text-[10px] h-6 px-1">
              <Circle className="h-3 w-3 mr-1" />
              Radius
            </TabsTrigger>
            <TabsTrigger value="shadows" className="text-[10px] h-6 px-1">
              <Layers className="h-3 w-3 mr-1" />
              Shadows
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="w-full h-7 grid grid-cols-3">
            <TabsTrigger value="typescale" className="text-[10px] h-6 px-1">
              <Type className="h-3 w-3 mr-1" />
              Type Scale
            </TabsTrigger>
            <TabsTrigger value="breakpoints" className="text-[10px] h-6 px-1">
              <Monitor className="h-3 w-3 mr-1" />
              Responsive
            </TabsTrigger>
            <TabsTrigger value="interactions" className="text-[10px] h-6 px-1">
              <MousePointer className="h-3 w-3 mr-1" />
              States
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Colors Tab */}
        <TabsContent value="colors" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              {/* Theme Mode Toggle */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Theme Mode</span>
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={cn(
                      "p-1 rounded transition-colors",
                      themeMode === 'light' ? "bg-background shadow-sm" : "hover:bg-background/50"
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={cn(
                      "p-1 rounded transition-colors",
                      themeMode === 'dark' ? "bg-background shadow-sm" : "hover:bg-background/50"
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <ColorTokenSection themeMode={themeMode} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <TypographyTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Effects Tab */}
        <TabsContent value="effects" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <EffectsTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Inputs Tab */}
        <TabsContent value="inputs" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <InputsTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <SpacingTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Border Radius Tab */}
        <TabsContent value="radius" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <BorderRadiusTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Shadows Tab */}
        <TabsContent value="shadows" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <ShadowTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Typography Scale Tab */}
        <TabsContent value="typescale" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <TypographyScaleSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Breakpoints Tab */}
        <TabsContent value="breakpoints" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <BreakpointTokenSection />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Interaction States Tab */}
        <TabsContent value="interactions" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <InteractionStateSection />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
