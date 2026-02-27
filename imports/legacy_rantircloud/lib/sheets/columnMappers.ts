import { TableField } from "@/services/tableService";
import { ColumnDataSchemaModel } from "@/types/revogrid";

export function mapFieldToColumn(field: TableField): ColumnDataSchemaModel {
  const baseColumn: ColumnDataSchemaModel = {
    prop: field.id || field.name,
    name: field.name,
    size: 150,
    filter: true,
    sortable: true,
    autoSize: true,
  };

  switch (field.type) {
    case 'number':
      return {
        ...baseColumn,
        columnType: 'numeric',
        size: 120,
        cellProperties: ({ model }) => {
          return {
            style: { textAlign: 'right' }
          };
        },
      };

    case 'boolean':
      return {
        ...baseColumn,
        columnType: 'boolean',
        size: 80,
        editor: 'checkbox',
        cellProperties: ({ model }) => ({
          style: { textAlign: 'center' }
        }),
      };

    case 'date':
      return {
        ...baseColumn,
        columnType: 'date',
        editor: 'date-editor',
        size: 130,
      };
 
    case 'timestamp':
      return {
        ...baseColumn,
        columnType: 'date',
        size: 180,
        cellProperties: ({ model }) => ({
          style: { 
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }
        }),
      };
    case 'select':
      const selectOptions = Array.isArray(field.options) 
        ? field.options.map((opt: any) => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt };
            }
            return { label: opt.label || opt, value: opt.value || opt };
          })
        : [];
      
      return {
        ...baseColumn,
        columnType: 'select',
        labelKey: 'label',
        valueKey: 'value',
        source: selectOptions,
        size: 180,
      } as ColumnDataSchemaModel;

    case 'multiselect':
      const multiselectOptions = Array.isArray(field.options)
        ? field.options.map((opt: any) => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt };
            }
            return { label: opt.label || opt, value: opt.value || opt };
          })
        : [];
      
      return {
        ...baseColumn,
        columnType: 'select',
        labelKey: 'label',
        valueKey: 'value',
        source: multiselectOptions,
        size: 200,
      } as ColumnDataSchemaModel;

    case 'textarea':
      return {
        ...baseColumn,
        columnType: 'string',
        size: 250,
        editor: 'textarea',
      };

    case 'email':
      return {
        ...baseColumn,
        columnType: 'string',
        size: 200,
        cellProperties: ({ model }) => ({
          style: { fontFamily: 'monospace' }
        }),
      };

    case 'password':
      return {
        ...baseColumn,
        columnType: 'string',
        readonly: true,
        size: 120,
        cellProperties: ({ model }) => ({
          style: { 
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }
        }),
      };

    case 'reference':
    case 'multireference':
      return {
        ...baseColumn,
        columnType: 'string',
        readonly: true,
        size: 180,
        cellProperties: ({ model }) => ({
          style: { 
            color: 'hsl(var(--primary))',
            textDecoration: 'underline'
          }
        }),
      };

    case 'document':
    case 'multidocument':
      return {
        ...baseColumn,
        columnType: 'string',
        readonly: true,
        size: 180,
        cellProperties: ({ model }) => ({
          style: { 
            color: 'hsl(var(--primary))',
            fontStyle: 'italic'
          }
        }),
      };

    case 'image':
      return {
        ...baseColumn,
        columnType: 'string',
        size: 100,
        readonly: true,
        cellProperties: ({ model }) => ({
          style: { 
            color: 'hsl(var(--primary))',
            textAlign: 'center'
          }
        }),
      };

    case 'pdf':
      return {
        ...baseColumn,
        columnType: 'string',
        readonly: true,
        size: 150,
        cellProperties: ({ model }) => ({
          style: { 
            color: 'hsl(var(--destructive))',
            fontWeight: '500'
          }
        }),
      };

    case 'json':
      return {
        ...baseColumn,
        columnType: 'string',
        size: 200,
        cellProperties: ({ model }) => ({
          style: { 
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }
        }),
      };

    case 'codescript':
      return {
        ...baseColumn,
        columnType: 'string',
        size: 250,
        readonly: true,
        cellProperties: ({ model }) => ({
          style: { 
            fontFamily: 'monospace',
            fontSize: '0.9em',
            backgroundColor: 'hsl(var(--muted))'
          }
        }),
      };

    case 'text':
    default:
      return {
        ...baseColumn,
        columnType: 'string',
      };
  }
}

export function mapFieldsToColumns(fields: TableField[]): ColumnDataSchemaModel[] {
  return fields.map(mapFieldToColumn);
}
