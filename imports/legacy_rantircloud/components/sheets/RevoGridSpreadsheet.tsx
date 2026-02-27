import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TableField, TableRecord } from '@/services/tableService';
import { generateRecordId, generateRecordIdWithPrefix } from '@/utils/generateRecordId';
import { RevoGrid, Editor } from '@revolist/react-datagrid';
import SelectTypePlugin from '@revolist/revogrid-column-select';
import { FormulaBar } from './FormulaBar';
import { SchemaPanel } from './SchemaPanel';
import { ConnectionsPanel } from './ConnectionsPanel';
import { AIContextMenu } from './AIContextMenu';
import { FormulaHelpDialog } from './FormulaHelpDialog';
import { RecordExpandModal } from '@/components/RecordExpandModal';
import { Button } from '@/components/ui/button';
import { Database, Settings2, Plus, Trash2, HelpCircle, Expand, Copy, Eye, ExternalLink, Code } from 'lucide-react';
import { mapFieldsToColumns } from '@/lib/sheets/columnMappers';
import { initializeFormulaEngine, evaluateFormula } from '@/lib/sheets/formulaEngine';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RevoGridSpreadsheetProps {
  tableData: TableRecord[];
  tableSchema: { fields: TableField[] };
  tableProjectId?: string;
  tableName?: string;
  onSave?: (record: any) => void;
  onUpdate?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  onBulkDelete?: (recordIds: string[]) => void;
  onSchemaChange?: (fields: TableField[]) => void;
  onViewJSON?: () => void;
  onShareEmbed?: () => void;
  onOpenAddRecordModal?: () => void;
  recordCount?: number;
}

