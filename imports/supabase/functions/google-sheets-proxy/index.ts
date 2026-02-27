import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';

interface GoogleSheetsRequest {
  accessToken: string;
  operation: string;
  spreadsheetId?: string;
  worksheetName?: string;
  worksheetId?: string;
  range?: string;
  rowIndex?: number;
  values?: any;
  multipleRows?: any;
  searchColumn?: string;
  searchValue?: string;
  spreadsheetTitle?: string;
  worksheetTitle?: string;
  customEndpoint?: string;
  customMethod?: string;
  customBody?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      accessToken,
      operation,
      spreadsheetId,
      worksheetName = 'Sheet1',
      worksheetId,
      range,
      rowIndex,
      values,
      multipleRows,
      searchColumn,
      searchValue,
      spreadsheetTitle,
      worksheetTitle,
      customEndpoint,
      customMethod = 'GET',
      customBody
    }: GoogleSheetsRequest = await req.json();

    if (!accessToken) {
      throw new Error('Google Sheets access token is required');
    }

    console.log(`Google Sheets Proxy: Processing operation: ${operation}`);

    // Helper function to get worksheet identifier for range
    const getWorksheetIdentifier = async () => {
      if (worksheetId && spreadsheetId) {
        // If worksheet ID is provided, get the sheet name for range construction
        const metadataResponse = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}`,
          { 
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        const metadata = await metadataResponse.json();
        if (!metadataResponse.ok) throw new Error(metadata.error?.message || 'Failed to get spreadsheet metadata');
        
        const worksheet = metadata.sheets?.find((sheet: any) => sheet.properties.sheetId.toString() === worksheetId.toString());
        if (!worksheet) throw new Error(`Worksheet with ID "${worksheetId}" not found`);
        
        return {
          name: worksheet.properties.title,
          id: worksheet.properties.sheetId
        };
      } else {
        // Use worksheet name, get ID if needed
        return {
          name: worksheetName,
          id: null // Will be fetched when needed
        };
      }
    };

    let response;
    let result = {
      data: null,
      values: [],
      spreadsheetId: spreadsheetId,
      worksheetId: worksheetId || null,
      rowCount: 0,
      success: false,
      error: null
    };

    switch (operation) {
      case 'exportSheet': {
        const worksheet = await getWorksheetIdentifier();
        const exportRange = range || `${worksheet.name}!A:Z`;
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(exportRange)}`,
          { 
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to export sheet');
        
        result.data = data;
        result.values = data.values || [];
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'getRow': {
        if (!rowIndex) throw new Error('Row index is required');
        const worksheet = await getWorksheetIdentifier();
        const rowRange = `${worksheet.name}!${rowIndex}:${rowIndex}`;
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}`,
          { 
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to get row');
        
        result.data = data;
        result.values = data.values?.[0] || [];
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'insertRow': {
        const parsedValues = typeof values === 'string' ? JSON.parse(values) : values || [];
        const worksheet = await getWorksheetIdentifier();
        const insertRange = range || `${worksheet.name}!A:A`;
        
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(insertRange)}:append?valueInputOption=RAW`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: [parsedValues]
            })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to insert row');
        
        result.data = data;
        result.rowCount = 1;
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'insertMultipleRows': {
        const parsedRows = typeof multipleRows === 'string' ? JSON.parse(multipleRows) : multipleRows || [];
        const worksheet = await getWorksheetIdentifier();
        const insertRange = range || `${worksheet.name}!A:A`;
        
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(insertRange)}:append?valueInputOption=RAW`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: parsedRows
            })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to insert multiple rows');
        
        result.data = data;
        result.rowCount = parsedRows.length;
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'updateRow': {
        if (!rowIndex) throw new Error('Row index is required');
        const parsedValues = typeof values === 'string' ? JSON.parse(values) : values || [];
        const worksheet = await getWorksheetIdentifier();
        const updateRange = range || `${worksheet.name}!${rowIndex}:${rowIndex}`;
        
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: [parsedValues]
            })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to update row');
        
        result.data = data;
        result.rowCount = 1;
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'createSpreadsheet': {
        if (!spreadsheetTitle) throw new Error('Spreadsheet title is required');
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              properties: {
                title: spreadsheetTitle
              }
            })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to create spreadsheet');
        
        result.data = data;
        result.spreadsheetId = data.spreadsheetId;
        result.success = true;
        break;
      }

      case 'customApiCall': {
        if (!customEndpoint) throw new Error('Custom endpoint is required');
        const url = customEndpoint.startsWith('http') 
          ? customEndpoint 
          : `${GOOGLE_SHEETS_API_BASE}${customEndpoint}`;
        
        const requestOptions: RequestInit = {
          method: customMethod,
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        };

        if (customBody && ['POST', 'PUT', 'PATCH'].includes(customMethod)) {
          requestOptions.body = typeof customBody === 'string' ? customBody : JSON.stringify(customBody);
        }

        response = await fetch(url, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Custom API call failed');
        
        result.data = data;
        result.success = true;
        break;
      }

      case 'deleteRow': {
        if (!rowIndex) throw new Error('Row index is required for deleteRow');
        if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
        
        const worksheet = await getWorksheetIdentifier();
        
        // Get worksheet ID if not already available
        let sheetId = worksheet.id;
        if (!sheetId) {
          const metadataResponse = await fetch(
            `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}`,
            { 
              method: 'GET',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );
          const metadata = await metadataResponse.json();
          if (!metadataResponse.ok) throw new Error(metadata.error?.message || 'Failed to get spreadsheet metadata');
          
          const sheet = metadata.sheets?.find((s: any) => s.properties.title === worksheet.name);
          if (!sheet) throw new Error(`Worksheet "${worksheet.name}" not found`);
          sheetId = sheet.properties.sheetId;
        }

        // Use batchUpdate to delete the row
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1, // 0-indexed
                    endIndex: rowIndex // exclusive
                  }
                }
              }]
            })
          }
        );
        const deleteData = await response.json();
        if (!response.ok) throw new Error(deleteData.error?.message || 'Failed to delete row');
        
        result.data = deleteData;
        result.rowCount = 1;
        result.worksheetId = sheetId;
        result.success = true;
        break;
      }

      case 'findRows': {
        if (!searchColumn || !searchValue) throw new Error('Search column and value are required for findRows');
        
        const worksheet = await getWorksheetIdentifier();
        const searchRange = range || `${worksheet.name}!A:Z`;
        
        // Get all data first
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(searchRange)}`,
          { 
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        const sheetData = await response.json();
        if (!response.ok) throw new Error(sheetData.error?.message || 'Failed to get sheet data');
        
        const allRows = sheetData.values || [];
        const headers = allRows[0] || [];
        const columnIndex = headers.findIndex((h: string) => 
          h.toLowerCase() === searchColumn.toLowerCase()
        );
        
        if (columnIndex === -1) {
          throw new Error(`Column "${searchColumn}" not found in sheet headers`);
        }
        
        // Find matching rows
        const matchingRows: any[] = [];
        for (let i = 1; i < allRows.length; i++) {
          if (allRows[i][columnIndex]?.toString() === searchValue?.toString()) {
            matchingRows.push({
              rowIndex: i + 1, // 1-indexed
              values: allRows[i],
              rowObject: headers.reduce((obj: any, header: string, idx: number) => {
                obj[header] = allRows[i][idx] || '';
                return obj;
              }, {})
            });
          }
        }
        
        result.data = { matchingRows, headers };
        result.values = matchingRows;
        result.rowCount = matchingRows.length;
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      case 'createWorksheet': {
        if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
        if (!worksheetTitle) throw new Error('Worksheet title is required for createWorksheet');
        
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [{
                addSheet: {
                  properties: {
                    title: worksheetTitle
                  }
                }
              }]
            })
          }
        );
        const createData = await response.json();
        if (!response.ok) throw new Error(createData.error?.message || 'Failed to create worksheet');
        
        const newSheetId = createData.replies?.[0]?.addSheet?.properties?.sheetId;
        result.data = createData;
        result.worksheetId = newSheetId;
        result.success = true;
        break;
      }

      case 'clearSheet': {
        if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
        
        const worksheet = await getWorksheetIdentifier();
        const clearRange = range || `${worksheet.name}!A:Z`;
        
        response = await fetch(
          `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        const clearData = await response.json();
        if (!response.ok) throw new Error(clearData.error?.message || 'Failed to clear sheet');
        
        result.data = clearData;
        result.worksheetId = worksheet.id;
        result.success = true;
        break;
      }

      default:
        throw new Error(`Unsupported Google Sheets operation: ${operation}`);
    }

    console.log(`Google Sheets Proxy: Successfully processed ${operation}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google Sheets Proxy Error:', error);
    return new Response(JSON.stringify({
      data: null,
      values: [],
      spreadsheetId: null,
      worksheetId: null,
      rowCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});