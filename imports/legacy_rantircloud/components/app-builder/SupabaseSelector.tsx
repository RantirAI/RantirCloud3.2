import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Zap, Plus, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { useSupabaseConnections } from '@/hooks/useSupabaseConnections';
import { useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import connectSupabaseDark from '@/assets/connect-supabase-dark.svg';
import connectSupabaseLight from '@/assets/connect-supabase-light.svg';

export function SupabaseSelector() {
  const { connections, loading, initiateOAuth, removeConnection } = useSupabaseConnections();
  const { addConnectedSupabase, removeConnectedSupabase } = useAppBuilderStore();

  // Sync real connections into the app builder store
  useEffect(() => {
    connections.forEach(conn => {
      addConnectedSupabase({ id: conn.id, projectName: conn.project_name });
    });
  }, [connections, addConnectedSupabase]);

  const handleConnect = () => {
    initiateOAuth(window.location.href);
  };

  const handleRemove = async (id: string) => {
    await removeConnection(id);
    removeConnectedSupabase(id);
  };

  const isConnected = connections.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors h-7 ${
            isConnected 
              ? 'border border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
              : 'border border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          <Zap className="h-3 w-3 flex-shrink-0" />
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isConnected ? (
            <span className="max-w-[36px] truncate text-[10px] font-medium">
              {connections[0].project_name.slice(0, 6)}
            </span>
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Supabase</DropdownMenuLabel>
          <div onClick={handleConnect} className="cursor-pointer">
            <img 
              src={connectSupabaseLight} 
              alt="Connect to Supabase" 
              className="h-[25px] w-auto block dark:hidden" 
            />
            <img 
              src={connectSupabaseDark} 
              alt="Connect to Supabase" 
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
                  <Zap className="h-3 w-3 text-emerald-500" />
                  <div className="truncate">
                    <span className="truncate">{conn.project_name}</span>
                    <p className="text-[10px] text-muted-foreground truncate">{conn.supabase_url}</p>
                  </div>
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
        <DropdownMenuItem onClick={() => window.open('https://supabase.com/dashboard', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Supabase Dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
