import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  ExternalLink, 
  Bell, 
  Code, 
  GitBranch, 
  Clock, 
  Variable, 
  Square,
  X
} from 'lucide-react';

interface ActionFlowNodeProps {
  data: {
    type: string;
    label: string;
    config: any;
    isStart?: boolean;
  };
  selected: boolean;
}

export function ActionFlowNode({ data, selected }: ActionFlowNodeProps) {
  const getNodeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      start: <Play className="h-4 w-4" />,
      navigate: <ExternalLink className="h-4 w-4" />,
      navigateToPage: <ExternalLink className="h-4 w-4" />,
      showAlert: <Bell className="h-4 w-4" />,
      apiCall: <Code className="h-4 w-4" />,
      executeCode: <Code className="h-4 w-4" />,
      condition: <GitBranch className="h-4 w-4" />,
      delay: <Clock className="h-4 w-4" />,
      setVariable: <Variable className="h-4 w-4" />,
      openModal: <Square className="h-4 w-4" />,
      closeModal: <X className="h-4 w-4" />,
    };
    return icons[type] || <Square className="h-4 w-4" />;
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      start: 'bg-gradient-to-br from-emerald-100 to-green-200 border-emerald-300 text-emerald-800 shadow-emerald-200/50',
      navigate: 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-300 text-blue-800 shadow-blue-200/50',
      navigateToPage: 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-300 text-blue-800 shadow-blue-200/50',
      showAlert: 'bg-gradient-to-br from-amber-100 to-yellow-200 border-amber-300 text-amber-800 shadow-amber-200/50',
      apiCall: 'bg-gradient-to-br from-purple-100 to-violet-200 border-purple-300 text-purple-800 shadow-purple-200/50',
      executeCode: 'bg-gradient-to-br from-stone-100 to-gray-200 border-stone-300 text-stone-800 shadow-stone-200/50',
      condition: 'bg-gradient-to-br from-orange-100 to-amber-200 border-orange-300 text-orange-800 shadow-orange-200/50',
      delay: 'bg-gradient-to-br from-pink-100 to-rose-200 border-pink-300 text-pink-800 shadow-pink-200/50',
      setVariable: 'bg-gradient-to-br from-indigo-100 to-blue-200 border-indigo-300 text-indigo-800 shadow-indigo-200/50',
      openModal: 'bg-gradient-to-br from-teal-100 to-cyan-200 border-teal-300 text-teal-800 shadow-teal-200/50',
      closeModal: 'bg-gradient-to-br from-red-100 to-rose-200 border-red-300 text-red-800 shadow-red-200/50',
    };
    return colors[type] || 'bg-gradient-to-br from-stone-100 to-gray-200 border-stone-300 text-stone-800 shadow-stone-200/50';
  };

  const getConfigSummary = (type: string, config: any) => {
    switch (type) {
      case 'navigate':
        return config.url ? `→ ${config.url}` : 'No URL set';
      case 'navigateToPage':
        return config.pageId ? `→ Page ${config.pageId}` : 'No page selected';
      case 'showAlert':
        return config.message ? `"${config.message.substring(0, 30)}${config.message.length > 30 ? '...' : ''}"` : 'No message';
      case 'apiCall':
        return config.url ? `${config.method || 'GET'} ${config.url}` : 'No URL set';
      case 'condition':
        return config.expression ? `${config.expression} ${config.operator} ${config.value}` : 'No condition set';
      case 'delay':
        return `Wait ${config.duration || 1000}ms`;
      case 'setVariable':
        return config.name ? `${config.name} = ${config.value}` : 'No variable set';
      default:
        return '';
    }
  };

  const isConditionNode = data.type === 'condition';

  return (
    <Card className={`min-w-[220px] transition-all duration-200 hover:scale-105 ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'} ${getNodeColor(data.type)}`}>
      {/* Target handle - only show if not start node */}
      {!data.isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-4 h-4 !bg-stone-600 !border-3 !border-white hover:!bg-stone-800 transition-colors !rounded-full shadow-lg"
        />
      )}

      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-card/70 backdrop-blur-sm">
            {getNodeIcon(data.type)}
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sm block">{data.label}</span>
            <Badge variant="secondary" className="text-xs mt-1">
              {data.type}
            </Badge>
          </div>
        </div>

        {/* Configuration summary */}
        {!data.isStart && (
          <div className="text-xs bg-card/50 rounded p-2 backdrop-blur-sm">
            {getConfigSummary(data.type, data.config) || 'Click to configure'}
          </div>
        )}
      </CardContent>

      {/* Source handles */}
      {isConditionNode ? (
        // Condition nodes have two outputs: true and false
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: '25%' }}
            className="w-4 h-4 !bg-emerald-600 !border-3 !border-white hover:!bg-emerald-800 transition-colors !rounded-full shadow-lg"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: '75%' }}
            className="w-4 h-4 !bg-rose-600 !border-3 !border-white hover:!bg-rose-800 transition-colors !rounded-full shadow-lg"
          />
          {/* Labels for condition outputs */}
          <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-6 text-xs font-semibold">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">True</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full">False</span>
          </div>
        </>
      ) : (
        // Regular nodes have one output
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-4 h-4 !bg-stone-600 !border-3 !border-white hover:!bg-stone-800 transition-colors !rounded-full shadow-lg"
        />
      )}
    </Card>
  );
}