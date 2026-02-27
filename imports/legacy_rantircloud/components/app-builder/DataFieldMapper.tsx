import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';

export interface FieldMapping {
  id: string;
  displayName: string;
  sourceField: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'url';
  format?: string;
  visible: boolean;
  order: number;
}

interface DataFieldMapperProps {
  component: any;
  schema: any;
  currentMappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
}

export function DataFieldMapper({ component, schema, currentMappings, onMappingsChange }: DataFieldMapperProps) {
  const [newFieldName, setNewFieldName] = useState('');

  const availableFields = schema?.fields || [];
  const fields = Array.isArray(availableFields) ? availableFields : Object.keys(availableFields).map(key => ({ name: key, type: 'text' }));

  const addCustomField = () => {
    if (!newFieldName.trim()) return;

    const newMapping: FieldMapping = {
      id: `field-${Date.now()}`,
      displayName: newFieldName,
      sourceField: '',
      type: 'text',
      visible: true,
      order: currentMappings.length
    };

    onMappingsChange([...currentMappings, newMapping]);
    setNewFieldName('');
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    const updatedMappings = currentMappings.map(mapping =>
      mapping.id === id ? { ...mapping, ...updates } : mapping
    );
    onMappingsChange(updatedMappings);
  };

  const removeMapping = (id: string) => {
    const filteredMappings = currentMappings.filter(mapping => mapping.id !== id);
    onMappingsChange(filteredMappings);
  };

  const moveMapping = (id: string, direction: 'up' | 'down') => {
    const currentIndex = currentMappings.findIndex(m => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentMappings.length) return;

    const reorderedMappings = [...currentMappings];
    const [movedItem] = reorderedMappings.splice(currentIndex, 1);
    reorderedMappings.splice(newIndex, 0, movedItem);

    // Update order property
    const updatedMappings = reorderedMappings.map((mapping, index) => ({
      ...mapping,
      order: index
    }));

    onMappingsChange(updatedMappings);
  };

  const autoMapFields = () => {
    const autoMappings: FieldMapping[] = fields.map((field, index) => ({
      id: `auto-${field.name}-${Date.now()}`,
      displayName: field.name.charAt(0).toUpperCase() + field.name.slice(1),
      sourceField: field.name,
      type: field.type || 'text',
      visible: true,
      order: index
    }));

    onMappingsChange(autoMappings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Field Mapping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="mappings" className="w-full">
          <TabsList className="w-fit">
            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
            <TabsTrigger value="quick">Quick Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="space-y-3">
              <Button onClick={autoMapFields} className="w-full" variant="outline">
                Auto-map All Fields
              </Button>
              
              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium">Add Custom Column</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Column name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomField()}
                  />
                  <Button onClick={addCustomField} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mappings" className="space-y-4">
            <div className="space-y-3">
              {currentMappings.map((mapping, index) => (
                <Card key={mapping.id} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateMapping(mapping.id, { visible: !mapping.visible })}
                          className="h-6 w-6 p-0"
                        >
                          {mapping.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                        <Badge variant={mapping.visible ? 'default' : 'secondary'}>
                          {mapping.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMapping(mapping.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMapping(mapping.id, 'down')}
                          disabled={index === currentMappings.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMapping(mapping.id)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Display Name</Label>
                        <Input
                          value={mapping.displayName}
                          onChange={(e) => updateMapping(mapping.id, { displayName: e.target.value })}
                          placeholder="Column header"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Source Field</Label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value) => updateMapping(mapping.id, { sourceField: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={mapping.type}
                          onValueChange={(value: any) => updateMapping(mapping.id, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(mapping.type === 'date' || mapping.type === 'number') && (
                        <div className="space-y-1">
                          <Label className="text-xs">Format</Label>
                          <Input
                            value={mapping.format || ''}
                            onChange={(e) => updateMapping(mapping.id, { format: e.target.value })}
                            placeholder={mapping.type === 'date' ? 'MM/DD/YYYY' : '0,0.00'}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {currentMappings.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No field mappings configured. Use Quick Setup to get started.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}