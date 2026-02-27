import { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Workflow, Plus, Check, X } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FlowProject {
  id: string;
  name: string;
}

export function FlowSelector() {
  const [flows, setFlows] = useState<FlowProject[]>([]);
  const [loading, setLoading] = useState(false);
  const { connectedFlows, addConnectedFlow, removeConnectedFlow, currentProject } = useAppBuilderStore();
  const { user } = useAuth();

  useEffect(() => {
    loadFlows();
  }, [user, currentProject?.workspace_id]);

  const loadFlows = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('flow_projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (currentProject?.workspace_id) {
        query = query.eq('workspace_id', currentProject.workspace_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (flow: FlowProject) => {
    const isActive = connectedFlows.some(f => f.id === flow.id);
    if (isActive) {
      removeConnectedFlow(flow.id);
    } else {
      addConnectedFlow({ id: flow.id, name: flow.name });
    }
  };

  const isConnected = connectedFlows.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors h-7 ${
            isConnected 
              ? 'border border-purple-500/60 bg-purple-500/10 text-purple-700 dark:text-purple-400' 
              : 'border border-dashed border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
          }`}
        >
          <Workflow className="h-3 w-3 flex-shrink-0" />
          {isConnected ? (
            <span className="max-w-[36px] truncate text-[10px] font-medium">
              {connectedFlows[0].name.slice(0, 6)}
            </span>
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Connect Flow</DropdownMenuLabel>
        
        {/* Active connections shown first */}
        {connectedFlows.length > 0 && (
          <>
            {connectedFlows.map((flow) => (
              <DropdownMenuItem key={flow.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-purple-500 flex-shrink-0" />
                  <Workflow className="h-3 w-3 text-purple-500" />
                  <span className="truncate">{flow.name.slice(0, 24)}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeConnectedFlow(flow.id); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {loading ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">Loading flows...</span>
          </DropdownMenuItem>
        ) : flows.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No flows found</span>
          </DropdownMenuItem>
        ) : (
          flows.filter(f => !connectedFlows.some(cf => cf.id === f.id)).map((flow) => (
            <DropdownMenuItem 
              key={flow.id} 
              onClick={() => handleToggle(flow)}
              className="flex items-center gap-2"
            >
              <Workflow className="h-3 w-3 text-purple-500" />
              <span className="truncate">{flow.name.slice(0, 24)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open('/flows', '_blank')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Flow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
