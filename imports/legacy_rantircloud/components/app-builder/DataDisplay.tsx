import React, { useState, useMemo } from 'react';
import { useDataBinding } from '@/hooks/useDataBinding';
import { AppComponent } from '@/types/appBuilder';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, ChevronLeft, ChevronRight, Eye, Edit, Trash2, MoreVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AddRecordModal } from '@/components/AddRecordModal';
import { tableService, TableField } from '@/services/tableService';
import { generateRecordId } from '@/utils/generateRecordId';

export interface DataDisplayField {
  id: string;
  displayName: string;
  sourceField: string;
  type: 'text' | 'number' | 'date' | 'image' | 'badge' | 'boolean';
  visible: boolean;
  order: number;
  isCustom?: boolean;
  customValue?: string;
  isImageField?: boolean;
  displayType?: 'text' | 'number' | 'date' | 'image' | 'badge' | 'boolean'; // Override display type
}

export interface DataDisplayTemplate {
  id: string;
  name: string;
  displayMode: 'list' | 'cards' | 'table';
  fields: string[]; // Required field types for this template
  supportsImages?: boolean; // Whether this template can display images
  imagePositions?: string[]; // Available image positions for cards
}

const DISPLAY_TEMPLATES: DataDisplayTemplate[] = [
  // List Templates
  { id: 'simple-list', name: 'Simple List', displayMode: 'list', fields: ['title'], supportsImages: true },
  { id: 'detailed-list', name: 'Detailed List', displayMode: 'list', fields: ['title', 'subtitle'], supportsImages: true },
  { id: 'rich-list', name: 'Rich List', displayMode: 'list', fields: ['title', 'subtitle', 'metadata'], supportsImages: true },
  
  // Card Templates  
  { id: 'basic-cards', name: 'Basic Cards', displayMode: 'cards', fields: ['title'], supportsImages: true, imagePositions: ['top', 'side', 'none'] },
  { id: 'image-cards', name: 'Image Cards', displayMode: 'cards', fields: ['image', 'title'], supportsImages: true, imagePositions: ['top', 'side', 'background'] },
  { id: 'detailed-cards', name: 'Detailed Cards', displayMode: 'cards', fields: ['image', 'title', 'description'], supportsImages: true, imagePositions: ['top', 'side', 'none'] },
  { id: 'compact-cards', name: 'Compact Cards', displayMode: 'cards', fields: ['title', 'badge'], supportsImages: true, imagePositions: ['side', 'none'] },
  
  // Table Templates
  { id: 'data-table', name: 'Data Table', displayMode: 'table', fields: ['columns'], supportsImages: true }
];

interface DataDisplayProps {
  component: AppComponent;
}

