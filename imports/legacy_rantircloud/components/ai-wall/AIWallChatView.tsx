import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIWallStore, ChatMessage } from '@/stores/aiWallStore';
import { cn } from '@/lib/utils';
import { Bot, User, Sparkles, AlertCircle, ChevronDown, Palette, LayoutGrid } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

function AgentReasoningMessage({ message }: { message: ChatMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = message.metadata;

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-relaxed">{message.content}</p>

        {/* Intent details */}
        {meta?.intent && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
              Design reasoning
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 p-2 rounded-md bg-muted/50 border border-border space-y-1.5">
                {meta.intent.industry && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Industry:</span>
                    <span className="text-[10px] font-medium text-foreground">{meta.intent.industry}</span>
                  </div>
                )}
                {meta.intent.mood && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Mood:</span>
                    <span className="text-[10px] font-medium text-foreground">{meta.intent.mood}</span>
                  </div>
                )}
                {meta.intent.keywords && meta.intent.keywords.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Keywords:</span>
                    {meta.intent.keywords.slice(0, 5).map((kw, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Token color swatches */}
        {meta?.tokens?.colors && Object.keys(meta.tokens.colors).length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <Palette className="w-3 h-3 text-muted-foreground" />
            {Object.entries(meta.tokens.colors).slice(0, 5).map(([name, color]) => (
              <div
                key={name}
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: color }}
                title={`${name}: ${color}`}
              />
            ))}
          </div>
        )}

        {/* Agent results */}
        {meta?.agentResults && meta.agentResults.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {meta.agentResults.map((result, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  result.status === 'success' ? "bg-emerald-500" : "bg-destructive"
                )} />
                <span className="text-[10px] text-muted-foreground">{result.agent}</span>
                {result.layout && (
                  <span className="text-[10px] text-foreground/60">— {result.layout}</span>
                )}
                {result.sectionCount && result.sectionCount > 1 && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">{result.sectionCount} sections</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerationMessage({ message }: { message: ChatMessage }) {
  const meta = message.metadata;
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-foreground">{message.content}</span>
          </div>
          {meta?.successCount !== undefined && meta?.totalCount !== undefined && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {meta.successCount}/{meta.totalCount} variants generated successfully
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="flex gap-2 items-start max-w-[85%]">
        <div className="p-2 px-3 rounded-lg bg-primary text-primary-foreground">
          <p className="text-xs leading-relaxed">{message.content}</p>
        </div>
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
      </div>
      <div className="p-2 rounded-md bg-destructive/5 border border-destructive/20">
        <p className="text-xs text-destructive">{message.content}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-violet-500" />
      </div>
      <div className="p-2 rounded-md bg-muted/50">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export function AIWallChatView() {
  const { chatMessages, isGenerating } = useAIWallStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, isGenerating]);

  if (chatMessages.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        {chatMessages.map((msg) => {
          switch (msg.role) {
            case 'user':
              return <UserMessage key={msg.id} message={msg} />;
            case 'system':
              return <AgentReasoningMessage key={msg.id} message={msg} />;
            case 'generation':
              return <GenerationMessage key={msg.id} message={msg} />;
            case 'error':
              return <ErrorMessage key={msg.id} message={msg} />;
            default:
              return null;
          }
        })}
        {isGenerating && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
