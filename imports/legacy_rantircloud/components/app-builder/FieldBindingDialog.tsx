import { useState } from 'react';
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
import { Database, Type, Hash, Calendar, ToggleLeft, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface FieldBindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectField: (fieldName: string) => void;
  fields: Field[];
  currentBinding?: string;
  tableName?: string;
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
      return 'bg-blue-100 text-blue-800';
    case 'number':
    case 'integer':
      return 'bg-green-100 text-green-800';
    case 'date':
    case 'datetime':
      return 'bg-purple-100 text-purple-800';
    case 'boolean':
      return 'bg-orange-100 text-orange-800';
    case 'json':
    case 'object':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export function FieldBindingDialog({
  open,
  onOpenChange,
  onSelectField,
  fields,
  currentBinding,
  tableName = 'Database Table'
}: FieldBindingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customBinding, setCustomBinding] = useState(currentBinding || '');

  // Enhanced filtering with better UX
  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Categorize fields by type for better organization
  const categorizedFields = filteredFields.reduce((acc, field) => {
    const category = field.type.toLowerCase();
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {} as Record<string, Field[]>);

  const handleFieldSelect = (fieldName: string) => {
    onSelectField(`{{${fieldName}}}`);
    onOpenChange(false);
  };

  const handleCustomBinding = () => {
    if (customBinding.trim()) {
      onSelectField(customBinding);
      onOpenChange(false);
    }
  };

  // Quick insert common patterns
  const insertPattern = (pattern: string) => {
    setCustomBinding(pattern);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bind Field Data
          </DialogTitle>
          <DialogDescription>
            Select a field from "{tableName}" to bind to this text component.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Fields</Label>
            <Input
              id="search"
              placeholder="Search by field name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Patterns */}
          {fields.length > 0 && (
            <div>
              <Label>Quick Patterns</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPattern(`{{${fields[0]?.name || 'field'}}}`)}
                  className="text-xs"
                >
                  Single Field
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPattern(`{{${fields[0]?.name || 'name'}}} - {{${fields[1]?.name || 'description'}}}`)}
                  className="text-xs"
                  disabled={fields.length < 2}
                >
                  Name - Description
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPattern(`ID: {{id}} | Name: {{${fields.find(f => f.name.toLowerCase().includes('name'))?.name || fields[0]?.name || 'name'}}}`)}
                  className="text-xs"
                >
                  ID + Name
                </Button>
              </div>
            </div>
          )}

          {/* Enhanced Fields List */}
          <div>
            <Label>Available Fields ({filteredFields.length})</Label>
            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-2">
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
                  // Group fields by type for better organization
                  Object.entries(categorizedFields).map(([type, typeFields]) => (
                    <div key={type} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                        {type} fields
                      </div>
                      {typeFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-primary/5 cursor-pointer group border border-transparent hover:border-primary/20 transition-all"
                          onClick={() => handleFieldSelect(field.name)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {getFieldIcon(field.type)}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{field.name}</div>
                              {field.description && (
                                <div className="text-xs text-muted-foreground">
                                  {field.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getFieldTypeColor(field.type)}`}
                            >
                              {field.type}
                            </Badge>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground">
                              Click to bind
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Custom Binding */}
          <div>
            <Label htmlFor="custom">Custom Binding</Label>
            <div className="flex gap-2">
              <Input
                id="custom"
                placeholder="e.g., {{fieldName}} or custom text with {{field}}"
                value={customBinding}
                onChange={(e) => setCustomBinding(e.target.value)}
              />
              <Button onClick={handleCustomBinding} disabled={!customBinding.trim()}>
                Apply
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{{fieldName}}'} to insert field values, or mix with static text
            </p>
          </div>

          {/* Current Binding */}
          {currentBinding && (
            <div className="p-2 bg-muted rounded-md">
              <Label className="text-xs">Current Binding:</Label>
              <code className="text-sm font-mono">{currentBinding}</code>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onSelectField('');
              onOpenChange(false);
            }}
          >
            Remove Binding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}