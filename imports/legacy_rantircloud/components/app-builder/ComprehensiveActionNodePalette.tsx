import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  Bell, 
  Code, 
  GitBranch, 
  Clock, 
  Variable, 
  Square,
  X,
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComprehensiveActionNodePaletteProps {
  onAddNode: (actionType: string, position: { x: number; y: number }) => void;
}

const actionCategories = [
  {
    name: 'Navigation',
    icon: <MousePointer className="h-4 w-4" />,
    actions: [
      { type: 'navigateToPage', label: 'Go to Page', icon: <MousePointer className="h-4 w-4" style={{ color: '#3b82f6' }} /> },
      { type: 'navigate', label: 'Navigate URL', icon: <ExternalLink className="h-4 w-4" style={{ color: '#3b82f6' }} /> },
      { type: 'openUrl', label: 'Open URL', icon: <Globe className="h-4 w-4" style={{ color: '#2563eb' }} /> },
      { type: 'redirect', label: 'Redirect', icon: <RotateCcw className="h-4 w-4" style={{ color: '#7c2d12' }} /> },
    ]
  },
  {
    name: 'UI & Display',
    icon: <Eye className="h-4 w-4" />,
    actions: [
      { type: 'showAlert', label: 'Show Alert', icon: <Bell className="h-4 w-4" style={{ color: '#f59e0b' }} /> },
      { type: 'openModal', label: 'Open Modal', icon: <Square className="h-4 w-4" style={{ color: '#14b8a6' }} /> },
      { type: 'closeModal', label: 'Close Modal', icon: <X className="h-4 w-4" style={{ color: '#ef4444' }} /> },
      { type: 'showComponent', label: 'Show Component', icon: <Eye className="h-4 w-4" style={{ color: '#15803d' }} /> },
      { type: 'hideComponent', label: 'Hide Component', icon: <EyeOff className="h-4 w-4" style={{ color: '#991b1b' }} /> },
    ]
  },
  {
    name: 'Data & Variables',
    icon: <Variable className="h-4 w-4" />,
    actions: [
      { type: 'setVariable', label: 'Set Variable', icon: <Variable className="h-4 w-4" style={{ color: '#6366f1' }} /> },
      { type: 'calculate', label: 'Calculate', icon: <Calculator className="h-4 w-4" style={{ color: '#0369a1' }} /> },
      { type: 'filterData', label: 'Filter Data', icon: <Filter className="h-4 w-4" style={{ color: '#0d9488' }} /> },
      { type: 'copyToClipboard', label: 'Copy to Clipboard', icon: <Copy className="h-4 w-4" style={{ color: '#475569' }} /> },
    ]
  },
  {
    name: 'Database',
    icon: <Database className="h-4 w-4" />,
    actions: [
      { type: 'createRecord', label: 'Create Record', icon: <Plus className="h-4 w-4" style={{ color: '#16a34a' }} /> },
      { type: 'updateRecord', label: 'Update Record', icon: <Edit3 className="h-4 w-4" style={{ color: '#ea580c' }} /> },
      { type: 'deleteRecord', label: 'Delete Record', icon: <Trash2 className="h-4 w-4" style={{ color: '#dc2626' }} /> },
      { type: 'database', label: 'Database Query', icon: <Database className="h-4 w-4" style={{ color: '#059669' }} /> },
    ]
  },
  {
    name: 'Communication',
    icon: <Send className="h-4 w-4" />,
    actions: [
      { type: 'apiCall', label: 'API Call', icon: <Send className="h-4 w-4" style={{ color: '#8b5cf6' }} /> },
      { type: 'sendEmail', label: 'Send Email', icon: <Mail className="h-4 w-4" style={{ color: '#dc2626' }} /> },
      { type: 'webhook', label: 'Webhook', icon: <Webhook className="h-4 w-4" style={{ color: '#7c3aed' }} /> },
    ]
  },
  {
    name: 'Logic & Flow',
    icon: <GitBranch className="h-4 w-4" />,
    actions: [
      { type: 'condition', label: 'Condition', icon: <GitBranch className="h-4 w-4" style={{ color: '#f97316' }} /> },
      { type: 'delay', label: 'Delay', icon: <Clock className="h-4 w-4" style={{ color: '#ec4899' }} /> },
      { type: 'executeCode', label: 'Execute Code', icon: <Code className="h-4 w-4" style={{ color: '#64748b' }} /> },
      { type: 'triggerEvent', label: 'Trigger Event', icon: <Zap className="h-4 w-4" style={{ color: '#eab308' }} /> },
    ]
  },
  {
    name: 'Files & Forms',
    icon: <FileText className="h-4 w-4" />,
    actions: [
      { type: 'formSubmit', label: 'Form Submit', icon: <FileText className="h-4 w-4" style={{ color: '#0891b2' }} /> },
      { type: 'uploadFile', label: 'Upload File', icon: <Upload className="h-4 w-4" style={{ color: '#c2410c' }} /> },
      { type: 'downloadFile', label: 'Download File', icon: <Download className="h-4 w-4" style={{ color: '#1d4ed8' }} /> },
    ]
  },
  {
    name: 'Security & Auth',
    icon: <UserCheck className="h-4 w-4" />,
    actions: [
      { type: 'authenticate', label: 'Authenticate', icon: <UserCheck className="h-4 w-4" style={{ color: '#9333ea' }} /> },
      { type: 'authorize', label: 'Authorize', icon: <Lock className="h-4 w-4" style={{ color: '#be123c' }} /> },
    ]
  },
  {
    name: 'Scheduling',
    icon: <Calendar className="h-4 w-4" />,
    actions: [
      { type: 'scheduleAction', label: 'Schedule Action', icon: <Calendar className="h-4 w-4" style={{ color: '#7c3aed' }} /> },
    ]
  },
];

export function ComprehensiveActionNodePalette({ onAddNode }: ComprehensiveActionNodePaletteProps) {
  const handleNodeAdd = (actionType: string) => {
    // Position nodes in a reasonable spot
    const position = { x: 100, y: 100 };
    onAddNode(actionType, position);
  };

  return (
    <div className="h-full">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Action Nodes</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag or click to add</p>
      </div>
      
      <ScrollArea className="h-full pb-16">
        <div className="p-3 space-y-4">
          {actionCategories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {category.icon}
                <span>{category.name}</span>
              </div>
              
              <div className="grid gap-1">
                {category.actions.map((action) => (
                  <Button
                    key={action.type}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 text-xs px-2 hover:bg-accent text-foreground"
                    onClick={() => handleNodeAdd(action.type)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/action-node', action.type);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {action.icon}
                      <span className="truncate">{action.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}