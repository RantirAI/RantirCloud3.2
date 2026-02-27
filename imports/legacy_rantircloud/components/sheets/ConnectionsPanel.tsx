import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { dataConnectionService, DataConnection } from '@/services/dataConnectionService';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataImport?: (data: any[]) => void;
}

export function ConnectionsPanel({ open, onOpenChange, onDataImport }: ConnectionsPanelProps) {
  const { id: tableProjectId } = useParams<{ id: string }>();
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    tableName: '',
    limit: 100,
  });
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load connections and table schema
  useEffect(() => {
    if (open && tableProjectId) {
      loadConnections();
      loadTableSchema();
    }
  }, [open, tableProjectId]);

  const loadTableSchema = async () => {
    if (!tableProjectId) return;
    
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('schema')
        .eq('id', tableProjectId)
        .single();

      if (error) throw error;
      
      if (data?.schema) {
        const schema = data.schema as any;
        if (schema.fields && Array.isArray(schema.fields)) {
          setTableSchema(schema.fields);
        }
      }
    } catch (error) {
      console.error('Error loading table schema:', error);
    }
  };

  const loadConnections = async () => {
    if (!tableProjectId) return;
    
    try {
      setLoading(true);
      const data = await dataConnectionService.listConnections(tableProjectId);
      setConnections(data);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const addConnection = async () => {
    if (!newConnection.name || !newConnection.tableName || !tableProjectId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await dataConnectionService.createConnection(
        tableProjectId,
        newConnection.name,
        newConnection.tableName,
        { 
          tableName: newConnection.tableName,
          limit: newConnection.limit 
        }
      );
      
      setNewConnection({ name: '', tableName: '', limit: 100 });
      toast.success('Connection added successfully');
      await loadConnections();
    } catch (error) {
      console.error('Error adding connection:', error);
      toast.error('Failed to add connection');
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      await dataConnectionService.deleteConnection(id);
      toast.success('Connection removed');
      await loadConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to delete connection');
    }
  };

  const testConnection = async (connection: DataConnection) => {
    try {
      setLoading(true);
      toast.info('Testing connection...');
      
      const success = await dataConnectionService.testConnection(connection.id, connection);
      
      if (success) {
        toast.success('Connection test successful');
        await loadConnections();
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const importData = async (connection: DataConnection) => {
    try {
      setLoading(true);
      toast.info('Importing data...');
      
      const result = await dataConnectionService.queryConnection(connection.id, connection);
      
      if (result.data && result.data.length > 0) {
        if (onDataImport) {
          onDataImport(result.data);
        }
        toast.success(`Imported ${result.rowCount} records`);
        onOpenChange(false);
      } else {
        toast.info('No data found');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON; we'll normalize date columns based on schema
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        if (jsonData.length === 0) {
          toast.error('No data found in file');
          return;
        }

        // Map schema by field name to detect date fields
        const fieldMap = new Map<string, any>();
        tableSchema.forEach((field: any) => {
          if (field?.name) fieldMap.set(field.name, field);
        });

        const formattedData = (jsonData as any[]).map((row) => {
          const formattedRow: any = {};

          Object.keys(row).forEach((key) => {
            const value = row[key];
            const field = fieldMap.get(key);

            if (field?.type === 'date') {
              let out = value;

              if (value instanceof Date) {
                // Format Date object as YYYY-MM-DD using local parts
                const y = value.getFullYear();
                const m = String(value.getMonth() + 1).padStart(2, '0');
                const d = String(value.getDate()).padStart(2, '0');
                out = `${y}-${m}-${d}`;
              } else if (typeof value === 'string') {
                // Already in YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                  out = value;
                }
                // Handle DD/MM/YYYY or DD/MM/YY (e.g. 10/02/2025)
                else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
                  const [dStr, mStr, yStr] = value.split('/');
                  const d = dStr.padStart(2, '0');
                  const m = mStr.padStart(2, '0');
                  const y = yStr.length === 2 ? `20${yStr}` : yStr;
                  out = `${y}-${m}-${d}`;
                }
              }

              formattedRow[key] = out;
            } else {
              formattedRow[key] = value;
            }
          });

          return formattedRow;
        });
        
        setUploadedData(formattedData);
        setUploadedFileName(file.name);
        toast.success(`Loaded ${formattedData.length} rows from ${file.name}`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please ensure it\'s a valid Excel or CSV file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const importUploadedData = () => {
    if (!uploadedData || uploadedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    if (onDataImport) {
      onDataImport(uploadedData);
    }
    
    toast.success(`Imported ${uploadedData.length} records from ${uploadedFileName}`);
    setUploadedData(null);
    setUploadedFileName('');
    onOpenChange(false);
  };

  const clearUploadedData = () => {
    setUploadedData(null);
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    if (!tableSchema || tableSchema.length === 0) {
      toast.error('No table schema available');
      return;
    }

    // Create header row with column names
    const headers = tableSchema.map(col => col.name || col.key);
    
    // Create a worksheet with just the headers
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate and download the file
    XLSX.writeFile(wb, 'table_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Import Data</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="upload" className="mt-6 h-[calc(100vh-120px)]">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex flex-col gap-4">
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <h3 className="font-medium text-sm">Upload Excel or CSV</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={!tableSchema || tableSchema.length === 0}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download Template
                </Button>
              </div>
              
              <div>
                <Label className="text-xs mb-2">Select File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="h-9 text-sm cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>

              {uploadedData && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{uploadedFileName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadedData.length} rows • {Object.keys(uploadedData[0] || {}).length} columns
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearUploadedData}
                      className="h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={importUploadedData}
                      className="flex-1"
                      size="sm"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Import {uploadedData.length} Rows
                    </Button>
                  </div>

                  {uploadedData.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-2">Preview (first 3 rows):</p>
                      <ScrollArea className="h-40 rounded border bg-background">
                        <div className="p-2">
                          <div className="text-xs font-mono space-y-1">
                            {uploadedData.slice(0, 3).map((row, idx) => (
                              <div key={idx} className="p-2 bg-muted rounded">
                                <pre className="whitespace-pre-wrap break-all">
                                  {JSON.stringify(row, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="h-[calc(100%-48px)] flex flex-col gap-4">
            <div className="space-y-3 border rounded-lg p-4 shrink-0">
              <h3 className="font-medium text-sm">Add New Connection</h3>
              
              <div>
                <Label className="text-xs">Connection Name</Label>
                <Input
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                  placeholder="My Database Connection"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Table Name</Label>
                <Input
                  value={newConnection.tableName}
                  onChange={(e) => setNewConnection({ ...newConnection, tableName: e.target.value })}
                  placeholder="table_projects"
                  className="h-8 text-sm font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Row Limit</Label>
                <Input
                  type="number"
                  value={newConnection.limit}
                  onChange={(e) => setNewConnection({ ...newConnection, limit: parseInt(e.target.value) || 100 })}
                  placeholder="100"
                  className="h-8 text-sm"
                  min={1}
                  max={1000}
                />
              </div>

              <Button onClick={addConnection} className="w-full" size="sm" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-4">
              {loading && connections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading connections...
                </div>
              )}

              {!loading && connections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No connections yet. Add your first connection above.
                </div>
              )}

              {connections.map((connection) => (
                <div key={connection.id} className="bg-card border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4" />
                        <span className="font-medium text-sm">{connection.name}</span>
                        <Badge variant={
                          connection.status === 'connected' ? 'default' :
                          connection.status === 'error' ? 'destructive' : 'secondary'
                        } className="text-xs">
                          {connection.status === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {connection.status === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                          {connection.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Table:</span>
                          <code className="bg-muted px-1 py-0.5 rounded">{connection.config.tableName}</code>
                        </div>
                        {connection.config.limit && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Limit:</span>
                            <span>{connection.config.limit} rows</span>
                          </div>
                        )}
                        {connection.last_synced_at && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Last synced:</span>
                            <span>{new Date(connection.last_synced_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteConnection(connection.id)}
                      className="h-6 w-6"
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => testConnection(connection)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={loading}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Test
                    </Button>
                    <Button
                      onClick={() => importData(connection)}
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={loading || connection.status !== 'connected'}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
