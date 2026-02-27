
import React, { useState, useEffect } from 'react';
import { Edge } from '@xyflow/react';
import FlowCanvas from './FlowCanvas';
import { NodeProperties } from './NodeProperties';
import { AddNodeDialog } from './AddNodeDialog';
import { useFlowStore } from '@/lib/flow-store';
import { NodePalette } from './NodePalette';
import { FlowNode } from '@/types/flowTypes';
import { DebugPanel } from '@/components/DebugPanel';
import { EmulatorPanel } from '@/components/EmulatorPanel';
import { FlowToolbar } from './FlowToolbar';
import { useFlowHistory } from '@/hooks/useFlowHistory';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface FlowContentProps {
  nodes: FlowNode[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: any) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  showEmulator?: boolean;
  onOpenEmbedConfig?: () => void;
}

export function FlowContent({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDragOver,
  onDrop,
  showEmulator,
  onOpenEmbedConfig,
}: FlowContentProps) {
  const { currentSelectedNodeId, setCurrentSelectedNodeId, debugLogs } = useFlowStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDebugDrawer, setShowDebugDrawer] = useState(false);
  
  const { handleUndo, handleRedo } = useFlowHistory();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  const handlePaneClick = () => {
    if (currentSelectedNodeId) {
      setCurrentSelectedNodeId(null);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col h-full relative bg-muted/30 font-sans overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Canvas Area */}
        <ResizablePanel defaultSize={showEmulator ? 55 : 75} minSize={30}>
          <div className="h-full relative">
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onPaneClick={handlePaneClick}
            />
            
            <FlowToolbar 
              onToggleDebugger={() => setShowDebugDrawer(true)}
              debugLogCount={debugLogs.length}
              showDebugger={showDebugDrawer}
            />
            
            <DebugPanel 
              isOpen={showDebugDrawer}
              onClose={() => setShowDebugDrawer(false)}
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Properties Panel */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <div className="h-full bg-background overflow-hidden border-l">
            {!isSidebarCollapsed && (
              <div className="h-full min-h-0 flex flex-col overflow-hidden">
                {currentSelectedNodeId ? (
                  <NodeProperties />
                ) : (
                  <NodePalette />
                )}
              </div>
            )}
            
            {isSidebarCollapsed && (
              <div className="h-full flex items-center justify-center rotate-90">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {currentSelectedNodeId ? "Node Properties" : "Node Palette"}
                </span>
              </div>
            )}
          </div>
        </ResizablePanel>
        
        {showEmulator && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
              <div className="h-full border-l overflow-hidden">
                <EmulatorPanel 
                  onOpenEmbedConfig={onOpenEmbedConfig}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      
      <AddNodeDialog />
    </div>
  );
}
