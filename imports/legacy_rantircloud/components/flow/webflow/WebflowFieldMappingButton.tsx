
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WebflowIcon } from '@/components/flow/icons/WebflowIcon';
import { WebflowFieldMappingDialog } from '@/components/flow/webflow/WebflowFieldMappingDialog';
import { toast } from 'sonner';

interface WebflowFieldMappingButtonProps {
  collectionId: string;
  apiKey: string;
  value: string | object;
  onChange: (value: string) => void;
  tableId?: string; // Optional tableId for import functionality
}

export function WebflowFieldMappingButton({ 
  collectionId, 
  apiKey, 
  value, 
  onChange,
  tableId
}: WebflowFieldMappingButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if collectionId and apiKey are valid
    setIsReady(!!collectionId && collectionId !== 'no-collection' && !!apiKey);
    
    // Parse initial value if it's a string
    if (typeof value === 'string' && value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.fields) {
          setInitialValues(parsed.fields);
        }
      } catch (e) {
        console.error("Error parsing item data:", e);
      }
    } else if (typeof value === 'object' && value !== null) {
      // If it's already an object
      const objValue = value as any;
      if (objValue.fields) {
        setInitialValues(objValue.fields);
      }
    }
  }, [value, collectionId, apiKey]);

  const handleSave = (data: Record<string, any>) => {
    try {
      // Include the original values in the JSON to preserve the data content
      // This ensures we save both the field mappings AND the actual data values
      const jsonString = JSON.stringify({
        fields: data
      }, null, 2);
      
      // Log what's being saved to help with debugging
      console.info("Saving field mappings with data:", jsonString);
      
      onChange(jsonString);
      
      // Check if any custom expressions were used
      const hasCustomExpression = Object.values(data).some(
        (val) => typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}') && val.includes('[')
      );

      if (hasCustomExpression) {
        toast.success("Field mappings with custom logic saved", {
          description: "Your advanced variable bindings have been applied"
        });
      } else {
        toast.success("Field mappings saved");
      }
      
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error saving field mappings:", err);
      toast.error("Failed to save field mappings");
    }
  };

  const handleOpenDialog = () => {
    if (!isReady) {
      if (!collectionId || collectionId === 'no-collection') {
        toast.error("Please select a collection first");
      } else if (!apiKey) {
        toast.error("Please enter a valid API key");
      }
      return;
    }
    
    console.log("Opening WebflowFieldMappingDialog");
    console.log("Collection ID:", collectionId);
    console.log("API Key:", apiKey ? "Present" : "Missing");
    setIsDialogOpen(true);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleOpenDialog}
      disabled={!isReady}
      className="w-full border-[#4353FF] text-[#4353FF] hover:bg-[#4353FF] hover:text-white"
    >
      <div className="flex items-center gap-2">
        <WebflowIcon size={16} />
        Map Webflow Fields
      </div>
      
      {!isReady && (
        <p className="text-xs text-amber-500 mt-1">
          {!collectionId || collectionId === 'no-collection' 
            ? "Please select a collection first" 
            : !apiKey 
              ? "Please enter a valid API key" 
              : ""}
        </p>
      )}
      
      <WebflowFieldMappingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        collectionId={collectionId}
        apiKey={apiKey}
        onSave={handleSave}
        initialValues={initialValues}
      />
    </Button>
  );
}
