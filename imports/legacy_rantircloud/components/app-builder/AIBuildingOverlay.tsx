import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAIBuildStep,
  getAICompletedSteps,
  getAITotalSections,
  getAINextSectionName,
} from '@/lib/aiBuildState';

interface AIBuildingOverlayProps {
  className?: string;
}

export function AIBuildingOverlay({ className }: AIBuildingOverlayProps) {
  const [currentStep, setCurrentStep] = useState('Initializing…');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [totalSections, setTotalSections] = useState(0);
  const [nextSectionName, setNextSectionName] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Poll real state at 400ms
  useEffect(() => {
    const interval = setInterval(() => {
      const step = getAIBuildStep();
      const steps = getAICompletedSteps();
      const total = getAITotalSections();
      const next = getAINextSectionName();
      if (step) setCurrentStep(step);
      setCompletedSteps(steps);
      setTotalSections(total);
      setNextSectionName(next);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  const completed = completedSteps.length;
  const progressPct = totalSections > 0 ? Math.round((completed / totalSections) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'absolute top-0 left-0 right-0 z-[9999]',
        className
      )}
      style={{ borderRadius: 'inherit' }}
    >
      {/* Compact top banner */}
      <div
        className="w-full"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--primary)/0.06) 100%)',
          borderBottom: '1px solid hsl(var(--primary)/0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Main strip row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Spinner */}
          <div
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'hsl(var(--primary)/0.12)' }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-medium truncate"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {nextSectionName
                  ? `Generating ${nextSectionName}…`
                  : currentStep || 'Generating…'}
              </span>
              <span
                className="text-sm leading-none flex-shrink-0"
                style={{
                  color: 'hsl(var(--primary))',
                  opacity: cursorVisible ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
              >
                _
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="mt-1.5 w-full rounded-full overflow-hidden"
              style={{ height: '3px', background: 'hsl(var(--muted))' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 100%)' }}
                initial={{ width: '0%' }}
                animate={{ width: totalSections > 0 ? `${progressPct}%` : '8%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Section counter */}
          <span
            className="flex-shrink-0 text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              color: 'hsl(var(--primary))',
              background: 'hsl(var(--primary)/0.1)',
              border: '1px solid hsl(var(--primary)/0.2)',
            }}
          >
            {totalSections > 0 ? `${completed}/${totalSections}` : '…'}
          </span>

          {/* Toggle expand */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            title={expanded ? 'Hide log' : 'Show log'}
          >
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expandable log */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="log"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 py-2 font-mono text-xs space-y-1 max-h-40 overflow-y-auto"
                style={{
                  background: 'hsl(var(--muted)/0.2)',
                  borderTop: '1px solid hsl(var(--border)/0.4)',
                }}
              >
                <AnimatePresence initial={false}>
                  {completedSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2
                        className="h-3 w-3 flex-shrink-0"
                        style={{ color: 'hsl(142 71% 45%)' }}
                      />
                      <span style={{ color: 'hsl(142 71% 45%)' }}>{step}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {currentStep && (
                  <div className="flex items-center gap-2">
                    <Loader2
                      className="h-3 w-3 flex-shrink-0 animate-spin"
                      style={{ color: 'hsl(var(--primary))' }}
                    />
                    <span style={{ color: 'hsl(var(--foreground))' }}>{currentStep}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
