import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, RefreshCw, Database, Eye, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { WebflowFieldSelector } from './WebflowFieldSelector';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { dataContextManager } from '@/lib/data-context';
import { DataPreview } from '@/components/flow/editor/DataPreview';
import { LoopDataPreview } from '@/components/flow/editor/LoopDataPreview';

interface WebflowFieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  apiKey: string;
  onSave: (data: Record<string, any>) => void;
  initialValues?: Record<string, any>;
}

export function WebflowFieldMappingDialog({
  open,
  onOpenChange,
  collectionId,
  apiKey,
  onSave,
  initialValues = {}
}: WebflowFieldMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [activeDataTab, setActiveDataTab] = useState<"livedata" | "loop">("livedata");
  const { nodes, edges } = useFlowStore();

  // Get the current Webflow node for context
  const webflowNode = nodes.find(n => 
    n.data?.type === 'webflow' && 
    n.data?.inputs?.collectionId === collectionId
  );

  // Get connected node data for live data preview
  const getConnectedNodesData = () => {
    if (!webflowNode) return [];
    
    const connectedNodeIds = edges
      .filter(edge => edge.target === webflowNode.id)
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

  // Load collection fields when the dialog opens
  useEffect(() => {
    if (open && collectionId && apiKey) {
      loadCollectionFields();
      
      // Initialize selected fields based on initial values
      const initialSelected: Record<string, boolean> = {};
      Object.keys(initialValues).forEach(key => {
        initialSelected[key] = true;
      });
      setSelectedFields(initialSelected);
      setFieldValues(initialValues);
    }
  }, [open, collectionId, apiKey]);

  // Function to extract API key from environment variables if needed
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

  // Load collection fields
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

      console.log("Fetching collection schema for collection:", collectionId);
      
      const { data: schemaData, error: schemaError } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path: `v2/collections/${collectionId}`,
          apiKey: actualApiKey,
          skipCache: true
        }
      });

      let foundFields = false;
      if (!schemaError && schemaData?.success && schemaData?.result) {
        console.log("Collection schema response:", schemaData.result);
        
        if (schemaData.result.fields) {
          foundFields = processSchemaFields(schemaData.result.fields);
        }
      }
      
      if (!foundFields) {
        console.log("Attempting to extract fields from collection items");
        await loadFieldsFromItems(actualApiKey, collectionId);
      }
    } catch (err: any) {
      console.error("Error loading Webflow collection fields:", err);
      setError(`Error: ${err.message || "Unknown error"}`);
      setLoading(false);
    }
  };
  
  // Process schema fields
  const processSchemaFields = (fieldsData: any): boolean => {
    try {
      let fieldsArray: any[] = [];
      
      if (Array.isArray(fieldsData)) {
        fieldsArray = fieldsData;
      } else {
        fieldsArray = Object.entries(fieldsData).map(([key, value]: [string, any]) => ({
          id: key,
          name: value.displayName || value.name || key,
          type: value.type || 'PlainText',
          required: value.required || value.isRequired || false,
          ...value
        }));
      }
      
      const filteredFields = fieldsArray.filter(field => 
        !field.name?.startsWith('_') && 
        field.name !== '_id' && 
        field.name !== 'id'
      );
      
      setFields(filteredFields);
      console.log("Filtered fields from schema:", filteredFields);
      
      setFieldValues(prev => {
        const updated = {...prev};
        filteredFields.forEach(field => {
          const fieldId = field.id || field._id || field.name || field.slug;
          if (updated[fieldId] === undefined) {
            updated[fieldId] = '';
          }
        });
        return updated;
      });
      
      setLoading(false);
      
      if (filteredFields.length === 0) {
        setError("No editable fields found in this collection schema.");
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error processing schema fields:", err);
      return false;
    }
  };
  
  // Load fields by getting items from the collection
  const loadFieldsFromItems = async (apiKey: string, collectionId: string) => {
    try {
      const { data: itemsData, error: itemsError } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path: `v2/collections/${collectionId}/items`,
          queryParams: '?limit=10',
          apiKey: apiKey,
          skipCache: true
        }
      });
      
      console.log("Items API response:", itemsData);
      
      if (itemsError) {
        console.error("Error fetching items:", itemsError);
        setError(`Error fetching collection items: ${itemsError.message}`);
        setLoading(false);
        return;
      }
      
      if (!itemsData?.success) {
        setError("Failed to fetch collection items. Please check your API permissions.");
        setLoading(false);
        return;
      }
      
      let items = [];
      if (itemsData.result?.items) {
        items = itemsData.result.items;
      } else if (Array.isArray(itemsData.result)) {
        items = itemsData.result;
      } else if (itemsData.result?.result?.items) {
        items = itemsData.result.result.items;
      }
      
      if (!items || items.length === 0) {
        setError("No items found in this collection. Please add some items first.");
        setLoading(false);
        return;
      }
      
      console.log("Found items:", items.length);
      
      const allFields = new Map();
      
      items.forEach((item: any) => {
        const fields = item.fieldData || item;
        
        Object.entries(fields).forEach(([key, value]) => {
          if (!key.startsWith('_') && key !== 'id' && !allFields.has(key)) {
            allFields.set(key, {
              id: key,
              name: key,
              type: typeof value === 'object' ? 'Object' : 'PlainText',
              value: value
            });
          }
        });
      });
      
      const fieldsArray = Array.from(allFields.values());
      
      if (fieldsArray.length === 0) {
        setError("No usable fields found in the items. The items might not have any custom fields.");
        setLoading(false);
        return;
      }
      
      setFields(fieldsArray);
      console.log("Fields extracted from items:", fieldsArray);
      
      setFieldValues(prev => {
        const updated = {...prev};
        fieldsArray.forEach(field => {
          const fieldId = field.id;
          if (updated[fieldId] === undefined) {
            updated[fieldId] = initialValues[fieldId] || '';
          }
        });
        return updated;
      });
      
      setLoading(false);
      
    } catch (err: any) {
      console.error("Error extracting fields from items:", err);
      setError(`Error processing collection items: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle field value changes
  const handleFieldValueChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Handle selection changes from WebflowFieldSelector
  const handleSelectionChange = (updatedSelectedFields: Record<string, boolean>) => {
    setSelectedFields(updatedSelectedFields);
    
    setFieldValues(prev => {
      const updated = {...prev};
      
      Object.keys(updatedSelectedFields).forEach(fieldId => {
        if (updatedSelectedFields[fieldId] && !updated[fieldId]) {
          updated[fieldId] = ``;
        }
      });
      
      return updated;
    });
  };

  // Handle save
  const handleSave = () => {
    const filteredValues = Object.entries(fieldValues).reduce((acc, [key, value]) => {
      if (selectedFields[key]) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    onSave(filteredValues);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img 
              src="https://assets-global.website-files.com/6536e7c751e83105cd921057/6536e7c751e83105cd9216dc_webflow-logo-black.svg" 
              alt="Webflow Logo" 
              className="h-5"
            />
            <span>Webflow Field Mapping</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left side - Field mapping */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-[#4353FF] mb-2" />
                <p>Loading collection fields...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <h4 className="font-medium">Error</h4>
                </div>
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                  onClick={loadCollectionFields}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <WebflowFieldSelector
                collectionId={collectionId}
                apiKey={apiKey}
                selectedFields={selectedFields}
                onSelectionChange={handleSelectionChange}
                onFieldsLoad={setFields}
                initialFields={fields}
                onFieldValueChange={handleFieldValueChange}
                fieldValues={fieldValues}
              />
            )}
          </div>
          
          {/* Right side - Data preview tabs */}
          <div className="w-96 border-l pl-4">
            <h3 className="font-medium mb-4">Available Data for Binding</h3>
            
            <Tabs value={activeDataTab} onValueChange={(value) => setActiveDataTab(value as "livedata" | "loop")} className="w-full">
              <TabsList className="w-fit">
                <TabsTrigger value="livedata" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Live Data
                </TabsTrigger>
                <TabsTrigger value="loop" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  Loop Data
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="livedata" className="mt-3">
                <ScrollArea className="h-[400px]">
                  {connectedNodesData.length > 0 ? (
                    <div className="space-y-3">
                      {connectedNodesData.map(({ nodeId: sourceNodeId, nodeName, data }) => (
                        <DataPreview
                          key={sourceNodeId}
                          data={data}
                          title={`${nodeName} Output`}
                          maxHeight="180px"
                          onSelectPath={(path) => {
                            const variablePath = `{{${sourceNodeId}.${path}}}`;
                            toast.success(`Variable copied: ${variablePath}`);
                            navigator.clipboard.writeText(variablePath);
                          }}
                          showSelectButtons={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border rounded-lg bg-muted/20">
                      <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="font-medium text-gray-900 mb-2">No Live Data</h4>
                      <p className="text-sm text-gray-500">
                        Connect and run nodes to see live data for easy binding
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="loop" className="mt-3">
                <ScrollArea className="h-[400px]">
                  {webflowNode ? (
                    <LoopDataPreview
                      nodeId={webflowNode.id}
                      onSelectItem={(path, value) => {
                        toast.success(`Variable copied: ${path}`);
                        navigator.clipboard.writeText(path);
                      }}
                    />
                  ) : (
                    <div className="p-6 text-center border rounded-lg bg-muted/20">
                      <Repeat className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="font-medium text-gray-900 mb-2">No Loop Data</h4>
                      <p className="text-sm text-gray-500">
                        Configure loop data sources to see available loop variables
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Save Field Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
