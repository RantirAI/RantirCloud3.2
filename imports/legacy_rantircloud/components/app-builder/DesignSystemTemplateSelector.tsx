import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Check, Loader2, Sparkles } from 'lucide-react';
import { designTemplateService, DesignSystemTemplate } from '@/services/designTemplateService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DesignSystemTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appProjectId: string;
  onApplied?: () => void;
}

const categoryColors: Record<string, string> = {
  modern: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  minimal: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  creative: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  corporate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function DesignSystemTemplateSelector({
  open,
  onOpenChange,
  appProjectId,
  onApplied
}: DesignSystemTemplateSelectorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DesignSystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [designStatus, setDesignStatus] = useState<{ tokensCount: number; presetsCount: number } | null>(null);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadDesignStatus();
    }
  }, [open, appProjectId]);

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

  const loadDesignStatus = async () => {
    try {
      const status = await designTemplateService.getDesignSystemStatus(appProjectId);
      setDesignStatus(status);
    } catch (err) {
      console.error('Failed to load design status:', err);
    }
  };

  const handleApplyTemplate = async (template: DesignSystemTemplate) => {
    if (!user) {
      toast.error('Please sign in to apply design templates. Your designs will be more consistent and professional.');
      return;
    }

    setApplying(template.id);
    try {
      const result = await designTemplateService.applyTemplateToProject(
        template.id,
        appProjectId
      );

      setAppliedTemplate(template.id);
      setDesignStatus({ tokensCount: result.tokensCreated, presetsCount: result.presetsCreated });
      toast.success(`Applied "${result.templateName}" - ${result.tokensCreated} tokens, ${result.presetsCreated} button presets created!`);
      
      setTimeout(() => {
        onOpenChange(false);
        onApplied?.();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to apply template:', err);
      toast.error(err.message || 'Failed to apply template. Please try again.');
    } finally {
      setApplying(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Design System Templates
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>Choose a professional design system to apply to your project. This will set up colors, fonts, and button styles that the AI will use when generating designs.</span>
            {designStatus && (
              <span className="flex items-center gap-2 mt-2">
                <Badge variant={designStatus.tokensCount > 0 ? "default" : "secondary"} className="text-xs">
                  {designStatus.tokensCount} tokens
                </Badge>
                <Badge variant={designStatus.presetsCount > 0 ? "default" : "secondary"} className="text-xs">
                  {designStatus.presetsCount} presets
                </Badge>
                {designStatus.tokensCount === 0 && (
                  <span className="text-yellow-500 text-xs">⚠️ No design system applied yet</span>
                )}
              </span>
            )}
            {!user && (
              <span className="text-yellow-500 text-xs block mt-2">
                ⚠️ Please sign in to apply design templates
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No design templates available
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card 
                  key={template.id}
                  className={`relative overflow-hidden transition-all duration-200 hover:border-primary/50 ${
                    appliedTemplate === template.id ? 'border-green-500 bg-green-500/5' : ''
                  }`}
                >
                  <div 
                    className="absolute top-0 left-0 w-2 h-full"
                    style={{ backgroundColor: template.preview_color }}
                  />
                  
                  <CardHeader className="pb-2 pl-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {appliedTemplate === template.id && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={categoryColors[template.category] || 'bg-muted'}
                      >
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pl-5">
                    <div className="space-y-3">
                      {/* Color preview */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Colors</p>
                        <div className="flex gap-1.5">
                          {template.tokens.colors?.slice(0, 6).map((color, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-md border border-white/10 shadow-sm"
                              style={{ backgroundColor: color.value }}
                              title={`${color.name}: ${color.value}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Fonts */}
                      {template.tokens.fonts && template.tokens.fonts.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Typography</p>
                          <p className="text-sm">
                            {template.tokens.fonts.map(f => f.value).join(' + ')}
                          </p>
                        </div>
                      )}

                      {/* Button preview */}
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex gap-2 flex-1">
                          {template.button_presets.slice(0, 2).map((preset, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1.5 text-xs rounded-md font-medium"
                              style={{
                                backgroundColor: preset.styles?.background?.color || 
                                  (preset.styles?.background?.gradient ? template.preview_color : 'transparent'),
                                border: preset.variant === 'outline' ? `2px solid ${template.preview_color}` : 'none',
                                color: preset.variant === 'outline' ? template.preview_color : '#fff',
                                borderRadius: preset.styles?.border?.radius ? 
                                  `${preset.styles.border.radius}px` : '8px'
                              }}
                            >
                              {preset.name}
                            </div>
                          ))}
                        </div>

                        <Button
                          onClick={() => handleApplyTemplate(template)}
                          disabled={applying === template.id || appliedTemplate === template.id}
                          size="sm"
                          className="shrink-0"
                        >
                          {applying === template.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Applying...
                            </>
                          ) : appliedTemplate === template.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              Applied
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              Apply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
