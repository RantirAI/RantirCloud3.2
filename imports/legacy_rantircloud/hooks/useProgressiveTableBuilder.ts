import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TableField {
  name: string;
  type: string;
  required?: boolean;
  options?: any;
  description?: string;
}

interface UseProgressiveTableBuilderOptions {
  databaseId: string;
  onFieldAdded?: (fieldIndex: number, totalFields: number, fieldName: string) => void;
  onComplete?: (tableId: string) => void;
}

type ValidFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'image' | 'pdf' | 'codescript' | 'reference' | 'multireference' | 'document' | 'multidocument' | 'json' | 'email' | 'password' | 'timestamp';

const mapFieldType = (type: string): ValidFieldType => {
  const typeMap: Record<string, ValidFieldType> = {
    'string': 'text',
    'text': 'text',
    'number': 'number',
    'integer': 'number',
    'float': 'number',
    'date': 'date',
    'datetime': 'timestamp',
    'boolean': 'boolean',
    'bool': 'boolean',
    'select': 'select',
    'dropdown': 'select',
    'multiselect': 'multiselect',
    'email': 'email',
    'textarea': 'textarea',
    'longtext': 'textarea',
    'image': 'image',
    'file': 'pdf',
    'json': 'json',
    'password': 'password',
    'timestamp': 'timestamp'
  };
  return typeMap[type.toLowerCase()] || 'text';
};

export function useProgressiveTableBuilder({ 
  databaseId, 
  onFieldAdded, 
  onComplete 
}: UseProgressiveTableBuilderOptions) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentField, setCurrentField] = useState(0);
  const [totalFields, setTotalFields] = useState(0);
  const [tableId, setTableId] = useState<string | null>(null);

  const createEmptyTable = async (name: string, description: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const tableSchema = {
      id: crypto.randomUUID(),
      name,
      fields: []
    };

    const { data: table, error } = await supabase
      .from('table_projects')
      .insert({
        name,
        description,
        user_id: user.id,
        database_id: databaseId,
        schema: tableSchema,
        records: []
      })
      .select()
      .single();

    if (error) throw error;
    return table.id;
  };

  const addFieldToTable = async (tblId: string, field: TableField): Promise<void> => {
    // Get current table schema
    const { data: table, error: fetchError } = await supabase
      .from('table_projects')
      .select('schema')
      .eq('id', tblId)
      .single();

    if (fetchError) throw fetchError;

    const currentSchema = table.schema as any;
    
    // Create new field with proper structure
    const newField = {
      id: crypto.randomUUID(),
      name: field.name,
      type: mapFieldType(field.type),
      required: field.required || false,
      options: field.options,
      description: field.description
    };

    // Add field to schema
    const updatedSchema = {
      ...currentSchema,
      fields: [...(currentSchema.fields || []), newField]
    };

    // Update table
    const { error: updateError } = await supabase
      .from('table_projects')
      .update({ schema: updatedSchema })
      .eq('id', tblId);

    if (updateError) throw updateError;
  };

  const buildTable = useCallback(async (
    name: string, 
    description: string, 
    fields: TableField[]
  ): Promise<string> => {
    setIsBuilding(true);
    setTotalFields(fields.length);
    setCurrentField(0);

    try {
      // Step 1: Create empty table
      const tblId = await createEmptyTable(name, description);
      setTableId(tblId);

      // Step 2: Progressively add each field with delay for visual effect
      for (let i = 0; i < fields.length; i++) {
        setCurrentField(i + 1);
        
        await addFieldToTable(tblId, fields[i]);
        onFieldAdded?.(i + 1, fields.length, fields[i].name);
        
        // Small delay between fields for visual progressive effect
        if (i < fields.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      onComplete?.(tblId);
      return tblId;
    } finally {
      setIsBuilding(false);
    }
  }, [databaseId, onFieldAdded, onComplete]);

  return {
    buildTable,
    isBuilding,
    currentField,
    totalFields,
    tableId,
    progress: totalFields > 0 ? Math.round((currentField / totalFields) * 100) : 0
  };
}
