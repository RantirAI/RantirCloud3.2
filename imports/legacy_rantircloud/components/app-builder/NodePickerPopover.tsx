import React, { useState } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Globe,
  Search
} from 'lucide-react';

interface NodePickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (actionType: string) => void;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

const actionCategories = [
  {
    name: 'Navigation',
    actions: [
      { type: 'navigateToPage', label: 'Go to Page', icon: <MousePointer className="h-3.5 w-3.5 text-blue-500" /> },
      { type: 'navigate', label: 'Navigate URL', icon: <ExternalLink className="h-3.5 w-3.5 text-blue-500" /> },
      { type: 'openUrl', label: 'Open URL', icon: <Globe className="h-3.5 w-3.5 text-blue-600" /> },
      { type: 'redirect', label: 'Redirect', icon: <RotateCcw className="h-3.5 w-3.5 text-amber-800" /> },
    ]
  },
  {
    name: 'UI & Display',
    actions: [
      { type: 'showAlert', label: 'Show Alert', icon: <Bell className="h-3.5 w-3.5 text-amber-500" /> },
      { type: 'openModal', label: 'Open Modal', icon: <Square className="h-3.5 w-3.5 text-teal-500" /> },
      { type: 'closeModal', label: 'Close Modal', icon: <X className="h-3.5 w-3.5 text-red-500" /> },
      { type: 'showComponent', label: 'Show Component', icon: <Eye className="h-3.5 w-3.5 text-green-700" /> },
      { type: 'hideComponent', label: 'Hide Component', icon: <EyeOff className="h-3.5 w-3.5 text-red-800" /> },
    ]
  },
  {
    name: 'Data & Variables',
    actions: [
      { type: 'setVariable', label: 'Set Variable', icon: <Variable className="h-3.5 w-3.5 text-indigo-500" /> },
      { type: 'calculate', label: 'Calculate', icon: <Calculator className="h-3.5 w-3.5 text-sky-700" /> },
      { type: 'filterData', label: 'Filter Data', icon: <Filter className="h-3.5 w-3.5 text-teal-600" /> },
      { type: 'copyToClipboard', label: 'Copy to Clipboard', icon: <Copy className="h-3.5 w-3.5 text-slate-600" /> },
    ]
  },
  {
    name: 'Database',
    actions: [
      { type: 'createRecord', label: 'Create Record', icon: <Plus className="h-3.5 w-3.5 text-green-600" /> },
      { type: 'updateRecord', label: 'Update Record', icon: <Edit3 className="h-3.5 w-3.5 text-orange-600" /> },
      { type: 'deleteRecord', label: 'Delete Record', icon: <Trash2 className="h-3.5 w-3.5 text-red-600" /> },
      { type: 'database', label: 'Database Query', icon: <Database className="h-3.5 w-3.5 text-emerald-600" /> },
    ]
  },
  {
    name: 'Communication',
    actions: [
      { type: 'apiCall', label: 'API Call', icon: <Send className="h-3.5 w-3.5 text-violet-500" /> },
      { type: 'sendEmail', label: 'Send Email', icon: <Mail className="h-3.5 w-3.5 text-red-600" /> },
      { type: 'webhook', label: 'Webhook', icon: <Webhook className="h-3.5 w-3.5 text-purple-600" /> },
    ]
  },
  {
    name: 'Logic & Flow',
    actions: [
      { type: 'condition', label: 'Condition', icon: <GitBranch className="h-3.5 w-3.5 text-orange-500" /> },
      { type: 'delay', label: 'Delay', icon: <Clock className="h-3.5 w-3.5 text-pink-500" /> },
      { type: 'executeCode', label: 'Execute Code', icon: <Code className="h-3.5 w-3.5 text-slate-500" /> },
      { type: 'triggerEvent', label: 'Trigger Event', icon: <Zap className="h-3.5 w-3.5 text-yellow-500" /> },
    ]
  },
  {
    name: 'Files & Forms',
    actions: [
      { type: 'formSubmit', label: 'Form Submit', icon: <FileText className="h-3.5 w-3.5 text-cyan-600" /> },
      { type: 'uploadFile', label: 'Upload File', icon: <Upload className="h-3.5 w-3.5 text-orange-700" /> },
      { type: 'downloadFile', label: 'Download File', icon: <Download className="h-3.5 w-3.5 text-blue-700" /> },
    ]
  },
  {
    name: 'Security',
    actions: [
      { type: 'authenticate', label: 'Authenticate', icon: <UserCheck className="h-3.5 w-3.5 text-purple-600" /> },
      { type: 'authorize', label: 'Authorize', icon: <Lock className="h-3.5 w-3.5 text-rose-700" /> },
    ]
  },
];

// Draggable action item for sidebar
interface DraggableActionItemProps {
  action: { type: string; label: string; icon: React.ReactNode };
  onSelect?: (type: string) => void;
}

export function DraggableActionItem({ action, onSelect }: DraggableActionItemProps) {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/action-node', action.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect?.(action.type)}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent transition-colors text-xs"
    >
      {action.icon}
      <span className="truncate">{action.label}</span>
    </div>
  );
}

// Export action categories for use in sidebar
export { actionCategories };

export function NodePickerPopover({ 
  open, 
  onOpenChange, 
  onSelect, 
  children,
  side = 'right',
  align = 'start'
}: NodePickerPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = actionCategories.map(category => ({
    ...category,
    actions: category.actions.filter(action => 
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.actions.length > 0);

  const handleSelect = (actionType: string) => {
    onSelect(actionType);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align} 
        className="w-64 p-0"
        sideOffset={8}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-3">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-1">
                  {category.name}
                </div>
                <div className="space-y-0.5">
                  {category.actions.map((action) => (
                    <Button
                      key={action.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 text-xs px-2 hover:bg-accent"
                      onClick={() => handleSelect(action.type)}
                    >
                      <div className="flex items-center gap-2">
                        {action.icon}
                        <span>{action.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                No actions found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
