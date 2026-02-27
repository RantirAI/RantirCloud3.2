
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Save, 
  Play, 
  Settings2, 
  Loader2, 
  ChevronDown,
  Activity,
  BarChart3,
  Puzzle,
  Variable,
  MessageSquare,
  PanelRightClose,
} from 'lucide-react';
import { NewFlowDialog } from './NewFlowDialog';
import { EnvironmentManager } from './EnvironmentManager';
import { EditableFlowName } from '@/components/EditableFlowName';

import { FlowMonitoringDashboard } from './flow/FlowMonitoringDashboard';
import { FlowVariablesManager } from './flow/FlowVariablesManager';
import { FlowDeployDropdown } from './flow/FlowDeployDropdown';
import { useFlowStore } from '@/lib/flow-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface FlowBuilderHeaderProps {
  projectName: string;
  flowProjectId?: string;
  isSaving: boolean;
  isAutosaving: boolean;
  lastSavedTime: Date | null;
  flowData: any;
  onSave: () => Promise<void>;
  onExport: () => void;
  onOpenIntegrationDialog: () => void;
  onNameChange?: (newName: string) => void;
  hasAiAgentNodes?: boolean;
  showEmulator?: boolean;
  onToggleEmulator?: () => void;
  onOpenDeploySidebar?: () => void;
}

export function FlowBuilderHeader({
  projectName,
  flowProjectId,
  isSaving,
  isAutosaving,
  lastSavedTime,
  flowData,
  onSave,
  onExport,
  onOpenIntegrationDialog,
  onNameChange,
  hasAiAgentNodes,
  showEmulator,
  onToggleEmulator,
  onOpenDeploySidebar
}: FlowBuilderHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(projectName);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  
  const { simulateFlow, isFlowRunning, autoLayout, isDragModeEnabled, setIsDragModeEnabled } = useFlowStore();

  const handleNameSubmit = () => {
    setIsEditingName(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(projectName);
      setIsEditingName(false);
    }
  };

  const handleRunFlow = async () => {
    try {
      await simulateFlow(flowProjectId);
    } catch (error) {
      console.error('Error running flow:', error);
    }
  };

  return (
    <div className="border-b bg-background px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {flowProjectId ? (
            <EditableFlowName
              initialName={projectName}
              flowId={flowProjectId}
              onUpdate={onNameChange}
              className="text-lg"
            />
          ) : (
            <h4 className="text-lg font-semibold text-foreground">
              {projectName}
            </h4>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {hasAiAgentNodes && onToggleEmulator && (
            <Button
              size="sm"
              variant={showEmulator ? "default" : "outline"}
              onClick={onToggleEmulator}
            >
              {showEmulator ? (
                <>
                  <PanelRightClose className="h-4 w-4 mr-1" />
                  Hide Agent Chat
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  AI Agent Chat
                </>
              )}
            </Button>
          )}
          
          <FlowVariablesManager icon={Variable} label="Variables & Secrets" />
          
          <Button variant="outline" size="sm" onClick={onOpenIntegrationDialog}>
            <Puzzle className="h-4 w-4 mr-1" />
            Integrations
          </Button>
          
          {flowProjectId && (
            <Dialog open={isMonitoringOpen} onOpenChange={setIsMonitoringOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Monitoring
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Flow Monitoring Dashboard</DialogTitle>
                </DialogHeader>
                <FlowMonitoringDashboard flowProjectId={flowProjectId} />
              </DialogContent>
            </Dialog>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                Settings
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[380px] max-w-[520px] bg-background border shadow-lg z-50">
              <div className="px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-3">Layout Controls</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auto Layout (Top to Bottom)</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => autoLayout('TB')}
                        className="h-8 px-3 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auto Layout (Left to Right)</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => autoLayout('LR')}
                        className="h-8 px-3 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Draggable Mode</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDragModeEnabled}
                          onChange={(e) => setIsDragModeEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t mx-4"></div>
              <div className="px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-3">Flow Management</div>
                <div className="space-y-3">
                  <div className="w-full">
                    <EnvironmentManager />
                  </div>
                  <div className="w-full">
                    <NewFlowDialog />
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={onSave}
            variant="outline"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>

          {flowProjectId && (
            <FlowDeployDropdown 
              flowProjectId={flowProjectId} 
              flowName={projectName}
              onOpenSidebar={onOpenDeploySidebar}
              hasAiAgentNodes={hasAiAgentNodes}
            />
          )}

          <Button
            type="button"
            onClick={handleRunFlow}
            variant="default"
            size="sm"
            disabled={isFlowRunning}
          >
            {isFlowRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run Flow
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
