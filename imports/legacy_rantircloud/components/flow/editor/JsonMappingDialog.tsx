
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogContentInner } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Braces, Wand } from 'lucide-react';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { NodePlugin } from '@/types/node-plugin';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VisualJsonBuilder } from './VisualJsonBuilder';
import { SimpleAiMapper } from './SimpleAiMapper';

interface JsonMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNodeId: string;
  targetNodeId: string;
  targetInputField: string;
  onSaveMapping: (mapping: string) => void;
  initialTabId?: string;
}

export function JsonMappingDialog({ 
  open, 
  onOpenChange, 
  sourceNodeId, 
  targetNodeId, 
  targetInputField,
  onSaveMapping,
  initialTabId = "visual-builder" 
}: JsonMappingDialogProps) {
  const { nodes } = useFlowStore();
  const [sourceNode, setSourceNode] = useState<any>(null);
  const [targetNode, setTargetNode] = useState<any>(null);
  const [sourcePlugin, setSourcePlugin] = useState<NodePlugin | undefined>(undefined);
  const [targetPlugin, setTargetPlugin] = useState<NodePlugin | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>(initialTabId);
  const [payloadJson, setPayloadJson] = useState<any>({});
  const [availableVariables, setAvailableVariables] = useState<Record<string, any>>({});

  // Load node data
  useEffect(() => {
    if (open) {
      // Reset active tab to initial when dialog opens
      setActiveTab(initialTabId);
      
      const source = nodes.find(n => n.id === sourceNodeId);
      const target = nodes.find(n => n.id === targetNodeId);
      
      if (source && target) {
        setSourceNode(source);
        setTargetNode(target);
        
        const srcPlugin = nodeRegistry.getPlugin(source.data.type);
        const tgtPlugin = nodeRegistry.getPlugin(target.data.type);
        
        setSourcePlugin(srcPlugin);
        setTargetPlugin(tgtPlugin);
      }
    }
  }, [open, nodes, sourceNodeId, targetNodeId, initialTabId]);

  // Get available variables from connected nodes
  useEffect(() => {
    // Get incoming connections to this node
    const { edges } = useFlowStore.getState();
    const incomingEdges = edges.filter(edge => edge.target === targetNodeId);
    const sourceNodeIds = incomingEdges.map(edge => edge.source);
    
    // Get variables from each source node
    const variables: Record<string, any> = {};
    
    sourceNodeIds.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;
      
      const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
      if (!plugin || !plugin.outputs) return;
      
      plugin.outputs.forEach(output => {
        const nodeName = sourceNode.data.label || sourceId;
        variables[`${nodeName}.${output.name}`] = {
          type: output.type,
          description: `${sourceNode.data.label} > ${output.name}`,
          nodeId: sourceId
        };
      });
    });
    
    // Also add environment variables
    variables["env.API_KEY"] = {
      type: "string",
      description: "Environment variable: API_KEY"
    };
    
    setAvailableVariables(variables);
  }, [nodes, targetNodeId]);

  const handlePayloadChange = (newPayload: any) => {
    setPayloadJson(newPayload);
  };

  const handleSavePayload = () => {
    try {
      // Convert the payload to a string
      const jsonString = JSON.stringify(payloadJson);
      onSaveMapping(jsonString);
      toast.success('JSON mapping saved');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error saving payload: Invalid JSON structure');
    }
  };

  // Handle AI-generated JSON fields
  const handleAiFieldsGenerated = (generatedJson: any) => {
    setPayloadJson(generatedJson);
    setActiveTab("visual-builder");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden font-sans">
        <DialogHeader>
          <DialogTitle>JSON Mapping</DialogTitle>
        </DialogHeader>
        
        <DialogContentInner className="flex-1 overflow-hidden min-h-[60vh] flex flex-col">
          {/* Source and Target Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Source: {sourceNode?.data.label}</h3>
              <p className="text-xs text-muted-foreground">
                Type: {sourceNode?.data.type}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Target: {targetNode?.data.label}</h3>
              <p className="text-xs text-muted-foreground">
                Field: {targetInputField}
              </p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-fit">
              <TabsTrigger value="visual-builder">
                <Braces className="h-4 w-4 mr-2" />
                JSON Builder
              </TabsTrigger>
              <TabsTrigger value="ai-mapper">
                <Wand className="h-4 w-4 mr-2" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual-builder" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">JSON Payload Builder</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSavePayload}
                  >
                    Save Payload
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Build your JSON structure and map variables from previous nodes directly into your payload.
                </p>
                
                <ScrollArea className="h-[400px]">
                  <VisualJsonBuilder
                    initialValue={payloadJson}
                    availableVariables={availableVariables}
                    onChange={handlePayloadChange}
                  />
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="ai-mapper" className="mt-4">
              <SimpleAiMapper
                sourceNodeId={sourceNodeId} 
                targetNodeId={targetNodeId}
                targetField={targetInputField}
                onFieldsGenerated={handleAiFieldsGenerated}
              />
            </TabsContent>
          </Tabs>
        </DialogContentInner>
      </DialogContent>
    </Dialog>
  );
}
