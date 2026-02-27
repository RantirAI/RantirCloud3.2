import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Save, 
  Play, 
  X,
  Eye,
  Table,
  GitMerge,
  Zap,
  RefreshCw,
  Settings,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { TableNode } from './TableNode';
import { ConnectionEdge } from './ConnectionEdge';
import { MergeConfigurationDialog } from './MergeConfigurationDialog';
import { DataMergeEngine } from './DataMergeEngine';

interface TableData {
  id: string;
  name: string;
  schema: any;
  records?: any;
  source?: 'table_project' | 'database';
  databaseName?: string;
}

interface JoinConfig {
  type: 'inner' | 'left' | 'right' | 'full';
  leftField: string;
  rightField: string;
  alias?: string;
}

interface VisualVariableBuilderProps {
  appProjectId: string;
  onSave?: (variableConfig: any) => void;
  onClose?: () => void;
  initialData?: any;
}

const nodeTypes: NodeTypes = {
  table: TableNode as any,
};

const edgeTypes: EdgeTypes = {
  custom: ConnectionEdge as any,
};

export function VisualVariableBuilder({ 
  appProjectId, 
  onSave, 
  onClose, 
  initialData 
}: VisualVariableBuilderProps) {
  const { user } = useAuth();
  const { fitView } = useReactFlow();
  const mergeEngineRef = useRef(new DataMergeEngine());
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [availableTables, setAvailableTables] = useState<TableData[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [joinConfig, setJoinConfig] = useState<JoinConfig>({
    type: 'inner',
    leftField: '',
    rightField: '',
  });
  const [variableName, setVariableName] = useState('');
  const [variableDescription, setVariableDescription] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAvailableTables();
    }
    if (initialData) {
      loadInitialConfiguration(initialData);
    }
  }, [appProjectId, initialData, user?.id]);

  // Auto-save connections when they change (disabled to prevent dialog closing)
  // useEffect(() => {
  //   if (nodes.length > 0 || edges.length > 0) {
  //     const timeoutId = setTimeout(() => {
  //       saveCurrentConfiguration();
  //     }, 1000); // Debounce for 1 second

  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [nodes, edges]);

  const saveCurrentConfiguration = () => {
    if (onSave) {
      const config = {
        nodes,
        edges,
        variableName,
        variableDescription,
        lastUpdated: new Date().toISOString(),
      };
      onSave(config);
    }
  };

  // Update merge engine when nodes or edges change
  useEffect(() => {
    const engine = mergeEngineRef.current;
    engine.clear();

    // Add tables to engine
    nodes.forEach(node => {
      if (node.type === 'table') {
        engine.addTable(node.id, {
          id: node.data.originalId || node.id,
          name: node.data.name,
          schema: node.data.schema,
          records: node.data.records || [],
          source: node.data.source,
        });
      }
    });

    // Add connections to engine
    edges.forEach(edge => {
      if (edge.data?.sourceField && edge.data?.targetField) {
        engine.addConnection(edge.id, {
          id: edge.id,
          sourceTableId: edge.source,
          targetTableId: edge.target,
          sourceField: edge.data.sourceField,
          targetField: edge.data.targetField,
          joinConfig: edge.data.joinConfig || {
            type: 'inner',
            leftField: edge.data.sourceField,
            rightField: edge.data.targetField,
          },
        });
      }
    });
  }, [nodes, edges]);

  const loadAvailableTables = async () => {
    if (!user?.id) {
      console.warn('User not available, skipping table loading');
      return;
    }

    try {
      setIsLoading(true);
      const allTables: TableData[] = [];

      // Load table projects
      const { data: tableProjects, error: tableError } = await supabase
        .from('table_projects')
        .select('id, name, schema, records')
        .eq('user_id', user.id);

      if (tableError) throw tableError;
      
      // Add table projects to available tables
      if (tableProjects) {
        allTables.push(...tableProjects.map(table => ({
          ...table,
          schema: table.schema || { fields: [] },
          records: table.records || [],
          source: 'table_project' as const
        })));
      }

      // Load connected database tables
      const { data: databases, error: dbError } = await supabase
        .from('databases')
        .select('id, name')
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // For each database, get its tables
      if (databases) {
        for (const database of databases) {
          try {
            const { data: dbTables, error: dbTablesError } = await supabase
              .from('table_projects')
              .select('id, name, schema, records')
              .eq('database_id', database.id);
            
            if (!dbTablesError && dbTables) {
              allTables.push(...dbTables.map(table => ({
                ...table,
                schema: table.schema || { fields: [] },
                records: table.records || [],
                source: 'database' as const,
                databaseName: database.name
              })));
            }
          } catch (dbTableError) {
            console.warn(`Failed to load tables for database ${database.name}:`, dbTableError);
          }
        }
      }

      setAvailableTables(allTables);
      console.log('Loaded tables:', allTables);
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitialConfiguration = (data: any) => {
    console.log('Loading initial configuration:', data);
    if (data.nodes) {
      setNodes(data.nodes);
      console.log('Loaded nodes:', data.nodes);
    }
    if (data.edges) {
      setEdges(data.edges);
      console.log('Loaded edges:', data.edges);
    }
    if (data.variableName) setVariableName(data.variableName);
    if (data.variableDescription) setVariableDescription(data.variableDescription);
    // Also check for legacy naming
    if (data.name && !data.variableName) setVariableName(data.name);
    if (data.description && !data.variableDescription) setVariableDescription(data.description);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      // Parse field information from handle IDs
      const sourceField = params.sourceHandle?.split('-').slice(-2, -1)[0];
      const targetField = params.targetHandle?.split('-').slice(-2, -1)[0];
      
      if (sourceField && targetField && params.source && params.target) {
        // Check if this exact connection already exists
        const connectionExists = edges.some(edge => 
          edge.source === params.source && 
          edge.target === params.target &&
          edge.data?.sourceField === sourceField &&
          edge.data?.targetField === targetField
        );

        if (connectionExists) {
          toast.error('This connection already exists between these tables');
          return;
        }

        const newEdge = {
          ...params,
          id: `${params.source}-${sourceField}-${params.target}-${targetField}`,
          type: 'custom',
          data: { 
            sourceField, 
            targetField,
            joinConfig: {
              type: 'inner' as const,
              leftField: sourceField,
              rightField: targetField,
            },
            onConfigure: () => handleEdgeConfigureClick(`${params.source}-${sourceField}-${params.target}-${targetField}`),
            onDelete: () => handleEdgeDelete(`${params.source}-${sourceField}-${params.target}-${targetField}`),
          },
        };
        
        // Update connected fields in both nodes
        setNodes((nds) => 
          nds.map((node) => {
            if (node.id === params.source) {
              const connectedFields = [...(node.data.connectedFields || [])];
              if (!connectedFields.includes(sourceField)) {
                connectedFields.push(sourceField);
              }
              return { ...node, data: { ...node.data, connectedFields } };
            }
            if (node.id === params.target) {
              const connectedFields = [...(node.data.connectedFields || [])];
              if (!connectedFields.includes(targetField)) {
                connectedFields.push(targetField);
              }
              return { ...node, data: { ...node.data, connectedFields } };
            }
            return node;
          })
        );
        
        setEdges((eds) => addEdge(newEdge, eds));
        toast.success('Tables connected successfully');
      }
    },
    [setEdges, setNodes, edges]
  );

  const handleTableDragFromSidebar = (table: TableData, event: React.DragEvent) => {
    event.stopPropagation(); // Prevent event bubbling that might close the dialog
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'table',
      table: table,
    }));
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling that might close the dialog
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation(); // Prevent event bubbling that might close the dialog

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');
      
      if (!data) return;

      const { type, table } = JSON.parse(data);

      if (type === 'table') {
        const position = {
          x: event.clientX - reactFlowBounds.left - 150,
          y: event.clientY - reactFlowBounds.top - 100,
        };

        const newNode: Node = {
          id: `table-${table.id}-${Date.now()}`,
          type: 'table',
          position,
          data: {
            name: table.name,
            originalId: table.id,
            schema: {
              fields: table.schema?.fields || []
            },
            source: table.source,
            databaseName: table.databaseName,
            connectedFields: [],
          },
        };

        setNodes((nds) => [...nds, newNode]);
        toast.success(`Table "${table.name}" added to canvas`);
      }
    },
    [setNodes]
  );

  const handleEdgeConfigureClick = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      setSelectedEdge(edge);
      setJoinConfig({
        type: edge.data?.joinConfig?.type || 'inner',
        leftField: edge.data?.joinConfig?.leftField || edge.data?.sourceField || '',
        rightField: edge.data?.joinConfig?.rightField || edge.data?.targetField || '',
        alias: edge.data?.joinConfig?.alias || '',
      });
      setIsConfiguring(true);
    }
  };

  const handleEdgeDelete = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      // Update connected fields in both nodes
      setNodes((nds) => 
        nds.map((node) => {
          let updatedConnectedFields = [...(node.data.connectedFields || [])];
          
          if (edge.source === node.id && edge.data?.sourceField) {
            updatedConnectedFields = updatedConnectedFields.filter(
              field => field !== edge.data.sourceField
            );
          }
          if (edge.target === node.id && edge.data?.targetField) {
            updatedConnectedFields = updatedConnectedFields.filter(
              field => field !== edge.data.targetField
            );
          }
          
          return { ...node, data: { ...node.data, connectedFields: updatedConnectedFields } };
        })
      );
      
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      toast.success('Connection removed');
    }
  };

  const handleJoinConfigSave = () => {
    if (!selectedEdge) return;

    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge.id
          ? { 
              ...edge, 
              data: { 
                ...edge.data, 
                joinConfig,
                onConfigure: () => handleEdgeConfigureClick(edge.id),
                onDelete: () => handleEdgeDelete(edge.id),
              }
            }
          : edge
      )
    );
    setIsConfiguring(false);
    setSelectedEdge(null);
    toast.success('Join configuration saved');
  };

  const generatePreview = async () => {
    if (nodes.length === 0) {
      toast.error('Add at least one table to preview data');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the first table as starting point
      const startTableId = nodes[0].id;
      const mockData = await mergeEngineRef.current.executeMerge(startTableId);
      
      setPreviewData(mockData);
      setIsPreviewOpen(true);
      toast.success('Preview generated successfully');
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVariable = async () => {
    if (!variableName.trim()) {
      toast.error('Please enter a variable name');
      return;
    }

    // Validate merge configuration
    const validation = mergeEngineRef.current.validateMergeConfiguration();
    if (!validation.valid) {
      toast.error(`Configuration errors: ${validation.errors.join(', ')}`);
      return;
    }

    const configuration = {
      nodes: nodes,
      edges: edges,
      name: variableName,
      description: variableDescription,
      type: 'visual_merge',
    };

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('app_variables')
        .insert([{
          app_project_id: appProjectId,
          user_id: user?.id,
          name: variableName,
          description: variableDescription,
          variable_type: 'computed',
          computation_logic: JSON.stringify(configuration),
          is_active: true,
        }]);

      if (error) throw error;

      toast.success('Visual variable saved successfully');
      onSave?.(configuration);
      onClose?.();
    } catch (error) {
      console.error('Error saving variable:', error);
      toast.error('Failed to save variable');
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceNodeFields = () => {
    if (!selectedEdge) return [];
    const sourceNode = nodes.find(n => n.id === selectedEdge.source);
    return sourceNode?.data?.schema?.fields || [];
  };

  const getTargetNodeFields = () => {
    if (!selectedEdge) return [];
    const targetNode = nodes.find(n => n.id === selectedEdge.target);
    return targetNode?.data?.schema?.fields || [];
  };

  const getSourceTable = () => {
    if (!selectedEdge) return undefined;
    const sourceNode = nodes.find(n => n.id === selectedEdge.source);
    return sourceNode ? {
      name: sourceNode.data.name,
      fields: sourceNode.data.schema?.fields || []
    } : undefined;
  };

  const getTargetTable = () => {
    if (!selectedEdge) return undefined;
    const targetNode = nodes.find(n => n.id === selectedEdge.target);
    return targetNode ? {
      name: targetNode.data.name,
      fields: targetNode.data.schema?.fields || []
    } : undefined;
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setVariableName('');
    setVariableDescription('');
    toast.success('Canvas cleared');
  };

  const autoArrange = () => {
    // Simple auto-arrange logic
    const arrangedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 3) * 350,
        y: Math.floor(index / 3) * 250,
      },
    }));
    
    setNodes(arrangedNodes);
    setTimeout(() => fitView(), 100);
    toast.success('Tables auto-arranged');
  };

  const statistics = mergeEngineRef.current.getMergeStatistics();

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Visual Table Merger
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect tables to merge data visually
          </p>
        </div>

        {/* Action Buttons - Top */}
        <div className="p-4 border-b space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={autoArrange} 
              variant="outline" 
              size="sm"
              disabled={nodes.length === 0}
            >
              <Zap className="h-3 w-3 mr-1" />
              Arrange
            </Button>
            <Button 
              onClick={clearCanvas} 
              variant="outline" 
              size="sm"
              disabled={nodes.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          
          <Button 
            onClick={generatePreview} 
            variant="outline" 
            className="w-full"
            disabled={nodes.length === 0 || isLoading}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating...' : 'Preview Data'}
          </Button>
          
          <Button 
            onClick={handleSaveVariable} 
            className="w-full"
            disabled={!variableName.trim() || nodes.length === 0 || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Variable'}
          </Button>
          
          {onClose && (
            <Button onClick={onClose} variant="outline" className="w-full">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          )}
        </div>

        {/* Variable Configuration */}
        <div className="p-4 border-b">
          <div className="space-y-3">
            <div>
              <Label htmlFor="variable-name">Variable Name</Label>
              <Input
                id="variable-name"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                placeholder="my_merged_data"
              />
            </div>
            <div>
              <Label htmlFor="variable-desc">Description</Label>
              <Textarea
                id="variable-desc"
                value={variableDescription}
                onChange={(e) => setVariableDescription(e.target.value)}
                placeholder="Describe what this variable contains..."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" />
            <h4 className="font-medium text-sm">Merge Statistics</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 bg-muted/30 rounded">
              <div className="font-semibold text-primary">{statistics.totalTables}</div>
              <div className="text-muted-foreground">Tables</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <div className="font-semibold text-green-600">{statistics.connections}</div>
              <div className="text-muted-foreground">Connections</div>
            </div>
          </div>
        </div>

        {/* Available Tables */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Available Tables ({availableTables.length})
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadAvailableTables}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <ScrollArea className="px-4 pb-4 h-full">
            <div className="space-y-2">
              {availableTables.map((table, index) => (
                <Card 
                  key={`${table.source}-${table.id}-${index}`}
                  className="cursor-grab hover:shadow-md transition-all hover:border-primary/50"
                  draggable
                  onDragStart={(e) => handleTableDragFromSidebar(table, e)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Table className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{table.name}</span>
                      {table.source === 'database' && table.databaseName && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {table.databaseName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(table.schema?.fields) && table.schema.fields.slice(0, 3).map((field: any) => (
                        <Badge key={field.name} variant="outline" className="text-xs">
                          {field.name}
                        </Badge>
                      ))}
                      {Array.isArray(table.schema?.fields) && table.schema.fields.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{table.schema.fields.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="bg-background"
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls position="top-left" />
          <Background />
          <MiniMap 
            position="bottom-left"
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.data?.connectedFields && Array.isArray(node.data.connectedFields) && node.data.connectedFields.length > 0) return '#22c55e';
              return '#3b82f6';
            }}
          />
          
          <Panel position="top-right">
            <Card className="p-3 max-w-xs">
              <div className="text-sm space-y-1">
                <div className="font-medium">Canvas Info</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Tables: {nodes.length}</div>
                  <div>• Connections: {edges.length}</div>
                  <div>• Drag tables from sidebar</div>
                  <div>• Connect fields to create joins</div>
                </div>
              </div>
            </Card>
          </Panel>
        </ReactFlow>
      </div>

      {/* Join Configuration Dialog */}
      <MergeConfigurationDialog
        isOpen={isConfiguring}
        onClose={() => setIsConfiguring(false)}
        joinConfig={joinConfig}
        onConfigChange={setJoinConfig}
        onSave={handleJoinConfigSave}
        sourceTable={getSourceTable()}
        targetTable={getTargetTable()}
      />

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Merged Data Preview
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {previewData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(previewData[0]).map((column) => (
                        <th key={column} className="border p-2 text-left text-sm font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 50).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="border p-2 text-sm">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 50 && (
                  <div className="mt-2 text-sm text-muted-foreground text-center">
                    Showing first 50 of {previewData.length} rows
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No data to preview</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}