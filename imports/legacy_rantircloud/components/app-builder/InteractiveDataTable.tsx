import { useState, useEffect, useMemo } from 'react';
import { AppComponent } from '@/types/appBuilder';
import { useDataBinding } from '@/hooks/useDataBinding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Loader2,
  RefreshCw,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddRecordModal } from './AddRecordModal';
import { tableService, TableField } from '@/services/tableService';
import { supabase } from '@/integrations/supabase/client';

interface InteractiveDataTableProps {
  component: AppComponent;
  isPreview: boolean;
}

export function InteractiveDataTable({ component, isPreview }: InteractiveDataTableProps) {
  const { data, loading, error, refetch } = useDataBinding(component);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [tableFields, setTableFields] = useState<TableField[]>([]);
  const [tableProjectId, setTableProjectId] = useState<string | null>(null);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>([]);

  const tableName = component.props?.title || component.props?.tableName || 'Data Table';
  const fieldMappings = (component.dataSource as any)?.fieldMappings || [];

  // Get table columns from field mappings or first data row - defined early to avoid temporal dead zone
  const columns = useMemo(() => {
    if (fieldMappings.length > 0) {
      return fieldMappings
        .filter(mapping => mapping.visible)
        .sort((a, b) => a.order - b.order)
        .map(mapping => ({
          key: mapping.id,
          label: mapping.displayName,
          field: mapping.sourceField
        }));
    }
    
    if (data.length > 0) {
      return Object.keys(data[0]).filter(key => key !== 'id').map(key => ({
        key,
        label: key,
        field: key
      }));
    }
    
    return [];
  }, [fieldMappings, data]);

  // Fetch table fields for the add modal
  useEffect(() => {
    const fetchTableInfo = async () => {
      const dataSource = component.dataSource;
      let projectId = dataSource?.tableProjectId;
      
      // Handle different data source structures
      if (!projectId) {
        const tableName = (dataSource as any)?.table?.tableName || 
                         (dataSource as any)?.tableName ||
                         (component.props as any)?.dataSource?.table?.tableName;
        
        if (tableName) {
          try {
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
              const tables = await tableService.getUserTableProjects(user.user.id);
              const matchingTable = tables.find(t => t.name === tableName);
              if (matchingTable) {
                projectId = matchingTable.id;
              }
            }
          } catch (err) {
            console.error('Failed to find table:', err);
          }
        }
      }
      
      if (projectId) {
        try {
          const tableProject = await tableService.getTableProject(projectId);
          setTableFields(tableProject.schema.fields || []);
          setTableProjectId(projectId);
          
          // Initialize selected fields with visible table columns
          const visibleColumns = columns.map(col => col.field).filter(field => 
            tableProject.schema.fields?.some(f => f.name === field && !f.system)
          );
          setSelectedAddFields(visibleColumns.length > 0 ? visibleColumns : 
            tableProject.schema.fields?.filter(f => !f.system).map(f => f.name) || []
          );
        } catch (err) {
          console.error('Failed to fetch table schema:', err);
        }
      }
    };

    fetchTableInfo();
  }, [component.dataSource, columns]);
  
  // Filter and sort data based on current state
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let result = [...data];
    
    // Apply search filter
    if (searchTerm && columns.length > 0) {
      result = result.filter(row => 
        columns.some(col => 
          String(row[col.field] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!tableProjectId) return;
    
    try {
      await tableService.deleteRecord(tableProjectId, recordId, data);
      refetch(); // Refresh data
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const handleAddRecord = async (record: any) => {
    if (!tableProjectId) return;
    
    try {
      await tableService.addRecord(tableProjectId, record, data);
      refetch(); // Refresh data
    } catch (error) {
      console.error('Failed to add record:', error);
      throw error;
    }
  };


  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  if (!isPreview) {
    // Builder mode - show placeholder
    return (
      <div className="border rounded-lg overflow-hidden w-full">
        <div className="bg-muted/30 p-3 border-b flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">{tableName}</h4>
            {component.dataSource?.tableProjectId && (
              <p className="text-xs text-muted-foreground mt-1">
                Connected to: {component.dataSource.tableProjectId}
              </p>
            )}
          </div>
          {component.dataSource?.tableProjectId && (
            <Badge variant="secondary" className="text-xs">
              Interactive
            </Badge>
          )}
        </div>
        <div className="p-4">
        <div className="text-center text-muted-foreground text-sm">
          {component.dataSource?.tableProjectId
            ? 'Interactive data table will render here in preview mode' 
            : 'Configure data source to display table data'
          }
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden w-full">
      {/* Header */}
      <div className="bg-muted/30 p-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">{tableName}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.length} records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort(column.field)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{column.label}</span>
                      <SortIcon column={column.field} />
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow key={row.id || index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {typeof row[column.field] === 'object' 
                        ? JSON.stringify(row[column.field])
                        : String(row[column.field] || '')
                      }
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {/* Edit modal */}}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Add Record Modal */}
      <AddRecordModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        fields={tableFields}
        onSave={handleAddRecord}
        selectedFields={selectedAddFields}
        onFieldSelectionChange={setSelectedAddFields}
      />

      {/* Pagination */}
      <div className="p-3 border-t flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to{' '}
          {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}