import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableField, tableService } from "@/services/tableService";
import { Plus, X, PlusCircle } from "lucide-react";
import { SchemaTypeIcon } from "./SchemaTypeIcon";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { documentService } from "@/services/documentService";

const fieldTypes = [{
  id: "text",
  name: "Text"
}, {
  id: "number",
  name: "Number"
}, {
  id: "date",
  name: "Date"
}, {
  id: "boolean",
  name: "Boolean"
}, {
  id: "select",
  name: "Select"
}, {
  id: "multiselect",
  name: "Multi-select (Options)"
}, {
  id: "reference",
  name: "Table Reference"
}, {
  id: "multireference",
  name: "Multiple References"
}, {
  id: "document",
  name: "Document Reference"
}, {
  id: "multidocument",
  name: "Multiple Documents"
}, {
  id: "image",
  name: "Image Upload"
}, {
  id: "pdf",
  name: "PDF Upload"
}, {
  id: "codescript",
  name: "Code Script"
}, {
  id: "textarea",
  name: "Long Text"
}, {
  id: "json",
  name: "JSON Data"
}, {
  id: "email",
  name: "Email"
}, {
  id: "password",
  name: "Password"
}, {
  id: "timestamp",
  name: "Timestamp"
}];

interface TableSchemaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schema: {
    name: string;
    fields: TableField[];
  }) => void;
  initialData?: {
    name: string;
    fields: TableField[];
  };
}

interface LinkedTable {
  id: string;
  name: string;
  schema?: {
    fields?: TableField[];
  };
}

interface LinkedDatabase {
  id: string;
  name: string;
}

interface LinkedDocument {
  id: string;
  title: string;
  database_id: string;
  database_name?: string;
}

