
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VariableBindingButton } from '@/components/flow/editor/VariableBindingButton';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { dataContextManager } from '@/lib/data-context';

interface WebflowFieldSelectorProps {
  collectionId: string;
  apiKey: string;
  selectedFields: Record<string, boolean>;
  onSelectionChange: (updatedSelectedFields: Record<string, boolean>) => void;
  onFieldsLoad: (fields: any[]) => void;
  initialFields?: any[];
  onFieldValueChange: (fieldId: string, value: any) => void;
  fieldValues: Record<string, any>;
}

export function WebflowFieldSelector({
  collectionId,
  apiKey,
  selectedFields,
  onSelectionChange,
  onFieldsLoad,
  initialFields = [],
  onFieldValueChange,
  fieldValues
}: WebflowFieldSelectorProps) {
  const [fields, setFields] = useState<any[]>(initialFields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { nodes, edges } = useFlowStore();

  // Extract API key if it's an environment variable reference
  function extractApiKey(key: string): string {
    if (!key) return '';
    
    if (key.startsWith('{{env.') && key.endsWith('}}')) {
      const envVarName = key.substring(6, key.length - 2);
      if (typeof window !== 'undefined') {
        const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
        return envVars[envVarName] || '';
      }
    }
    
    return key;
  }

  // Get available variables for binding with live data support
  const getAvailableVariables = () => {
    const variables: { label: string; value: string; description?: string }[] = [];

    // Get environment variables
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    Object.keys(envVars).forEach(key => {
      variables.push({
        label: `Environment > ${key}`,
        value: `{{env.${key}}}`,
        description: 'Environment variable'
      });
    });

    // Find the current Webflow node
    const webflowNodeId = nodes.find(n => n.data?.type === 'webflow' && n.data?.inputs?.collectionId === collectionId)?.id;
    if (webflowNodeId) {
      // Get connected node IDs
      const connectedNodeIds = edges
        .filter(edge => edge.target === webflowNodeId)
        .map(edge => edge.source);
      
      // Get live data suggestions from data context manager
      const liveDataSuggestions = dataContextManager.generateVariableSuggestions(connectedNodeIds);
      variables.push(...liveDataSuggestions);

      // Get regular node outputs from connected nodes (fallback)
      connectedNodeIds.forEach(sourceId => {
        const sourceNode = nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;

        const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
        if (!plugin || !plugin.outputs) return;

        // Only add if not already in live data
        plugin.outputs.forEach(output => {
          const variableValue = `{{${sourceId}.${output.name}}}`;
          if (!liveDataSuggestions.some(live => live.value === variableValue)) {
            variables.push({
              label: `${sourceNode.data.label} > ${output.name}`,
              value: variableValue,
              description: output.description
            });
          }
        });
      });
    }

    return variables;
  };

  // Load collection fields when component mounts or collection changes
  useEffect(() => {
    if (collectionId && apiKey && fields.length === 0) {
      loadCollectionFields();
    }
  }, [collectionId, apiKey]);

  const loadCollectionFields = async () => {
    try {
      setLoading(true);
      setError(null);

      const actualApiKey = extractApiKey(apiKey);
      
      if (!actualApiKey) {
        setError("API key not found. Please check your environment variables.");
        setLoading(false);
        return;
      }

      console.log("Loading Webflow collection fields for:", collectionId);
      
      const { data, error } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path: `v2/collections/${collectionId}`,
          apiKey: actualApiKey,
          skipCache: true
        }
      });

      if (error) {
        console.error("Error fetching collection schema:", error);
        setError(`Error: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data?.success || !data?.result) {
        setError("Failed to fetch collection schema");
        setLoading(false);
        return;
      }

      console.log("Collection schema response:", data.result);

      // Extract fields - handle both object and array formats
      let fieldsData = data.result.fields || data.result;
      let fieldsArray: any[] = [];

      if (Array.isArray(fieldsData)) {
        fieldsArray = fieldsData;
      } else if (typeof fieldsData === 'object') {
        // Convert object to array
        fieldsArray = Object.entries(fieldsData).map(([key, value]: [string, any]) => ({
          slug: key,
          displayName: value.displayName || value.name || key,
          type: value.type || 'PlainText',
          required: value.required || false,
          ...value
        }));
      }

      // Filter out system fields
      const filteredFields = fieldsArray.filter(field => 
        field.slug && 
        !field.slug.startsWith('_') && 
        field.slug !== 'id'
      );

      console.log("Processed fields:", filteredFields);
      
      setFields(filteredFields);
      onFieldsLoad(filteredFields);
      setLoading(false);

      if (filteredFields.length === 0) {
        setError("No editable fields found in this collection.");
      }

    } catch (err: any) {
      console.error("Error loading collection fields:", err);
      setError(`Error: ${err.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  const handleFieldSelection = (fieldId: string, selected: boolean) => {
    const updatedSelection = {
      ...selectedFields,
      [fieldId]: selected
    };
    onSelectionChange(updatedSelection);
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    onFieldValueChange(fieldId, value);
  };

  const availableVariables = getAvailableVariables();

  // Find the current Webflow node ID for passing to VariableBindingButton
  const webflowNodeId = nodes.find(n => n.data?.type === 'webflow' && n.data?.inputs?.collectionId === collectionId)?.id;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#4353FF] mb-2" />
        <p>Loading collection fields...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        <div className="flex items-center mb-2">
          <Info className="h-5 w-5 text-red-600 mr-2" />
          <h4 className="font-medium text-red-800">Error Loading Fields</h4>
        </div>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadCollectionFields}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No fields available for this collection.</p>
        <Button 
          variant="outline" 
          size="sm"
          className="mt-4"
          onClick={loadCollectionFields}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Fields
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Map Collection Fields</h3>
        <Badge variant="secondary">{Object.keys(selectedFields).filter(k => selectedFields[k]).length} selected</Badge>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {fields.map((field) => {
            const fieldId = field.slug || field.id || field.name;
            const fieldName = field.displayName || field.name || fieldId;
            const isSelected = selectedFields[fieldId] || false;
            const fieldValue = fieldValues[fieldId] || '';
            
            return (
              <Card key={fieldId} className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={fieldId}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleFieldSelection(fieldId, checked as boolean)}
                    />
                    <div className="flex-1">
                      <CardTitle className="text-sm">{fieldName}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {field.type || 'PlainText'}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isSelected && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <Label htmlFor={`value-${fieldId}`} className="text-xs">
                        Field Value
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`value-${fieldId}`}
                          placeholder={`Enter value for ${fieldName}`}
                          value={fieldValue}
                          onChange={(e) => handleFieldValueChange(fieldId, e.target.value)}
                          className="flex-1"
                        />
                        <VariableBindingButton
                          variables={availableVariables}
                          onVariableSelect={(value) => handleFieldValueChange(fieldId, value)}
                          size="icon"
                          position="end"
                          nodeId={webflowNodeId}
                          includeLoopVariables={true}
                        />
                      </div>
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">{field.helpText}</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
