
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WebflowIcon } from '@/components/flow/icons/WebflowIcon';
import { Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { tableService } from '@/services/tableService';
import { generateRecordId } from '@/utils/generateRecordId';

interface WebflowImportButtonProps {
  collectionId: string;
  apiKey: string;
  tableId: string;
  fieldMapping?: string;
  onImportComplete?: () => void;
}

export function WebflowImportButton({
  collectionId,
  apiKey,
  tableId,
  fieldMapping,
  onImportComplete
}: WebflowImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  
  // Extract API key if it's an environment variable reference
  const extractApiKey = (key: string): string => {
    if (!key) return '';
    
    if (key.startsWith('{{env.') && key.endsWith('}}')) {
      const envVarName = key.substring(6, key.length - 2);
      if (typeof window !== 'undefined') {
        const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
        return envVars[envVarName] || '';
      }
    }
    
    return key;
  };

  // Parse field mapping if provided
  const parseFieldMapping = (): Record<string, string> => {
    if (!fieldMapping) return {};
    
    try {
      const parsed = JSON.parse(fieldMapping);
      if (parsed.fields) return parsed.fields;
      return parsed;
    } catch (err) {
      console.error("Error parsing field mapping:", err);
      return {};
    }
  };

  // Sanitize and convert data types
  const sanitizeAndConvertValue = (value: any, fieldType: string): any => {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle different field types
    switch (fieldType) {
      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed;
        }
        return null;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);

      case 'date':
        if (typeof value === 'string' && value.trim()) {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();
        }
        return null;

      case 'image':
      case 'pdf':
        // Handle Webflow file objects
        if (typeof value === 'object' && value !== null) {
          if (value.url) {
            return value.url; // Extract URL from Webflow file object
          }
          return JSON.stringify(value);
        }
        if (typeof value === 'string') {
          // Try to parse JSON string first
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object') {
              if (parsed.url) {
                return parsed.url; // Extract URL from parsed JSON
              }
              // If it's a complex object without URL, return the URL if it exists
              return JSON.stringify(parsed);
            }
            return value; // Return as-is if it's not a JSON object
          } catch (e) {
            // If it's not valid JSON, check if it's already a URL
            if (value.startsWith('http://') || value.startsWith('https://')) {
              return value;
            }
            return value; // Return as-is
          }
        }
        return value;

      case 'text':
      default:
        // Handle objects and arrays by converting to JSON string or extracting meaningful data
        if (typeof value === 'object' && value !== null) {
          // Special handling for Webflow objects
          if (value.url) {
            return value.url; // Extract URL for display
          }
          if (value.name) {
            return value.name; // Extract name for display
          }
          if (value.title) {
            return value.title; // Extract title for display
          }
          // For complex objects, stringify them
          return JSON.stringify(value);
        }
        
        // Handle string values that might be JSON
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object') {
              // Extract meaningful data from parsed JSON
              if (parsed.url) return parsed.url;
              if (parsed.name) return parsed.name;
              if (parsed.title) return parsed.title;
              if (parsed.text) return parsed.text;
              // If no meaningful single value, return the original string
              return value;
            }
            return value;
          } catch (e) {
            // Not JSON, return as string
            return String(value);
          }
        }
        
        // Convert everything else to string
        return String(value);
    }
  };

  const importAllData = async () => {
    if (!tableId || !collectionId || !apiKey) {
      toast.error("Cannot import data. Missing required information.");
      return;
    }

    try {
      setIsImporting(true);
      toast.info("Starting import from Webflow...");

      // 1. Get the table project to access schema
      const tableProject = await tableService.getTableProject(tableId);
      console.log("Table project loaded:", tableProject.name);
      
      // 2. Extract the actual API key if it's an environment variable
      const actualApiKey = extractApiKey(apiKey);
      
      if (!actualApiKey) {
        toast.error("API key not found. Please check your environment variables.");
        setIsImporting(false);
        return;
      }
      
      // 3. Get field mapping if available
      const fieldMappings = parseFieldMapping();

      // 4. Fetch all items from the Webflow collection
      const { data, error } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path: `v2/collections/${collectionId}/items`,
          apiKey: actualApiKey,
          queryParams: '?limit=100',
          skipCache: true
        }
      });
      
      if (error || !data?.success) {
        console.error("Error fetching collection items:", error || data?.error);
        toast.error("Failed to import data from Webflow");
        setIsImporting(false);
        return;
      }
      
      // 5. Extract items from the response
      let items = [];
      console.log("Webflow API response:", data);
      
      if (data.result?.items) {
        items = data.result.items;
      } else if (Array.isArray(data.result)) {
        items = data.result;
      } else if (data.result?.result?.items) {
        items = data.result.result.items;
      }
      
      if (!items || items.length === 0) {
        toast.warning("No items found to import");
        setIsImporting(false);
        return;
      }
      
      console.log(`Found ${items.length} items to import`, items);
      
      // 6. Convert each item to a record with proper data type conversion
      const importedRecords = [];
      
      for (const item of items) {
        const record: Record<string, any> = {
          id: generateRecordId(item.fieldData || item),
          webflow_id: item.id || item._id || ''
        };
        
        // Extract field data from the item
        const fieldData = item.fieldData || item;
        console.log("Processing item with enhanced sanitization:", fieldData);
        
        // Process each field from the table schema
        tableProject.schema.fields.forEach(field => {
          const fieldId = field.id;
          const fieldName = field.name;
          const fieldType = field.type;
          
          // Skip system fields
          if (fieldId === 'id' || fieldName === 'id') return;
          if (fieldName === 'webflow_id') return;
          
          let rawValue = null;
          
          // Get the raw value using field mappings or direct field matching
          if (Object.keys(fieldMappings).length > 0) {
            // Use field mappings if available
            for (const [webflowField, mappedField] of Object.entries(fieldMappings)) {
              if (mappedField === `{{${fieldId}}}` || mappedField === fieldId || mappedField === fieldName) {
                if (fieldData[webflowField] !== undefined) {
                  rawValue = fieldData[webflowField];
                  break;
                }
              }
            }
          } else {
            // Default field matching
            if (fieldData[fieldName] !== undefined) {
              rawValue = fieldData[fieldName];
            } else if (fieldData[field.name] !== undefined) {
              rawValue = fieldData[field.name];
            } else {
              // Case-insensitive match
              const matchingKey = Object.keys(fieldData).find(
                key => key.toLowerCase() === fieldName.toLowerCase()
              );
              if (matchingKey) {
                rawValue = fieldData[matchingKey];
              }
            }
          }
          
          // Sanitize and convert the value based on field type
          const sanitizedValue = sanitizeAndConvertValue(rawValue, fieldType);
          record[fieldId] = sanitizedValue;
          
          console.log(`Field ${fieldName} (${fieldType}): ${JSON.stringify(rawValue)} -> ${JSON.stringify(sanitizedValue)}`);
        });
        
        importedRecords.push(record);
      }
      
      console.log(`Converting ${importedRecords.length} enhanced sanitized records`, importedRecords);
      
      // 7. Update the table with all imported records
      if (importedRecords.length > 0) {
        await tableService.updateTableProject(tableId, {
          records: [...importedRecords]
        });
        
        toast.success(`Successfully imported ${importedRecords.length} records from Webflow with enhanced data processing`);
        if (onImportComplete) onImportComplete();
      } else {
        toast.warning("No records were imported. Check field mappings.");
      }
      
    } catch (err: any) {
      console.error("Error importing data:", err);
      toast.error(err.message || "Failed to import data from Webflow");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button
      onClick={importAllData}
      disabled={isImporting}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isImporting ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importing Data...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <WebflowIcon size={16} />
          <Database className="h-4 w-4 mr-1" />
          Import Collection Data Now
        </div>
      )}
    </Button>
  );
}
