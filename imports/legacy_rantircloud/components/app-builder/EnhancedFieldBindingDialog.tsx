import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Type, Hash, Calendar, ToggleLeft, FileText, Link2, Sparkles, Code2, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CombineTextBuilder } from './CombineTextBuilder';

interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface EnhancedFieldBindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectField: (fieldName: string) => void;
  fields: Field[];
  currentBinding?: string;
  tableName?: string;
  componentType?: string;
}

const getFieldIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'text':
    case 'string':
      return <Type className="h-4 w-4" />;
    case 'number':
    case 'integer':
      return <Hash className="h-4 w-4" />;
    case 'date':
    case 'datetime':
      return <Calendar className="h-4 w-4" />;
    case 'boolean':
      return <ToggleLeft className="h-4 w-4" />;
    case 'json':
    case 'object':
      return <FileText className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
};

const getFieldTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'text':
    case 'string':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'number':
    case 'integer':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'date':
    case 'datetime':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'boolean':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'json':
    case 'object':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400';
  }
};

export function EnhancedFieldBindingDialog({
  open,
  onOpenChange,
  onSelectField,
  fields,
  currentBinding,
  tableName = 'Database Table',
  componentType = 'text'
}: EnhancedFieldBindingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customBinding, setCustomBinding] = useState(currentBinding || '');
  const [activeTab, setActiveTab] = useState('fields');
  const [showCombineBuilder, setShowCombineBuilder] = useState(false);

  // Enhanced filtering and categorization
  const { filteredFields, categorizedFields, suggestedFields } = useMemo(() => {
    const filtered = fields.filter(field =>
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categorized = filtered.reduce((acc, field) => {
      const category = field.type.toLowerCase();
      if (!acc[category]) acc[category] = [];
      acc[category].push(field);
      return acc;
    }, {} as Record<string, Field[]>);

    // Smart suggestions based on component type and field names
    const suggested = fields.filter(field => {
      const name = field.name.toLowerCase();
      const type = field.type.toLowerCase();
      
      if (componentType === 'text' || componentType === 'heading') {
        return type === 'text' || type === 'string' || 
               name.includes('title') || name.includes('name') || name.includes('description');
      }
      if (componentType === 'image') {
        return type === 'url' || name.includes('image') || name.includes('photo') || name.includes('avatar');
      }
      return true;
    }).slice(0, 6);

    return { filteredFields: filtered, categorizedFields: categorized, suggestedFields: suggested };
  }, [fields, searchQuery, componentType]);

  // Smart pattern suggestions
  const patternSuggestions = useMemo(() => {
    const patterns = [];
    
    if (fields.length === 0) return patterns;
    
    // Single field patterns
    suggestedFields.slice(0, 3).forEach(field => {
      patterns.push({
        label: field.name,
        value: `{{${field.name}}}`,
        description: `Display ${field.name} value`
      });
    });
    
    // Combined patterns
    const nameField = fields.find(f => f.name.toLowerCase().includes('name'));
    const descField = fields.find(f => f.name.toLowerCase().includes('description') || f.name.toLowerCase().includes('desc'));
    const titleField = fields.find(f => f.name.toLowerCase().includes('title'));
    
    if (nameField && descField) {
      patterns.push({
        label: 'Name + Description',
        value: `{{${nameField.name}}} - {{${descField.name}}}`,
        description: 'Combine name with description'
      });
    }
    
    if (titleField && nameField) {
      patterns.push({
        label: 'Title: Name',
        value: `{{${titleField.name}}}: {{${nameField.name}}}`,
        description: 'Title with name format'
      });
    }
    
    // ID pattern
    const idField = fields.find(f => f.name.toLowerCase() === 'id');
    if (idField && nameField) {
      patterns.push({
        label: 'ID + Name',
        value: `#{{${idField.name}}} {{${nameField.name}}}`,
        description: 'ID with name reference'
      });
    }
    
    return patterns;
  }, [fields, suggestedFields]);

  const handleFieldSelect = (fieldName: string) => {
    onSelectField(`{{${fieldName}}}`);
    onOpenChange(false);
  };

  const handlePatternSelect = (pattern: string) => {
    onSelectField(pattern);
    onOpenChange(false);
  };

  const handleCustomBinding = () => {
    if (customBinding.trim()) {
      onSelectField(customBinding);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bind Data Field
          </DialogTitle>
          <DialogDescription>
            Connect your {componentType} component to data from "{tableName}".
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggested" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Suggested
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              All Fields
            </TabsTrigger>
            <TabsTrigger value="combine" className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Combine
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="space-y-4">
            {/* Smart Suggestions */}
            <div>
              <Label>Recommended for {componentType} components</Label>
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-3 space-y-2">
                  {suggestedFields.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No suggestions available</p>
                    </div>
                  ) : (
                    suggestedFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
                        onClick={() => handleFieldSelect(field.name)}
                      >
                        <div className="flex items-center gap-3">
                          {getFieldIcon(field.type)}
                          <div>
                            <div className="font-medium">{field.name}</div>
                            {field.description && (
                              <div className="text-xs text-muted-foreground">
                                {field.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={getFieldTypeColor(field.type)}>
                          {field.type}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Pattern Suggestions */}
            {patternSuggestions.length > 0 && (
              <div>
                <Label>Smart Patterns</Label>
                <div className="grid grid-cols-1 gap-2">
                  {patternSuggestions.map((pattern, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
                      onClick={() => handlePatternSelect(pattern.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{pattern.label}</div>
                          <div className="text-xs text-muted-foreground">{pattern.description}</div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {pattern.value}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Search Fields</Label>
              <Input
                id="search"
                placeholder="Search by name, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* All Fields */}
            <div>
              <Label>All Fields ({filteredFields.length})</Label>
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-3 space-y-3">
                  {filteredFields.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {fields.length === 0 ? (
                        <div>
                          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No fields available</p>
                          <p className="text-xs">Connect to a database table first</p>
                        </div>
                      ) : (
                        <div>
                          <p>No fields match "{searchQuery}"</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => setSearchQuery('')}
                            className="text-xs"
                          >
                            Clear search
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    Object.entries(categorizedFields).map(([type, typeFields]) => (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Separator className="flex-1" />
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                            {type} ({typeFields.length})
                          </div>
                          <Separator className="flex-1" />
                        </div>
                        {typeFields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
                            onClick={() => handleFieldSelect(field.name)}
                          >
                            <div className="flex items-center gap-3">
                              {getFieldIcon(field.type)}
                              <div>
                                <div className="font-medium">{field.name}</div>
                                {field.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {field.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge className={getFieldTypeColor(field.type)}>
                              {field.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="combine" className="space-y-4">
            {/* Combine Text Builder Entry */}
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Combine Text Builder</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Build complex text by combining multiple fields, static text, and formatters.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Multiple Fields</Badge>
                <Badge variant="outline">Currency Formatting</Badge>
                <Badge variant="outline">Date Formatting</Badge>
                <Badge variant="outline">String Transforms</Badge>
              </div>
              <Button 
                onClick={() => setShowCombineBuilder(true)}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Open Combine Builder
              </Button>
            </div>

            {/* Examples */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Example Combinations:</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Product with Price:</span>
                  <code className="text-xs">{'{{name}} - {{price|currency_usd}}'}</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Full Name:</span>
                  <code className="text-xs">{'{{firstName}} {{lastName|uppercase}}'}</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Date Display:</span>
                  <code className="text-xs">{'Created: {{created_at|date_long}}'}</code>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {/* Custom Expression Builder */}
            <div>
              <Label htmlFor="custom">Custom Expression</Label>
              <div className="space-y-2">
                <Input
                  id="custom"
                  placeholder="e.g., {{name}} ({{email}}) or Hello {{firstName}}!"
                  value={customBinding}
                  onChange={(e) => setCustomBinding(e.target.value)}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Use {'{{'} fieldName {'}}'}  to insert field values</p>
                  <p>• Mix with static text: "Hello {'{{'} name {'}}'} !"</p>
                  <p>• Combine multiple fields: "{'{{'} firstName {'}}'}  {'{{'} lastName {'}}'} "</p>
                </div>
              </div>
            </div>

            {/* Field Reference */}
            {fields.length > 0 && (
              <div>
                <Label>Available Field References</Label>
                <ScrollArea className="h-32 border rounded-md">
                  <div className="p-2 space-y-1">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer text-sm"
                        onClick={() => setCustomBinding(prev => prev + `{{${field.name}}}`)}
                      >
                        <span className="font-mono">{'{{' + field.name + '}}'}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Button onClick={handleCustomBinding} disabled={!customBinding.trim()} className="w-full">
              Apply Custom Binding
            </Button>
          </TabsContent>
        </Tabs>

        {/* Current Binding */}
        {currentBinding && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <Label className="text-xs font-medium">Current Binding:</Label>
            <code className="text-sm font-mono block mt-1">{currentBinding}</code>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {currentBinding && (
            <Button
              variant="destructive"
              onClick={() => {
                onSelectField('');
                onOpenChange(false);
              }}
            >
              Remove Binding
            </Button>
          )}
        </div>

        {/* Combine Text Builder Dialog */}
        <CombineTextBuilder
          open={showCombineBuilder}
          onOpenChange={setShowCombineBuilder}
          onApply={(binding) => {
            onSelectField(binding);
            setShowCombineBuilder(false);
            onOpenChange(false);
          }}
          fields={fields}
          currentBinding={currentBinding}
          tableName={tableName}
        />
      </DialogContent>
    </Dialog>
  );
}