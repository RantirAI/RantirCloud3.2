import { useState } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { MessageSquare, ChevronDown, ChevronRight, Database, Workflow, AppWindow } from 'lucide-react';
import { Conversation } from '@/stores/aiSidebarStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ConversationHistoryProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

export function ConversationHistory({ conversations, onSelectConversation }: ConversationHistoryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Helper to get context icon and color
  const getContextConfig = (pageContext: string) => {
    switch (pageContext) {
      case 'flow':
        return { icon: Workflow, label: 'Flow', color: 'text-blue-500' };
      case 'database':
        return { icon: Database, label: 'Database', color: 'text-green-500' };
      case 'app':
        return { icon: AppWindow, label: 'App', color: 'text-purple-500' };
      default:
        return { icon: MessageSquare, label: 'Chat', color: 'text-gray-500' };
    }
  };

  // Helper to format date groups
  const formatDateGroup = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce((acc, conv) => {
    const dateKey = formatDateGroup(new Date(conv.timestamp));
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No conversation history yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start chatting to see your history here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(groupedConversations).map(([date, convs]) => (
          <div key={date}>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {date}
            </h3>
            <div className="space-y-2">
              {convs.map((conv) => {
                const isExpanded = expandedIds.has(conv.id);
                const contextConfig = getContextConfig(conv.pageContext);
                const ContextIcon = contextConfig.icon;
                const firstUserMsg = conv.messages.find(m => m.role === 'user')?.content;
                const lastMsg = conv.messages[conv.messages.length - 1];
                
                return (
                  <div
                    key={conv.id}
                    className="border rounded-lg bg-card overflow-hidden transition-all hover:shadow-sm"
                  >
                    <button
                      onClick={() => toggleExpand(conv.id)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn("mt-1 p-1.5 rounded-md bg-muted", contextConfig.color)}>
                        <ContextIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {contextConfig.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(conv.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2 mb-1">
                          {firstUserMsg || conv.preview}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{conv.messages.length} messages</span>
                          {lastMsg && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                Last: {lastMsg.role === 'user' ? 'You' : 'AI'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-3 space-y-2">
                        {conv.messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'text-xs p-2 rounded',
                              msg.role === 'user'
                                ? 'bg-primary/10 text-primary-foreground ml-2'
                                : 'bg-muted mr-2'
                            )}
                          >
                            <div className="font-medium text-[10px] uppercase tracking-wide mb-1 opacity-70">
                              {msg.role === 'user' ? 'You' : 'AI'}
                            </div>
                            {msg.role === 'assistant' ? (
                              <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => onSelectConversation(conv.id)}
                          className="w-full text-xs text-primary hover:underline mt-2 text-center"
                        >
                          Continue this conversation
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
