import { Button } from '@/components/ui/button';
import { Bug, Hand, Undo2, Redo2, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/lib/flow-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useReactFlow } from '@xyflow/react';
import { useFlowHistory } from '@/hooks/useFlowHistory';

interface FlowToolbarProps {
  onToggleDebugger: () => void;
  debugLogCount?: number;
  showDebugger?: boolean;
}

export function FlowToolbar({ onToggleDebugger, debugLogCount = 0, showDebugger = false }: FlowToolbarProps) {
  const { isDragModeEnabled, setIsDragModeEnabled, setUserHasAdjustedViewport } = useFlowStore();
  const { fitView } = useReactFlow();
  const { handleUndo, handleRedo, canUndo, canRedo } = useFlowHistory();

  const handleToggleDragMode = () => {
    setIsDragModeEnabled(!isDragModeEnabled);
  };

  const handleCenterView = () => {
    fitView({ padding: 0.3, duration: 200 });
    setUserHasAdjustedViewport(true);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleDebugger}
                className={cn(
                  "relative h-9 w-9",
                  showDebugger && "bg-accent text-accent-foreground"
                )}
              >
                <Bug className="h-4 w-4" />
                {debugLogCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {debugLogCount > 9 ? '9+' : debugLogCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Debugger {showDebugger ? '(Open)' : ''}</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleDragMode}
                className={cn(
                  "h-9 w-9",
                  isDragModeEnabled && "bg-accent text-accent-foreground"
                )}
              >
                <Hand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pan Mode {isDragModeEnabled ? '(Active)' : ''}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCenterView}
                className="h-9 w-9"
              >
                <Crosshair className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Center View</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn("h-9 w-9", !canUndo && "opacity-50 cursor-not-allowed")}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canUndo ? 'Undo' : 'Nothing to undo'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn("h-9 w-9", !canRedo && "opacity-50 cursor-not-allowed")}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canRedo ? 'Redo' : 'Nothing to redo'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
