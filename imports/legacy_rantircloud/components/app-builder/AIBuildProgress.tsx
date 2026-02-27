import { useEffect, useState } from 'react';
import { Check, Circle, Loader2, AlertCircle, Sparkles, X, Bot } from 'lucide-react';
import { BuildStep } from '@/hooks/useAIAppBuildStream';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getIsAIBuilding } from '@/lib/aiBuildState';

interface AIBuildProgressProps {
  steps: BuildStep[];
  progress: number;
  isBuilding: boolean;
  onCancel?: () => void;
  prompt?: string;
  streamedSections?: number;
}

export function AIBuildProgress({
  steps, 
  progress, 
  isBuilding,
  onCancel,
}: AIBuildProgressProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRendering(getIsAIBuilding());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!isBuilding) return;
    setElapsedTime(0);
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isBuilding]);

  if (steps.length === 0 && !isBuilding) return null;

  const currentBuildingStep = steps.find(s => s.status === 'building');
  const hasErrors = steps.some(s => s.status === 'error');
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const allStepsDone = steps.length > 0 && steps.every(s => s.status === 'complete' || s.status === 'error');
  const isComplete = !isBuilding && allStepsDone && !isRendering;
  
  // Count streamed sections (component steps with streamedCount data)
  const streamedSections = steps.filter(s => s.type === 'component' && s.status === 'complete').length;
  const latestStreamedSection = [...steps].reverse().find(s => s.type === 'component' && s.status === 'complete' && s.data?.sectionName);
  const latestSectionName = latestStreamedSection?.data?.sectionName;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {/* Header with status */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              isBuilding ? "bg-primary/15" : hasErrors ? "bg-destructive/15" : "bg-green-500/15"
            )}>
              {isBuilding ? (
                <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
              ) : hasErrors ? (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Check className="h-3.5 w-3.5 text-green-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold leading-none">
                {isBuilding ? 'Generating Design' : hasErrors ? 'Build Incomplete' : 'Build Complete'}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {isBuilding 
                  ? (latestSectionName 
                    ? `Streaming: ${latestSectionName} (${streamedSections} sections on canvas)`
                    : currentBuildingStep?.message || 'Processing...') 
                  : hasErrors 
                    ? `${completedSteps}/${steps.length} steps completed`
                    : `${streamedSections > 0 ? `${streamedSections} sections` : `${steps.length} steps`} · ${formatTime(elapsedTime)}`
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isBuilding && (
              <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
                {formatTime(elapsedTime)}
              </span>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                title={isBuilding ? "Stop generation" : "Dismiss"}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-3.5 py-2 bg-background/80">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="font-medium">
              {isBuilding ? `Step ${completedSteps + 1} of ${Math.max(steps.length, completedSteps + 1)}` : 'Completed'}
            </span>
            <span className="font-mono tabular-nums">{progress}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-1.5" />
            {isBuilding && (
              <motion.div
                className="absolute top-0 left-0 h-1.5 bg-primary/30 rounded-full"
                animate={{ width: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ maxWidth: `${progress}%` }}
              />
            )}
          </div>
        </div>

        {/* Steps list */}
        <div className="px-3.5 py-2">
          <ScrollArea className="max-h-40">
            <AnimatePresence mode="popLayout">
              {steps.map((step, index) => {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={cn(
                      'flex items-center gap-2 py-1 text-xs',
                      step.status === 'pending' && 'opacity-30'
                    )}
                  >
                    <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                      {step.status === 'complete' && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                          <Check className="h-3 w-3 text-green-500" />
                        </motion.div>
                      )}
                      {step.status === 'building' && (
                        <Loader2 className="h-3 w-3 text-primary animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      )}
                    </div>

                    <span className={cn(
                      'leading-none',
                      step.status === 'error' && 'text-destructive',
                      step.status === 'building' && 'text-primary font-medium',
                      step.status === 'complete' && 'text-muted-foreground',
                      step.status === 'pending' && 'text-muted-foreground/50'
                    )}>
                      {step.message}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Initial thinking state */}
            {isBuilding && steps.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 py-1.5"
              >
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Analyzing your request...</span>
              </motion.div>
            )}
          </ScrollArea>
        </div>

        {/* Rendering phase indicator */}
        {allStepsDone && isRendering && !isBuilding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-3.5 py-2 bg-primary/5 border-t border-primary/15"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] text-primary font-medium">Rendering components...</span>
                <div className="flex gap-0.5 mt-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="h-0.5 flex-1 bg-primary/20 rounded-full overflow-hidden"
                    >
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ width: '50%' }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success footer */}
        {isComplete && !hasErrors && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-3.5 py-2 bg-green-500/5 border-t border-green-500/15"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-green-500" />
              <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                Design added to canvas
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
