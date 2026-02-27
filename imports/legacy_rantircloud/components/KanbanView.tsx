import React, { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableField, TableRecord } from "@/services/tableService";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, Trash2, GripVertical, File } from "lucide-react";
import { SchemaTypeIcon } from "./SchemaTypeIcon";
import { Input } from "./ui/input";
import { CSS } from "@dnd-kit/utilities";
import { ViewSettingsDialog } from "./ViewSettingsDialog";
import { FileUploader } from "./FileUploader";
import { ViewSettings } from "@/types/viewTypes";
import { ItemPreviewSidebar } from "./ItemPreviewSidebar";
import { AddRecordModal } from "./AddRecordModal";

interface KanbanViewProps {
  tableData: TableRecord[];
  tableSchema: {
    fields: TableField[];
  };
  onSave?: (record: any) => void;
  onUpdate?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  groupByField?: string;
  onOpenSettings?: () => void;
  settings?: ViewSettings;
}

function SortableItem({ 
  record, 
  renderContent, 
  id, 
  onCardClick 
}: { 
  record: TableRecord; 
  renderContent: (record: TableRecord) => React.ReactNode; 
  id: string;
  onCardClick?: (record: TableRecord) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="kanban-card" {...attributes} {...listeners}>
      <Card 
        className="shadow-sm cursor-pointer hover:bg-muted/50 transition-colors bg-card"
        onClick={() => onCardClick?.(record)}
      >
        <CardContent className="p-3 relative">
          <div className="absolute top-2 right-2 cursor-grab">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          {renderContent(record)}
        </CardContent>
      </Card>
    </div>
  );
}

const getFirstMediaField = (fields: TableField[], visibleFields: string[]) =>
  fields.find((f) =>
    visibleFields.includes(f.id) && (f.type === "image" || f.type === "pdf")
  );