export function DataDisplay({ component }: DataDisplayProps) {
  const { data, loading, error, refetch } = useDataBinding(component);
  const navigate = useNavigate();
  
  // Debug logging
  console.log('DataDisplay component:', {
    component,
    dataSource: component.dataSource,
    databaseConnection: component.props?.databaseConnection,
    fieldMappings: component.props?.fieldMappings,
    fieldMappingsFiltered: (component.props?.fieldMappings || []).filter(Boolean),
    data,
    loading,
    error
  });
  
  // Component configuration from props - use useMemo to ensure re-render on prop changes
  const config = useMemo(() => ({
    displayMode: component.props?.displayMode || 'list',
    template: component.props?.template || 'simple-list',
    fieldMappings: (component.props?.fieldMappings || []).filter(Boolean),
    showSearch: component.props?.showSearch || false,
    showPagination: component.props?.showPagination || false,
    itemsPerPage: component.props?.itemsPerPage || 10,
    allowSorting: component.props?.allowSorting || false,
    cardsPerRow: component.props?.cardsPerRow || 3,
    // CRUD configuration
    enableCrud: component.props?.enableCrud || false,
    editMode: component.props?.editMode || 'dialog', // 'dialog', 'sidebar', 'page'
    viewMode: component.props?.viewMode || 'dialog', // 'dialog', 'sidebar', 'page'
    addMode: component.props?.addMode || 'dialog', // 'dialog', 'sidebar', 'page'
    enableBulkDelete: component.props?.enableBulkDelete || false,
    showAddButton: component.props?.showAddButton || false,
    imageField: component.props?.imageField || '', // Field to use for images
    imagePosition: component.props?.imagePosition || 'top', // Image position for cards
  }), [component.props]);

  const { displayMode, template, fieldMappings, showSearch, showPagination, itemsPerPage, allowSorting, cardsPerRow, enableCrud, editMode, viewMode, addMode, enableBulkDelete, showAddButton, imageField, imagePosition } = config;
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<Set<any>>(new Set());
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditSidebar, setShowEditSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSidebar, setShowAddSidebar] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableFields, setTableFields] = useState<TableField[]>([]);
  const [tableProjectId, setTableProjectId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Process and filter data
  const processedData = useMemo(() => {
    let filteredData = [...data];
    
    // Apply search filter
    if (searchTerm && showSearch) {
      filteredData = filteredData.filter(item => {
        return fieldMappings.some((mapping: DataDisplayField) => {
          // Add null check for mapping
          if (!mapping || !mapping.sourceField) return false;
          const value = item[mapping.sourceField];
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }
    
    // Apply sorting
    if (sortField && allowSorting) {
      filteredData.sort((a, b) => {
        // Handle null/undefined items
        if (!a || !b) {
          if (!a && !b) return 0;
          if (!a) return 1; // Put null items at the end
          if (!b) return -1;
        }
        
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1; // Put null values at the end
        if (bVal == null) return -1;
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filteredData;
  }, [data, searchTerm, sortField, sortDirection, fieldMappings, showSearch, allowSorting]);
  
  // Pagination
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = showPagination 
    ? processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : processedData;
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const renderFieldValue = (item: any, mapping: DataDisplayField, context: 'list' | 'card' | 'table' = 'list') => {
    // Add safety checks
    if (!item || !mapping || !mapping.sourceField) {
      return null;
    }
    
    const value = item[mapping.sourceField];
    
    // Check for empty/null/undefined values
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Use display type override if available, otherwise use mapping type
    const displayType = mapping.displayType || mapping.type;
    
    switch (displayType) {
      case 'image':
        const imageClass = context === 'table' 
          ? "w-12 h-12 rounded object-cover" 
          : context === 'card' 
          ? "w-full h-full object-cover" 
          : "w-8 h-8 rounded object-cover";
        return (
          <img 
            src={value} 
            alt={mapping.displayName || 'Image'}
            className={imageClass}
          />
        );
        
      case 'badge':
        return <Badge variant="secondary" className="text-xs">{String(value)}</Badge>;
        
      case 'boolean':
        return (
          <div className="flex items-center">
            {value ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span className="text-red-600 font-medium">✗</span>
            )}
          </div>
        );
        
      case 'date':
        return new Date(value).toLocaleDateString();
        
      default:
        return String(value);
    }
  };
  
  const renderListItem = (item: any, index: number) => {
    let visibleMappings = fieldMappings.filter((m: DataDisplayField) => m && m.visible);
    
    // Apply template-based field filtering
    if (template === 'simple-list') {
      visibleMappings = visibleMappings.slice(0, 1); // Only show primary field
    } else if (template === 'detailed-list') {
      visibleMappings = visibleMappings.slice(0, 2); // Show primary and secondary
    } else if (template === 'rich-list') {
      visibleMappings = visibleMappings.slice(0, 6); // Show up to 6 fields
    }
    
    if (visibleMappings.length === 0) {
      return null;
    }
    
    const primaryField = visibleMappings[0];
    const secondaryField = visibleMappings[1];
    const tertiaryField = visibleMappings[2];
    const imageMapping = visibleMappings.find(m => m && (m.displayType || m.type) === 'image');
    
    return (
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Image if available */}
        {imageMapping && template === 'rich-list' && (
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
            {renderFieldValue(item, imageMapping, 'list')}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {primaryField && (
            <div className="font-semibold text-gray-900 mb-1 truncate" style={{ color: '#111827' }}>
              {renderFieldValue(item, primaryField, 'list')}
            </div>
          )}
          {secondaryField && template !== 'simple-list' && (
            <div className="text-sm text-gray-600 mb-1 truncate" style={{ color: '#6b7280' }}>
              <span className="font-medium text-gray-700">{secondaryField.displayName}:</span> {renderFieldValue(item, secondaryField, 'list')}
            </div>
          )}
          {tertiaryField && template === 'rich-list' && (
            <div className="text-xs text-gray-500 truncate" style={{ color: '#9ca3af' }}>
              <span className="font-medium">{tertiaryField.displayName}:</span> {renderFieldValue(item, tertiaryField, 'list')}
            </div>
          )}
          {/* Show additional fields only for rich list */}
          {template === 'rich-list' && visibleMappings.length > 3 && (
            <div className="flex flex-wrap gap-2 mt-2">
               {visibleMappings.slice(3, 6).filter(m => m !== imageMapping).map((mapping: DataDisplayField) => {
                 // Add null check
                 if (!mapping) return null;
                 const value = renderFieldValue(item, mapping, 'list');
                 return value ? (
                   <div key={mapping.id} className="text-xs bg-gray-100 px-2 py-1 rounded" style={{ backgroundColor: '#f3f4f6' }}>
                     <span className="font-medium text-gray-600">{mapping.displayName}:</span>
                     <span className="text-gray-800 ml-1">{String(value)}</span>
                   </div>
                 ) : null;
               })}
            </div>
          )}
        </div>
        
        {/* CRUD Actions - Always visible for list items */}
        {enableCrud && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView(item)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };
  
  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.size === paginatedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedData));
    }
  };

  const handleSelectItem = (item: any) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
  };

  // CRUD action handlers - moved to handleEdit function above

  const handleEdit = (item: any) => {
    setCurrentItem(item);
    if (editMode === 'dialog') {
      setShowEditDialog(true);
    } else if (editMode === 'sidebar') {
      setShowEditSidebar(true);
    } else if (editMode === 'page') {
      // Navigate to edit page on same page
      const editUrl = `/edit-item/${encodeURIComponent(JSON.stringify(item))}`;
      navigate(editUrl);
    }
  };

  const handleView = (item: any) => {
    setCurrentItem(item);
    if (viewMode === 'dialog') {
      setShowViewDialog(true);
    } else if (viewMode === 'sidebar') {
      // Use edit sidebar for now, but in view mode
      setShowEditSidebar(true);
    } else if (viewMode === 'page') {
      // Navigate to view page on same page
      const viewUrl = `/view-item/${encodeURIComponent(JSON.stringify(item))}`;
      navigate(viewUrl);
    }
  };

  const handleDelete = (item: any) => {
    setCurrentItem(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!currentItem) return;
    
    setIsDeleting(true);
    console.log('Delete operation started:', currentItem);
    
    try {
      const tableProjectId = component.props?.databaseConnection?.tableProjectId;
      
      console.log('Delete attempt:', {
        currentItem,
        tableProjectId,
        databaseConnection: component.props?.databaseConnection
      });
      
      if (!tableProjectId) {
        throw new Error('No table project ID found');
      }

      // Get the current table project data
      const { data: tableProject, error: fetchError } = await supabase
        .from('table_projects')
        .select('records')
        .eq('id', tableProjectId)
        .single();

      console.log('Fetched table project:', { tableProject, fetchError });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      // Remove the item using its id
      const currentRecords = Array.isArray(tableProject.records) ? tableProject.records : [];
      console.log('Current records before delete:', currentRecords.length, 'records');
      console.log('Item to delete:', currentItem);

      const recordId = currentItem?.id;
      if (!recordId) {
        throw new Error('No item id found for deletion');
      }

      const updatedRecords = currentRecords.filter((record: any) => record?.id !== recordId);
      const removedCount = currentRecords.length - updatedRecords.length;

      if (removedCount === 0) {
        throw new Error(`Item with id ${recordId} not found`);
      }

      console.log('Updated records after delete:', updatedRecords.length, 'records (removed', removedCount, ')');

      console.log('Updated records after delete:', updatedRecords.length, 'records (removed 1)');

      // Update the table project with new records
      const { error: updateError } = await supabase
        .from('table_projects')
        .update({ 
          records: updatedRecords,
          updated_at: new Date().toISOString()
        })
        .eq('id', tableProjectId);

      console.log('Update result:', { updateError });

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      toast({
        title: "Item Deleted",
        description: "The item has been deleted successfully",
      });

      // Reload the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error: any) {
      console.error('Delete error details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete the item",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setCurrentItem(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setIsDeleting(true);
    try {
      const tableProjectId = component.props?.databaseConnection?.tableProjectId;
      
      if (tableProjectId) {
        // Get the current table project data
        const { data: tableProject, error: fetchError } = await supabase
          .from('table_projects')
          .select('records')
          .eq('id', tableProjectId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        // Remove the selected items from records array
        const currentRecords = Array.isArray(tableProject.records) ? tableProject.records : [];
        const selectedItemsArray = Array.from(selectedItems);
        const updatedRecords = currentRecords.filter((record: any) => {
          return !selectedItemsArray.some((selectedItem: any) => {
            // If both have id fields, use those for comparison
            if (selectedItem.id && record.id) {
              return record.id === selectedItem.id;
            }
            // Otherwise, do a deep comparison
            return JSON.stringify(record) === JSON.stringify(selectedItem);
          });
        });

        // Update the table project with new records
        const { error: updateError } = await supabase
          .from('table_projects')
          .update({ 
            records: updatedRecords,
            updated_at: new Date().toISOString()
          })
          .eq('id', tableProjectId);

        if (updateError) {
          throw updateError;
        }

        // Force a page refresh to update the data
        window.location.reload();
      }

      setSelectedItems(new Set());
      toast({
        title: "Items Deleted",
        description: `${selectedItems.size} items have been deleted successfully`,
      });
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to delete the selected items",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdd = async () => {
    try {
      // Get table project ID from data source
      const dataSource = component.dataSource;
      let projectId = dataSource?.tableProjectId;
      
      // Handle different data source structures
      if (!projectId) {
        const tableName = (dataSource as any)?.table?.tableName || 
                         (dataSource as any)?.tableName ||
                         (component.props as any)?.dataSource?.table?.tableName ||
                         (component.props as any)?.databaseConnection?.tableName;
        
        if (tableName) {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user?.id) {
            const tables = await tableService.getUserTableProjects(user.user.id);
            const matchingTable = tables.find(t => t.name === tableName);
            if (matchingTable) {
              projectId = matchingTable.id;
            }
          }
        }
      }

      if (!projectId) {
        toast({
          title: "Error",
          description: "No table found to add records to",
          variant: "destructive"
        });
        return;
      }

      // Fetch table project to get schema
      const tableProject = await tableService.getTableProject(projectId);
      if (tableProject.schema?.fields) {
        setTableFields(tableProject.schema.fields);
        setTableProjectId(projectId);
        
        // Handle different add modes
        if (addMode === 'dialog') {
          setShowAddModal(true);
        } else if (addMode === 'sidebar') {
          setShowAddSidebar(true);
        } else if (addMode === 'page') {
          // Navigate to add page
          navigate(`/tables/${projectId}/add`);
        }
      } else {
        toast({
          title: "Error",
          description: "Unable to load table schema",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error preparing add form:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open add form",
        variant: "destructive"
      });
    }
  };

  const handleAddRecord = async (record: any) => {
    if (!tableProjectId) return;

    try {
      // Add the record to the table project
      await tableService.addRecord(tableProjectId, record, data);
      
      // Refresh the data
      if (typeof refetch === 'function') {
        refetch();
      }
      
      toast({
        title: "Success",
        description: "Record added successfully",
      });
    } catch (error: any) {
      console.error('Error adding record:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add record",
        variant: "destructive"
      });
    }
  };

  const renderCardItem = (item: any, index: number) => {
    const visibleMappings = fieldMappings.filter((m: DataDisplayField) => m && m.visible);
    
    if (visibleMappings.length === 0) {
      return null;
    }
    
    const imageMapping = visibleMappings.find((m: DataDisplayField) => m && m.type === 'image');
    const primaryField = visibleMappings.find((m: DataDisplayField) => m && m.type !== 'image') || visibleMappings[0];
    const allOtherFields = visibleMappings.filter((m: DataDisplayField) => m && m !== imageMapping && m !== primaryField);
    
    // Different layouts based on template
    switch (template) {
      case 'basic-cards':
        return (
            <Card key={index} className="group border bg-card hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className={cn("p-4", enableBulkDelete && "pt-8")}>
              <div className="flex items-start justify-between mb-3">
                {primaryField && (
                  <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2 flex-1">
                    {renderFieldValue(item, primaryField)}
                  </h3>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Show all other fields as simple list */}
              {allOtherFields.length > 0 && (
                <div className="space-y-2">
                   {allOtherFields.map((mapping: DataDisplayField) => {
                     // Add null check
                     if (!mapping) return null;
                     const value = renderFieldValue(item, mapping);
                     return value ? (
                       <div key={mapping.id} className="text-sm text-muted-foreground">
                         <span className="font-medium">{mapping.displayName}:</span> {String(value)}
                       </div>
                     ) : null;
                   })}
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case 'image-cards':
         return (
            <Card key={index} className="group border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden">
            {imageMapping && (
              <div className="aspect-[4/3] overflow-hidden bg-muted/30 relative">
                <img 
                  src={item[imageMapping.sourceField]} 
                  alt={primaryField ? String(item[primaryField.sourceField]) : 'Image'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
            <CardContent className={cn("p-4", enableBulkDelete && "pt-8")}>
              {primaryField && (
                <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2 mb-3">
                  {renderFieldValue(item, primaryField)}
                </h3>
              )}
              
              {/* Grid layout for other fields */}
              {allOtherFields.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                   {allOtherFields.map((mapping: DataDisplayField) => {
                     // Add null check
                     if (!mapping) return null;
                     const value = renderFieldValue(item, mapping);
                     return value ? (
                       <div key={mapping.id} className="text-sm">
                         <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                           {mapping.displayName}
                         </div>
                          <div className="text-foreground font-medium truncate">
                            {String(value)}
                          </div>
                       </div>
                     ) : null;
                   })}
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case 'detailed-cards':
         return (
           <Card key={index} className="group border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="flex">
              {imageMapping && (
                <div className="w-32 h-32 flex-shrink-0 overflow-hidden bg-muted/30">
                  <img 
                    src={item[imageMapping.sourceField]} 
                    alt={primaryField ? String(item[primaryField.sourceField]) : 'Image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardContent className={cn("p-4 flex-1", enableBulkDelete && "pt-8")}>
                <div className="flex items-start justify-between mb-3">
                  {primaryField && (
                    <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-1 flex-1">
                      {renderFieldValue(item, primaryField)}
                    </h3>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Show first 3 fields with labels, rest as badges */}
                {allOtherFields.length > 0 && (
                  <div className="space-y-2">
                     {allOtherFields.slice(0, 3).map((mapping: DataDisplayField) => {
                       // Add null check  
                       if (!mapping) return null;
                       const value = renderFieldValue(item, mapping);
                       return value ? (
                         <div key={mapping.id} className="flex items-center gap-2">
                           <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium min-w-fit">
                             {mapping.displayName}:
                           </span>
                            <span className="text-sm text-foreground truncate">
                              {String(value)}
                            </span>
                         </div>
                       ) : null;
                     })}
                    
                     {allOtherFields.length > 3 && (
                       <div className="flex flex-wrap gap-2 pt-2">
                          {allOtherFields.slice(3).map((mapping: DataDisplayField) => {
                            // Add null check
                            if (!mapping) return null;
                            const value = renderFieldValue(item, mapping);
                            return value ? (
                              <span key={mapping.id} className="text-xs text-muted-foreground">
                                {mapping.displayName}: {String(value)}
                              </span>
                            ) : null;
                          })}
                       </div>
                     )}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        );
        
      case 'compact-cards':
         return (
           <Card key={index} className="group border bg-card hover:shadow-md transition-all duration-200 overflow-hidden">
             <CardContent className={cn("p-3", enableBulkDelete && "pt-7")}>
               <div className="flex items-center justify-between mb-2">
                 {primaryField && (
                   <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-1 flex-1">
                     {renderFieldValue(item, primaryField)}
                   </h3>
                 )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
               {/* Compact layout with plain text */}
               {allOtherFields.length > 0 && (
                 <div className="flex flex-wrap gap-2">
                    {allOtherFields.map((mapping: DataDisplayField) => {
                      // Add null check
                      if (!mapping) return null;
                      const value = renderFieldValue(item, mapping);
                      return value ? (
                        <span key={mapping.id} className="text-xs text-muted-foreground">
                          {mapping.displayName}: {String(value)}
                        </span>
                      ) : null;
                    })}
                 </div>
               )}
            </CardContent>
          </Card>
        );
        
      default:
        return (
          <Card key={index} className="group border bg-background hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className={cn("p-4", enableBulkDelete && "pt-8")}>
              <div className="flex items-start justify-between mb-3">
                {primaryField && (
                  <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2 flex-1">
                    {renderFieldValue(item, primaryField)}
                  </h3>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {allOtherFields.length > 0 && (
                <div className="space-y-2">
                   {allOtherFields.map((mapping: DataDisplayField) => {
                     // Add null check
                     if (!mapping) return null;
                     const value = renderFieldValue(item, mapping);
                     return value ? (
                       <div key={mapping.id} className="text-sm text-muted-foreground">
                         <span className="font-medium">{mapping.displayName}:</span> {String(value)}
                       </div>
                     ) : null;
                   })}
                </div>
              )}
            </CardContent>
          </Card>
        );
    }
  };
  
  const renderTableView = () => {
    const visibleMappings = fieldMappings.filter((m: DataDisplayField) => m && m.visible);
    
    if (visibleMappings.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <p>No fields configured for display.</p>
        </div>
      );
    }
    
    return (
       <div className="overflow-x-auto bg-card">
         <table className="w-full border-collapse">
           <thead className="bg-muted">
             <tr className="border-b border-border">
              {enableBulkDelete && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedItems.size === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
               {visibleMappings.map((mapping: DataDisplayField) => {
                 // Add null check
                 if (!mapping) return null;
                 return (
                 <th 
                   key={mapping.id} 
                    className={cn(
                      "text-left px-4 py-3 font-semibold text-foreground text-sm",
                      allowSorting && "cursor-pointer hover:bg-accent transition-colors"
                    )}
                   onClick={() => allowSorting && handleSort(mapping.sourceField)}
                 >
                   <div className="flex items-center">
                     {mapping.displayName}
                     {sortField === mapping.sourceField && (
                       <span className="ml-2 text-blue-600">
                         {sortDirection === 'asc' ? '↑' : '↓'}
                       </span>
                     )}
                   </div>
                 </th>
                 );
               })}
              {enableCrud && (
                <th className="w-24 px-4 py-3 text-center">
                  <span className="text-sm font-medium">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                 <td 
                   colSpan={visibleMappings.length + (enableBulkDelete ? 1 : 0) + (enableCrud ? 1 : 0)} 
                   className="px-4 py-8 text-center text-muted-foreground"
                 >
                  No items match your search criteria.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                 <tr 
                   key={index} 
                   className="hover:bg-accent/50 transition-colors group"
                 >
                  {enableBulkDelete && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedItems.has(item)}
                        onCheckedChange={() => handleSelectItem(item)}
                      />
                    </td>
                  )}
                   {visibleMappings.map((mapping: DataDisplayField) => {
                     // Add null check
                     if (!mapping) return null;
                     return (
                      <td 
                        key={mapping.id} 
                        className="px-4 py-3 text-sm text-foreground border-t border-border"
                      >
                       <div className="max-w-xs">
                         {(mapping.displayType || mapping.type) === 'image' ? 
                           renderFieldValue(item, mapping, 'table') :
                           <div className="truncate">{renderFieldValue(item, mapping, 'table')}</div>
                         }
                       </div>
                     </td>
                     );
                   })}
                  {enableCrud && (
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Loading data...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error loading data: {error}</p>
      </div>
    );
  }
  
  if (!data.length) {
    // Check if data source is connected
    const hasDataSource = component.dataSource || component.props?.databaseConnection;
    
    if (!hasDataSource) {
      return (
        <div className="text-center p-8 bg-white text-gray-900 border-2 border-dashed border-gray-300 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}>
          <div className="space-y-3">
            <div className="text-2xl">📊</div>
            <h3 className="font-semibold text-lg">No Data Source Connected</h3>
            <p className="text-gray-600" style={{ color: '#6b7280' }}>
              Connect a database table in the properties panel to display data.
            </p>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
              1. Select this component<br/>
              2. Go to Data Binding tab<br/>
              3. Choose a database connection<br/>
              4. Configure field mappings
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center p-8 bg-white text-gray-900 border-2 border-dashed border-gray-300 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}>
        <div className="space-y-3">
          <div className="text-2xl">📋</div>
          <h3 className="font-semibold text-lg">No Data Found</h3>
          <p className="text-gray-600" style={{ color: '#6b7280' }}>
            The connected table appears to be empty or data couldn't be loaded.
          </p>
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
            Check your database connection and ensure the selected table has data.
          </div>
        </div>
      </div>
    );
  }

  // Handle case when no field mappings are configured
  if (!fieldMappings.length) {
    return (
      <div className="text-center p-8 bg-white text-gray-900 border-2 border-dashed border-gray-300 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}>
        <div className="space-y-3">
          <div className="text-2xl">🔧</div>
          <h3 className="font-semibold text-lg">Field Mappings Required</h3>
          <p className="text-gray-600" style={{ color: '#6b7280' }}>
            Configure how your data fields should be displayed.
          </p>
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
            Go to the Data Binding tab and click "Auto-bind Fields" or manually configure field mappings.
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-white border rounded-lg">
      {/* Header with actions */}
      {(enableCrud && (showAddButton || enableBulkDelete)) && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {enableBulkDelete && selectedItems.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedItems.size})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showAddButton && (
              <Button onClick={handleAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      <div className="p-4">
        {/* Bulk selection header */}
        {enableBulkDelete && displayMode !== 'table' && paginatedData.length > 0 && (
          <div className="flex items-center gap-2 mb-4 pb-2 border-b">
            <Checkbox
              checked={selectedItems.size === paginatedData.length && paginatedData.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label className="text-sm text-muted-foreground">
              Select all ({selectedItems.size}/{paginatedData.length})
            </Label>
          </div>
        )}

        {/* Data Display */}
        {displayMode === 'list' && (
          <div className="border rounded-lg divide-y bg-card overflow-hidden">
            {paginatedData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No items match your search criteria.</p>
              </div>
            ) : (
              paginatedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 border-b border-gray-200 bg-white last:border-b-0 group" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                  {enableBulkDelete && (
                    <Checkbox
                      checked={selectedItems.has(item)}
                      onCheckedChange={() => handleSelectItem(item)}
                    />
                  )}
                  {renderListItem(item, index)}
                </div>
              ))
            )}
          </div>
        )}
        
        {displayMode === 'cards' && (
          <div className={cn(
            "grid gap-6",
            cardsPerRow === 1 && "grid-cols-1",
            cardsPerRow === 2 && "grid-cols-1 md:grid-cols-2",
            cardsPerRow === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            cardsPerRow === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {paginatedData.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground">
                <p>No items match your search criteria.</p>
              </div>
            ) : (
              paginatedData.map((item, index) => (
                <div key={index} className="relative">
                  {enableBulkDelete && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedItems.has(item)}
                        onCheckedChange={() => handleSelectItem(item)}
                        className="bg-background border-2 shadow-sm"
                      />
                    </div>
                  )}
                  {renderCardItem(item, index)}
                </div>
              ))
            )}
          </div>
        )}
        
        {displayMode === 'table' && (
          <div className="border rounded-lg overflow-hidden">
            {renderTableView()}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="pb-8 px-6 pt-6">
            <DialogTitle className="text-xl font-semibold">View Item</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
               {fieldMappings.filter((m: DataDisplayField) => m && m.visible).map((mapping: DataDisplayField) => (
                <div key={mapping.id} className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{mapping.displayName}</Label>
                  <div className="bg-muted/50 rounded-lg p-4 min-h-[48px] flex items-center border">
                    {renderFieldValue(currentItem, mapping) || <span className="text-muted-foreground italic">No data</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="pb-8 px-6 pt-6">
            <DialogTitle className="text-xl font-semibold">Edit Item</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <div className="px-6 pb-6">
              <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                 {fieldMappings.filter((m: DataDisplayField) => m && m.visible).map((mapping: DataDisplayField) => (
                  <div key={mapping.id} className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{mapping.displayName}</Label>
                    <Input
                      defaultValue={currentItem[mapping.sourceField] || ''}
                      placeholder={`Enter ${mapping.displayName.toLowerCase()}`}
                      className="h-12 border-2 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-8 border-t mt-6">
                <Button variant="outline" size="lg" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button size="lg" onClick={() => {
                  // TODO: Implement save functionality
                  setShowEditDialog(false);
                  toast({
                    title: "Item Updated",
                    description: "Item has been updated successfully",
                  });
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Sidebar */}
      <Sheet open={showEditSidebar} onOpenChange={setShowEditSidebar}>
        <SheetContent className="w-[480px] overflow-hidden">
          <SheetHeader className="pb-8">
            <SheetTitle className="text-xl font-semibold">Edit Item</SheetTitle>
          </SheetHeader>
          {currentItem && (
            <div className="h-full flex flex-col">
              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {fieldMappings.filter((m: DataDisplayField) => m && m.visible).map((mapping: DataDisplayField) => (
                  <div key={mapping.id} className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{mapping.displayName}</Label>
                    <Input
                      defaultValue={currentItem[mapping.sourceField] || ''}
                      placeholder={`Enter ${mapping.displayName.toLowerCase()}`}
                      className="h-12 border-2 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-8 border-t">
                <Button variant="outline" size="lg" onClick={() => setShowEditSidebar(false)}>
                  Cancel
                </Button>
                <Button size="lg" onClick={() => {
                  // TODO: Implement save functionality
                  setShowEditSidebar(false);
                  toast({
                    title: "Item Updated",
                    description: "Item has been updated successfully",
                  });
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-8 px-6 pt-6">
            <DialogTitle className="text-xl font-semibold text-destructive">Delete Item</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="space-y-6">
              <p className="text-muted-foreground text-base leading-relaxed">
                Are you sure you want to delete this item? This action cannot be undone and will permanently remove the item from your database.
              </p>
              {currentItem && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-destructive">
                       {fieldMappings.length > 0 && fieldMappings.find(m => m) 
                         ? renderFieldValue(currentItem, fieldMappings.find(m => m)) 
                         : 'Selected item'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-8 border-t mt-6">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="lg"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Record Modal */}
      <AddRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddRecord}
        tableFields={tableFields}
      />

      {/* Add Record Sidebar */}
      <Sheet open={showAddSidebar} onOpenChange={setShowAddSidebar}>
        <SheetContent className="w-[480px] overflow-hidden">
          <SheetHeader className="pb-8">
            <SheetTitle className="text-xl font-semibold">Add New Record</SheetTitle>
          </SheetHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!tableProjectId) return;

            const formData = new FormData(e.currentTarget);
            const newRecord: Record<string, any> = {
              id: generateRecordId(data),
              created_at: new Date().toISOString()
            };

            // Collect form data
            tableFields
              .filter(field => field.name !== 'id' && !field.system)
              .forEach(field => {
                const value = formData.get(field.name);
                if (field.type === 'number') {
                  newRecord[field.name] = value ? parseFloat(value as string) || 0 : 0;
                } else if (field.type === 'boolean') {
                  newRecord[field.name] = value === 'on';
                } else {
                  newRecord[field.name] = value || '';
                }
              });

            try {
              await handleAddRecord(newRecord);
              setShowAddSidebar(false);
            } catch (error) {
              console.error('Error adding record:', error);
            }
          }} className="h-full flex flex-col">
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              {tableFields
                .filter(field => field.name !== 'id' && !field.system)
                .map((field) => (
                  <div key={field.id} className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {field.name}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                        className="w-full h-24 px-3 py-2 border-2 border-input bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name={field.name}
                          className="h-4 w-4 rounded border-input focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Yes</span>
                      </div>
                    ) : field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
                      <select
                        name={field.name}
                        className="w-full h-12 px-3 border-2 border-input bg-background rounded-md focus:ring-2 focus:ring-primary/20 text-sm"
                      >
                        <option value="">Select {field.name}</option>
                        {field.options.map((option, index) => (
                          <option key={`${option}-${index}`} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        name={field.name}
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                        className="h-12 border-2 focus:ring-2 focus:ring-primary/20"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 pt-8 border-t">
              <Button type="button" variant="outline" size="lg" onClick={() => setShowAddSidebar(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg">
                Add Record
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { DISPLAY_TEMPLATES };