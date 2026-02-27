import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  ExternalLink, 
  Bell, 
  Code, 
  GitBranch, 
  Clock, 
  Variable, 
  Square,
  X,
  Settings,
  Database,
  Send,
  MousePointer,
  Edit3,
  Trash2,
  Plus,
  Mail,
  Webhook,
  FileText,
  RotateCcw,
  UserCheck,
  Lock,
  Download,
  Upload,
  Filter,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  Calculator,
  Zap,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalActionNodeProps {
  data: {
    type: string;
    label: string;
    config: any;
    isStart?: boolean;
    onUpdateConfig?: (nodeId: string, config: any) => void;
    onDelete?: (nodeId: string) => void;
    onOpenSettings?: (nodeId: string) => void;
    onAddNode?: (nodeId: string, handleId?: string) => void;
    hasError?: boolean;
    executionResult?: any;
    isExecuting?: boolean;
    isConnected?: boolean;
    isTrueConnected?: boolean;
    isFalseConnected?: boolean;
  };
  id: string;
  selected: boolean;
}

const getNodeIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    start: <Play className="h-4 w-4 text-emerald-500" />,
    navigate: <ExternalLink className="h-4 w-4 text-blue-500" />,
    navigateToPage: <MousePointer className="h-4 w-4 text-blue-500" />,
    showAlert: <Bell className="h-4 w-4 text-amber-500" />,
    apiCall: <Send className="h-4 w-4 text-violet-500" />,
    executeCode: <Code className="h-4 w-4 text-slate-500" />,
    condition: <GitBranch className="h-4 w-4 text-orange-500" />,
    delay: <Clock className="h-4 w-4 text-pink-500" />,
    setVariable: <Variable className="h-4 w-4 text-indigo-500" />,
    openModal: <Square className="h-4 w-4 text-teal-500" />,
    closeModal: <X className="h-4 w-4 text-red-500" />,
    database: <Database className="h-4 w-4 text-emerald-600" />,
    sendEmail: <Mail className="h-4 w-4 text-red-600" />,
    webhook: <Webhook className="h-4 w-4 text-purple-600" />,
    createRecord: <Plus className="h-4 w-4 text-green-600" />,
    updateRecord: <Edit3 className="h-4 w-4 text-orange-600" />,
    deleteRecord: <Trash2 className="h-4 w-4 text-red-600" />,
    formSubmit: <FileText className="h-4 w-4 text-cyan-600" />,
    redirect: <RotateCcw className="h-4 w-4 text-amber-800" />,
    authenticate: <UserCheck className="h-4 w-4 text-purple-600" />,
    authorize: <Lock className="h-4 w-4 text-rose-700" />,
    downloadFile: <Download className="h-4 w-4 text-blue-700" />,
    uploadFile: <Upload className="h-4 w-4 text-orange-700" />,
    filterData: <Filter className="h-4 w-4 text-teal-600" />,
    copyToClipboard: <Copy className="h-4 w-4 text-slate-600" />,
    showComponent: <Eye className="h-4 w-4 text-green-700" />,
    hideComponent: <EyeOff className="h-4 w-4 text-red-800" />,
    scheduleAction: <Calendar className="h-4 w-4 text-purple-600" />,
    calculate: <Calculator className="h-4 w-4 text-sky-700" />,
    triggerEvent: <Zap className="h-4 w-4 text-yellow-500" />,
    openUrl: <Globe className="h-4 w-4 text-blue-600" />,
  };
  return iconMap[type] || <Square className="h-4 w-4 text-muted-foreground" />;
};

