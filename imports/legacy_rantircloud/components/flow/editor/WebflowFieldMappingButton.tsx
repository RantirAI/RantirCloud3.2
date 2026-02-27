
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WebflowFieldMappingDialog } from '../webflow/WebflowFieldMappingDialog';
import { useVariableResolver } from '@/hooks/useVariableResolver';

interface WebflowFieldMappingButtonProps {
  collectionId: string;
  apiKey: string;
  value: string;
  onChange: (value: string) => void;
}

export function WebflowFieldMappingButton({
  collectionId,
  apiKey,
  value,
  onChange
}: WebflowFieldMappingButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const { resolveVariable, isVariableBinding } = useVariableResolver();

  // Resolve variables to actual values
  const resolvedApiKey = isVariableBinding(apiKey) ? resolveVariable(apiKey) : apiKey;
  const resolvedCollectionId = isVariableBinding(collectionId) ? resolveVariable(collectionId) : collectionId;

  console.log('WebflowFieldMappingButton resolved values:', { 
    originalApiKey: apiKey, 
    resolvedApiKey, 
    originalCollectionId: collectionId, 
    resolvedCollectionId 
  });

  // Check if we have data already
  useEffect(() => {
    try {
      if (value && value !== '{}') {
        const parsedData = JSON.parse(value);
        if (Object.keys(parsedData).length > 0) {
          setHasData(true);
        }
      }
    } catch (error) {
      console.error("Error parsing existing field data:", error);
    }
  }, [value]);

  // Handle opening the field mapping dialog
  const handleOpenMapping = () => {
    if (!resolvedCollectionId || resolvedCollectionId === 'no-collection') {
      toast.error("Please select a collection first");
      return;
    }
    
    if (!resolvedApiKey) {
      toast.error("Please enter an API key first");
      return;
    }
    
    console.log('Opening field mapping with resolved values:', { resolvedApiKey, resolvedCollectionId });
    setOpen(true);
  };

  // Handle saving field mappings
  const handleSaveMapping = (data: Record<string, any>) => {
    try {
      // Convert to JSON and save
      const jsonStr = JSON.stringify(data);
      onChange(jsonStr);
      
      // Show success toast with count of fields
      const fieldCount = Object.keys(data).length;
      toast.success(`${fieldCount} fields mapped successfully`);
      
      // Update state
      setHasData(fieldCount > 0);
    } catch (error) {
      console.error("Error saving field mappings:", error);
      toast.error("Failed to save field mappings");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleOpenMapping}
          disabled={loading || !resolvedCollectionId || resolvedCollectionId === 'no-collection'}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading Fields...
            </>
          ) : hasData ? (
            <>
              <FileJson className="h-4 w-4 mr-2" />
              Edit Field Mappings
              <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {(() => {
                  try {
                    const parsedData = JSON.parse(value);
                    return Object.keys(parsedData).length;
                  } catch {
                    return 0;
                  }
                })()}
              </span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Map Collection Fields
            </>
          )}
        </Button>
        
        {!resolvedCollectionId || resolvedCollectionId === 'no-collection' ? (
          <div className="text-xs text-amber-500">
            Please select a collection first
          </div>
        ) : !resolvedApiKey ? (
          <div className="text-xs text-amber-500">
            Please enter a valid API key
          </div>
        ) : hasData ? (
          <div className="text-xs text-muted-foreground">
            Field mapping data is configured. Click the button above to edit.
          </div>
        ) : null}
      </div>
      
      <WebflowFieldMappingDialog
        open={open}
        onOpenChange={setOpen}
        collectionId={resolvedCollectionId || ''}
        apiKey={resolvedApiKey || ''}
        onSave={handleSaveMapping}
        initialValues={(() => {
          try {
            return value ? JSON.parse(value) : {};
          } catch {
            return {};
          }
        })()}
      />
    </div>
  );
}
