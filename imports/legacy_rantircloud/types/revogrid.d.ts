import '@revolist/revogrid';

export interface ColumnDataSchemaModel {
  prop: string | number;
  name?: string;
  size?: number;
  readonly?: boolean;
  cellTemplate?: any;
  editor?: any;
  cellProperties?: any;
  filter?: boolean | string;
  sortable?: boolean;
  order?: 'asc' | 'desc';
  columnType?: string;
  autoSize?: boolean;
  pin?: 'colPinStart' | 'colPinEnd';
  source?: any[];
  labelKey?: string;
  valueKey?: string;
}

export interface DataType {
  [key: string]: any;
}

export interface RevoGridElement extends HTMLElement {
  columns: ColumnDataSchemaModel[];
  source: DataType[];
  readonly?: boolean;
  resize?: boolean;
  filter?: boolean;
  range?: boolean;
  rowHeaders?: boolean;
  theme?: string;
  rowClass?: string;
  autoSizeColumn?: boolean;
  columnTypes?: any;
  editors?: any;
  plugins?: any[];
}

export interface FormulaContext {
  cellAddress: string;
  rowIndex: number;
  columnIndex: number;
  value: any;
}

export interface AIContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  action: (context: any) => void | Promise<void>;
  divider?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'revo-grid': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.Ref<RevoGridElement>;
        class?: string;
      };
    }
  }
}
