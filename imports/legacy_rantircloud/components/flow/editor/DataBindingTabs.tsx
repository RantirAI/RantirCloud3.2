
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Variable, Braces, Wand, Repeat, Database, Eye } from 'lucide-react';
import { VariableBindingButton } from './VariableBindingButton';
import { JsonMapperButton } from './JsonMapperButton';
import { LoopDataPreview } from './LoopDataPreview';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useFlowStore } from '@/lib/flow-store';
import { dataContextManager } from '@/lib/data-context';
import { DataPreview } from './DataPreview';

interface DataBindingTabsProps {
  nodeId: string;
  inputField: string;
  onSelectVariable: (variable: string) => void;
  onSelectMapping: (mapping: string) => void;
  variables: { label: string; value: string; description?: string }[];
  showJsonMapping?: boolean;
  isVariableBound?: boolean;
  boundVariableName?: string;
  onUnbind?: () => void;
}

export function DataBindingTabs({
  nodeId,
  inputField,
  onSelectVariable,
  onSelectMapping,
  variables,
  showJsonMapping = true,
  isVariableBound = false,
  boundVariableName,
  onUnbind
}: DataBindingTabsProps) {
  const [activeTab, setActiveTab] = useState<"livedata" | "loop" | "nodes" | "json" | "ai">("livedata");
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { nodes, edges } = useFlowStore();
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as "livedata" | "loop" | "nodes" | "json" | "ai");
    
    if (value === "json") {
      setIsJsonDialogOpen(true);
    } else {
      setIsJsonDialogOpen(false);
    }
  };

  const handleCloseJsonDialog = () => {
    setIsJsonDialogOpen(false);
  };
  
  const generateWithAi = async () => {
    if (!aiInstructions.trim()) {
      toast.error("Please provide instructions for the AI");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      setIsJsonDialogOpen(true);
      setTimeout(() => {
        const jsonMapperDialog = document.querySelector('[data-tab-value="ai-mapper"]');
        if (jsonMapperDialog) {
          (jsonMapperDialog as HTMLElement).click();
        }
      }, 100);
    } catch (error) {
      toast.error('Error with AI mapper');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get connected node data for live data preview
  const getConnectedNodesData = () => {
    const connectedNodeIds = edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
    
    return connectedNodeIds.map(sourceNodeId => {
      const nodeData = dataContextManager.getNodeData(sourceNodeId);
      const node = nodes.find(n => n.id === sourceNodeId);
      return {
        nodeId: sourceNodeId,
        nodeName: node?.data.label || sourceNodeId,
        data: nodeData?.outputs || {}
      };
    }).filter(item => Object.keys(item.data).length > 0);
  };

  const connectedNodesData = getConnectedNodesData();

  return (
    <div className="mt-2 flex flex-col font-sans">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
        <TabsList className="h-7 p-0 bg-transparent space-x-1">
          <TabsTrigger 
            value="livedata" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted flex items-center"
          >
            <Eye className="h-3 w-3 mr-1" />
            Live Data
          </TabsTrigger>
          
          <TabsTrigger 
            value="loop" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted flex items-center"
          >
            <Repeat className="h-3 w-3 mr-1" />
            Loop Data
          </TabsTrigger>
          
          <TabsTrigger 
            value="nodes" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted flex items-center"
          >
            <Variable className="h-3 w-3 mr-1" />
            Variables
          </TabsTrigger>
          
          {showJsonMapping && (
            <TabsTrigger 
              value="json" 
              className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted flex items-center"
            >
              <Braces className="h-3 w-3 mr-1" />
              JSON Builder
            </TabsTrigger>
          )}
          
          <TabsTrigger 
            value="ai" 
            className="text-xs h-6 px-2 py-0 data-[state=active]:bg-muted flex items-center"
          >
            <Wand className="h-3 w-3 mr-1" />
            AI Helper
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="livedata" className="mt-3">
          <div className="space-y-3 min-h-[350px]">
            {connectedNodesData.length > 0 ? (
              connectedNodesData.map(({ nodeId: sourceNodeId, nodeName, data }) => (
                <DataPreview
                  key={sourceNodeId}
                  data={data}
                  title={`${nodeName} Output Data`}
                  maxHeight="300px"
                  onSelectPath={(path) => {
                    const variablePath = `{{${sourceNodeId}.${path}}}`;
                    onSelectVariable(variablePath);
                    toast.success(`Selected: ${variablePath}`);
                  }}
                  showSelectButtons={true}
                />
              ))
            ) : (
              <div className="p-8 text-center border rounded-lg bg-muted/20">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Live Data Available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Run connected nodes to see their output data here for easy binding
                </p>
                <div className="text-xs text-gray-400">
                  Data from test runs will appear here automatically
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="loop" className="mt-3">
          <div className="min-h-[350px]">
            <LoopDataPreview
              nodeId={nodeId}
              onSelectItem={(path, value) => {
                onSelectVariable(path);
                toast.success(`Selected: ${path}`);
              }}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="nodes" className="mt-3">
          <div className="p-2 min-h-[350px]">
            <VariableBindingButton
              onVariableSelect={onSelectVariable}
              variables={variables}
              isBound={isVariableBound}
              boundVariableName={boundVariableName}
              onUnbind={onUnbind}
              expanded={true}
              position="inline"
              size="xs" 
              variant="ghost"
              nodeId={nodeId}
              includeLoopVariables={true}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="ai" className="mt-3">
          <div className="p-3 space-y-4 border rounded-md min-h-[350px]">
            <Textarea
              placeholder="Describe what you want to build (e.g., 'Map the user's name and email to a payload structure')"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="h-24 text-sm"
            />
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
              onClick={generateWithAi}
              disabled={isGenerating || !aiInstructions.trim()}
            >
              {isGenerating ? (
                <>
                  <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-r-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand className="h-3 w-3 mr-2" />
                  Generate JSON with AI
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {isJsonDialogOpen && (
        <JsonMapperButton
          nodeId={nodeId}
          inputField={inputField}
          onSelectMapping={onSelectMapping}
          useAdvancedMapper={true}
          useAiMapper={activeTab === "ai"}
          onClose={handleCloseJsonDialog}
          open={isJsonDialogOpen}
          initialTabId={activeTab === "ai" ? "ai-mapper" : "visual-builder"}
        />
      )}
    </div>
  );
}
