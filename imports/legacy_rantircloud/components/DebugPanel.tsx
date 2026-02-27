
import React, { useState } from 'react';
import { Button } from './ui/button';
import { useParams } from 'react-router-dom';
import { flowService } from '@/services/flowService';
import { DebugDrawer } from './DebugDrawer';
import { useDebugData } from './debug/DebugData';
import { Bug } from 'lucide-react';
import { useFlowStore } from '@/lib/flow-store';

interface DebugPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DebugPanel({ isOpen = false, onClose }: DebugPanelProps = {}) {
  const { id: flowProjectId } = useParams<{ id: string }>();
  const [botpressData, setBotpressData] = useState<any>(null);
  const { environmentVariables } = useDebugData(flowProjectId);
  const { 
    isFlowRunning,
    debugLogs,
    errorNodes,
    flowStartTime, 
    flowEndTime,
    clearDebugLogs
  } = useFlowStore();

  // Calculate execution duration
  const executionDuration = flowStartTime && flowEndTime 
    ? ((flowEndTime - flowStartTime) / 1000).toFixed(2) + 's'
    : null;

  return (
    <DebugDrawer 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && onClose) {
          onClose();
        }
      }}
      webflowData={botpressData}
    />
  );
}
