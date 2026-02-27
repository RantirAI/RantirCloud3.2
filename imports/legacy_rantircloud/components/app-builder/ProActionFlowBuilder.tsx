import React, { useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Save, 
  X, 
  Settings, 
  ArrowRight,
  Globe,
  Database,
  GitBranch,
  Mail,
  Code,
  Zap
} from 'lucide-react';

interface ProActionFlowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (flowData: any) => void;
  initialData?: any;
}

const nodeTypes = {
  navigate: { icon: ArrowRight, color: '#3B82F6', name: 'Navigate' },
  apiCall: { icon: Globe, color: '#8B5CF6', name: 'API Call' },
  database: { icon: Database, color: '#F59E0B', name: 'Database' },
  condition: { icon: GitBranch, color: '#EF4444', name: 'Condition' },
  email: { icon: Mail, color: '#DC2626', name: 'Email' },
  custom: { icon: Code, color: '#6B7280', name: 'Custom Code' }
};

const ActionNode = ({ data, selected }: any) => {
  const IconComponent = data.icon || Code;
  
  return (
    <Card className={`
      bg-white border-2 rounded-xl shadow-sm transition-all duration-200 p-4 min-w-[180px]
      ${selected ? 'border-primary shadow-lg' : 'border-gray-200'}
    `}>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${data.color}15` }}
        >
          <IconComponent className="w-4 h-4" style={{ color: data.color }} />
        </div>
        <div>
          <h4 className="font-medium text-sm">{data.label}</h4>
          <p className="text-xs text-muted-foreground">{data.type}</p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};

const ProActionFlowBuilder: React.FC<ProActionFlowBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);
  const [connectionPopup, setConnectionPopup] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({ isOpen: false, position: { x: 0, y: 0 } });

  const nodeTypesMap = useMemo(() => ({
    actionNode: ActionNode
  }), []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      style: { stroke: '#64748b', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    const target = event.target as Element;
    if (target.classList.contains('react-flow__pane')) {
      const bounds = target.getBoundingClientRect();
      const x = (event as MouseEvent).clientX - bounds.left;
      const y = (event as MouseEvent).clientY - bounds.top;
      
      setConnectionPopup({
        isOpen: true,
        position: { x, y }
      });
    }
  }, []);

  const handleNodeSelect = (nodeType: string) => {
    const config = nodeTypes[nodeType as keyof typeof nodeTypes];
    if (!config) return;

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'actionNode',
      position: {
        x: connectionPopup.position.x - 90,
        y: connectionPopup.position.y - 40
      },
      data: {
        type: nodeType,
        label: config.name,
        icon: config.icon,
        color: config.color
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setConnectionPopup({ isOpen: false, position: { x: 0, y: 0 } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <div className="flex h-[90vh]">
          {/* Sidebar */}
          <div className="w-64 border-r bg-card p-4">
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-2">
              {Object.entries(nodeTypes).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNodeSelect(key)}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center mr-3"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <IconComponent className="w-3 h-3" style={{ color: config.color }} />
                    </div>
                    {config.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 z-10 bg-slate-100 dark:bg-slate-800 border-b p-3 flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Action Flow
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  Trigger: onClick
                </Badge>
                <Button variant="outline" size="sm" className="h-7">
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Test Flow
                </Button>
                <Button onClick={() => onSave?.({ nodes, edges })} size="sm" className="h-7">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="h-full pt-14">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypesMap}
                connectionMode={ConnectionMode.Loose}
                fitView
                style={{ backgroundColor: 'hsl(var(--background))' }}
              >
                <Background color="hsl(var(--muted-foreground) / 0.3)" gap={16} size={1} />
                <Controls className="!bg-background !border-border" />
              </ReactFlow>
            </div>
          </div>
        </div>

        {/* Connection Popup */}
        {connectionPopup.isOpen && (
          <div
            className="absolute z-50 bg-white border rounded-lg shadow-xl p-3"
            style={{
              left: connectionPopup.position.x,
              top: connectionPopup.position.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <h4 className="font-medium text-sm mb-2">Add Node</h4>
            {Object.entries(nodeTypes).slice(0, 3).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start mb-1"
                  onClick={() => handleNodeSelect(key)}
                >
                  <IconComponent className="w-3 h-3 mr-2" />
                  {config.name}
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProActionFlowBuilder;