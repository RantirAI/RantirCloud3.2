import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, User, Sparkles, Wand2, RotateCcw, History } from 'lucide-react';
import { useAIAppBuildStream } from '@/hooks/useAIAppBuildStream';
import { AIBuildProgress } from './AIBuildProgress';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppComponent } from '@/types/appBuilder';

// ═══════════════════════════════════════════════════════════════════════════════
// AI-POWERED INTENT CLASSIFICATION
// Replaces brittle keyword matching with an LLM classifier
// ═══════════════════════════════════════════════════════════════════════════════

function extractSectionHint(component: AppComponent): string {
  // Pull first heading text from component tree to give classifier context
  if (component.props?.content && typeof component.props.content === 'string') {
    return component.props.content.slice(0, 60);
  }
  if (Array.isArray(component.children)) {
    for (const child of component.children) {
      if (child.type === 'heading' && child.props?.content) {
        return String(child.props.content).slice(0, 60);
      }
      // Check one level deeper
      if (Array.isArray(child.children)) {
        for (const grandchild of child.children) {
          if (grandchild.type === 'heading' && grandchild.props?.content) {
            return String(grandchild.props.content).slice(0, 60);
          }
        }
      }
    }
  }
  return component.type || '';
}

async function classifyIntent(
  prompt: string,
  components: AppComponent[]
): Promise<{ targetSection: string | null; confidence: number }> {
  // Extract section summaries from canvas
  const canvasSections = components.map((c, i) => ({
    index: i,
    id: c.id,
    type: c.type,
    hint: extractSectionHint(c),
  }));

  // If canvas is empty, it's always a full-page build
  if (canvasSections.length === 0) {
    return { targetSection: null, confidence: 1.0 };
  }

  try {
    const { data, error } = await supabase.functions.invoke('app-builder-ai', {
      body: {
        prompt,
        context: { prompt, canvasSections },
        mode: 'classify-intent',
      },
    });

    if (error || !data) {
      console.warn('[ClassifyIntent] Failed, falling back to full-page:', error);
      return { targetSection: null, confidence: 0 };
    }

    console.log('[ClassifyIntent] Result:', data);
    return {
      targetSection: data.targetSection || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
    };
  } catch (err) {
    console.error('[ClassifyIntent] Error:', err);
    return { targetSection: null, confidence: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai-build' | 'ai-chat';
  content: string;
  timestamp: number;
  // For ai-build messages:
  snapshot?: any[]; // Components snapshot before this build
  buildPrompt?: string;
  targetSection?: string | null;
}

interface ProgressiveAIChatProps {
  projectId: string;
}

export function ProgressiveAIChat({ projectId }: ProgressiveAIChatProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { currentProject, currentPage, updatePage } = useAppBuilderStore();
  
  const { 
    isBuilding, 
    buildSteps, 
    progress, 
    startBuild, 
    cancelBuild, 
    resetBuild 
  } = useAIAppBuildStream();

  const buildTemplates = [
    { label: 'SaaS Landing', prompt: 'Create a modern SaaS landing page with hero, features, pricing, and testimonials' },
    { label: 'Portfolio', prompt: 'Create a creative portfolio website with project showcase and about section' },
    { label: 'E-commerce', prompt: 'Create an e-commerce storefront with product grid, featured items, and CTA' },
    { label: 'Agency', prompt: 'Create a digital agency website with services, case studies, and contact form' },
  ];

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages, buildSteps, progress]);

  // Load conversation history
  useEffect(() => {
    const saved = localStorage.getItem(`ai-conv-${projectId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load conversation:', e);
      }
    }
  }, [projectId]);

  // Save conversation history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`ai-conv-${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

  // Get current page components for snapshot
  const getCurrentComponents = useCallback(() => {
    if (!currentProject || !currentPage) return [];
    const page = currentProject.pages.find(p => p.id === currentPage);
    return page?.components || [];
  }, [currentProject, currentPage]);

  // Restore a version from snapshot
  const restoreVersion = useCallback((snapshot: any[]) => {
    if (!currentPage || !snapshot) return;
    updatePage(currentPage, { components: snapshot });
    toast.success('Version restored! Canvas updated.');
  }, [currentPage, updatePage]);

  // Safety: if isBuilding is stuck for >60s, auto-reset it
  useEffect(() => {
    if (!isBuilding) return;
    const timeout = setTimeout(() => {
      console.warn('[ProgressiveAIChat] isBuilding stuck for 60s, force-resetting');
      resetBuild();
      setLocalLoading(false);
    }, 60000);
    return () => clearTimeout(timeout);
  }, [isBuilding, resetBuild]);

  const handleSubmit = async () => {
    if (!prompt.trim() || localLoading) return;
    
    // If isBuilding is stuck from a previous session, force-reset it
    if (isBuilding) {
      console.warn('[ProgressiveAIChat] isBuilding was stuck, force-resetting before new build');
      resetBuild();
      // Small delay to let state settle
      await new Promise(r => setTimeout(r, 100));
    }

    const userPrompt = prompt.trim();
    setPrompt('');
    setLocalLoading(true);

    // Add user message
    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };

    // Snapshot current components before build
    const snapshot = getCurrentComponents();

    // AI-powered intent classification
    const { targetSection, confidence } = await classifyIntent(userPrompt, snapshot);
    const effectiveTarget = confidence >= 0.7 ? targetSection : null;

    console.log(`[ProgressiveAIChat] Intent: target=${targetSection}, confidence=${confidence}, effective=${effectiveTarget}`);

    // Add build message placeholder
    const buildMsg: ConversationMessage = {
      id: `build-${Date.now()}`,
      type: 'ai-build',
      content: effectiveTarget 
        ? `Updating ${effectiveTarget} section...` 
        : 'Building your app...',
      timestamp: Date.now(),
      snapshot: snapshot.length > 0 ? snapshot : undefined,
      buildPrompt: userPrompt,
      targetSection: effectiveTarget,
    };

    setMessages(prev => [...prev, userMsg, buildMsg]);

    // Start the build with context
    const contextualPrompt = effectiveTarget 
      ? `[TARGET SECTION: ${effectiveTarget}] ${userPrompt}`
      : userPrompt;

    try {
      console.log('[ProgressiveAIChat] Starting build with prompt:', contextualPrompt);
      await startBuild(contextualPrompt);

      // Update build message with completion status
      setMessages(prev => prev.map(m => 
        m.id === buildMsg.id 
          ? { ...m, content: targetSection ? `Updated ${targetSection} section ✓` : 'Build complete ✓' }
          : m
      ));
    } catch (err: any) {
      console.error('[ProgressiveAIChat] Build failed:', err);
      toast.error(err?.message || 'Build failed. Please try again.');
      setMessages(prev => prev.map(m => 
        m.id === buildMsg.id 
          ? { ...m, content: `Build failed: ${err?.message || 'Unknown error'}` }
          : m
      ));
    } finally {
      setLocalLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(`ai-conv-${projectId}`);
    resetBuild();
  };

  const hasConversation = messages.length > 0 || isBuilding;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">AI Builder</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="h-6 w-6 p-0"
            title="Clear conversation"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Conversation Area */}
      <ScrollArea className="flex-1 mb-3" ref={scrollAreaRef}>
        <div className="space-y-3 p-1">
          {/* Empty state */}
          {!hasConversation && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-sm">Describe your app</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I'll create it on the canvas. You can then ask me to update specific sections.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick Start</p>
                <div className="grid grid-cols-2 gap-2">
                  {buildTemplates.map((template) => (
                    <button
                      key={template.label}
                      onClick={() => setPrompt(template.prompt)}
                      className="p-2 text-left text-xs bg-muted/50 hover:bg-muted rounded-md border border-border/50 transition-colors"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id}>
              {/* User message */}
              {message.type === 'user' && (
                <div className="flex gap-2 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2 max-w-[85%]">
                    <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3 w-3" />
                  </div>
                </div>
              )}

              {/* AI Build message */}
              {message.type === 'ai-build' && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="max-w-[90%] space-y-2">
                    {/* Show section target if applicable */}
                    {message.targetSection && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {message.targetSection}
                        </span>
                        section update
                      </div>
                    )}

                    {/* Build status text */}
                    <div className="text-xs text-muted-foreground">
                      {message.content}
                    </div>

                    {/* Restore button if snapshot exists */}
                    {message.snapshot && message.snapshot.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => restoreVersion(message.snapshot!)}
                      >
                        <History className="h-3 w-3" />
                        Restore previous version
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* AI Chat message */}
              {message.type === 'ai-chat' && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 max-w-[85%]">
                    <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

           {/* Live build progress (inline) */}
           {(isBuilding || localLoading) && (
             <div className="flex gap-2 justify-start">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                 <Bot className="h-3 w-3 text-primary animate-pulse" />
               </div>
               <div className="max-w-[90%]">
                 {buildSteps.length === 0 ? (
                   // Show loading indicator while steps are being populated
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <Loader2 className="h-4 w-4 text-primary animate-spin" />
                       <span className="text-xs text-muted-foreground font-medium">AI is thinking...</span>
                     </div>
                     <p className="text-[11px] text-muted-foreground">Analyzing your request and generating components</p>
                   </div>
                 ) : (
                   <AIBuildProgress
                     steps={buildSteps}
                     progress={progress}
                     isBuilding={isBuilding}
                     onCancel={cancelBuild}
                   />
                 )}
               </div>
             </div>
           )}

          {/* Completed build progress (when not building but steps exist) */}
          {!isBuilding && buildSteps.length > 0 && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="max-w-[90%]">
                <AIBuildProgress
                  steps={buildSteps}
                  progress={progress}
                  isBuilding={false}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="space-y-2">
        {/* Section edit hints */}
        {hasConversation && !isBuilding && (
          <div className="flex flex-wrap gap-1">
            {['Update hero', 'Change pricing', 'Fix footer'].map((hint) => (
              <button
                key={hint}
                onClick={() => setPrompt(hint)}
                className="text-[10px] px-2 py-0.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={hasConversation 
              ? "Update a section or describe changes..." 
              : "Describe the app you want to build..."
            }
            className="pr-10 resize-none text-xs min-h-[60px]"
            rows={2}
            disabled={isBuilding || localLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isBuilding || localLoading}
            size="sm"
            className="absolute right-2 bottom-2 h-6 w-6 p-0"
          >
            {(isBuilding || localLoading) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
