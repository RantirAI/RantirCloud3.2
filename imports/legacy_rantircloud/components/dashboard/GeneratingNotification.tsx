import { Card } from "@/components/ui/card";
import Lottie from "lottie-react";
import generatingAnimation from "@/assets/generating-loader.json";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getIsAIBuilding } from "@/lib/aiBuildState";
import { Loader2, Check, Sparkles } from "lucide-react";

interface GeneratingNotificationProps {
  isGenerating: boolean;
  projectTypes: string[];
}

export function GeneratingNotification({ isGenerating, projectTypes }: GeneratingNotificationProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  // Poll the AI building state to detect the rendering phase
  useEffect(() => {
    if (!isGenerating) {
      // When generation stops, check if we're still rendering
      const interval = setInterval(() => {
        const building = getIsAIBuilding();
        setIsRendering(building);
        if (!building) {
          setShowComplete(true);
          clearInterval(interval);
          // Auto-hide after 3 seconds
          setTimeout(() => setShowComplete(false), 3000);
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      setShowComplete(false);
      setIsRendering(false);
    }
  }, [isGenerating]);

  // Show during generation, rendering, or briefly after completion
  if (!isGenerating && !isRendering && !showComplete) return null;

  const projectTypeLabel = projectTypes.length > 0 
    ? projectTypes.join(", ") 
    : "project";

  const isRenderingPhase = !isGenerating && isRendering;
  const isCompletePhase = !isGenerating && !isRendering && showComplete;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-fade-in">
      <Card className="w-80 shadow-xl border-2 overflow-hidden rounded-xl">
        {/* Lottie Animation - Full width and height */}
        <div className="relative w-full h-40 overflow-hidden">
          <Lottie 
            animationData={generatingAnimation}
            loop={!isCompletePhase}
            autoplay={true}
            className="absolute inset-0 w-full h-full"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* Status Text */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold leading-tight">
              {isCompletePhase
                ? "Your project is ready!"
                : isRenderingPhase
                ? "Rendering your design..."
                : `Generating ${projectTypeLabel}...`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isCompletePhase
                ? "All sections have been placed on the canvas."
                : isRenderingPhase
                ? "Components are being placed on the canvas. Almost there!"
                : "AI is creating your project. This may take a moment."}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {isCompletePhase ? (
              <>
                <div className="flex-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </div>
                <div className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-primary font-medium">Complete</span>
                </div>
              </>
            ) : isRenderingPhase ? (
              <>
                <div className="flex-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '90%' }} />
                </div>
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  <span className="text-[10px] text-primary font-medium">Rendering</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-[10px] text-muted-foreground">Processing</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