const getNodeTitle = (type: string) => {
  const titleMap: Record<string, string> = {
    start: 'Start',
    navigate: 'Navigate',
    navigateToPage: 'Go to Page',
    showAlert: 'Show Alert',
    apiCall: 'API Call',
    executeCode: 'Code',
    condition: 'Condition',
    delay: 'Delay',
    setVariable: 'Set Variable',
    openModal: 'Open Modal',
    closeModal: 'Close Modal',
    database: 'Database',
    sendEmail: 'Send Email',
    webhook: 'Webhook',
    createRecord: 'Create Record',
    updateRecord: 'Update Record',
    deleteRecord: 'Delete Record',
    formSubmit: 'Form Submit',
    redirect: 'Redirect',
    authenticate: 'Authenticate',
    authorize: 'Authorize',
    downloadFile: 'Download',
    uploadFile: 'Upload',
    filterData: 'Filter Data',
    copyToClipboard: 'Copy',
    showComponent: 'Show',
    hideComponent: 'Hide',
    scheduleAction: 'Schedule',
    calculate: 'Calculate',
    triggerEvent: 'Event',
    openUrl: 'Open URL',
  };
  return titleMap[type] || type;
};

export function HorizontalActionNode({ data, id, selected }: HorizontalActionNodeProps) {
  const isConditionNode = data.type === 'condition';

  const getConfigPreview = () => {
    const { type, config } = data;
    if (!config) return null;
    
    switch (type) {
      case 'navigateToPage':
        return config.pageId ? `→ Page` : null;
      case 'showAlert':
        return config.message ? config.message.slice(0, 20) + (config.message.length > 20 ? '...' : '') : null;
      case 'delay':
        return config.duration ? `${config.duration}ms` : null;
      case 'setVariable':
        return config.name ? `${config.name}` : null;
      case 'condition':
        return config.leftValue ? `If ${config.leftValue}` : null;
      case 'apiCall':
        return config.method ? config.method : null;
      default:
        return null;
    }
  };

  const configPreview = getConfigPreview();

  return (
    <div className="relative">
      {/* Input Handle - Left side */}
      {!data.isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background !rounded-full !-left-1.5"
        />
      )}

      {/* Node Card */}
      <div
        className={cn(
          "bg-card border-2 rounded-lg shadow-sm min-w-[140px] max-w-[180px] transition-all cursor-pointer",
          selected ? "border-primary shadow-md" : "border-border",
          data.hasError && "border-destructive bg-destructive/5",
          data.isExecuting && "border-primary/50 bg-primary/5",
          data.isStart && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
        )}
        onClick={(e) => {
          e.stopPropagation();
          data.onOpenSettings?.(id);
        }}
      >
        {/* Execution Status */}
        {data.isExecuting && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
        )}
        {data.hasError && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
        )}
        {data.executionResult?.success && !data.isExecuting && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
        )}

        {/* Content */}
        <div className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">{getNodeIcon(data.type)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-foreground truncate">
                {data.config?.customLabel || getNodeTitle(data.type)}
              </div>
              {configPreview && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {configPreview}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons on hover - only for non-start nodes */}
        {!data.isStart && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1 bg-card border rounded-md shadow-sm p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSettings?.(id);
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Output handles and add buttons */}
      {isConditionNode ? (
        // Condition node: Two outputs (TRUE goes right, FALSE goes down-right)
        <div className="absolute -right-1.5 top-0 bottom-0 flex flex-col justify-center gap-6">
          {/* TRUE path - right */}
          <div className="relative flex items-center">
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background !rounded-full !relative !transform-none"
            />
            <span className="absolute -top-4 left-0 text-[9px] font-medium text-emerald-600">TRUE</span>
            {!data.isTrueConnected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddNode?.(id, 'true');
                }}
                className="ml-2 w-5 h-5 rounded-full bg-card border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* FALSE path - down-right */}
          <div className="relative flex items-center">
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !rounded-full !relative !transform-none"
            />
            <span className="absolute -bottom-4 left-0 text-[9px] font-medium text-red-600">FALSE</span>
            {!data.isFalseConnected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddNode?.(id, 'false');
                }}
                className="ml-2 w-5 h-5 rounded-full bg-card border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      ) : (
        // Regular node: One output to the right
        <>
          <Handle
            type="source"
            position={Position.Right}
            className="!w-3 !h-3 !bg-primary !border-2 !border-background !rounded-full !-right-1.5"
          />
          {/* Add button */}
          {!data.isConnected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onAddNode?.(id);
              }}
              className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