export function TableSchemaEditor({
  isOpen,
  onClose,
  onSave,
  initialData
}: TableSchemaEditorProps) {
  const { user } = useAuth();
  const [name, setName] = useState(initialData?.name || "");
  const [fields, setFields] = useState<TableField[]>(initialData?.fields || []);
  const [linkedTables, setLinkedTables] = useState<LinkedTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [linkedDatabases, setLinkedDatabases] = useState<LinkedDatabase[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadLinkedTables();
      loadLinkedDocuments();
    }
    if (isOpen && initialData?.fields) {
      console.log('TableSchemaEditor fields loaded:', initialData.fields.map(f => ({
        name: f.name,
        type: f.type,
        system: f.system,
        disabled: Boolean(f.system)
      })));
    }
  }, [isOpen, user, initialData]);

  // Update fields when initialData changes
  useEffect(() => {
    if (initialData?.fields) {
      setFields(initialData.fields);
      setName(initialData.name || "");
    }
  }, [initialData]);

  const loadLinkedTables = async () => {
    try {
      setIsLoadingTables(true);
      const tables = await tableService.getUserTableProjects(user?.id || "");
      const linkedTablesWithSchema = await Promise.all(tables.map(async (table: any) => {
        try {
          const fullTable = await tableService.getTableProject(table.id);
          return {
            id: table.id,
            name: table.name,
            schema: fullTable.schema
          };
        } catch (error) {
          console.error(`Error loading schema for table ${table.id}:`, error);
          return {
            id: table.id,
            name: table.name,
            schema: { fields: [] }
          };
        }
      }));
      setLinkedTables(linkedTablesWithSchema);
    } catch (error) {
      console.error("Failed to load tables for references:", error);
      toast.error("Could not load available tables for references");
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadLinkedDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      // First get all databases
      const { data: databases, error: dbError } = await supabase
        .from('databases')
        .select('id, name')
        .eq('user_id', user?.id || '');

      if (dbError) throw dbError;

      setLinkedDatabases(databases || []);

      // Then get all documents from all databases
      const allDocuments: LinkedDocument[] = [];
      for (const db of databases || []) {
        try {
          const docs = await documentService.getDatabaseDocuments(db.id);
          allDocuments.push(...docs.map(doc => ({
            id: doc.id,
            title: doc.title,
            database_id: doc.database_id,
            database_name: db.name
          })));
        } catch (error) {
          console.error(`Error loading documents for database ${db.id}:`, error);
        }
      }
      setLinkedDocuments(allDocuments);
    } catch (error) {
      console.error("Failed to load documents for references:", error);
      toast.error("Could not load available documents for references");
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const addField = () => {
    const newField: TableField = {
      id: crypto.randomUUID(),
      name: "",
      type: "text"
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<TableField>) => {
    setFields(fields.map(field => {
      if (field.id === id) {
        if ((updates.type === 'select' || updates.type === 'multiselect') && !Array.isArray(field.options)) {
          return {
            ...field,
            ...updates,
            options: { values: [] }
          };
        }
        if ((updates.type === 'reference' || updates.type === 'multireference') && (!field.options || !field.options.targetTableId)) {
          return {
            ...field,
            ...updates,
            options: {
              targetTableId: '',
              targetTableName: ''
            }
          };
        }
        if ((updates.type === 'document' || updates.type === 'multidocument') && (!field.options || !field.options.targetDatabaseId)) {
          return {
            ...field,
            ...updates,
            options: {
              targetDatabaseId: '',
              targetDatabaseName: ''
            }
          };
        }
        return { ...field, ...updates };
      }
      return field;
    }));
  };

  const addOptionValue = (fieldId: string, value: string) => {
    if (!value.trim()) return;
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        const currentOptions = Array.isArray(field.options) ? field.options : [];
        if (currentOptions.includes(value)) {
          return field;
        }
        return {
          ...field,
          options: [...currentOptions, value]
        };
      }
      return field;
    }));
  };

  const removeOptionValue = (fieldId: string, value: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId && Array.isArray(field.options)) {
        return {
          ...field,
          options: field.options.filter(v => v !== value)
        };
      }
      return field;
    }));
  };

  const handleSubmit = () => {
    onSave({
      name,
      fields: fields.map(field => ({
        ...field,
        name: field.name || `Field ${fields.indexOf(field) + 1}`
      }))
    });
  };

  const renderFieldOptions = (field: TableField) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="text-options">
              <AccordionTrigger className="text-xs py-2 px-3 border-b border-border/50">
                Text Field Options
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Length</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={field.options?.minLength || ''}
                        onChange={e => updateField(field.id, {
                          options: {
                            ...field.options,
                            minLength: parseInt(e.target.value) || undefined
                          }
                        })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Length</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="No limit"
                        value={field.options?.maxLength || ''}
                        onChange={e => updateField(field.id, {
                          options: {
                            ...field.options,
                            maxLength: parseInt(e.target.value) || undefined
                          }
                        })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  {field.type === 'text' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Input Pattern</Label>
                      <Input
                        placeholder="e.g. [A-Za-z0-9]+ for alphanumeric only"
                        value={field.options?.pattern || ''}
                        onChange={e => updateField(field.id, {
                          options: {
                            ...field.options,
                            pattern: e.target.value || undefined
                          }
                        })}
                        className="text-xs h-8"
                      />
                      <p className="text-xs text-muted-foreground">Regular expression pattern for validation</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      case 'select':
      case 'multiselect':
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="options">
              <AccordionTrigger className="text-xs py-2 px-3 border-b border-border/50">
                Field Options
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Label className="mb-1 block text-xs">Add Options</Label>
                  <div className="flex gap-2 mb-2">
                    <Input 
                      placeholder="Add option value..." 
                      className="flex-1 text-sm" 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          addOptionValue(field.id, input.value);
                          input.value = '';
                        }
                      }} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={e => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addOptionValue(field.id, input.value);
                        input.value = '';
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(field.options) && field.options.map((value, index) => (
                      <Badge key={`${value}-${index}`} variant="secondary" className="flex items-center gap-1 text-xs">
                        {value}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeOptionValue(field.id, value)} />
                      </Badge>
                    ))}
                    {(!Array.isArray(field.options) || field.options.length === 0) && (
                      <div className="text-xs text-muted-foreground">No options added yet</div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      case 'reference':
      case 'multireference':
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="reference">
              <AccordionTrigger className="text-xs py-2 px-3 border-b border-border/50">
                Reference Configuration
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Label className="text-xs">Select Target Table</Label>
                  <Select 
                    value={field.options?.targetTableId} 
                    onValueChange={tableId => {
                      const selectedTable = linkedTables.find(t => t.id === tableId);
                      if (selectedTable) {
                        updateField(field.id, {
                          options: {
                            ...field.options,
                            targetTableId: tableId,
                            targetTableName: selectedTable.name,
                            displayField: selectedTable.schema?.fields?.[0]?.id
                          }
                        });
                      }
                    }} 
                    disabled={isLoadingTables || linkedTables.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingTables ? "Loading tables..." : "Select a table"} />
                    </SelectTrigger>
                    <SelectContent className="z-[200] bg-popover">
                      {linkedTables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {field.options?.targetTableId && (
                    <div className="mt-2">
                      <Label className="text-xs">Display Field</Label>
                      <Select 
                        value={field.options?.displayField} 
                        onValueChange={fieldId => {
                          updateField(field.id, {
                            options: {
                              ...field.options,
                              displayField: fieldId
                            }
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select display field" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] bg-popover">
                          {linkedTables.find(t => t.id === field.options?.targetTableId)?.schema?.fields?.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      case 'document':
      case 'multidocument':
        return (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="document">
              <AccordionTrigger className="text-xs py-2 px-3 border-b border-border/50">
                Document Reference Configuration
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Label className="text-xs">Filter by Database (optional)</Label>
                  <Select 
                    value={field.options?.targetDatabaseId || 'all'} 
                    onValueChange={databaseId => {
                      const selectedDb = linkedDatabases.find(d => d.id === databaseId);
                      updateField(field.id, {
                        options: {
                          ...field.options,
                          targetDatabaseId: databaseId === 'all' ? undefined : databaseId,
                          targetDatabaseName: databaseId === 'all' ? undefined : selectedDb?.name
                        }
                      });
                    }} 
                    disabled={isLoadingDocuments || linkedDatabases.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingDocuments ? "Loading databases..." : "All databases"} />
                    </SelectTrigger>
                    <SelectContent className="z-[200] bg-popover">
                      <SelectItem value="all">All Databases</SelectItem>
                      {linkedDatabases.map(db => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                    {linkedDocuments.length > 0 ? (
                      <>Available documents: {linkedDocuments.filter(doc => !field.options?.targetDatabaseId || doc.database_id === field.options?.targetDatabaseId).length}</>
                    ) : (
                      <>No documents available</>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto z-[100]" side="right">
        <SheetHeader>
          <SheetTitle>Create Table Schema</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-180px)] py-4 px-[16px]">
          <div className="space-y-4 pr-6">
            <div className="space-y-2">
              <Label htmlFor="name">Table Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Customers, Products, etc." 
                className="h-9" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Fields</Label>
                <Button type="button" size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" /> Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map(field => (
                  <div key={field.id} className="flex flex-col space-y-3 border p-2 rounded-md">
                    <div className="flex items-start space-x-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            value={field.name} 
                            onChange={e => updateField(field.id, { name: e.target.value })} 
                            placeholder="Field name" 
                            className="h-9" 
                            disabled={field.system} 
                          />
                          {field.system && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">System</span>
                          )}
                        </div>
                        <Select 
                          value={field.type} 
                          onValueChange={value => updateField(field.id, { type: value as TableField["type"] })} 
                          disabled={field.system}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                          <SelectContent className="z-[200] bg-popover">
                            {fieldTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                <span className="flex items-center gap-2">
                                  <SchemaTypeIcon type={type.id} />
                                  {type.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!field.system && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeField(field.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {renderFieldOptions(field)}
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground">
                    No fields added yet. Click "Add Field" to create your first field.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || fields.length === 0}>
            Save Schema
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}