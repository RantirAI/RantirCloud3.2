import { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableField, TableRecord } from "@/services/tableService";
import { generateRecordId } from "@/utils/generateRecordId";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "./FileUploader";
import { DataChatPanel } from "./DataChatPanel";
import { 
  SortAsc, 
  SortDesc, 
  Filter, 
  Plus, 
  Trash2,
  ChevronDown,
  File,
  FileText,
  GripVertical,
  MessageSquare
} from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SchemaTypeIcon } from "./SchemaTypeIcon";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { format, isValid } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CellContextMenu } from "./CellContextMenu";

interface SpreadsheetViewProps {
  tableData: TableRecord[];
  tableSchema: {
    fields: TableField[];
  };
  tableProjectId?: string;
  tableName?: string;
  onSave?: (record: any) => void;
  onUpdate?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  onBulkDelete?: (recordIds: string[]) => void;
}

// Helper function to get field value using both field name and field ID
const getFieldValue = (record: TableRecord, field: TableField): any => {
  if (!record || !field) return undefined;
  
  // Try multiple field name variations to handle different naming conventions
  let value = record[field.name];
  
  // If not found by field name, try field ID
  if (value === undefined) {
    value = record[field.id];
  }
  
  // If still not found, try camelCase version of field name
  if (value === undefined && field.name.includes(' ')) {
    const camelCaseName = field.name.split(' ')
      .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    value = record[camelCaseName];
  }
  
  // If still not found, try snake_case version
  if (value === undefined && field.name.includes(' ')) {
    const snakeCaseName = field.name.toLowerCase().replace(/\s+/g, '_');
    value = record[snakeCaseName];
  }
  
  // If still not found, try kebab-case version
  if (value === undefined && field.name.includes(' ')) {
    const kebabCaseName = field.name.toLowerCase().replace(/\s+/g, '-');
    value = record[kebabCaseName];
  }
  
  // Auto-convert data types based on field type
  if (value !== undefined && value !== null) {
    switch (field.type) {
      case 'number':
        const numValue = Number(value);
        return !isNaN(numValue) ? numValue : value;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      case 'date':
        if (typeof value === 'string' && value.trim() !== '') {
          const date = new Date(value);
          return isValid(date) ? date.toISOString() : value;
        }
        return value;
      case 'select':
      case 'text':
      case 'textarea':
      case 'codescript':
      case 'image':
      case 'pdf':
      default:
        return String(value);
    }
  }
  
  return value;
};

// Sanitize and format data for display
const sanitizeValue = (value: any, fieldType?: string): string => {
  // Handle null and undefined - only show dash for these
  if (value === null || value === undefined) {
    return '-';
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value.toString();
  }
  
  // Handle numbers (including 0) - 0 is a valid value
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        // For objects in arrays, try to extract meaningful data
        if (item.name) return item.name;
        if (item.title) return item.title;
        if (item.display) return item.display;
        if (item.value) return item.value;
        return JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }
  
  // Handle objects (like Webflow data)
  if (typeof value === 'object') {
    // For dates, try to format them
    if (fieldType === 'date') {
      try {
        const date = new Date(value);
        if (isValid(date)) {
          return format(date, "PPP");
        }
      } catch (e) {
        // Fall through to object handling
      }
    }
    
    // Handle Webflow URL objects specifically
    if (value.url) {
      return String(value.url);
    }
    
    // Handle Webflow file objects
    if (value.fileId && value.url) {
      return String(value.url);
    }
    
    // Handle Webflow image objects
    if (value.alt !== undefined && value.url) {
      return String(value.url);
    }
    
    // For Webflow objects, try to extract meaningful data
    if (value.name) return String(value.name);
    if (value.title) return String(value.title);
    if (value.display) return String(value.display);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    if (value.content) return String(value.content);
    if (value.slug) return String(value.slug);
    
    // Handle Webflow rich text objects
    if (value.html) return String(value.html);
    if (value.plainText) return String(value.plainText);
    
    // For other objects, try to extract meaningful data
    if (value.toString && value.toString() !== '[object Object]') {
      return value.toString();
    }
    
    // Last resort: JSON stringify but make it readable
    try {
      const jsonStr = JSON.stringify(value);
      // If it's a simple object with one property, just show the value
      const parsed = JSON.parse(jsonStr);
      const keys = Object.keys(parsed);
      if (keys.length === 1) {
        const singleValue = parsed[keys[0]];
        // Don't return null as a string
        if (singleValue === null || singleValue === undefined) {
          return '-';
        }
        return String(singleValue);
      }
      return jsonStr;
    } catch (e) {
      return String(value);
    }
  }
  
  // Handle strings - this is the critical fix
  const stringValue = String(value).trim();
  
  // Only show dash for truly empty strings, null strings, or undefined strings
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
    return '-';
  }
  
  // Return the actual string value - don't convert valid URLs to dashes!
  return stringValue;
};

