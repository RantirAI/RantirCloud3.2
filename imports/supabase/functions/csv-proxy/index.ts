import { corsHeaders } from '../_shared/cors.ts';

// Simple CSV parser
function parseCSV(csvText: string, delimiter: string, hasHeader: boolean, skipEmpty: boolean): { data: Record<string, any>[]; columns: string[] } {
  const lines = csvText.split(/\r?\n/);
  const filteredLines = skipEmpty ? lines.filter(line => line.trim()) : lines;
  
  if (filteredLines.length === 0) {
    return { data: [], columns: [] };
  }

  const parseRow = (row: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  let columns: string[];
  let dataStartIndex: number;

  if (hasHeader) {
    columns = parseRow(filteredLines[0]);
    dataStartIndex = 1;
  } else {
    const firstRow = parseRow(filteredLines[0]);
    columns = firstRow.map((_, i) => `column_${i + 1}`);
    dataStartIndex = 0;
  }

  const data: Record<string, any>[] = [];
  for (let i = dataStartIndex; i < filteredLines.length; i++) {
    const values = parseRow(filteredLines[i]);
    const row: Record<string, any> = {};
    columns.forEach((col, j) => {
      row[col] = values[j] || '';
    });
    data.push(row);
  }

  return { data, columns };
}

// Generate CSV from JSON
function generateCSV(data: Record<string, any>[], delimiter: string, includeHeader: boolean, columnsFilter?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const columns = columnsFilter && columnsFilter.length > 0 
    ? columnsFilter 
    : Object.keys(data[0]);

  const escapeValue = (val: any): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [];
  
  if (includeHeader) {
    rows.push(columns.map(escapeValue).join(delimiter));
  }

  for (const item of data) {
    const row = columns.map(col => escapeValue(item[col]));
    rows.push(row.join(delimiter));
  }

  return rows.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action,
      csvData,
      jsonData,
      delimiter,
      hasHeader,
      skipEmptyLines,
      includeHeader,
      columns
    } = body;

    console.log('CSV proxy called with action:', action);

    let result: Record<string, any>[] = [];
    let csvOutput: string | undefined;
    let outputColumns: string[] = [];

    switch (action) {
      case 'csvToJson': {
        if (!csvData) {
          throw new Error('CSV data is required');
        }

        const parsed = parseCSV(
          csvData,
          delimiter || ',',
          hasHeader !== false,
          skipEmptyLines !== false
        );

        result = parsed.data;
        outputColumns = parsed.columns;
        break;
      }

      case 'jsonToCsv': {
        let data: Record<string, any>[];
        try {
          data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (e) {
          throw new Error('Invalid JSON data');
        }

        if (!Array.isArray(data)) {
          throw new Error('JSON data must be an array');
        }

        const columnsList = columns ? columns.split(',').map((c: string) => c.trim()) : undefined;
        
        csvOutput = generateCSV(
          data,
          delimiter || ',',
          includeHeader !== false,
          columnsList
        );
        
        result = data;
        outputColumns = columnsList || (data.length > 0 ? Object.keys(data[0]) : []);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('CSV operation successful');

    return new Response(JSON.stringify({
      success: true,
      data: result,
      csv: csvOutput,
      rowCount: result.length,
      columnCount: outputColumns.length,
      columns: outputColumns,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CSV proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
