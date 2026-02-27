import { Sparkles, MessageSquare, History, Wand2, Cpu, Zap, Send, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AI_WALL_PRESETS, AIWallPreset } from '@/lib/aiWallPresets';
import { AIWallPresetCard } from './AIWallPresetCard';
import { AIWallChatView } from './AIWallChatView';
import { useAIWallStore } from '@/stores/aiWallStore';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface AIWallSidebarProps {
  onGenerate: () => void;
}

export function AIWallSidebar({ onGenerate }: AIWallSidebarProps) {
  const [showPresets, setShowPresets] = useState(false);
  const {
    selectedPreset,
    setSelectedPreset,
    prompt,
    setPrompt,
    isGenerating,
    activeTab,
    setActiveTab,
    hasStartedChat,
    generations,
    savedStyle,
    clearSavedStyle,
  } = useAIWallStore();

  const handlePresetSelect = (preset: AIWallPreset) => {
    setSelectedPreset(selectedPreset?.id === preset.id ? null : preset);
  };

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-[340px] h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">AI Wall</h2>
            <p className="text-[10px] text-muted-foreground">Generate beautiful designs</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1 gap-1.5">
              <MessageSquare className="w-3 h-3" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="wall" className="flex-1 gap-1.5">
              <Sparkles className="w-3 h-3" />
              Design Wall
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History className="w-3 h-3" />
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'wall' && (
        <>
          {hasStartedChat ? (
            <>
              <Collapsible open={showPresets} onOpenChange={setShowPresets}>
                <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-2 border-b border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Layers className="w-3 h-3" />
                  <span>Design Presets</span>
                  <span className={cn("ml-auto transition-transform text-[10px]", showPresets && "rotate-180")}>▾</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 border-b border-border max-h-[200px] overflow-y-auto">
                    <div className="flex flex-col gap-0.5">
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
              <AIWallChatView />
            </>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-foreground mb-2">Design Presets</h3>
                  <div className="flex flex-col gap-0.5">
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
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ background: selectedPreset.previewGradient }} />
                      <span className="text-xs font-medium text-foreground">{selectedPreset.name}</span>
                      <button onClick={() => setSelectedPreset(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {activeTab === 'chat' && (
        <AIWallChatView />
      )}

      {activeTab === 'history' && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            {generations.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-center">
                <div className="space-y-2">
                  <History className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No generations yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {generations.map((gen) => {
                  const successCount = gen.variants.filter(v => v.components.length > 0).length;
                  return (
                    <div key={gen.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{gen.prompt}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{successCount} variant{successCount !== 1 ? 's' : ''}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(gen.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Prompt Input */}
      <div className="p-4 border-t border-border space-y-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border border-border">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-violet-500" />
                  <Zap className="w-3 h-3 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-foreground">Multi-Agent AI</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">3 agents</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-xs">MiniMax, Gemini & GPT generate 3 variants in parallel — no rate-limit bottlenecks.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Saved Style Indicator */}
        {savedStyle && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent/10 border border-accent/20">
            <Palette className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground truncate flex-1">
              Style: {savedStyle.sourceVariantName}
            </span>
            <button
              onClick={clearSavedStyle}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={savedStyle
              ? "Describe what to add... styles will be preserved"
              : hasStartedChat
              ? "Follow up or describe a new design..."
              : "Describe your design... e.g., 'Landing page for a project management SaaS'"}
            className="min-h-[80px] pr-12 resize-none text-sm"
            disabled={isGenerating}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "absolute bottom-2 right-2 h-8 w-8",
              "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            )}
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
