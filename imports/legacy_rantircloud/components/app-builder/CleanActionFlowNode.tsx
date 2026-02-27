import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  Globe,
  Bug
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface CleanActionFlowNodeProps {
  data: {
    type: string;
    label: string;
    config: any;
    isStart?: boolean;
    onUpdateConfig?: (nodeId: string, config: any) => void;
    onDelete?: (nodeId: string) => void;
    onOpenSettings?: (nodeId: string) => void;
    onDebug?: (nodeId: string) => void;
    hasError?: boolean;
    executionResult?: any;
    isExecuting?: boolean;
  };
  id: string;
  selected: boolean;
}

export function CleanActionFlowNode({ data, id, selected }: CleanActionFlowNodeProps) {
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const { currentProject } = useAppBuilderStore();
  const pages = currentProject?.pages || [];

  const getNodeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      start: <Play className="h-5 w-5" style={{ color: '#10b981' }} />,
      navigate: <ExternalLink className="h-5 w-5" style={{ color: '#3b82f6' }} />,
      navigateToPage: <MousePointer className="h-5 w-5" style={{ color: '#3b82f6' }} />,
      showAlert: <Bell className="h-5 w-5" style={{ color: '#f59e0b' }} />,
      apiCall: <Send className="h-5 w-5" style={{ color: '#8b5cf6' }} />,
      executeCode: <Code className="h-5 w-5" style={{ color: '#64748b' }} />,
      condition: <GitBranch className="h-5 w-5" style={{ color: '#f97316' }} />,
      delay: <Clock className="h-5 w-5" style={{ color: '#ec4899' }} />,
      setVariable: <Variable className="h-5 w-5" style={{ color: '#6366f1' }} />,
      openModal: <Square className="h-5 w-5" style={{ color: '#14b8a6' }} />,
      closeModal: <X className="h-5 w-5" style={{ color: '#ef4444' }} />,
      database: <Database className="h-5 w-5" style={{ color: '#059669' }} />,
      sendEmail: <Mail className="h-5 w-5" style={{ color: '#dc2626' }} />,
      webhook: <Webhook className="h-5 w-5" style={{ color: '#7c3aed' }} />,
      createRecord: <Plus className="h-5 w-5" style={{ color: '#16a34a' }} />,
      updateRecord: <Edit3 className="h-5 w-5" style={{ color: '#ea580c' }} />,
      deleteRecord: <Trash2 className="h-5 w-5" style={{ color: '#dc2626' }} />,
      formSubmit: <FileText className="h-5 w-5" style={{ color: '#0891b2' }} />,
      redirect: <RotateCcw className="h-5 w-5" style={{ color: '#7c2d12' }} />,
      authenticate: <UserCheck className="h-5 w-5" style={{ color: '#9333ea' }} />,
      authorize: <Lock className="h-5 w-5" style={{ color: '#be123c' }} />,
      downloadFile: <Download className="h-5 w-5" style={{ color: '#1d4ed8' }} />,
      uploadFile: <Upload className="h-5 w-5" style={{ color: '#c2410c' }} />,
      filterData: <Filter className="h-5 w-5" style={{ color: '#0d9488' }} />,
      copyToClipboard: <Copy className="h-5 w-5" style={{ color: '#475569' }} />,
      showComponent: <Eye className="h-5 w-5" style={{ color: '#15803d' }} />,
      hideComponent: <EyeOff className="h-5 w-5" style={{ color: '#991b1b' }} />,
      scheduleAction: <Calendar className="h-5 w-5" style={{ color: '#7c3aed' }} />,
      calculate: <Calculator className="h-5 w-5" style={{ color: '#0369a1' }} />,
      triggerEvent: <Zap className="h-5 w-5" style={{ color: '#eab308' }} />,
      openUrl: <Globe className="h-5 w-5" style={{ color: '#2563eb' }} />,
    };
    return iconMap[type] || <Square className="h-5 w-5" style={{ color: '#6b7280' }} />;
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
      showComponent: 'Show Component',
      hideComponent: 'Hide Component',
      scheduleAction: 'Schedule',
      calculate: 'Calculate',
      triggerEvent: 'Trigger Event',
      openUrl: 'Open URL',
    };
    return titleMap[type] || type;
  };

  const handleConfigChange = (key: string, value: any) => {
    if (data.onUpdateConfig) {
      const newConfig = { ...data.config, [key]: value };
      data.onUpdateConfig(id, newConfig);
    }
  };

  const isConditionNode = data.type === 'condition';

  const renderQuickEdit = () => {
    switch (data.type) {
      case 'navigateToPage':
        return (
          <div className="mt-2">
            <Select
              value={data.config?.pageId || ''}
              onValueChange={(value) => handleConfigChange('pageId', value)}
            >
              <SelectTrigger className="h-7 text-xs nodrag">
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'showAlert':
        return (
          <div className="mt-2">
            <Input
              value={data.config?.message || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="Alert message"
              className="h-7 text-xs nodrag"
            />
          </div>
        );
      case 'delay':
        return (
          <div className="mt-2">
            <Input
              type="number"
              value={data.config?.duration || 1000}
              onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
              placeholder="Duration (ms)"
              className="h-7 text-xs nodrag"
            />
          </div>
        );
      case 'setVariable':
        return (
          <div className="mt-2 space-y-1">
            <Input
              value={data.config?.name || ''}
              onChange={(e) => handleConfigChange('name', e.target.value)}
              placeholder="Variable name"
              className="h-6 text-xs nodrag"
            />
            <Input
              value={data.config?.value || ''}
              onChange={(e) => handleConfigChange('value', e.target.value)}
              placeholder="Value"
              className="h-6 text-xs nodrag"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getExecutionStatusIndicator = () => {
    if (data.isExecuting) {
      return (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      );
    }
    
    if (data.hasError) {
      return (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full">
          <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      );
    }
    
    if (data.executionResult?.success) {
      return (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
      );
    }
    
    return null;
  };

  return (
    <div className={`
      bg-card border-2 rounded-xl shadow-lg min-w-[280px] max-w-[400px] relative transition-all
      ${selected ? 'border-primary border-dashed shadow-primary/20' : 'border-border'}
      ${data.hasError ? 'border-destructive bg-destructive/10' : ''}
      ${data.isExecuting ? 'border-primary bg-primary/5' : ''}
      ${data.isStart ? 'bg-primary/10 border-primary' : ''}
    `}>
      {/* Target handle - only show if not start node */}
      {!data.isStart && (
        <>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-muted-foreground/30"></div>
          <Handle
            type="target"
            position={Position.Top}
            className="!w-4 !h-4 !bg-primary !border-2 !border-card !rounded-full"
            style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }}
          />
        </>
      )}

      {/* Execution Status Indicator */}
      {getExecutionStatusIndicator()}

      {/* Node Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getNodeIcon(data.type)}
            </div>
            <span className="text-base font-semibold text-foreground truncate">
              {data.config?.customLabel || getNodeTitle(data.type)}
            </span>
          </div>
          
          {!data.isStart && (
            <div className="flex items-center gap-1 nodrag">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-16 text-xs nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDebug?.(id);
                }}
              >
                Test
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onOpenSettings?.(id);
                }}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>

        {/* Description/Preview */}
        {!data.isStart && (
          <div className="text-sm text-muted-foreground space-y-1">
            {data.type === 'navigateToPage' && data.config?.pageId && (
              <div>
                <span className="text-muted-foreground/70">Go to:</span> {pages.find(p => p.id === data.config.pageId)?.name || 'Page'}
              </div>
            )}
            {data.type === 'showAlert' && data.config?.message && (
              <div>
                <span className="text-muted-foreground/70">Message:</span> {data.config.message}
              </div>
            )}
            {data.type === 'delay' && (
              <div>
                <span className="text-muted-foreground/70">Wait:</span> {data.config?.duration || 1000}ms
              </div>
            )}
            {data.type === 'setVariable' && data.config?.name && (
              <div>
                <span className="text-muted-foreground/70">Variable:</span> {data.config.name}
              </div>
            )}
            {data.type === 'condition' && data.config?.condition && (
              <div>
                <span className="text-muted-foreground/70">If:</span> {data.config.condition}
              </div>
            )}
            {data.type === 'apiCall' && data.config?.url && (
              <div className="truncate">
                <span className="text-muted-foreground/70">URL:</span> {data.config.url}
              </div>
            )}
            {(!data.config || Object.keys(data.config).length === 0) && (
              <span className="text-muted-foreground/50 italic">Not configured</span>
            )}
          </div>
        )}
      </div>

      {/* Source handles */}
      {isConditionNode ? (
        // Condition nodes have two outputs: true and false
        <div className="relative">
          <div className="absolute -bottom-16 left-0 right-0 flex justify-between px-12">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-0.5 bg-muted-foreground/30"></div>
              <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                className="!w-4 !h-4 !bg-green-500 !border-2 !border-card !rounded-full relative !static !transform-none"
              />
              <span className="text-xs text-muted-foreground font-medium mt-1">true</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-0.5 bg-muted-foreground/30"></div>
              <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                className="!w-4 !h-4 !bg-red-500 !border-2 !border-card !rounded-full relative !static !transform-none"
              />
              <span className="text-xs text-muted-foreground font-medium mt-1">false</span>
            </div>
          </div>
        </div>
      ) : (
        // Regular nodes have one output
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-4 !h-4 !bg-primary !border-2 !border-card !rounded-full"
            style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)' }}
          />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-muted-foreground/30"></div>
        </>
      )}
    </div>
  );
}