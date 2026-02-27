import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Plus, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { useGitHubConnections } from '@/hooks/useGitHubConnections';
import { useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import connectGitHubDark from '@/assets/connect-github-dark.svg';
import connectGitHubLight from '@/assets/connect-github-light.svg';

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export function GitHubSelector() {
  const { connections, loading, initiateOAuth, removeConnection } = useGitHubConnections();
  const { addConnectedGitHub, removeConnectedGitHub } = useAppBuilderStore();

  // Sync real connections into the app builder store
  useEffect(() => {
    connections.forEach(conn => {
      addConnectedGitHub({ id: conn.id, repo: conn.github_username });
    });
  }, [connections, addConnectedGitHub]);

  const handleConnect = () => {
    initiateOAuth(window.location.href);
  };

  const handleRemove = async (id: string) => {
    await removeConnection(id);
    removeConnectedGitHub(id);
  };

  const isConnected = connections.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors h-7 ${
            isConnected 
              ? 'border border-zinc-500/60 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300' 
              : 'border border-dashed border-zinc-500/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/10'
          }`}
        >
          <GitHubIcon className="w-3 h-3 flex-shrink-0" />
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isConnected ? (
            <span className="max-w-[36px] truncate text-[10px] font-medium">
              {connections[0].github_username.slice(0, 6)}
            </span>
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">GitHub</DropdownMenuLabel>
          <div onClick={handleConnect} className="cursor-pointer">
            <img 
              src={connectGitHubLight} 
              alt="Connect to GitHub" 
              className="h-[25px] w-auto block dark:hidden" 
            />
            <img 
              src={connectGitHubDark} 
              alt="Connect to GitHub" 
              className="h-[25px] w-auto hidden dark:block" 
            />
          </div>
        </div>
        
        {connections.length > 0 && (
          <>
            {connections.map((conn) => (
              <DropdownMenuItem key={conn.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  {conn.avatar_url && (
                    <img src={conn.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  <span className="truncate">{conn.github_username}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemove(conn.id); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open('https://github.com/new', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Create New Repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