export function RevoGridSpreadsheet({
  tableData,
  tableSchema,
  tableProjectId,
  tableName,
  onSave,
  onUpdate,
  onDelete,
  onBulkDelete,
  onSchemaChange,
  onViewJSON,
  onShareEmbed,
  onOpenAddRecordModal,
  recordCount,
}: RevoGridSpreadsheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | undefined>();
  const [editingValue, setEditingValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const justFocusedRef = useRef(false);
  const [schemaPanelOpen, setSchemaPanelOpen] = useState(false);
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(false);
  const [formulaHelpOpen, setFormulaHelpOpen] = useState(false);
  const [localData, setLocalData] = useState<TableRecord[]>(tableData);
  const [localSchema, setLocalSchema] = useState<TableField[]>(tableSchema.fields);

  // Row selection should be independent from cell focus.
  // We track selected rows by record id (stable even if the grid gets sorted/filtered).
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<TableRecord | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const toggleRowSelected = useCallback((recordId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }, []);

  const openRecordById = useCallback((recordId: string) => {
    const record = localData.find((r) => r.id === recordId);
    if (record) setExpandedRecord(record);
  }, [localData]);

  // Custom date editor for RevoGrid
  const editors = useMemo(() => {
    const DateCellEditor = (props: any) => {
      const [value, setValue] = useState<string>(props.model?.[props.prop] || '');

      const commit = (next: string) => {
        if (props.save) props.save(next);
        if (props.close) props.close();
      };

      return (
        <input
          type="date"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(value);
            if (e.key === 'Escape' && props.close) props.close();
          }}
          className="rv-input rv-input-date"
        />
      );
    };

    return {
      'date-editor': Editor(DateCellEditor),
    } as any;
  }, []);

  // Column types for RevoGrid
  const columnTypes = useMemo(() => ({
    select: new SelectTypePlugin(),
  }), []);

  // Custom row header with: (1) select checkbox, (2) expand button.
  // This keeps these controls OUT of the data grid cells.
  const rowHeadersConfig = useMemo(() => ({
    size: 70,
    cellTemplate: (h: any, props: any) => {
      const model = props?.model || {};
      const recordId: string | undefined = model.__recordId;
      const isEmptyRow = !!model.__isEmptyRow || recordId === '__empty__';

      if (!recordId || isEmptyRow) return '';

      const isSelected = selectedRowIds.has(recordId);
      const showActions = hoveredRowId === recordId || activeRowId === recordId || isSelected;

      return h('div', {
        class: 'rv-rowheader-actions',
        onMouseEnter: () => setHoveredRowId(recordId),
        onMouseLeave: () => setHoveredRowId((prev: string | null) => (prev === recordId ? null : prev)),
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: '100%',
          height: '100%',
          padding: '0 6px',
          background: isSelected ? 'hsl(var(--accent))' : 'transparent',
        },
      }, [
        // Checkbox for row selection (multi-select)
        h('button', {
          type: 'button',
          class: 'row-select-btn',
          onClick: (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            toggleRowSelected(recordId);
          },
          style: {
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            border: isSelected ? 'none' : '2px solid hsl(var(--border))',
            background: isSelected ? 'hsl(var(--primary))' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: '0',
          },
          title: 'Select row',
          'aria-label': 'Select row',
        }, isSelected ? [
          h('svg', {
            width: '12',
            height: '12',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'hsl(var(--primary-foreground))',
            strokeWidth: '3',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }, [
            h('polyline', { points: '20 6 9 17 4 12' }),
          ])
        ] : []),

        // Expand button (opens the record modal)
        h('button', {
          type: 'button',
          class: 'expand-row-btn',
          onClick: (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            openRecordById(recordId);
          },
          style: {
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: showActions ? '0.85' : '0.15',
            borderRadius: '4px',
          },
          title: 'Expand record',
          'aria-label': 'Expand record',
        }, [
          h('svg', {
            width: '16',
            height: '16',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }, [
            h('path', { d: 'M15 3h6v6' }),
            h('path', { d: 'M9 21H3v-6' }),
            h('path', { d: 'M21 3l-7 7' }),
            h('path', { d: 'M3 21l7-7' }),
          ])
        ])
      ]);
    }
  }), [selectedRowIds, hoveredRowId, activeRowId, toggleRowSelected, openRecordById]);

  // Memoize columns and source for stable references (prevents infinite re-renders)
  const columns = useMemo(() => {
    return mapFieldsToColumns(localSchema);
  }, [localSchema]);
  
  const source = useMemo(() => {
    const data = localData.map((record) => {
      const row: any = {
        __recordId: record.id,
        __isEmptyRow: false,
      };
      localSchema.forEach((field) => {
        const fieldKey = field.id || field.name;
        row[fieldKey] = record[fieldKey] || record[field.name] || '';
      });
      return row;
    });

    // Add empty row at the end for quick data entry
    const emptyRow: any = { __isEmptyRow: true, __recordId: '__empty__' };
    localSchema.forEach((field) => {
      const fieldKey = field.id || field.name;
      emptyRow[fieldKey] = '';
    });
    data.push(emptyRow);

    console.log('RevoGrid - Source data being set:', data);
    return data;
  }, [localData, localSchema]);

  // Initialize formula engine
  useEffect(() => {
    initializeFormulaEngine();
  }, []);

  // Update local data when tableData changes
  useEffect(() => {
    setLocalData(tableData);
  }, [tableData]);

  // Update local schema when tableSchema changes
  useEffect(() => {
    setLocalSchema(tableSchema.fields);
  }, [tableSchema.fields]);

  const handleCellEdit = useCallback((rowIndex: number, fieldId: string, value: any) => {
    const record = localData[rowIndex];
    if (!record) return;

    // Find the field by id or name
    const field = localSchema.find(f => (f.id || f.name) === fieldId);
    if (!field) return;

    const fieldKey = field.id || field.name;

    // Check if value actually changed
    const currentValue = record[fieldKey] || record[field.name] || '';
    if (String(value) === String(currentValue)) {
      return; // No change, don't save
    }

    // Check if value is a formula
    let finalValue = value;
    if (typeof value === 'string' && value.startsWith('=')) {
      try {
        finalValue = evaluateFormula(value);
        if (finalValue && typeof finalValue === 'object' && 'error' in finalValue) {
          toast.error('Invalid formula: ' + finalValue.error);
          return;
        }
      } catch (error) {
        console.error('Formula error:', error);
        toast.error('Invalid formula');
        return;
      }
    }

    const updates = { [fieldKey]: finalValue };
    
    // Update local data immediately for UI responsiveness
    setLocalData((prev) =>
      prev.map((r, idx) => (idx === rowIndex ? { ...r, ...updates } : r))
    );

    // Call parent update handler silently (no toast)
    if (onUpdate && record.id) {
      onUpdate(record.id, updates);
    }
  }, [localData, localSchema, onUpdate]);

  const handleAddRecord = () => {
    const newRecord: TableRecord = {
      id: generateRecordId(),
    };

    localSchema.forEach((field) => {
      const fieldKey = field.id || field.name;
      // Set appropriate default values based on field type
      if (field.type === 'boolean') {
        newRecord[fieldKey] = false;
      } else if (field.type === 'number') {
        newRecord[fieldKey] = 0;
      } else if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
        // Don't set a default value for select fields - leave empty to force user selection
        newRecord[fieldKey] = '';
      } else {
        newRecord[fieldKey] = '';
      }
    });

    setLocalData([...localData, newRecord]);

    if (onSave) {
      onSave(newRecord);
    }

    toast.success('Record added');
  };

  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) {
      toast.error('No rows selected');
      return;
    }

    const recordIdsToDelete = Array.from(selectedRowIds);
    const recordsToDelete = localData.filter((r) => r?.id && selectedRowIds.has(r.id));

    if (recordsToDelete.length === 0) return;

    // Update local data
    const newData = localData.filter((r) => !selectedRowIds.has(r.id));
    setLocalData(newData);
    setSelectedRowIds(new Set());

    // Call delete handlers
    if (recordsToDelete.length === 1 && onDelete) {
      onDelete(recordsToDelete[0].id);
    } else if (recordsToDelete.length > 1 && onBulkDelete) {
      onBulkDelete(recordIdsToDelete);
    }

    toast.success(`${recordsToDelete.length} record(s) deleted`);
  };

  const handleDuplicateRecord = (record: TableRecord) => {
    const newRecord: TableRecord = {
      ...record,
      id: generateRecordIdWithPrefix('copy'),
    };
    
    setLocalData([...localData, newRecord]);
    
    if (onSave) {
      onSave(newRecord);
    }
    
    toast.success('Record duplicated');
  };

  const handleExpandRecord = (rowIndex: number) => {
    const record = localData[rowIndex];
    if (record) {
      setExpandedRecord(record);
    }
  };

  const handleDeleteSingleRecord = (recordId: string) => {
    setLocalData(prev => prev.filter(r => r.id !== recordId));
    if (onDelete) {
      onDelete(recordId);
    }
    toast.success('Record deleted');
  };

  const handleSchemaChange = (fields: TableField[]) => {
    setLocalSchema(fields);
    if (onSchemaChange) {
      onSchemaChange(fields);
    }
  };

  const handleFormulaSubmit = (formula: string) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const field = localSchema[col];
    if (field) {
      handleCellEdit(row, field.id || field.name, formula);
    }
    setEditingValue('');
    setIsEditing(false);
  };

  const handleGenerateFormula = (formula: string) => {
    if (selectedCell) {
      handleFormulaSubmit(formula);
    }
  };

  const handleMapData = (result: any) => {
    if (!result?.transformedData || !Array.isArray(result.transformedData)) {
      toast.error('No data to import');
      return;
    }

    const newRecords: TableRecord[] = result.transformedData.map((row: any) => {
      const newRecord: TableRecord = {
        // Always generate a new internal ID to avoid duplicates from imported data
        id: generateRecordId(row, { fields: localSchema }),
      };
      // Map each field from the transformed data
      localSchema.forEach((field) => {
        const fieldKey = field.id || field.name;
        const value = row[field.name] || row[field.id] || '';
        newRecord[fieldKey] = value;
      });

      return newRecord;
    });

    // Add new records to local data
    setLocalData([...localData, ...newRecords]);

    // Save each record
    if (onSave) {
      newRecords.forEach(record => onSave(record));
    }

    toast.success(`Imported ${newRecords.length} record(s)`);
  };

  const handleConnectionImport = (data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('No data to import');
      return;
    }

    const newRecords: TableRecord[] = data.map((row) => {
      const newRecord: TableRecord = {
        // Always generate a new internal ID to avoid duplicates from imported data
        id: generateRecordId(row, { fields: localSchema }),
      };
      // Map each field from the imported data
      localSchema.forEach((field) => {
        const fieldKey = field.id || field.name;
        const value = row[field.name] || row[field.id] || row[fieldKey] || '';
        newRecord[fieldKey] = value;
      });

      return newRecord;
    });

    // Add new records to local data
    setLocalData([...localData, ...newRecords]);

    // Save each record
    if (onSave) {
      newRecords.forEach(record => onSave(record));
    }

    toast.success(`Imported ${newRecords.length} record(s) from connection`);
  };

  // Event handlers for RevoGrid
  const handleAfterEdit = (e: any) => {
    const detail = e.detail || e;
    
    if (detail && detail.val !== undefined) {
      const rowIndex = detail.rowIndex;
      
      // RevoGrid provides column.name, find the matching field by name
      const columnName = detail.column?.name;
      if (!columnName) {
        console.error('No column name found in event');
        return;
      }
      
      // Find the field by name
      const field = localSchema.find(f => f.name === columnName);
      if (!field) {
        console.error('No field found for column name:', columnName);
        return;
      }
      
      // Use field.id if available, otherwise use field.name as the identifier
      const fieldKey = field.id || field.name;
      
      // Check if this is the empty row (last row in source)
      const isEmptyRow = rowIndex === localData.length;
      
      if (isEmptyRow && detail.val) {
        // Create a new record from the empty row
        const newRecord: TableRecord = {
          id: generateRecordId({ [fieldKey]: detail.val }, { fields: localSchema }),
        };
        localSchema.forEach((f) => {
          const fKey = f.id || f.name;
          newRecord[fKey] = fKey === fieldKey ? detail.val : '';
        });
        
        setLocalData([...localData, newRecord]);
        
        if (onSave) {
          onSave(newRecord);
        }
        toast.success('Record added');
      } else {
        handleCellEdit(rowIndex, fieldKey, detail.val);
      }
    }
  };
  const handleAfterSelection = (e: CustomEvent) => {
    const detail = e.detail;
    if (detail && detail.range) {
      const range = detail.range;
      const ids = new Set<string>();

      for (let i = range.y; i <= range.y1; i++) {
        const recordId = (source as any[])?.[i]?.__recordId;
        const isEmpty = (source as any[])?.[i]?.__isEmptyRow;
        if (recordId && recordId !== '__empty__' && !isEmpty) ids.add(recordId);
      }

      setSelectedRowIds(ids);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Unified Toolbar */}
      <div className="border-b bg-background px-3 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left side - Record count and data actions */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {recordCount ?? localData.length} records
          </span>
          
          <div className="h-4 w-px bg-border" />
          
          {onViewJSON && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewJSON}
            >
              <Eye className="h-4 w-4 mr-2" />
              View JSON
            </Button>
          )}
          
          {onShareEmbed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareEmbed}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share & Embed
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConnectionsPanelOpen(true)}
          >
            <Database className="h-4 w-4 mr-2" />
            Import & Connect
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSchemaPanelOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Schema
          </Button>
        </div>

        {/* Right side - Row actions and CRUD */}
        <div className="flex items-center gap-2">
          {/* Row Actions when single row selected */}
          {selectedRowIds.size === 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const recordId = Array.from(selectedRowIds)[0];
                  openRecordById(recordId);
                }}
              >
                <Expand className="h-4 w-4 mr-2" />
                Expand
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const recordId = Array.from(selectedRowIds)[0];
                  const record = localData.find((r) => r.id === recordId);
                  if (record) handleDuplicateRecord(record);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </>
          )}

          {onOpenAddRecordModal && (
            <Button variant="ghost" size="sm" onClick={onOpenAddRecordModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFormulaHelpOpen(true)}
            title="Formula Help"
            className="h-8 w-8"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedRowIds.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedRowIds.size})
          </Button>
        </div>
      </div>

      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        value={editingValue}
        onSubmit={handleFormulaSubmit}
        onCancel={() => {
          setIsEditing(false);
          if (selectedCell) {
            const record = localData[selectedCell.row];
            const field = localSchema[selectedCell.col];
            if (record && field) {
              setEditingValue(String(record[field.id] || record[field.name] || ''));
            }
          }
        }}
        isEditing={isEditing}
      />

      {/* Spreadsheet with AI Context Menu */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <AIContextMenu
          selectedCell={selectedCell}
          onGenerateFormula={handleGenerateFormula}
          onMapData={handleMapData}
          columns={localSchema}
          sampleData={localData}
        >
          <div className="absolute inset-0 overflow-auto">
            <RevoGrid
              columns={columns}
              source={source}
              resize={true}
              filter={true}
              range={true}
              rowHeaders={rowHeadersConfig as any}
              autoSizeColumn={true}
              theme="compact"
              editors={editors}
              columnTypes={columnTypes}
              onAfteredit={handleAfterEdit}
              onBeforecellfocus={(e: CustomEvent) => {
                const detail: any = e.detail || {};
                const recordId: string | undefined = detail?.model?.__recordId;

                if (recordId && recordId !== '__empty__') {
                  setActiveRowId(recordId);
                }
              }}
              style={{ height: '100%', width: '100%', minWidth: 'max-content' }}
            />
          </div>
        </AIContextMenu>
      </div>

      {/* Panels */}
      <SchemaPanel
        open={schemaPanelOpen}
        onOpenChange={setSchemaPanelOpen}
        fields={localSchema}
        onFieldsChange={handleSchemaChange}
      />

      <ConnectionsPanel
        open={connectionsPanelOpen}
        onOpenChange={setConnectionsPanelOpen}
        onDataImport={handleConnectionImport}
      />

      <FormulaHelpDialog
        isOpen={formulaHelpOpen}
        onClose={() => setFormulaHelpOpen(false)}
      />

      {/* Record Expand Modal */}
      <RecordExpandModal
        isOpen={!!expandedRecord}
        onClose={() => setExpandedRecord(null)}
        record={expandedRecord}
        tableSchema={{ fields: localSchema }}
        onEdit={(recordId, updates) => {
          // Update local data
          setLocalData(prev => prev.map(r => 
            r.id === recordId ? { ...r, ...updates } : r
          ));
          // Call parent update handler
          if (onUpdate) {
            onUpdate(recordId, updates);
          }
          setExpandedRecord(null);
        }}
        onDelete={(recordId) => {
          handleDeleteSingleRecord(recordId);
          setExpandedRecord(null);
        }}
        onDuplicate={(record) => {
          handleDuplicateRecord(record);
        }}
      />
    </div>
  );
}
