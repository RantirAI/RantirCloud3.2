
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Eye, MessageSquare, Wand, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useFlowStore } from '@/lib/flow-store';
import { PayloadMapping } from '@/types/flowTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

interface MappingField {
  id: string;
  sourceField: string;
  targetField: string;
  transformExpression?: string;
}

interface AdvancedJsonMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNodeId: string;
  targetNodeId: string;
  targetInputField: string;
  onSaveMapping: (mapping: string) => void;
}

export function AdvancedJsonMapper({
  open,
  onOpenChange,
  sourceNodeId,
  targetNodeId,
  targetInputField,
  onSaveMapping
}: AdvancedJsonMapperProps) {
  const { nodes, updateNode } = useFlowStore();
  const [activeTab, setActiveTab] = useState('visual-mapper');
  const [mappingFields, setMappingFields] = useState<MappingField[]>([]);
  const [combinedView, setCombinedView] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiAssistMode, setAiAssistMode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  const targetNode = nodes.find(n => n.id === targetNodeId);

  // Helper function to generate ID
  const generateId = () => `field_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize with a single empty mapping field
  useEffect(() => {
    if (open && mappingFields.length === 0) {
      setMappingFields([
        { id: generateId(), sourceField: '', targetField: targetInputField, transformExpression: '' }
      ]);
    }
  }, [open, targetInputField, mappingFields.length]);

  // Add a new mapping field
  const addMappingField = () => {
    setMappingFields([
      ...mappingFields, 
      { id: generateId(), sourceField: '', targetField: '', transformExpression: '' }
    ]);
  };

  // Remove a mapping field
  const removeMappingField = (id: string) => {
    setMappingFields(mappingFields.filter(field => field.id !== id));
  };

  // Update a mapping field
  const updateMappingField = (id: string, field: Partial<MappingField>) => {
    setMappingFields(mappingFields.map(f => 
      f.id === id ? { ...f, ...field } : f
    ));
  };

  // Generate transform function preview
  const generatePreview = () => {
    const functionLines = ['function transform(data) {'];
    functionLines.push('  return {');
    
    mappingFields.forEach(field => {
      if (field.sourceField && field.targetField) {
        const transform = field.transformExpression 
          ? field.transformExpression 
          : `data.${field.sourceField}`;
        functionLines.push(`    ${field.targetField}: ${transform},`);
      }
    });
    
    functionLines.push('  };');
    functionLines.push('}');
    
    return functionLines.join('\n');
  };

  // Save mappings as payload mappings
  const saveAsPayloadMappings = () => {
    if (!targetNode) return;
    
    // Get valid mappings (with both source and target fields)
    const validMappings = mappingFields.filter(
      field => field.sourceField && field.targetField
    );
    
    if (validMappings.length === 0) {
      toast.error('Please define at least one valid mapping with source and target fields');
      return;
    }
    
    // Create payload mappings
    const payloadMappings: PayloadMapping[] = validMappings.map(field => ({
      sourceNodeId,
      sourceOutputField: field.sourceField,
      targetField: field.targetField,
      ...(field.transformExpression ? { transformExpression: field.transformExpression } : {})
    }));
    
    // Update node with new mappings
    const existingMappings = targetNode.data.payloadMappings || [];
    
    // Filter out any existing mappings for this target field
    const filteredMappings = existingMappings.filter(
      (m: PayloadMapping) => m.targetField !== targetInputField
    );
    
    // Add new mappings
    const newMappings = [...filteredMappings, ...payloadMappings];
    
    updateNode(targetNodeId, {
      payloadMappings: newMappings
    });
    
    toast.success('Field mappings saved successfully');
    onOpenChange(false);
  };

  // Generate mappings using AI
  const generateWithAI = async () => {
    if (!apiKey) {
      toast.error('Please enter an OpenAI API key');
      return;
    }

    setIsGenerating(true);

    try {
      // This would be a real API call in production
      // Simulated response for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sample AI-generated mappings
      const aiMappings: MappingField[] = [
        { 
          id: generateId(), 
          sourceField: 'user.name', 
          targetField: 'customer_name', 
          transformExpression: 'data.user.name.toUpperCase()' 
        },
        { 
          id: generateId(), 
          sourceField: 'transaction.amount', 
          targetField: 'price', 
          transformExpression: 'parseFloat(data.transaction.amount).toFixed(2)' 
        }
      ];

      // If we're in combined mode, add to existing mappings
      if (combinedView) {
        setMappingFields([...mappingFields, ...aiMappings]);
      } else {
        // Replace mappings
        setMappingFields(aiMappings);
      }

      toast.success('AI-generated mappings created successfully');
    } catch (error) {
      console.error('Error generating mappings with AI:', error);
      toast.error('Failed to generate mappings with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy transform function to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePreview());
    toast.success('Transform function copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Advanced Field Mapping</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[60vh] flex flex-col">
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
              <TabsTrigger value="visual-mapper">Visual Mapper</TabsTrigger>
              <TabsTrigger value="ai-assisted">AI-Assisted Mapping</TabsTrigger>
            </TabsList>

            <TabsContent value="visual-mapper" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addMappingField}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Mapping
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Copy Function
                  </Button>
                </div>
              </div>

              {showPreview && (
                <div className="bg-slate-50 p-3 rounded-md border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Transform Function Preview:</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="text-xs font-mono bg-slate-100 p-2 rounded overflow-auto max-h-[200px]">
                    {generatePreview()}
                  </pre>
                </div>
              )}

              <ScrollArea className="border rounded-md p-4 h-[300px]">
                <div className="space-y-4">
                  {mappingFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md bg-slate-50 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeMappingField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Source Field</label>
                          <Input
                            placeholder="e.g., response.data.user.name"
                            value={field.sourceField}
                            onChange={(e) => updateMappingField(field.id, { sourceField: e.target.value })}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Target Field</label>
                          <Input
                            placeholder="e.g., userName"
                            value={field.targetField}
                            onChange={(e) => updateMappingField(field.id, { targetField: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Transform Expression (Optional)</label>
                        <Input
                          placeholder="e.g., data.response.data.user.name.toUpperCase()"
                          value={field.transformExpression || ''}
                          onChange={(e) => updateMappingField(field.id, { transformExpression: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use "data" variable to reference the source data.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="ai-assisted" className="mt-4 space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use AI to automatically generate mappings between your data structures.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key is not stored anywhere and is only used for this request.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Instructions for AI</label>
                  <Input
                    placeholder="e.g., Map customer data to our internal format"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => setCombinedView(!combinedView)}
                    variant={combinedView ? "secondary" : "outline"}
                    size="sm"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {combinedView ? "Combined View Enabled" : "Use Combined View"}
                  </Button>
                  
                  <Button
                    onClick={generateWithAI}
                    disabled={!apiKey || isGenerating}
                    className="gap-1"
                  >
                    {isGenerating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand className="h-4 w-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-medium mb-2">AI-Generated Mappings</h4>
                  
                  {mappingFields.length > 0 ? (
                    <ScrollArea className="border rounded-md p-4 h-[200px]">
                      <div className="space-y-3">
                        {mappingFields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between border-b pb-2">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {field.sourceField} → {field.targetField}
                              </Badge>
                              {field.transformExpression && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Code className="h-3 w-3 mr-1" />
                                  {field.transformExpression}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeMappingField(field.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-[100px] border rounded-md bg-slate-50">
                      <p className="text-sm text-muted-foreground">
                        No mappings generated yet. Click "Generate with AI" to start.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsPayloadMappings}>
              Save Mappings
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