export function KanbanView({
  tableData,
  tableSchema,
  onSave,
  onUpdate,
  onDelete,
  groupByField,
  onOpenSettings,
  settings,
}: KanbanViewProps) {
  const [newCard, setNewCard] = useState<Record<string, any>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TableRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const viewSettings: ViewSettings = {
    visibleFields: tableSchema.fields.map((f) => f.id),
    showTypeIcons: settings?.showTypeIcons ?? true,
    showImages: settings?.showImages ?? true,
    kanbanImageDisplay: settings?.kanbanImageDisplay ?? "cover",
    ...settings,
  };

  const actualGroupByField = groupByField || viewSettings.groupByField || 
    tableSchema.fields.find((f) => f.type === "select")?.id || tableSchema.fields[0]?.id;

  const groupValues = tableData.filter(record => record && record.id).reduce((acc: string[], record) => {
    const value = record[actualGroupByField];
    if (value && !acc.includes(value)) {
      acc.push(value);
    }
    return acc;
  }, []);
  const allGroups = ["Not categorized", ...groupValues];

  const firstMediaField = getFirstMediaField(tableSchema.fields, viewSettings.visibleFields);

  const handleInputChange = (fieldId: string, value: any) => {
    setNewCard(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleAddCard = (groupValue: string) => {
    setIsAddModalOpen(true);
  };

  const handleSaveNewRecord = (record: any) => {
    if (onSave) {
      onSave(record);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onUpdate) {
      const activeRecord = tableData.find(record => record.id === active.id);
      const overGroup = over.id.toString().split('-')[0];
      
      if (activeRecord && overGroup) {
        const newValue = overGroup === "Not categorized" ? null : overGroup;
        onUpdate(activeRecord.id, { [actualGroupByField]: newValue });
      }
    }
  };

  const handleDeleteCard = (recordId: string) => {
    if (onDelete) {
      if (window.confirm("Are you sure you want to delete this card?")) {
        onDelete(recordId);
      }
    }
  };

  const renderCardMedia = (record: TableRecord) => {
    if (!viewSettings.showImages || !firstMediaField) return null;
    const mediaUrl = record[firstMediaField.id];
    if (!mediaUrl) return null;

    if (firstMediaField.type === "image") {
      return (
        <div className="w-full h-28 mb-3 rounded overflow-hidden bg-muted/20">
          <img
            src={mediaUrl}
            alt="Card media"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    if (firstMediaField.type === "pdf") {
      return (
        <div className="flex items-center gap-2 mb-3">
          <File className="h-6 w-6 text-red-500" />
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View PDF
          </a>
        </div>
      );
    }
    return null;
  };

  const renderTypeIcon = (field: TableField) =>
    viewSettings.showTypeIcons ? <span className="pr-1"><SchemaTypeIcon type={field.type} size={14} /></span> : null;

  const getCardTitle = (record: TableRecord) => {
    // Try to find a meaningful title field
    const titleField = tableSchema.fields.find(f => 
      f.type === 'text' && (
        f.name.toLowerCase().includes('title') || 
        f.name.toLowerCase().includes('name') ||
        f.name.toLowerCase().includes('username')
      )
    );
    
    if (titleField) {
      const titleValue = record[titleField.id] || record[titleField.name];
      if (titleValue) return String(titleValue);
    }
    
    // Fallback to first text field that's not the group field
    const firstTextField = tableSchema.fields.find(f => 
      f.type === 'text' && f.id !== actualGroupByField
    );
    if (firstTextField) {
      const value = record[firstTextField.id] || record[firstTextField.name];
      if (value) return String(value);
    }
    
    return `Record ${record.id.slice(0, 8)}...`;
  };

  const renderCardContent = (record: TableRecord) => (
    <div className="space-y-2">
      {renderCardMedia(record)}
      
      {/* Card Title */}
      <div className="font-medium text-sm text-foreground mb-2 truncate">
        {getCardTitle(record)}
      </div>
      
      {/* Key Fields */}
      {tableSchema.fields
        .filter((field) => field.id !== actualGroupByField && viewSettings.visibleFields.includes(field.id))
        .slice(0, 2)
        .map((field) => (
          <div key={field.id} className="flex justify-between items-center text-xs">
            <span className="font-medium flex items-center gap-1 text-muted-foreground">
              {viewSettings.showTypeIcons && <SchemaTypeIcon type={field.type} size={12} />}
              {field.name}:
            </span>
            <span className="text-right text-foreground">
              {renderFieldValue(record, field)}
            </span>
          </div>
        ))}
      
      {/* ID and Creation Date */}
      <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
        <div className="text-xs text-muted-foreground">
          ID: {record.id.slice(0, 8)}...
        </div>
        {record.created_at && (
          <div className="text-xs text-muted-foreground">
            Created: {new Date(record.created_at).toLocaleDateString()}
          </div>
        )}
      </div>
      
      {onDelete && (
        <div className="absolute bottom-2 right-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCard(record.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderFieldValue = (record: TableRecord, field: TableField) => {
    const value = record[field.id] || record[field.name]; // Try both field.id and field.name

    switch (field.type) {
      case "boolean":
        return <Checkbox checked={value === true} disabled />;
      case "select":
        return value ? <Badge variant="outline">{value}</Badge> : "-";
      case "image":
        return value ? (
          <div className="h-8 w-12 relative">
            <img src={value} alt="Thumbnail" className="h-full w-full object-cover rounded" />
          </div>
        ) : '-';
      case "pdf":
        return value ? (
          <div className="flex items-center">
            <File className="h-4 w-4 mr-1 text-red-500" />
            <span className="text-xs text-blue-500 underline">
              <a href={value} target="_blank" rel="noopener noreferrer">View</a>
            </span>
          </div>
        ) : '-';
      case "codescript":
        return <span className="font-mono text-xs">{value ? `${value.substring(0, 15)}${value.length > 15 ? '...' : ''}` : '-'}</span>;
      default:
        return value || "-";
    }
  };

  return (
    <div className="rounded-md w-full bg-background p-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {allGroups.map((groupValue) => {
            const groupCards = tableData
              .filter(record => record && record.id) // Filter out null/undefined records
              .filter(record => 
                (groupValue === "Not categorized" && !record[actualGroupByField]) || 
                record[actualGroupByField] === groupValue
              );
            
            return (
              <div key={groupValue} className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{groupValue}</h4>
                  <Badge className="bg-primary/10 hover:bg-primary/20 text-primary">
                    {groupCards.length}
                  </Badge>
                </div>
                
                <div className="space-y-3 kanban-column">
                  <SortableContext items={groupCards.filter(card => card?.id).map(card => card.id)} strategy={verticalListSortingStrategy}>
                    {groupCards.filter(record => record?.id).map(record => (
                      <div key={record.id} className="relative">
                        <SortableItem
                          id={record.id}
                          record={record}
                          renderContent={renderCardContent}
                          onCardClick={setSelectedRecord}
                        />
                      </div>
                    ))}
                  </SortableContext>
                  
                  <Card className="shadow-sm border-dashed">
                    <CardContent className="p-3">
                      <Button 
                        variant="ghost" 
                        className="w-full h-8 justify-start text-muted-foreground"
                        onClick={() => setIsAddModalOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add New Card
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>
      
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
          // Handle field reordering if needed
        }}
        onToggleFieldVisibility={(fieldId) => {
          // Handle field visibility toggle if needed
        }}
      />

      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewRecord}
        tableFields={tableSchema.fields}
      />
    </div>
  );
}