const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return isValid(date);
};

// Sortable Header Component
interface SortableHeaderProps {
  field: TableField;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  filters: Record<string, any>;
  onSort: (fieldId: string) => void;
  onFilter: (fieldId: string, value: any) => void;
}

function SortableHeader({ field, sortField, sortDirection, filters, onSort, onFilter }: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead 
      ref={setNodeRef}
      style={style}
      className="font-medium border-r p-0 h-9 relative"
    >
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-1">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
          <SchemaTypeIcon type={field.type} size={14} className="opacity-70" />
          <span>{field.name}</span>
        </div>
        
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={() => onSort(field.id)}
          >
            {sortField === field.id ? (
              sortDirection === "asc" ? (
                <SortAsc className="h-3 w-3" />
              ) : (
                <SortDesc className="h-3 w-3" />
              )
            ) : (
              <SortAsc className="h-3 w-3 opacity-30" />
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
              >
                <Filter className={`h-3 w-3 ${filters[field.id] ? 'text-primary' : 'opacity-30'}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <Input
                  placeholder="Filter..."
                  value={filters[field.id] || ''}
                  onChange={(e) => onFilter(field.id, e.target.value)}
                  className="w-full"
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFilter(field.id, '')}>
                Clear filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TableHead>
  );
}

export function SpreadsheetView({ 
  tableData, 
  tableSchema, 
  tableProjectId,
  tableName,
  onSave, 
  onUpdate, 
  onDelete,
  onBulkDelete
}: SpreadsheetViewProps) {
  const [editingCell, setEditingCell] = useState<{rowId: string, fieldId: string} | null>(null);
  const [cellValues, setCellValues] = useState<Record<string, Record<string, any>>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [initializedRecords, setInitializedRecords] = useState<Set<string>>(new Set());
  const [orderedFields, setOrderedFields] = useState<TableField[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle column drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setOrderedFields((fields) => {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return fields;
      }

      const newFields = [...fields];
      const [reorderedField] = newFields.splice(oldIndex, 1);
      newFields.splice(newIndex, 0, reorderedField);

      return newFields;
    });
  };

  // Initialize ordered fields
  useEffect(() => {
    const safeFields = (tableSchema?.fields || []).filter((field): field is TableField => {
      // More robust validation
      if (!field) return false;
      if (typeof field !== 'object') return false;
      if (!field.id || !field.name) return false;
      if (typeof field.id !== 'string' || typeof field.name !== 'string') return false;
      if (field.id.trim() === '' || field.name.trim() === '') return false;
      return true;
    });
    
    if (orderedFields.length === 0) {
      setOrderedFields(safeFields);
    }
  }, [tableSchema?.fields, orderedFields.length]);

  // Safety check for fields - use ordered fields
  const safeFields = orderedFields;

  // CRITICAL: Filter out any records without valid IDs
  const safeTableData = (tableData || []).filter((record): record is TableRecord => {
    if (!record || !record.id || typeof record.id !== 'string' || record.id.trim() === '') {
      return false;
    }
    return true;
  });

  // Initialize cellValues for new records only, preserve existing editing values
  useEffect(() => {
    setCellValues(prevCellValues => {
      const newCellValues = { ...prevCellValues };
      
      safeTableData.forEach(record => {
        if (record && record.id && !initializedRecords.has(record.id)) {
          // Start with the record ID - this is critical
          const recordValues: Record<string, any> = { 
            id: record.id
          };
          
          // Process each field and convert data types
          safeFields.forEach(field => {
            if (field && field.id && field.name) {
              const fieldValue = getFieldValue(record, field);
              recordValues[field.id] = fieldValue;
              recordValues[field.name] = fieldValue;
            }
          });
          
          newCellValues[record.id] = recordValues;
          setInitializedRecords(prev => new Set([...prev, record.id]));
        }
      });
      
      return newCellValues;
    });
  }, [safeTableData, safeFields]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);
  
  const toggleSort = (fieldId: string) => {
    if (sortField === fieldId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(fieldId);
      setSortDirection("asc");
    }
  };
  
  const applyFilter = (fieldId: string, value: any) => {
    setFilters(prev => {
      if (value === "" || value === undefined) {
        const newFilters = { ...prev };
        delete newFilters[fieldId];
        return newFilters;
      }
      
      return { ...prev, [fieldId]: value };
    });
  };
  
  const clearFilters = () => {
    setFilters({});
  };
  
  const handleCellClick = (rowId: string, fieldId: string) => {
    setEditingCell({ rowId, fieldId });
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, rowId: string, fieldId: string) => {
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    let value: any = e.target.value;

    // Convert value based on field type
    if (field.type === 'number') {
      const numValue = Number(value);
      value = !isNaN(numValue) ? numValue : value;
    }

    setCellValues(prev => {
      const currentRow = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          id: rowId, // CRITICAL: Always preserve the ID
          [fieldId]: value,
          [field.name]: value
        }
      };
    });
  };

  const handleCellBlur = async (rowId: string, fieldId: string) => {
    setEditingCell(null);
    
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    const originalRecord = tableData.find(r => r.id === rowId);
    const originalValue = getFieldValue(originalRecord, field);
    let newValue = cellValues[rowId]?.[fieldId];
    
    // Make sure we're actually updating something that changed
    if (originalValue !== newValue && onUpdate) {
      const fieldName = field.name;
      
      // Field validation based on type and options
      if (field.type === 'email' && newValue && typeof newValue === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newValue)) {
          toast.error("Please enter a valid email address");
          setCellValues(prev => ({
            ...prev,
            [rowId]: {
              ...prev[rowId],
              [fieldId]: originalValue,
              [field.name]: originalValue
            }
          }));
          return;
        }
      }
      
      // Text field validation with character limits and patterns
      if ((field.type === 'text' || field.type === 'textarea') && newValue && typeof newValue === 'string') {
        if (field.options?.minLength && newValue.length < field.options.minLength) {
          toast.error(`Minimum length is ${field.options.minLength} characters`);
          setCellValues(prev => ({
            ...prev,
            [rowId]: {
              ...prev[rowId],
              [fieldId]: originalValue,
              [field.name]: originalValue
            }
          }));
          return;
        }
        
        if (field.options?.maxLength && newValue.length > field.options.maxLength) {
          toast.error(`Maximum length is ${field.options.maxLength} characters`);
          setCellValues(prev => ({
            ...prev,
            [rowId]: {
              ...prev[rowId],
              [fieldId]: originalValue,
              [field.name]: originalValue
            }
          }));
          return;
        }
        
        if (field.options?.pattern && !new RegExp(field.options.pattern).test(newValue)) {
          toast.error("Input doesn't match the required pattern");
          setCellValues(prev => ({
            ...prev,
            [rowId]: {
              ...prev[rowId],
              [fieldId]: originalValue,
              [field.name]: originalValue
            }
          }));
          return;
        }
      }
      
      // Password hashing is done server-side - send plaintext over TLS
      
      // Handle undefined/null values safely
      const safeNewValue = newValue === undefined || newValue === null ? '' : newValue;
      const update = { [fieldName]: JSON.parse(JSON.stringify(safeNewValue)) };
      
      // Log what's being saved for debugging
      console.log(`Saving field ${fieldName} with value:`, field.type === 'password' ? '[HASHED]' : update[fieldName]);
      
      onUpdate(rowId, update);
    }
  };
  
  const handleCellKeyDown = (e: React.KeyboardEvent, rowId: string, fieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur(rowId, fieldId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const field = safeFields.find(f => f?.id === fieldId);
      if (!field) return;

      const originalRecord = tableData.find(r => r.id === rowId);
      const originalValue = getFieldValue(originalRecord, field);
      
      setCellValues(prev => {
        const currentRow = prev[rowId] || {};
        return {
          ...prev,
          [rowId]: {
            ...currentRow,
            id: rowId, // CRITICAL: Always preserve the ID
            [fieldId]: originalValue,
            [field.name]: originalValue
          }
        };
      });
      setEditingCell(null);
    }
  };
  
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(row => row.id));
    }
    setAllSelected(!allSelected);
  };
  
  const toggleSelectRow = (rowId: string) => {
    setSelectedRows(prev => {
      const isSelected = prev.includes(rowId);
      
      if (isSelected) {
        return prev.filter(id => id !== rowId);
      } else {
        return [...prev, rowId];
      }
    });
  };
  
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} records?`)) {
      if (onBulkDelete) {
        onBulkDelete(selectedRows);
        setSelectedRows([]);
        setAllSelected(false);
      }
    }
  };

  const addNewRecord = () => {
    if (!onSave) return;
    
    // Generate a unique ID for the new record
    const newRecordId = generateRecordId();
    
    // Create new record with proper ID assignment
    const newRecord: Record<string, any> = {};
    
    // First, set the ID field
    newRecord.id = newRecordId;
    
    // Then process all fields from the schema
    safeFields.forEach(field => {
      if (field && field.name) {
        if (field.name === 'id' || field.system) {
          // For ID or system fields, use the generated ID
          newRecord[field.name] = newRecordId;
        } else {
          // Set appropriate default values based on field type for other fields
          switch (field.type) {
            case 'boolean':
              newRecord[field.name] = false;
              break;
            case 'number':
              newRecord[field.name] = 0;
              break;
            case 'date':
              newRecord[field.name] = null;
              break;
            case 'select':
              // Leave select fields empty to force user selection
              newRecord[field.name] = '';
              break;
            default:
              newRecord[field.name] = '';
          }
        }
      }
    });
    
    console.log('Creating new record with ID:', newRecordId, 'Full record:', newRecord);
    onSave(newRecord);
  };

  const handleFileChange = (url: string | null, rowId: string, fieldId: string) => {
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    setCellValues(prev => {
      const currentRow = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          id: rowId, // CRITICAL: Always preserve the ID
          [fieldId]: url,
          [field.name]: url
        }
      };
    });
    
    // Directly trigger an update since this is a user-initiated action
    if (onUpdate) {
      const fieldName = field.name;
      const update = { [fieldName]: url };
      console.log(`Saving file field ${fieldName} with value:`, update[fieldName]);
      onUpdate(rowId, update);
    }
  };

  const handleSelectChange = (value: string, rowId: string, fieldId: string) => {
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    setCellValues(prev => {
      const currentRow = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          id: rowId, // CRITICAL: Always preserve the ID
          [fieldId]: value,
          [field.name]: value
        }
      };
    });
    
    // Directly trigger an update for select fields
    if (onUpdate) {
      const fieldName = field.name;
      const update = { [fieldName]: value };
      console.log(`Saving select field ${fieldName} with value:`, update[fieldName]);
      onUpdate(rowId, update);
    }
  };
  
  const handleCheckboxChange = (checked: boolean | "indeterminate", rowId: string, fieldId: string) => {
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    const boolValue = checked === true;
    setCellValues(prev => {
      const currentRow = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          id: rowId, // CRITICAL: Always preserve the ID
          [fieldId]: boolValue,
          [field.name]: boolValue
        }
      };
    });
    
    // Directly trigger an update for boolean fields
    if (onUpdate) {
      const fieldName = field.name;
      const update = { [fieldName]: boolValue };
      console.log(`Saving boolean field ${fieldName} with value:`, update[fieldName]);
      onUpdate(rowId, update);
    }
  };
  
  const handleDateChange = (date: Date | undefined, rowId: string, fieldId: string) => {
    const field = safeFields.find(f => f?.id === fieldId);
    if (!field) return;

    const isoDate = date?.toISOString();
    setCellValues(prev => {
      const currentRow = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...currentRow,
          id: rowId, // CRITICAL: Always preserve the ID
          [fieldId]: isoDate,
          [field.name]: isoDate
        }
      };
    });
    
    // Directly trigger an update for date fields
    if (onUpdate) {
      const fieldName = field.name;
      const update = { [fieldName]: isoDate };
      console.log(`Saving date field ${fieldName} with value:`, update[fieldName]);
      onUpdate(rowId, update);
    }
  };
  
  const renderCellContent = (row: TableRecord, field: TableField) => {
    if (!row || !field || !field.id) {
      return '-';
    }

    const isEditing = editingCell?.rowId === row.id && editingCell?.fieldId === field.id;
    
    // Get the current value - prioritize editing state, then cellValues, then original data
    let rawValue;
    if (cellValues[row.id] && cellValues[row.id][field.id] !== undefined) {
      rawValue = cellValues[row.id][field.id];
    } else {
      rawValue = getFieldValue(row, field);
    }
    
    if (field.system || field.id === 'id') {
      return (
        <div className="px-2 py-1 bg-muted/30 text-muted-foreground font-mono text-sm">
          {sanitizeValue(rawValue) || row.id || '-'}
        </div>
      );
    }

    if (field.type === 'reference') {
      return null;
    }

    if (isEditing) {
      switch (field.type) {
        case 'text':
          return (
            <Input 
              ref={inputRef}
              value={rawValue ?? ''}
              onChange={(e) => handleCellChange(e, row.id, field.id)}
              onBlur={() => handleCellBlur(row.id, field.id)}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.id)}
              className="w-full h-8 py-1 px-2 border-0 focus:ring-0 focus-visible:ring-0"
            />
          );
        case 'number':
          return (
            <Input 
              ref={inputRef}
              type="number"
              value={rawValue ?? ''}
              onChange={(e) => handleCellChange(e, row.id, field.id)}
              onBlur={() => handleCellBlur(row.id, field.id)}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.id)}
              className="w-full h-8 py-1 px-2 border-0 focus:ring-0 focus-visible:ring-0"
            />
          );
        case 'select':
          return (
            <Select 
              value={rawValue ?? ''} 
              onValueChange={(val) => handleSelectChange(val, row.id, field.id)}
            >
              <SelectTrigger className="w-full h-8 py-1 px-2 border-0">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(field.options) && field.options.map((option: string, index: number) => (
                  <SelectItem key={`${option}-${index}`} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case 'boolean':
          return (
            <div className="flex justify-center">
              <Checkbox 
                checked={rawValue === true || rawValue === 'true' || rawValue === 1}
                onCheckedChange={(checked) => handleCheckboxChange(checked, row.id, field.id)}
              />
            </div>
          );
        case 'image':
          return (
            <div className="p-1">
              <FileUploader 
                type="image"
                value={rawValue}
                onChange={(url) => handleFileChange(url, row.id, field.id)}
              />
            </div>
          );
        case 'pdf':
          return (
            <div className="p-1">
              <FileUploader 
                type="pdf"
                value={rawValue}
                onChange={(url) => handleFileChange(url, row.id, field.id)}
              />
            </div>
          );
        case 'codescript':
          return (
            <Input 
              ref={inputRef}
              value={rawValue ?? ''}
              onChange={(e) => handleCellChange(e, row.id, field.id)}
              onBlur={() => handleCellBlur(row.id, field.id)}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.id)}
              className="w-full h-8 py-1 px-2 border-0 focus:ring-0 focus-visible:ring-0 font-mono"
            />
          );
        case 'date':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-8 px-2"
                >
                  {rawValue && isValidDateString(rawValue) ? format(new Date(rawValue), "PPP") : <span>Pick a date...</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={rawValue && isValidDateString(rawValue) ? new Date(rawValue) : undefined}
                  onSelect={(date) => handleDateChange(date, row.id, field.id)}
                  initialFocus
                  className="rounded-md border pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          );
        case 'multireference':
          const referenceOptions = field.options?.references || [];
          
          return (
            <Select
              value={rawValue ?? ''}
              onValueChange={(val) => handleSelectChange(val, row.id, field.id)}
            >
              <SelectTrigger className="w-full h-8 py-1 px-2">
                <SelectValue placeholder="Select reference..." />
              </SelectTrigger>
              <SelectContent>
                {referenceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        default:
          return (
            <Input 
              ref={inputRef}
              value={rawValue ?? ''}
              onChange={(e) => handleCellChange(e, row.id, field.id)}
              onBlur={() => handleCellBlur(row.id, field.id)}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.id)}
              className="w-full h-8 py-1 px-2 border-0 focus:ring-0 focus-visible:ring-0"
            />
          );
      }
    }
    
    // Non-editing display - use sanitized value
    const displayValue = sanitizeValue(rawValue, field.type);
    
    // Only show dash if the sanitized value is actually a dash (empty/null data)
    if (displayValue === '-') {
      return '-';
    }

    switch (field.type) {
      case 'boolean':
        const boolValue = rawValue === true || rawValue === 'true' || rawValue === 1;
        return (
          <div className="flex justify-center">
            <Checkbox checked={boolValue} disabled />
          </div>
        );
      case 'select':
        return displayValue;
      case 'image':
        return displayValue && displayValue !== '-' ? (
          <div className="h-8 w-12 relative">
            <img src={displayValue} alt="Thumbnail" className="h-full w-full object-cover rounded" />
          </div>
        ) : '-';
      case 'pdf':
        return displayValue && displayValue !== '-' ? (
          <div className="flex items-center">
            <File className="h-4 w-4 mr-1 text-red-500" />
            <span className="text-xs text-blue-500 underline">
              <a href={displayValue} target="_blank" rel="noopener noreferrer">View PDF</a>
            </span>
          </div>
        ) : '-';
      case 'codescript':
        return <span className="font-mono text-xs">{displayValue.length > 15 ? `${displayValue.substring(0, 15)}...` : displayValue}</span>;
      case 'date':
        if (displayValue && displayValue !== '-' && isValidDateString(displayValue)) {
          try {
            return format(new Date(displayValue), "PPP");
          } catch (e) {
            return displayValue;
          }
        }
        return displayValue;
      case 'multireference':
        if (displayValue && displayValue !== '-' && field.options?.references) {
          const refOption = field.options.references.find(ref => ref.id === rawValue);
          return refOption ? refOption.display : displayValue;
        }
        return displayValue;
      case 'json':
        // Special handling for selectedPlan field
        if (field.name === 'selectedPlan' && rawValue && typeof rawValue === 'object') {
          const plan = rawValue;
          if (plan.validated === false) {
            return (
              <Badge variant="destructive" className="text-xs">
                Invalid Plan
              </Badge>
            );
          } else if (plan.name) {
            return (
              <div className="flex items-center gap-1">
                <Badge variant="default" className="text-xs">
                  {plan.name}
                </Badge>
                {plan.validated && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    ✓ Verified
                  </Badge>
                )}
              </div>
            );
          }
        }
        // Regular JSON display for other fields
        if (rawValue && typeof rawValue === 'object') {
          return (
            <span className="text-xs font-mono bg-muted px-1 rounded">
              {JSON.stringify(rawValue).length > 20 
                ? `${JSON.stringify(rawValue).substring(0, 20)}...` 
                : JSON.stringify(rawValue)
              }
            </span>
          );
        }
        return displayValue;
      default:
        return displayValue;
    }
  };

  const filteredData = safeTableData.filter(row => {
    return Object.entries(filters).every(([fieldId, filterValue]) => {
      const field = safeFields.find(f => f?.id === fieldId);
      if (!field) return true;

      const value = getFieldValue(row, field);
      if (filterValue === null || filterValue === undefined) return true;
      
      if (typeof filterValue === 'string') {
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      }
      
      return value === filterValue;
    });
  });
  
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    
    const field = safeFields.find(f => f?.id === sortField);
    if (!field) return 0;

    const aValue = getFieldValue(a, field);
    const bValue = getFieldValue(b, field);
    
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    const result = aValue > bValue ? 1 : -1;
    return sortDirection === "asc" ? result : -result;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-auto bg-background">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className="border-collapse min-w-max">
              <TableHeader className="bg-muted/30 border-border sticky top-0 z-10">
                <TableRow className="hover:bg-muted/40 border-border">
                  <TableHead className="w-12 p-0 border-r h-9">
                    <div className="flex justify-center p-2">
                      <Checkbox 
                        checked={allSelected && filteredData.length > 0} 
                        onCheckedChange={toggleSelectAll}
                      />
                    </div>
                  </TableHead>
                  
                  <SortableContext items={safeFields.map(f => f.id)} strategy={horizontalListSortingStrategy}>
                    {safeFields.map((field) => {
                      // Additional safety check inside the map
                      if (!field || !field.id || !field.name) {
                        console.warn('Invalid field found in safeFields:', field);
                        return null;
                      }
                      
                      return (
                        <SortableHeader
                          key={field.id}
                          field={field}
                          sortField={sortField}
                          sortDirection={sortDirection}
                          filters={filters}
                          onSort={toggleSort}
                          onFilter={applyFilter}
                        />
                      );
                    })}
                  </SortableContext>
                  
                  <TableHead className="w-16 border-r p-0 h-9">
                    <div className="p-2">Actions</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
            
            <TableBody>
              {sortedData.length > 0 ? (
                sortedData.map((row) => {
                  const isBeingEdited = editingCell?.rowId === row.id;
                  const isAnyRowBeingEdited = editingCell !== null;
                  const shouldBlur = isAnyRowBeingEdited && !isBeingEdited;
                  
                  return (
                    <TableRow 
                      key={row.id} 
                      className={`
                        transition-all duration-300 ease-in-out
                        ${selectedRows.includes(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                        ${isBeingEdited ? 
                          'bg-blue-100/80 dark:bg-blue-900/30 backdrop-blur-sm shadow-xl scale-[1.02] relative z-10 border-2 border-blue-300/60 dark:border-blue-500/40 ring-2 ring-blue-200/40 dark:ring-blue-400/20' : 
                          shouldBlur ? 
                            'spreadsheet-blur-row' : 
                            'hover:bg-muted/30 bg-card'
                        }
                      `}
                    >
                    <TableCell className="w-12 p-0 border-r">
                      <div className="flex justify-center p-2">
                        <Checkbox 
                          checked={selectedRows.includes(row.id)} 
                          onCheckedChange={() => toggleSelectRow(row.id)}
                        />
                      </div>
                    </TableCell>
                    
                    {safeFields.map((field) => {
                      // Additional safety check inside the map
                      if (!field || !field.id || !field.name) {
                        console.warn('Invalid field found in safeFields during row render:', field);
                        return null;
                      }
                      
                       return (
                          <CellContextMenu
                            key={`${row.id}-${field.id}`}
                            rowId={row.id}
                            fieldId={field.id}
                            value={cellValues[row.id]?.[field.id] || getFieldValue(row, field)}
                            onDelete={onDelete}
                          >
                            <TableCell 
                              className="p-0 border-r cursor-pointer h-8"
                              onClick={() => handleCellClick(row.id, field.id)}
                            >
                              <div className="p-1 h-8 flex items-center">
                                {renderCellContent(row, field)}
                              </div>
                            </TableCell>
                          </CellContextMenu>
                       );
                    })}
                    
                    <TableCell className="w-16 p-0 border-r">
                      <div className="p-2 flex justify-center">
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to delete this record?")) {
                                onDelete(row.id);
                              }
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                   </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={safeFields.length + 2} className="h-24 text-center">
                    {Object.keys(filters).length > 0 ? "No matching records found" : "No data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </DndContext>
        </div>
      </div>

      {/* Data Chat Panel */}
      {tableProjectId && tableName && (
        <DataChatPanel
          tableProjectId={tableProjectId}
          tableName={tableName}
          tableSchema={tableSchema}
          tableData={tableData}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
