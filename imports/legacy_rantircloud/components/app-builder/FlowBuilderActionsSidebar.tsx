import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
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
  Calculator,
  Zap,
  Globe,
  GripVertical
} from 'lucide-react';

const actionCategories = [
  {
    name: 'Navigation',
    actions: [
      { type: 'navigateToPage', label: 'Go to Page', icon: MousePointer, color: 'text-blue-500' },
      { type: 'navigate', label: 'Navigate URL', icon: ExternalLink, color: 'text-blue-500' },
      { type: 'openUrl', label: 'Open URL', icon: Globe, color: 'text-blue-600' },
      { type: 'redirect', label: 'Redirect', icon: RotateCcw, color: 'text-amber-800' },
    ]
  },
  {
    name: 'UI & Display',
    actions: [
      { type: 'showAlert', label: 'Show Alert', icon: Bell, color: 'text-amber-500' },
      { type: 'openModal', label: 'Open Modal', icon: Square, color: 'text-teal-500' },
      { type: 'closeModal', label: 'Close Modal', icon: X, color: 'text-red-500' },
      { type: 'showComponent', label: 'Show Component', icon: Eye, color: 'text-green-700' },
      { type: 'hideComponent', label: 'Hide Component', icon: EyeOff, color: 'text-red-800' },
    ]
  },
  {
    name: 'Data & Variables',
    actions: [
      { type: 'setVariable', label: 'Set Variable', icon: Variable, color: 'text-indigo-500' },
      { type: 'calculate', label: 'Calculate', icon: Calculator, color: 'text-sky-700' },
      { type: 'filterData', label: 'Filter Data', icon: Filter, color: 'text-teal-600' },
      { type: 'copyToClipboard', label: 'Copy to Clipboard', icon: Copy, color: 'text-slate-600' },
    ]
  },
  {
    name: 'Database',
    actions: [
      { type: 'createRecord', label: 'Create Record', icon: Plus, color: 'text-green-600' },
      { type: 'updateRecord', label: 'Update Record', icon: Edit3, color: 'text-orange-600' },
      { type: 'deleteRecord', label: 'Delete Record', icon: Trash2, color: 'text-red-600' },
      { type: 'database', label: 'Database Query', icon: Database, color: 'text-emerald-600' },
    ]
  },
  {
    name: 'Communication',
    actions: [
      { type: 'apiCall', label: 'API Call', icon: Send, color: 'text-violet-500' },
      { type: 'sendEmail', label: 'Send Email', icon: Mail, color: 'text-red-600' },
      { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-purple-600' },
    ]
  },
  {
    name: 'Logic & Flow',
    actions: [
      { type: 'condition', label: 'Condition', icon: GitBranch, color: 'text-orange-500' },
      { type: 'delay', label: 'Delay', icon: Clock, color: 'text-pink-500' },
      { type: 'executeCode', label: 'Execute Code', icon: Code, color: 'text-slate-500' },
      { type: 'triggerEvent', label: 'Trigger Event', icon: Zap, color: 'text-yellow-500' },
    ]
  },
  {
    name: 'Files & Forms',
    actions: [
      { type: 'formSubmit', label: 'Form Submit', icon: FileText, color: 'text-cyan-600' },
      { type: 'uploadFile', label: 'Upload File', icon: Upload, color: 'text-orange-700' },
      { type: 'downloadFile', label: 'Download File', icon: Download, color: 'text-blue-700' },
    ]
  },
  {
    name: 'Security',
    actions: [
      { type: 'authenticate', label: 'Authenticate', icon: UserCheck, color: 'text-purple-600' },
      { type: 'authorize', label: 'Authorize', icon: Lock, color: 'text-rose-700' },
    ]
  },
];

interface FlowBuilderActionsSidebarProps {
  className?: string;
}

export function FlowBuilderActionsSidebar({ className }: FlowBuilderActionsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = actionCategories.map(category => ({
    ...category,
    actions: category.actions.filter(action => 
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.actions.length > 0);

  const handleDragStart = (event: React.DragEvent, actionType: string) => {
    event.dataTransfer.setData('application/action-node', actionType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`h-full flex flex-col bg-card ${className}`}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
            Actions
          </Badge>
          <span className="text-xs text-muted-foreground">Drag to canvas</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Actions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {filteredCategories.map((category) => (
            <div key={category.name}>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-1.5">
                {category.name}
              </div>
              <div className="space-y-0.5">
                {category.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, action.type)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent transition-colors group border border-transparent hover:border-border/50"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                      <div className={`flex items-center justify-center w-5 h-5 rounded ${action.color.replace('text-', 'bg-')}/10`}>
                        <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                      </div>
                      <span className="text-xs truncate flex-1">{action.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No actions found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
