import { useRef } from 'react';
import { Send, ImagePlus, X, Cpu, Zap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AI_WALL_PRESETS, AIWallPreset } from '@/lib/aiWallPresets';
import { AIWallPresetCard } from './AIWallPresetCard';
import { AIWallChatView } from './AIWallChatView';

import { useAIWallStore } from '@/stores/aiWallStore';
import { generateDesign } from '@/services/aiWallService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export function AIWallSidebarContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPresets, setShowPresets] = useState(false);
  const {
    selectedPreset,
    setSelectedPreset,
    prompt,
    setPrompt,
    isGenerating,
    setIsGenerating,
    addGeneration,
    updateGenerationVariants,
    uploadedDesignImage,
    setUploadedDesignImage,
    hasStartedChat,
    addChatMessage,
  } = useAIWallStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setUploadedDesignImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePresetSelect = (preset: AIWallPreset) => {
    setSelectedPreset(selectedPreset?.id === preset.id ? null : preset);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    addChatMessage({ role: 'user', content: prompt.trim() });
    addChatMessage({ role: 'system', content: 'Analyzing your design intent — generating 4 unique designs...' });

    setIsGenerating(true);
    let intentShown = false;
    let tokensShown = false;

    try {
      const { generation, reasoning } = await generateDesign({
        prompt: prompt.trim(),
        preset: selectedPreset,
        referenceImage: uploadedDesignImage || undefined,
        onBatchComplete: (variants) => updateGenerationVariants(variants),
        onSectionPlanReady: (sectionPlan) => {
          addChatMessage({
            role: 'system',
            content: `Planning ${sectionPlan.length} sections: ${sectionPlan.join(' → ')}`,
          });
        },
        onDesignComplete: (variant, index, total, layoutName, sectionCount) => {
          // Show intent/tokens immediately after first design completes
          if (index === 0 && !intentShown) {
            intentShown = true;
            if (reasoning?.intent) {
              addChatMessage({
                role: 'system',
                content: `Design direction: ${reasoning.intent.industry || 'general'} with ${reasoning.intent.mood || 'modern'} mood.`,
                metadata: { intent: reasoning.intent },
              });
            }
            if (reasoning?.tokens) {
              tokensShown = true;
              addChatMessage({
                role: 'system',
                content: 'Design tokens generated — colors, typography, and spacing.',
                metadata: { tokens: reasoning.tokens },
              });
            }
          }

          if (variant.components.length > 0) {
            addChatMessage({
              role: 'system',
              content: `Design ${index + 1}/${total} ready${layoutName ? ` — ${layoutName}` : ''}${sectionCount && sectionCount > 1 ? ` (${sectionCount} sections)` : ''}`,
            });
          } else {
            addChatMessage({
              role: 'error',
              content: `Design ${index + 1}/${total} failed — skipping`,
            });
          }
        },
      });

      // Show remaining reasoning if not already shown during streaming
      if (!intentShown && reasoning.intent) {
        addChatMessage({
          role: 'system',
          content: `Design direction: ${reasoning.intent.industry || 'general'} with ${reasoning.intent.mood || 'modern'} mood.`,
          metadata: { intent: reasoning.intent },
        });
      }
      if (!tokensShown && reasoning.tokens) {
        addChatMessage({
          role: 'system',
          content: 'Design tokens generated — colors, typography, and spacing.',
          metadata: { tokens: reasoning.tokens },
        });
      }

      addGeneration(generation);
      const successCount = generation.variants.filter(v => v.components.length > 0).length;
      const totalCount = generation.variants.length;

      addChatMessage({
        role: 'generation',
        content: `${successCount}/${totalCount} designs generated successfully`,
        metadata: { generationId: generation.id, successCount, totalCount },
      });

      if (successCount > 0) {
        toast.success(`Generated ${successCount}/${totalCount} design variants!`);
      } else {
        toast.warning('All designs failed — providers may be rate-limited, try again.');
      }
    } catch (error) {
      console.error('[AI Wall] Generation error:', error);
      addChatMessage({ role: 'error', content: 'Failed to generate designs. Please try again.' });
      toast.error('Failed to generate designs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {hasStartedChat ? (
        <>
          {/* Collapsible presets in chat mode */}
          <Collapsible open={showPresets} onOpenChange={setShowPresets}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 border-b border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Layers className="w-3 h-3" />
              <span>Design Presets</span>
              <span className={cn("ml-auto transition-transform", showPresets && "rotate-180")}>▾</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 border-b border-border space-y-2 max-h-[200px] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {AI_WALL_PRESETS.map((preset) => (
                    <AIWallPresetCard
                      key={preset.id}
                      preset={preset}
                      isSelected={selectedPreset?.id === preset.id}
                      onSelect={handlePresetSelect}
                    />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Chat messages */}
          <AIWallChatView />
        </>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Design Presets</h3>
              <div className="flex flex-col gap-2">
                {AI_WALL_PRESETS.map((preset) => (
                  <AIWallPresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={selectedPreset?.id === preset.id}
                    onSelect={handlePresetSelect}
                  />
                ))}
              </div>
            </div>

            {selectedPreset && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: selectedPreset.previewGradient }} />
                  <span className="text-xs font-medium text-foreground">{selectedPreset.name}</span>
                  <button onClick={() => setSelectedPreset(null)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Prompt Input */}
      <div className="p-3 border-t border-border space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-violet-500" />
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                </div>
                <span className="text-[11px] font-medium text-foreground">Multi-Agent AI</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-muted-foreground">3 agents</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-xs">MiniMax, Gemini & GPT generate 3 variants in parallel.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {uploadedDesignImage && (
          <div className="relative rounded-md overflow-hidden border border-border bg-muted">
            <img src={uploadedDesignImage} alt="Design reference" className="w-full h-20 object-cover" />
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/80 text-[9px] font-medium text-foreground">Reference</div>
            <button onClick={() => setUploadedDesignImage(null)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasStartedChat ? "Follow up or describe a new design..." : "Describe your design..."}
            className="min-h-[60px] pl-9 pr-10 resize-none text-xs"
            disabled={isGenerating}
          />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isGenerating} className="absolute bottom-1.5 left-1.5 h-7 w-7 text-muted-foreground hover:text-foreground" title="Upload design reference">
            <ImagePlus className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className={cn("absolute bottom-1.5 right-1.5 h-7 w-7", "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600")}>
            {isGenerating ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
