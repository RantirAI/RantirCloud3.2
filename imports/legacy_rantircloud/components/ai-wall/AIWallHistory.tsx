import { useEffect, useState } from 'react';
import { Clock, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadSessionList, loadSession, deleteSession, AIWallSessionRow } from '@/services/aiWallPersistence';
import { useAIWallStore } from '@/stores/aiWallStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function AIWallHistory() {
  const [sessions, setSessions] = useState<AIWallSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { setCurrentGeneration, currentGeneration } = useAIWallStore();

  const fetchSessions = async () => {
    setLoading(true);
    const data = await loadSessionList();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpen = async (sessionId: string) => {
    setLoadingId(sessionId);
    const generation = await loadSession(sessionId);
    if (generation) {
      setCurrentGeneration(generation);
      toast.success('Design loaded');
    } else {
      toast.error('Failed to load design');
    }
    setLoadingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const ok = await deleteSession(sessionId);
    if (ok) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentGeneration?.id === sessionId) {
        setCurrentGeneration(null);
      }
      toast.success('Design deleted');
    } else {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">No past designs yet</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Generate a design to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-1.5">
        <h3 className="text-xs font-medium text-foreground mb-2">Past Designs</h3>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleOpen(session.id)}
            className={cn(
              "w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group",
              currentGeneration?.id === session.id && "border-primary/50 bg-primary/5"
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {session.prompt.length > 60 ? session.prompt.slice(0, 60) + '...' : session.prompt}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {loadingId === session.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(e, session.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
