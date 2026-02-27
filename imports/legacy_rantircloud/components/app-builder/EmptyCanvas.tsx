import { MousePointer, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppBuilderSidebarStore } from '@/stores/appBuilderSidebarStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAISidebarStore } from '@/stores/aiSidebarStore';
import websiteOption from '@/assets/app-builder/website-option.svg';
import presentationsOption from '@/assets/app-builder/presentations-option.svg';
import aiWallOption from '@/assets/app-builder/ai-wall-option.svg';

export function EmptyCanvas() {
  const { setActiveTab } = useAppBuilderSidebarStore();
  const { setEmptyCanvasDismissed, currentPage } = useAppBuilderStore();
  const { setActiveTab: setAISidebarTab } = useAISidebarStore();

  const handleBuildWebsite = () => {
    if (currentPage) {
      setEmptyCanvasDismissed(currentPage, true);
    }
    setActiveTab('components');
  };

  const handleStartAIWall = () => {
    if (currentPage) {
      setEmptyCanvasDismissed(currentPage, true);
    }
    // Open the AI sidebar on the 'wall' tab to trigger the AI Wall overlay
    setAISidebarTab('wall');
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center max-w-4xl w-full px-6">
        {/* Option Cards - 3 across */}
        <div className="flex gap-4 mb-8 pointer-events-auto justify-center">
          {/* Start Building with AI First */}
          <div 
            className="group cursor-pointer rounded-xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:shadow-lg flex-1 max-w-[240px]"
            onClick={handleStartAIWall}
          >
            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={aiWallOption} 
                alt="Start Building with AI" 
                className="w-full h-full object-contain"
              />
            </div>
            <h4 className="font-semibold text-sm mb-1">Start Building with AI First</h4>
            <p className="text-xs text-muted-foreground">
              Start building with Rantir's AI Wall for a scrolling array of designs
            </p>
          </div>

          {/* Build a Website or App */}
          <div 
            className="group cursor-pointer rounded-xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:shadow-lg flex-1 max-w-[240px]"
            onClick={handleBuildWebsite}
          >
            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={websiteOption} 
                alt="Build a Website" 
                className="w-full h-full object-contain"
              />
            </div>
            <h4 className="font-semibold text-sm mb-1">Build a Website or App</h4>
            <p className="text-xs text-muted-foreground">
              Start dragging and dropping elements here
            </p>
          </div>

          {/* Build a Presentation - Coming Soon */}
          <div 
            className={cn(
              "rounded-xl border-2 border-border bg-card p-4 opacity-50 cursor-not-allowed text-center flex-1 max-w-[240px]"
            )}
          >
            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={presentationsOption} 
                alt="Build a Presentation" 
                className="w-full h-full object-contain grayscale"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">Build a Presentation</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Create interactive slides and decks
            </p>
          </div>
        </div>
        
        {/* Centered bullet points */}
        <div className="space-y-3 text-sm text-muted-foreground flex flex-col items-center pointer-events-auto">
          <div className="flex items-center gap-3">
            <MousePointer className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Drag components from the left sidebar</span>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Use AI Assistant to generate components</span>
          </div>
          <div className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Nest components to create complex layouts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
