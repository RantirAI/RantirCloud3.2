import { 
  Maximize2, 
  Minimize2, 
  Palette, 
  Shuffle, 
  LayoutGrid, 
  Eye,
  Sparkles,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AIWallActionOverlayProps {
  onExploreWide?: () => void;
  onExploreNarrow?: () => void;
  onChangeStyle?: () => void;
  onRemixColors?: () => void;
  onShuffleLayout?: () => void;
  onSeeViews?: () => void;
  onUseInProject?: () => void;
  disabled?: boolean;
}

export function AIWallActionOverlay({
  onExploreWide,
  onExploreNarrow,
  onChangeStyle,
  onRemixColors,
  onShuffleLayout,
  onSeeViews,
  onUseInProject,
  disabled = false,
}: AIWallActionOverlayProps) {
  const actions = [
    { icon: Maximize2, label: 'Explore wide', onClick: onExploreWide },
    { icon: Minimize2, label: 'Explore narrow', onClick: onExploreNarrow },
    { icon: Sparkles, label: 'Change style', onClick: onChangeStyle },
    { icon: Palette, label: 'Remix colors', onClick: onRemixColors },
    { icon: Shuffle, label: 'Shuffle layout', onClick: onShuffleLayout },
    { icon: Eye, label: 'See other views', onClick: onSeeViews },
  ];

  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-background/80 backdrop-blur-sm rounded-xl border border-border shadow-lg">
      <TooltipProvider>
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                disabled={disabled || !action.onClick}
                className="h-8 px-3 text-xs gap-1.5 hover:bg-muted"
              >
                <action.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{action.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={onUseInProject}
              disabled={disabled || !onUseInProject}
              className="h-8 px-4 text-xs gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Use in Project</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export to App Builder</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
