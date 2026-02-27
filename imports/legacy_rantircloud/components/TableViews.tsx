import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableField, TableRecord } from "@/services/tableService";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "./FileUploader";
import { 
  SortAsc, 
  SortDesc, 
  Filter, 
  Plus, 
  Trash2,
  ChevronDown,
  File,
  FileText
} from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewSettingsDialog } from "./ViewSettingsDialog";
import { ItemPreviewSidebar } from "./ItemPreviewSidebar";
import { Settings2 } from "lucide-react";
import { ViewSettings } from "@/types/viewTypes";

interface TableViewsProps {
  tableData: TableRecord[];
  tableSchema: {
    fields: TableField[];
  };
  onSave?: (record: any) => void;
  onUpdate?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  onBulkDelete?: (recordIds: string[]) => void;
  initialView?: "table" | "gallery";
  tableProjectId?: string;
  viewSettings?: {[viewType: string]: ViewSettings};
  onViewSettingsChange?: (viewType: string, settings: ViewSettings) => void;
}

// Helper function to get field value using both field name and field ID
const getFieldValue = (record: TableRecord, field: TableField): any => {
  if (!record || !field) return undefined;
  
  // Try field name first, then field ID
  let value = record[field.name] !== undefined ? record[field.name] : record[field.id];
  
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

export function TableViews({ 
  tableData, 
  tableSchema, 
  onSave, 
  onUpdate, 
  onDelete,
  onBulkDelete,
  initialView = "table",
  tableProjectId,
  viewSettings: databaseViewSettings,
  onViewSettingsChange
}: TableViewsProps) {
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TableRecord | null>(null);
  
  // Safety check for fields - filter out any undefined or null fields with more robust checking
  const safeFields = (tableSchema?.fields || []).filter((field): field is TableField => {
    // More robust validation
    if (!field) return false;
    if (typeof field !== 'object') return false;
    if (!field.id || !field.name) return false;
    if (typeof field.id !== 'string' || typeof field.name !== 'string') return false;
    if (field.id.trim() === '' || field.name.trim() === '') return false;
    return true;
  });

  // Get view settings from database or use defaults
  const getDefaultSettings = (viewType: string): ViewSettings => ({
    type: viewType as ViewSettings['type'],
    visibleFields: safeFields.map(f => f.id),
    showLabels: true,
    cardsPerRow: 3,
    showImages: true,
    kanbanImageDisplay: "square"
  });

  const viewSettings = databaseViewSettings?.[currentView] || getDefaultSettings(currentView);

  // CRITICAL: Filter out any records without valid IDs
  const safeTableData = (tableData || []).filter((record): record is TableRecord => {
    if (!record) return false;
    if (!record.id) return false;
    if (typeof record.id !== 'string') return false;
    if (record.id.trim() === '') return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(safeTableData.map(row => row.id));
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

  const renderTableView = () => {
    return (
      <div className="h-full flex flex-col">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentView("gallery")}>
              Switch to Gallery View
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedRows.length === 0}>
              Delete Selected
            </Button>
          </div>
        </div>
        
        {/* Table Content */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 overflow-auto">
            <Table className="border-collapse min-w-max">
              <TableHeader className="bg-muted dark:bg-muted sticky top-0 z-10">
                <TableRow className="hover:bg-muted dark:hover:bg-muted">
                  <TableHead className="w-12 p-0 border-r h-9">
                    <div className="flex justify-center p-2">
                      <Checkbox 
                        checked={allSelected && safeTableData.length > 0} 
                        onCheckedChange={toggleSelectAll}
                      />
                    </div>
                  </TableHead>
                  
                  {safeFields.map((field) => (
                    <TableHead key={field.id} className="font-medium border-r p-2 h-9">
                      {field.name}
                    </TableHead>
                  ))}
                  
                  <TableHead className="w-16 border-r p-2 h-9">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeTableData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                    <TableCell className="w-12 p-0 border-r">
                      <div className="flex justify-center p-2">
                        <Checkbox 
                          checked={selectedRows.includes(row.id)} 
                          onCheckedChange={() => toggleSelectRow(row.id)}
                        />
                      </div>
                    </TableCell>
                    
                    {safeFields.map((field) => (
                      <TableCell key={`${row.id}-${field.id}`} className="p-2 border-r">
                        {sanitizeValue(getFieldValue(row, field))}
                      </TableCell>
                    ))}
                    
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const getCardTitle = (record: TableRecord) => {
    // Try to find a meaningful title field
    const titleField = safeFields.find(f => 
      f.type === 'text' && (
        f.name.toLowerCase().includes('title') || 
        f.name.toLowerCase().includes('name')
      )
    );
    
    if (titleField) {
      const titleValue = getFieldValue(record, titleField);
      if (titleValue) return String(titleValue);
    }
    
    // Fallback to first text field
    const firstTextField = safeFields.find(f => f.type === 'text');
    if (firstTextField) {
      const value = getFieldValue(record, firstTextField);
      if (value) return String(value);
    }
    
    return `Record ${record.id.slice(0, 8)}...`;
  };

  const renderGalleryView = () => {
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    }[viewSettings.cardsPerRow] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

    return (
      <div className="h-full flex flex-col">
        {/* Gallery Content */}
        <div className="flex-1 overflow-auto p-2 bg-background dark:bg-card">
          <div className={`grid gap-4 ${gridCols}`}>
            {safeTableData.map((row) => (
              <Card 
                key={row.id} 
                className="bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedRecord(row)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">
                    {getCardTitle(row)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {safeFields
                      .filter(field => viewSettings.visibleFields.includes(field.id))
                      .slice(0, 4)
                      .map((field) => (
                        <div key={`${row.id}-${field.id}`} className="flex items-start gap-2">
                          {viewSettings.showLabels && (
                            <div className="text-xs font-medium text-muted-foreground min-w-0 w-1/3">
                              {field.name}:
                            </div>
                          )}
                          <div className="text-xs text-foreground min-w-0 flex-1">
                            {sanitizeValue(getFieldValue(row, field))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      {currentView === "table" ? renderTableView() : renderGalleryView()}
      
      <ViewSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        viewType="gallery"
        tableSchema={tableSchema}
        settings={viewSettings}
        onSave={(settings) => {
          if (onViewSettingsChange) {
            onViewSettingsChange(currentView, settings);
          }
          setIsSettingsOpen(false);
        }}
      />
      
      <ItemPreviewSidebar
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        tableSchema={tableSchema}
        visibleFields={viewSettings.visibleFields}
        onEdit={(recordId, updates) => {
          if (onUpdate) {
            onUpdate(recordId, updates);
          }
        }}
        onDelete={onDelete}
        onFieldsReorder={(fields) => {
          if (onViewSettingsChange) {
            const updatedSettings = {
              ...viewSettings,
              visibleFields: fields.map(f => f.id)
            };
            onViewSettingsChange(currentView, updatedSettings);
          }
        }}
        onToggleFieldVisibility={(fieldId) => {
          if (onViewSettingsChange) {
            const updatedSettings = {
              ...viewSettings,
              visibleFields: viewSettings.visibleFields.includes(fieldId)
                ? viewSettings.visibleFields.filter(id => id !== fieldId)
                : [...viewSettings.visibleFields, fieldId]
            };
            onViewSettingsChange(currentView, updatedSettings);
          }
        }}
      />
    </div>
  );
}
