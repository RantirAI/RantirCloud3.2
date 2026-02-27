import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { DatabaseBindingField } from '@/components/app-builder/properties/DatabaseBindingField';
import { DISPLAY_TEMPLATES, DataDisplayField } from './DataDisplay';

import { AppComponent } from '@/types/appBuilder';
import { toast } from 'sonner';

interface DataDisplayPropertiesTabProps {
  component: AppComponent;
}

export function DataDisplayPropertiesTab({ component }: DataDisplayPropertiesTabProps) {
  const { updateComponent } = useAppBuilderStore();
  const [newFieldName, setNewFieldName] = useState('');
  
  // Get current configuration
  const displayMode = component.props?.displayMode || 'list';
  const template = component.props?.template || 'simple-list';
  const fieldMappings = component.props?.fieldMappings || [];
  const dataSource = component.dataSource || component.props?.dataSource || component.props?.databaseConnection;
  
  // Get available templates for current display mode
  const availableTemplates = DISPLAY_TEMPLATES.filter(t => t.displayMode === displayMode);
  const currentTemplate = DISPLAY_TEMPLATES.find(t => t.id === template);
  
  const handlePropertyChange = (propertyName: string, value: any) => {
    updateComponent(component.id, {
      props: {
        ...component.props,
        [propertyName]: value
      }
    });
  };
  
  const handleDatabaseConnection = (connectionData: any) => {
    updateComponent(component.id, {
      props: {
        ...component.props,
        dataSource: connectionData
      }
    });
  };
  
  const addFieldMapping = (fieldType: string, isCustom = false) => {
    const id = isCustom ? newFieldName.toLowerCase().replace(/\s+/g, '_') : fieldType;
    const displayName = isCustom ? newFieldName : fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
    
    if (!id) {
      toast.error('Please enter a field name');
      return;
    }
    
    const newMapping: DataDisplayField = {
      id,
      displayName,
      sourceField: '',
      type: 'text',
      visible: true,
      order: fieldMappings.length
    };
    
    handlePropertyChange('fieldMappings', [...fieldMappings, newMapping]);
    if (isCustom) setNewFieldName('');
  };
  
  const updateFieldMapping = (id: string, updates: Partial<DataDisplayField>) => {
    const updatedMappings = fieldMappings.map((mapping: DataDisplayField) => 
      mapping.id === id ? { ...mapping, ...updates } : mapping
    );
    handlePropertyChange('fieldMappings', updatedMappings);
  };
  
  const removeFieldMapping = (id: string) => {
    const updatedMappings = fieldMappings.filter((mapping: DataDisplayField) => mapping.id !== id);
    handlePropertyChange('fieldMappings', updatedMappings);
  };
  
  const moveFieldMapping = (id: string, direction: 'up' | 'down') => {
    const currentIndex = fieldMappings.findIndex((m: DataDisplayField) => m.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fieldMappings.length) return;
    
    const updatedMappings = [...fieldMappings];
    [updatedMappings[currentIndex], updatedMappings[newIndex]] = 
    [updatedMappings[newIndex], updatedMappings[currentIndex]];
    
    // Update order values
    updatedMappings.forEach((mapping, index) => {
      mapping.order = index;
    });
    
    handlePropertyChange('fieldMappings', updatedMappings);
  };
  
  const autoMapFields = () => {
    if (!dataSource?.fields) {
      toast.error('No data source connected');
      return;
    }
    
    // Create mappings for all available fields
    const autoMappings: DataDisplayField[] = dataSource.fields.map((field: any, index: number) => {
      // Better auto-detection of field types
      let fieldType = 'text';
      let displayType = 'text';
      
      const fieldName = field.name?.toLowerCase() || '';
      
      // Auto-detect images by field name or content
      if (fieldName.includes('image') || fieldName.includes('photo') || fieldName.includes('picture') || 
          fieldName.includes('avatar') || fieldName.includes('thumbnail') || fieldName === 'img') {
        fieldType = 'image';
        displayType = 'image';
      } else if (field.type === 'number') {
        fieldType = 'number';
        displayType = 'number';
      } else if (field.type === 'boolean') {
        fieldType = 'boolean';
        displayType = 'boolean';
      } else if (field.type === 'timestamp' || fieldName.includes('date') || fieldName.includes('time')) {
        fieldType = 'date';
        displayType = 'date';
      } else if (fieldName.includes('status') || fieldName.includes('category') || fieldName.includes('tag')) {
        fieldType = 'text';
        displayType = 'badge';
      }
      
      return {
        id: field.name,
        displayName: field.displayName || field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1'),
        sourceField: field.name,
        type: fieldType,
        displayType: displayType,
        visible: true,
        order: index
      };
    });
    
    handlePropertyChange('fieldMappings', autoMappings);
    toast.success(`Auto-mapped ${autoMappings.length} fields successfully!`);
  };
  
  // Get schema fields for dropdowns
  const schemaFields = dataSource?.fields || [];
  
  return (
    <div className="space-y-3 max-w-full overflow-hidden">
      <Tabs defaultValue="template" className="w-full max-w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted h-8 p-0.5 rounded-none">
          <TabsTrigger 
            value="template" 
            className="text-xs font-medium h-7 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:text-foreground"
          >
            Template
          </TabsTrigger>
          <TabsTrigger 
            value="data" 
            className="text-xs font-medium h-7 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:text-foreground"
          >
            Data Source
          </TabsTrigger>
          <TabsTrigger 
            value="options" 
            className="text-xs font-medium h-7 rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:text-foreground"
          >
            Display Options
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="template" className="flex flex-col h-full space-y-2 mt-3 max-w-full overflow-hidden">
          <div className="flex-shrink-0 bg-card p-3 max-w-full">
            <div className="pb-2">
              <h3 className="text-sm font-medium">Display Template</h3>
            </div>
            <div className="space-y-2 max-w-full">
              <div>
                <Label>Display Mode</Label>
                <Select
                  value={displayMode}
                  onValueChange={(value) => handlePropertyChange('displayMode', value)}
                >
                  <SelectTrigger className="max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List View</SelectItem>
                    <SelectItem value="cards">Card Grid</SelectItem>
                    <SelectItem value="table">Table View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Template</Label>
                <Select
                  value={template}
                  onValueChange={(value) => handlePropertyChange('template', value)}
                >
                  <SelectTrigger className="max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {currentTemplate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Required Fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {currentTemplate.fields.map((field) => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col bg-card p-3 max-w-full overflow-hidden">
            <div className="flex-row items-center justify-between flex-shrink-0 pb-2 max-w-full">
              <h3 className="text-sm font-medium">Field Mappings</h3>
              <Button onClick={autoMapFields} variant="outline" size="sm" className="flex-shrink-0">
                Auto Map Fields
              </Button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden max-w-full">
              {currentTemplate?.fields.map((fieldType) => {
                const mapping = fieldMappings.find((m: DataDisplayField) => m.id === fieldType);
                
                return (
                  <div key={fieldType} className="space-y-3 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field</Label>
                      {!mapping && (
                        <Button
                          onClick={() => addFieldMapping(fieldType)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    
                    {mapping && (
                      <div className="space-y-2">
                           <div>
                             <Label className="text-xs">Display Name</Label>
                             <Input
                               value={mapping.displayName}
                               onChange={(e) => updateFieldMapping(mapping.id, { displayName: e.target.value })}
                               placeholder="Display name"
                               className="max-w-full"
                             />
                           </div>
                           
                           <div>
                             <Label className="text-xs">Source Field</Label>
                             <Select
                               value={mapping.sourceField}
                               onValueChange={(value) => updateFieldMapping(mapping.id, { sourceField: value })}
                             >
                               <SelectTrigger className="max-w-full">
                                 <SelectValue placeholder="Select field" />
                               </SelectTrigger>
                              <SelectContent>
                                {schemaFields.filter((field: any) => field.name && field.name.trim()).map((field: any) => (
                                  <SelectItem key={field.name} value={field.name}>
                                    {field.name} ({field.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                           </Select>
                         </div>
                         
                         {/* Custom Value Field */}
                         <div className="flex items-center space-x-2">
                           <Switch
                             checked={mapping.isCustom || false}
                             onCheckedChange={(checked) => updateFieldMapping(mapping.id, { isCustom: checked })}
                           />
                           <Label className="text-xs">Use Custom Value</Label>
                         </div>
                         
                         {mapping.isCustom && (
                           <div>
                             <Label className="text-xs">Custom Value</Label>
                             <Input
                               value={mapping.customValue || ''}
                               onChange={(e) => updateFieldMapping(mapping.id, { customValue: e.target.value })}
                               placeholder="Enter custom value..."
                             />
                           </div>
                         )}
                         
              {/* Display Type Override */}
              <div>
                <Label className="text-xs">Display Type</Label>
                <Select
                  value={mapping.displayType || mapping.type}
                  onValueChange={(value) => updateFieldMapping(mapping.id, { displayType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="badge">Badge</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={mapping.visible}
                              onCheckedChange={(checked) => updateFieldMapping(mapping.id, { visible: checked })}
                            />
                            <Label className="text-xs">Visible</Label>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              onClick={() => moveFieldMapping(mapping.id, 'up')}
                              size="sm"
                              variant="ghost"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => moveFieldMapping(mapping.id, 'down')}
                              size="sm"
                              variant="ghost"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => removeFieldMapping(mapping.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show all mapped fields from auto-mapping */}
              {fieldMappings.length > 0 && (
                <>
                  <div className="flex-shrink-0 border-t pt-4 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="font-medium text-sm">All Mapped Fields ({fieldMappings.length})</Label>
                      <Badge variant="outline" className="text-xs">
                        {fieldMappings.filter((m: DataDisplayField) => m.visible).length} visible
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                     {fieldMappings.map((mapping: DataDisplayField) => (
                       <div key={mapping.id} className="p-3 border rounded-lg bg-muted/20">
                          <div className="space-y-3">
                             <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                 <Badge variant="secondary" className="text-xs flex-shrink-0">
                                   {mapping.displayType || mapping.type}
                                 </Badge>
                                 <span className="font-medium text-sm truncate">{mapping.displayName}</span>
                               </div>
                               <div className="flex items-center gap-2 flex-shrink-0">
                                 <Button
                                   onClick={() => moveFieldMapping(mapping.id, 'up')}
                                   size="sm"
                                   variant="ghost"
                                   disabled={mapping.order === 0}
                                   className="h-7 w-7 p-0"
                                 >
                                   <ArrowUp className="h-3 w-3" />
                                 </Button>
                                 <Button
                                   onClick={() => moveFieldMapping(mapping.id, 'down')}
                                   size="sm"
                                   variant="ghost"
                                   disabled={mapping.order === fieldMappings.length - 1}
                                   className="h-7 w-7 p-0"
                                 >
                                   <ArrowDown className="h-3 w-3" />
                                 </Button>
                                 <div className="flex items-center justify-center min-w-[36px]">
                                   <Switch
                                     checked={mapping.visible}
                                     onCheckedChange={(checked) => updateFieldMapping(mapping.id, { visible: checked })}
                                   />
                                 </div>
                                 <Button
                                   onClick={() => removeFieldMapping(mapping.id)}
                                   size="sm"
                                   variant="ghost"
                                   className="text-red-600 h-7 w-7 p-0"
                                 >
                                   <Trash2 className="h-3 w-3" />
                                 </Button>
                               </div>
                             </div>
                           
                           {/* Expandable field configuration */}
                           <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                             <div>
                               <Label className="text-xs text-muted-foreground">Display Name</Label>
                               <Input
                                 value={mapping.displayName}
                                 onChange={(e) => updateFieldMapping(mapping.id, { displayName: e.target.value })}
                                 placeholder="Display name"
                                 className="h-8 text-xs"
                               />
                             </div>
                             
                             <div>
                               <Label className="text-xs text-muted-foreground">Display Type</Label>
                               <Select
                                 value={mapping.displayType || mapping.type}
                                 onValueChange={(value) => updateFieldMapping(mapping.id, { displayType: value as any })}
                               >
                                 <SelectTrigger className="h-8 text-xs">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="text">Text</SelectItem>
                                   <SelectItem value="number">Number</SelectItem>
                                   <SelectItem value="date">Date</SelectItem>
                                   <SelectItem value="image">Image</SelectItem>
                                   <SelectItem value="badge">Badge</SelectItem>
                                   <SelectItem value="boolean">Boolean</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>
                           </div>
                           
                           <div className="text-xs text-muted-foreground">
                             Source: <code className="bg-background px-1 rounded">{mapping.sourceField}</code>
                             {mapping.displayType && mapping.displayType !== mapping.type && (
                               <span className="ml-2 text-primary">• Display override: {mapping.displayType}</span>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </>
              )}
              
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="mt-3">
          <div className="bg-card p-3">
            <div className="pb-2">
              <h3 className="text-sm font-medium">Data Source</h3>
              <p className="text-xs text-muted-foreground">Connect your data display to a database table</p>
            </div>
            <div className="space-y-2">
              <DatabaseBindingField
                label="Database Connection"
                value={component.dataSource || component.props?.databaseConnection}
                onChange={(value) => {
                  handlePropertyChange('databaseConnection', value);
                  // Also update the dataSource for compatibility
                  updateComponent(component.id, { 
                    dataSource: value,
                    props: { 
                      ...component.props,
                      databaseConnection: value 
                    }
                  });
                }}
                description="Select a table to connect your data display to"
              />
              
              {(component.dataSource || component.props?.databaseConnection) && (
                <div className="mt-4 p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Data Source Connected</span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Your data display is now connected to the selected table. 
                    Configure field mappings in the Template tab to customize how data is displayed.
                  </p>
                  {dataSource?.fields && dataSource.fields.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-2">
                        Available Fields ({dataSource.fields.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dataSource.fields.slice(0, 8).map((field: any) => (
                          <span 
                            key={field.name}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                          >
                            {field.name}
                            <span className="text-green-600 dark:text-green-400">({field.type})</span>
                          </span>
                        ))}
                        {dataSource.fields.length > 8 && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                            +{dataSource.fields.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="options" className="space-y-2 mt-3">
          <div className="bg-card p-3">
            <div className="pb-2">
              <h3 className="text-sm font-medium">Display Options</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Show Search Bar</Label>
                <Switch
                  checked={component.props?.showSearch || false}
                  onCheckedChange={(checked) => handlePropertyChange('showSearch', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Enable Pagination</Label>
                <Switch
                  checked={component.props?.showPagination || false}
                  onCheckedChange={(checked) => handlePropertyChange('showPagination', checked)}
                />
              </div>
              
              {component.props?.showPagination && (
                <div>
                  <Label>Items per Page</Label>
                  <Select
                    value={String(component.props?.itemsPerPage || 10)}
                    onValueChange={(value) => handlePropertyChange('itemsPerPage', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label>Allow Sorting</Label>
                <Switch
                  checked={component.props?.allowSorting || false}
                  onCheckedChange={(checked) => handlePropertyChange('allowSorting', checked)}
                />
              </div>
              
              {displayMode === 'cards' && (
                <>
                  <div>
                    <Label>Cards per Row</Label>
                    <Select
                      value={String(component.props?.cardsPerRow || 3)}
                      onValueChange={(value) => handlePropertyChange('cardsPerRow', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Card Image Position - Always visible for cards */}
                  <div>
                    <Label>Card Image Position</Label>
                    <Select
                      value={component.props?.imagePosition || 'top'}
                      onValueChange={(value) => handlePropertyChange('imagePosition', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="side">Side</SelectItem>
                        <SelectItem value="background">Background</SelectItem>
                        <SelectItem value="none">No Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Image Field Selection */}
              {currentTemplate?.supportsImages && schemaFields.length > 0 && (
                <div>
                  <Label>Image Field</Label>
                  <Select
                    value={component.props?.imageField || ''}
                    onValueChange={(value) => handlePropertyChange('imageField', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field for images" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="none">No image field</SelectItem>
                      {schemaFields.filter((field: any) => field.name && field.name.trim()).map((field: any) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Remove this section as it's now moved above */}
            </div>
          </div>

          <div className="bg-card p-3">
            <div className="pb-2">
              <h3 className="text-sm font-medium">CRUD Operations</h3>
              <p className="text-xs text-muted-foreground">Enable create, read, update, and delete operations</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Enable CRUD Operations</Label>
                <Switch
                  checked={component.props?.enableCrud || false}
                  onCheckedChange={(checked) => handlePropertyChange('enableCrud', checked)}
                />
              </div>

              {component.props?.enableCrud && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Show Add Button</Label>
                    <Switch
                      checked={component.props?.showAddButton || false}
                      onCheckedChange={(checked) => handlePropertyChange('showAddButton', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Enable Bulk Delete</Label>
                    <Switch
                      checked={component.props?.enableBulkDelete || false}
                      onCheckedChange={(checked) => handlePropertyChange('enableBulkDelete', checked)}
                    />
                  </div>

                  <div>
                    <Label>View Mode</Label>
                    <Select
                      value={component.props?.viewMode || 'dialog'}
                      onValueChange={(value) => handlePropertyChange('viewMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dialog">Dialog</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="page">New Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Edit Mode</Label>
                    <Select
                      value={component.props?.editMode || 'dialog'}
                      onValueChange={(value) => handlePropertyChange('editMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dialog">Dialog</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="page">New Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Add Mode</Label>
                    <Select
                      value={component.props?.addMode || 'dialog'}
                      onValueChange={(value) => handlePropertyChange('addMode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dialog">Dialog</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="page">New Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}