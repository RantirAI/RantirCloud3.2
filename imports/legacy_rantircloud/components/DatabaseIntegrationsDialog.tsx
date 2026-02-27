import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { TableSchema, TableField, tableService } from '@/services/tableService';
import { toast } from '@/components/ui/sonner';
import { integrationsService } from '@/services/integrationsService';
import { Loader2, ArrowRight, CheckCircle, Upload, Plus, Table, Check, ArrowDown, Database, Import, Eye, AlertTriangle, RefreshCw, Hexagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebflowSelectField } from '@/components/flow/node-types/WebflowSelectField';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { generateRecordId } from '@/utils/generateRecordId';

type DataSource = 'webflow' | 'airtable' | 'hubspot' | 'googleAnalytics' | 'snowflake' | 'bigQuery' | 'mysql' | 'mongodb' | 'wordpress' | 'databricks' | 'excel' | null;
type ImportStep = 'select' | 'connect' | 'selectCollection' | 'preview' | 'confirm' | 'importing' | 'complete';
interface DatabaseIntegrationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
}
interface IntegrationOption {
  id: DataSource;
  name: string;
  icon: string | React.ReactNode;
  connected: boolean;
  action: 'import' | 'upload' | 'connect';
  actionText: string;
  comingSoon?: boolean;
}
export function DatabaseIntegrationsDialog({
  isOpen,
  onClose,
  databaseId
}: DatabaseIntegrationsDialogProps) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<ImportStep>('select');
  const [selectedSource, setSelectedSource] = useState<DataSource>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [webflowApiKey, setWebflowApiKey] = useState<string>('');
  const [webflowSite, setWebflowSite] = useState<string>('');
  const [webflowCollection, setWebflowCollection] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [tableFields, setTableFields] = useState<TableField[]>([]);
  const [importedTable, setImportedTable] = useState<string>('');
  const [confirmImport, setConfirmImport] = useState<boolean>(false);
  const [sampleRecords, setSampleRecords] = useState<any[]>([]);
  const [previewCount, setPreviewCount] = useState<number>(3);
  const [activeTab, setActiveTab] = useState("preview-data");
  const [importProgress, setImportProgress] = useState(0);

  // Integration options with their connection states
  const integrationOptions: IntegrationOption[] = [{
    id: 'excel',
    name: 'Excel or CSV',
    icon: <img src="/lovable-uploads/71851ffc-5d53-4c42-aeb8-589224f5f862.png" alt="CSV" className="w-6 h-6" />,
    connected: false,
    action: 'upload',
    actionText: 'Upload CSV'
  }, {
    id: 'airtable',
    name: 'Airtable',
    icon: <img src="/lovable-uploads/3971d1c0-fc78-4dc7-8325-96cdc5a8ac5e.png" alt="Airtable" className="w-6 h-6" />,
    connected: false,
    action: 'connect',
    actionText: 'Connect app'
  }, {
    id: 'hubspot',
    name: 'Hubspot',
    icon: <img src="/lovable-uploads/6f8797fb-e681-4c17-962e-03964bf80a2e.png" alt="Hubspot" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'googleAnalytics',
    name: 'Google Analytics',
    icon: <img src="/lovable-uploads/f66bd3dc-6b0f-4526-9057-1732a6e62bc3.png" alt="Google Analytics" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'snowflake',
    name: 'Snowflake',
    icon: <img src="/lovable-uploads/d8578f08-6720-4a01-9077-c27e527dfbe8.png" alt="Snowflake" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'bigQuery',
    name: 'Google BigQuery',
    icon: <img src="/lovable-uploads/de2c55c9-161a-4ed1-9ed4-e28eea78828d.png" alt="Google BigQuery" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'webflow',
    name: 'Webflow',
    icon: <img src="/lovable-uploads/48038fe7-f1e3-4c3b-ba0f-8cee5d8e258c.png" alt="Webflow" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'mysql',
    name: 'MySQL',
    icon: <img src="/lovable-uploads/3ac65ef8-1ff0-43ea-bf64-46c09ef8ccd7.png" alt="MySQL" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'mongodb',
    name: 'MongoDB',
    icon: <img src="/lovable-uploads/d8927880-c131-4e28-aa76-6a478f3240ba.png" alt="MongoDB" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'wordpress',
    name: 'Wordpress',
    icon: <img src="/lovable-uploads/34297184-7edf-4a6d-a36d-43478185b669.png" alt="WordPress" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }, {
    id: 'databricks',
    name: 'Databricks',
    icon: <img src="/lovable-uploads/e8f624e6-02ba-4c40-8f38-c5e723b7349b.png" alt="Databricks" className="w-6 h-6" />,
    connected: false,
    action: 'import',
    actionText: 'Import Data'
  }];

  // Check for connected integrations
  React.useEffect(() => {
    if (user) {
      const checkIntegrations = async () => {
        try {
          const userIntegrations = await integrationsService.getUserIntegrations(user.id);
          // Update integration statuses based on user integrations
          // Only Webflow is actually implemented now
        } catch (error) {
          console.error("Error checking integrations:", error);
        }
      };
      checkIntegrations();
    }
  }, [user]);
  const handleWebflowSiteChange = (value: string, label?: string) => {
    setWebflowSite(value);
    setWebflowCollection('');
    setCollectionName('');
  };
  const handleWebflowCollectionChange = (value: string, label?: string) => {
    setWebflowCollection(value);
    if (label) {
      setCollectionName(label);
    }
  };
  const handleSelectSource = (source: DataSource) => {
    setSelectedSource(source);

    // Only Webflow is fully implemented for now
    if (source === 'webflow') {
      setStep('connect');
    } else {
      toast.info(`${source} integration coming soon!`);
    }
  };

  // Enhanced sanitize and convert function for proper data type handling
  const sanitizeAndConvertValue = (value: any, fieldType: string): any => {
    if (value === null || value === undefined) {
      return null;
    }
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
        // Handle Webflow file objects properly
        if (typeof value === 'object' && value !== null) {
          if (value.url) {
            return value.url; // Extract URL from Webflow file object
          }
          return JSON.stringify(value);
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (parsed && parsed.url) {
              return parsed.url; // Extract URL from parsed JSON
            }
            return value; // Return as-is if it's already a URL
          } catch (e) {
            return value; // Return as-is if it's not JSON
          }
        }
        return value;
      case 'text':
      default:
        // Handle objects and arrays
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
        return String(value);
    }
  };

  // Extract fields from Webflow data
  const extractFieldsFromWebflowData = (data: any): TableField[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("Invalid data format for field extraction:", data);
      return [];
    }

    // Start with system fields
    const fields: TableField[] = [{
      id: crypto.randomUUID(),
      name: 'id',
      type: 'text',
      required: true,
      system: true
    }, {
      id: crypto.randomUUID(),
      name: 'webflow_id',
      type: 'text',
      required: false,
      description: 'Original Webflow ID'
    }];

    // Track field names we've already added
    const fieldNames = new Set(['id', 'webflow_id']);
    try {
      // Check if items have fieldData property
      const sampleItem = data[0];

      // Try to determine the structure of the data
      let sampleFields: any = {};

      // Handle different Webflow API response formats
      if (sampleItem.fieldData) {
        // New format with fieldData property
        sampleFields = sampleItem.fieldData;
        console.log("Using fieldData property for fields", sampleFields);
      } else if (sampleItem.fields) {
        // Alternative format with fields property
        sampleFields = sampleItem.fields;
        console.log("Using fields property for fields", sampleFields);
      } else {
        // Assume top-level properties are fields (excluding system fields)
        const systemProps = ['id', '_id', '_draft', '_archived', 'slug'];
        sampleFields = Object.keys(sampleItem).filter(key => !systemProps.includes(key)).reduce((obj, key) => {
          obj[key] = sampleItem[key];
          return obj;
        }, {});
        console.log("Using top-level properties for fields", sampleFields);
      }

      // Process all items to find all possible fields
      for (const item of data) {
        // Determine where to find the fields based on the structure
        let itemFields: any = {};
        if (item.fieldData) {
          itemFields = item.fieldData;
        } else if (item.fields) {
          itemFields = item.fields;
        } else {
          // Extract from top level, excluding system props
          const systemProps = ['id', '_id', '_draft', '_archived', 'slug'];
          Object.keys(item).forEach(key => {
            if (!systemProps.includes(key)) {
              itemFields[key] = item[key];
            }
          });
        }

        // Add fields from extracted data
        Object.keys(itemFields).forEach(key => {
          if (!fieldNames.has(key)) {
            const value = itemFields[key];
            const fieldType = getFieldTypeFromValue(value);
            fields.push({
              id: crypto.randomUUID(),
              name: key,
              type: fieldType,
              required: false,
              description: `Imported from Webflow field: ${key}`
            });
            fieldNames.add(key);
          }
        });
      }
      return fields;
    } catch (error) {
      console.error("Error processing fields:", error);
      return fields; // Return at least the system fields
    }
  };

  // Determine field type based on value
  const getFieldTypeFromValue = (value: any): TableField['type'] => {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return 'text'; // Store arrays as JSON text

      // Check if it's an image/file reference
      if (value.url || value.fileId) return 'image';
      return 'text'; // For other objects, store as JSON text
    }

    // Check for common date formats
    if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ||
    // ISO format
    value.match(/^\d{4}-\d{2}-\d{2}$/))) {
      // YYYY-MM-DD
      return 'date';
    }

    // Default to text for all other types
    return 'text';
  };
  const fetchCollectionData = async () => {
    if (!webflowCollection || !user || !webflowApiKey) return;
    try {
      setIsLoading(true);
      console.log("Fetching collection data for collection:", webflowCollection);
      console.log("Using API key:", webflowApiKey ? "Present (hidden)" : "Not provided");

      // Call the Supabase Edge Function with POST method
      const {
        data: responseData,
        error: fnError
      } = await supabase.functions.invoke('webflow-proxy', {
        method: 'POST',
        body: {
          path: `v2/collections/${webflowCollection}/items`,
          apiKey: webflowApiKey
        }
      });
      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(`Error calling Webflow API: ${fnError.message}`);
      }
      if (!responseData || !responseData.success) {
        throw new Error(responseData?.error || `Failed to fetch collection data`);
      }
      console.log("Collection data response:", responseData);

      // Extract items array - handle different response structures
      let items: any[] = [];
      if (responseData.result) {
        if (Array.isArray(responseData.result)) {
          items = responseData.result;
        } else if (responseData.result.items && Array.isArray(responseData.result.items)) {
          items = responseData.result.items;
        } else if (responseData.result.result && Array.isArray(responseData.result.result.items)) {
          items = responseData.result.result.items;
        } else if (responseData.result.result && responseData.result.result.items) {
          items = responseData.result.result.items;
        } else {
          // Last resort - try to use result directly if it might be an item
          items = [responseData.result];
        }
      }
      console.log("Extracted items:", items);
      if (!items || items.length === 0) {
        toast.warning('No items found in this collection');
        setCollectionData([]);
        return;
      }

      // Store the collection data
      setCollectionData(items);

      // Generate table fields from the items
      const extractedFields = extractFieldsFromWebflowData(items);
      setTableFields(extractedFields);

      // Set sample records for preview
      const samples = items.slice(0, Math.min(5, items.length));
      setSampleRecords(samples);

      // Move to preview step
      setStep('preview');
    } catch (error: any) {
      console.error('Error fetching collection data:', error);
      toast.error(error.message || 'Failed to fetch collection data');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert a single Webflow item to a record for import with proper sanitization
  // Note: We'll generate sequential IDs in the caller to maintain proper sequencing
  const convertItemToRecord = (item: any, fields: TableField[], existingRecords: any[] = []): any => {
    const record: any = {
      id: generateRecordId(existingRecords)
    };

    // Map webflow ID
    record.webflow_id = item.id || item._id;

    // Determine where the actual field data is located
    let sourceData: any = {};
    if (item.fieldData) {
      sourceData = item.fieldData;
    } else if (item.fields) {
      sourceData = item.fields;
    } else {
      const systemProps = ['id', '_id', '_draft', '_archived', 'slug', 'webflow_id'];
      Object.keys(item).forEach(key => {
        if (!systemProps.includes(key)) {
          sourceData[key] = item[key];
        }
      });
    }
    console.log("Source data for record:", sourceData);

    // Map each field to its value with proper sanitization
    fields.forEach(field => {
      if (field.name !== 'id' && field.name !== 'webflow_id') {
        let rawValue = sourceData[field.name];

        // Apply sanitization and type conversion
        const sanitizedValue = sanitizeAndConvertValue(rawValue, field.type);
        record[field.name] = sanitizedValue;
        console.log(`Field ${field.name} (${field.type}): ${JSON.stringify(rawValue)} -> ${JSON.stringify(sanitizedValue)}`);
      }
    });
    console.log("Converted record:", record);
    return record;
  };
  const importCollectionData = async () => {
    if (!user || !collectionName || collectionData.length === 0 || !databaseId) {
      toast.error('Missing required data for import');
      return;
    }
    try {
      setStep('importing');
      setIsLoading(true);
      setImportProgress(0);

      // Create table schema
      const tableSchema: TableSchema = {
        id: crypto.randomUUID(),
        name: collectionName,
        fields: tableFields
      };

      // Setup progress updates
      const totalSteps = collectionData.length + 2; // +2 for schema creation and final update
      let currentStep = 0;
      const updateProgress = () => {
        currentStep++;
        const percentage = Math.round(currentStep / totalSteps * 100);
        setImportProgress(percentage);
      };

      // Step 1: Create table structure
      updateProgress();
      console.log("Created table structure with fields:", tableFields);

      // Step 2: Convert Webflow data to table records
      const records = collectionData.map(item => {
        const record = convertItemToRecord(item, tableFields);
        updateProgress();
        return record;
      });
      console.log("Converted records:", records);

      // Step 3: Create table project with the data
      const newProject = await tableService.createTableProject({
        name: `${collectionName}`,
        description: `Imported from Webflow collection: ${collectionName}`,
        user_id: user.id,
        schema: tableSchema,
        records: records,
        database_id: databaseId
      });
      console.log("Created table project:", newProject);
      setImportedTable(newProject.id);
      setStep('complete');
      toast.success(`Successfully imported ${records.length} records from Webflow`);
    } catch (error: any) {
      console.error('Error importing collection:', error);
      toast.error(error.message || 'Failed to import collection data');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Get formatted value for display in the table preview
  const getFormattedValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      if (value.url) return `[File: ${value.url.split('/').pop()}]`;
      return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    }
    return String(value);
  };
  const handleNext = () => {
    if (step === 'connect' && selectedSource === 'webflow') {
      if (!webflowApiKey.trim()) {
        toast.error('Please enter your Webflow API key');
        return;
      }

      // Save API key and proceed to collection selection
      setWebflowApiKey(webflowApiKey);
      setStep('selectCollection');
    } else if (step === 'selectCollection' && webflowCollection) {
      fetchCollectionData();
    } else if (step === 'preview') {
      // Move to the confirmation step
      setStep('confirm');
    } else if (step === 'confirm') {
      importCollectionData();
    }
  };
  const resetDialog = () => {
    setStep('select');
    setSelectedSource(null);
    setWebflowApiKey('');
    setWebflowSite('');
    setWebflowCollection('');
    setCollectionName('');
    setCollectionData([]);
    setTableFields([]);
    setImportedTable('');
    setConfirmImport(false);
    setSampleRecords([]);
    setActiveTab('preview-data');
  };
  const handleClose = () => {
    resetDialog();
    onClose();
  };
  const renderIntegrationGrid = () => {
    return <div className="grid grid-cols-3 gap-4 py-4">
        {integrationOptions.map(option => <div key={option.id} onClick={() => handleSelectSource(option.id)} className="border rounded-lg p-2 flex flex-col items-center cursor-pointer hover:border-primary transition-colors">
            <div className="w-6 h-6 flex items-center justify-center text-1xl mb-1">
              {option.icon}
            </div>
            <h3 className="font-medium text-sm mb-1">{option.name}</h3>
            <Badge variant="outline" className="bg-muted/50 mb-4">
              {option.connected ? 'CONNECTED' : 'NOT CONNECTED'}
            </Badge>
            <Button variant="outline" size="sm" className="mt-auto w-full">
              {option.action === 'upload' && <Upload className="h-3 w-3 mr-1" />}
              {option.action === 'connect' && <Plus className="h-3.5 w-3.5 mr-1" />}
              {option.actionText}
            </Button>
          </div>)}
      </div>;
  };
  const renderTablePreview = () => {
    if (!tableFields.length || !sampleRecords.length) {
      return <div className="text-center p-4 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No data available for preview</p>
        </div>;
    }
    return <div className="border rounded-md overflow-hidden">
        <ScrollArea className="h-[350px]">
          <UITable>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {tableFields.map(field => <TableHead key={field.id} className="whitespace-nowrap">
                    {field.name} 
                    <Badge variant="outline" className="ml-1 text-xs">
                      {field.type}
                    </Badge>
                  </TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRecords.map((record, rowIndex) => {
              // Determine where to find the field values for this record
              let fieldValues: any = {};
              if (record.fieldData) {
                fieldValues = record.fieldData;
              } else if (record.fields) {
                fieldValues = record.fields;
              } else {
                // Use top-level properties
                const systemProps = ['id', '_id', '_draft', '_archived', 'slug'];
                Object.keys(record).forEach(key => {
                  if (!systemProps.includes(key)) {
                    fieldValues[key] = record[key];
                  }
                });
              }
              return <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/20" : ""}>
                    {tableFields.map(field => {
                  let value = '-';
                  if (field.name === 'id') {
                    value = `[Generated UUID]`;
                  } else if (field.name === 'webflow_id') {
                    value = record.id || record._id || '-';
                  } else {
                    value = getFormattedValue(fieldValues[field.name]);
                  }
                  return <TableCell key={`${rowIndex}-${field.id}`} className="overflow-hidden text-ellipsis">
                          {value}
                        </TableCell>;
                })}
                  </TableRow>;
            })}
            </TableBody>
          </UITable>
        </ScrollArea>
      </div>;
  };
  const renderTableStructure = () => {
    return <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Table Fields</h3>
          <Badge variant="outline">{tableFields.length} fields defined</Badge>
        </div>
        
        <div className="border rounded-md overflow-hidden">
          <ScrollArea className="h-[300px]">
            <UITable>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableFields.map(field => <TableRow key={field.id} className={field.system ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={field.type === 'image' ? "bg-blue-50 text-blue-600 border-blue-200" : field.type === 'number' ? "bg-green-50 text-green-600 border-green-200" : ""}>
                        {field.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{field.required ? "Yes" : "No"}</TableCell>
                    <TableCell>{field.system ? "Yes" : "No"}</TableCell>
                    <TableCell>{field.description || "-"}</TableCell>
                  </TableRow>)}
              </TableBody>
            </UITable>
          </ScrollArea>
        </div>
      </div>;
  };
  const getStepContent = () => {
    switch (step) {
      case 'select':
        return renderIntegrationGrid();
      case 'connect':
        if (selectedSource === 'webflow') {
          return <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Enter Webflow API Key</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  You'll need to generate a site-specific API key from your Webflow project settings.
                </p>
                <Input placeholder="Enter your Webflow API key" value={webflowApiKey} onChange={e => setWebflowApiKey(e.target.value)} />
              </div>
            </div>;
        }
        return null;
      case 'selectCollection':
        return <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Select Webflow Site</h4>
              <WebflowSelectField value={webflowSite} onChange={handleWebflowSiteChange} optionType="sites" apiKey={webflowApiKey} showIntegrationStatus loadOnMount={true} // Ensure sites load immediately
            />
            </div>
            
            {webflowSite && <div>
                <h4 className="text-sm font-medium mb-2">Select Collection</h4>
                <WebflowSelectField value={webflowCollection} onChange={(value: string, label?: string) => {
              // Find the selected option to get its label if not provided
              if (!label) {
                const selected = document.querySelector(`[data-value="${value}"]`);
                label = selected?.textContent || value;
              }
              handleWebflowCollectionChange(value, label);
            }} optionType="collections" siteId={webflowSite} apiKey={webflowApiKey} loadOnMount={true} // Ensure collections load immediately when siteId is available
            />
              </div>}
          </div>;
      case 'preview':
        return <div className="space-y-5 py-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-blue-700">Collection: {collectionName}</h3>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                We found {tableFields.length} fields and {collectionData.length} records in this collection.
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="preview-data">Data Preview</TabsTrigger>
                <TabsTrigger value="table-structure">Table Structure</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview-data">
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Table className="h-4 w-4" /> Data Preview
                  </h4>
                  {renderTablePreview()}
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing {Math.min(sampleRecords.length, 5)} of {collectionData.length} records
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="table-structure">
                {renderTableStructure()}
              </TabsContent>
            </Tabs>
            
            <div className="bg-green-50 border border-green-300 rounded-md p-4">
              <div className="flex items-center gap-3">
                <ArrowDown className="h-5 w-5 text-green-500" />
                <div>
                  <h3 className="font-medium text-green-700">Next Steps</h3>
                  <p className="text-sm text-green-600">
                    Review the data preview and table structure, then proceed to create your table.
                  </p>
                </div>
              </div>
            </div>
          </div>;
      case 'confirm':
        return <div className="space-y-5 py-4">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800">Confirmation Required</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You're about to create a new table named "{collectionName}" with {tableFields.length} fields and import {collectionData.length} records.
                  </p>
                </div>
              </div>
            </div>
            
            <Card className="p-4 shadow-md">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Hexagon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Table Summary</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Table Name:</p>
                    <p className="font-medium">{collectionName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Database ID:</p>
                    <p className="font-mono text-xs">{databaseId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fields:</p>
                    <p className="font-medium">{tableFields.length} fields</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Records:</p>
                    <p className="font-medium">{collectionData.length} records</p>
                  </div>
                </div>
              </div>
            </Card>
            
            {renderTableStructure()}
            
            <div className="bg-green-50 border border-green-300 rounded-md p-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <p className="text-green-700 font-medium">
                  Ready to create table and import data
                </p>
              </div>
            </div>
          </div>;
      case 'importing':
        return <div className="space-y-4 py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-center text-lg mt-4 font-medium">
              Importing data from Webflow...
            </p>
            <div className="w-full max-w-md bg-muted/20 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-primary h-2 transition-all duration-300" style={{
              width: `${importProgress}%`
            }}></div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {importProgress < 100 ? `Processing ${importProgress}% complete...` : "Finalizing import..."}
            </p>
          </div>;
      case 'complete':
        return <div className="space-y-4 py-4 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <p className="text-center mt-4 font-medium text-lg">
              Import complete!
            </p>
            <p className="text-center text-muted-foreground">
              Successfully imported {collectionData.length} records into your database.
            </p>
            <div className="bg-muted/20 rounded-md p-6 mt-2 w-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-lg">{collectionName}</p>
                    <p className="text-muted-foreground">{tableFields.length} fields, {collectionData.length} records</p>
                  </div>
                  <Button onClick={() => navigate(`/tables/${importedTable}`)} className="gap-2">
                    <Eye className="h-4 w-4" /> View Table
                  </Button>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">What's next?</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Create form views for data entry</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Create reports and visualizations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Set up automated workflows</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>;
      default:
        return null;
    }
  };
  const getDialogTitle = () => {
    if (step === 'select') {
      return "Start a table from pre-existing data source";
    } else if (step === 'confirm') {
      return "Confirm Table Creation & Import";
    } else if (selectedSource === 'webflow') {
      return "Import from Webflow";
    }
    return "Import Data";
  };
  const getDialogDescription = () => {
    if (step === 'select') {
      return "Choose a data source to import from";
    } else if (step === 'confirm') {
      return "Review and confirm the table structure before creating it in your database";
    } else if (selectedSource === 'webflow') {
      return "Connect to Webflow to import collection data into your database.";
    }
    return "Connect to import data into your database.";
  };
  const renderFooter = () => {
    if (step === 'importing') {
      return null; // No footer during import
    }
    if (step === 'complete') {
      return <Button onClick={handleClose}>
          Close
        </Button>;
    }
    if (step === 'select') {
      return <>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled>
            Continue and create a data connection
          </Button>
        </>;
    }
    if (step === 'confirm') {
      return <>
          <Button variant="outline" onClick={() => setStep('preview')}>
            Back to Preview
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={importCollectionData} className="bg-green-600 hover:bg-green-700 gap-2">
            <Database className="h-4 w-4" />
            Create Table & Import Data
          </Button>
        </>;
    }
    return <>
        <Button variant="outline" onClick={() => step === 'connect' ? setStep('select') : setStep(step === 'preview' ? 'selectCollection' : 'select')}>
          Back
        </Button>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={isLoading || step === 'connect' && !webflowApiKey || step === 'selectCollection' && !webflowCollection} className={step === 'preview' ? "gap-2" : ""}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === 'preview' ? <>
              <RefreshCw className="h-4 w-4 mr-2" /> 
              Review & Confirm
            </> : <>Next <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </>;
  };
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={step === 'select' ? "sm:max-w-[700px]" : "sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden"}>
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className={step !== 'select' ? "flex-1 overflow-auto px-6" : "px-6"}>
          {getStepContent()}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 mt-2 border-t">
          {renderFooter()}
        </DialogFooter>
        
        {step === 'select' && <div className="text-center text-xs text-muted-foreground pt-2 border-t mt-4">
            DON'T SEE YOUR DATA SOURCE? <span className="text-primary font-medium cursor-pointer">REQUEST A CUSTOM ONE</span>
          </div>}
      </DialogContent>
    </Dialog>;
}
