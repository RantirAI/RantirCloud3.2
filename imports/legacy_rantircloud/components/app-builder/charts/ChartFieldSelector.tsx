import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Hash, Type, Calendar, ToggleLeft, Image, List } from 'lucide-react';

interface TableField {
  name: string;
  type: string;
  displayName?: string;
}

interface ChartFieldSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fields: TableField[];
  placeholder?: string;
  allowEmpty?: boolean;
  filterTypes?: string[];
}

const getFieldIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'number':
    case 'integer':
    case 'decimal':
    case 'currency':
      return Hash;
    case 'date':
    case 'datetime':
    case 'timestamp':
      return Calendar;
    case 'boolean':
    case 'checkbox':
      return ToggleLeft;
    case 'image':
    case 'file':
      return Image;
    case 'select':
    case 'multiselect':
      return List;
    default:
      return Type;
  }
};

const getFieldTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'number':
    case 'integer':
    case 'decimal':
    case 'currency':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'boolean':
    case 'checkbox':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'select':
    case 'multiselect':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
};

export function ChartFieldSelector({
  label,
  value,
  onChange,
  fields,
  placeholder = 'Select field...',
  allowEmpty = false,
  filterTypes
}: ChartFieldSelectorProps) {
  // Filter fields by type if specified
  const filteredFields = filterTypes 
    ? fields.filter(f => filterTypes.includes(f.type?.toLowerCase()))
    : fields;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select 
        value={value || ''} 
        onValueChange={(val) => onChange(val === '__none__' ? '' : val)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder}>
            {value && (
              <div className="flex items-center gap-2">
                {(() => {
                  const field = fields.find(f => f.name === value);
                  const Icon = getFieldIcon(field?.type || 'text');
                  return (
                    <>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{field?.displayName || field?.name || value}</span>
                    </>
                  );
                })()}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="__none__">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
          )}
          {filteredFields.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No fields available
            </div>
          ) : (
            filteredFields.map((field) => {
              const Icon = getFieldIcon(field.type);
              return (
                <SelectItem key={field.name} value={field.name}>
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">{field.displayName || field.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-[10px] px-1.5 py-0 ${getFieldTypeColor(field.type)}`}
                    >
                      {field.type}
                    </Badge>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
