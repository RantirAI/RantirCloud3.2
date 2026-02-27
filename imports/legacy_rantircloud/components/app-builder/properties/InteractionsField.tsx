import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  MousePointer,
  Navigation,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  EyeOff,
  Copy,
  Download,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractionAction {
  id: string;
  type: 'navigate' | 'openModal' | 'openDialog' | 'toggleVisibility' | 'copyText' | 'openUrl' | 'sendEmail' | 'makeCall' | 'showToast' | 'downloadFile' | 'shareContent';
  label: string;
  config: Record<string, any>;
}

interface InteractionsFieldProps {
  label: string;
  value: InteractionAction[];
  onChange: (value: InteractionAction[]) => void;
}

export function InteractionsField({ label, value = [], onChange }: InteractionsFieldProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingAction, setEditingAction] = useState<string | null>(null);

  const actionTypes = [
    { 
      value: 'navigate', 
      label: 'Navigate to Page', 
      icon: Navigation,
      config: [
        { name: 'target', label: 'Target Page', type: 'select', options: [
          { label: 'Home', value: '/home' },
          { label: 'About', value: '/about' },
          { label: 'Contact', value: '/contact' },
          { label: 'Products', value: '/products' },
          { label: 'Custom URL', value: 'custom' }
        ]},
        { name: 'customUrl', label: 'Custom URL', type: 'text', showIf: 'target', showIfValue: 'custom' },
        { name: 'openInNewTab', label: 'Open in New Tab', type: 'checkbox' }
      ]
    },
    { 
      value: 'openModal', 
      label: 'Open Modal', 
      icon: MessageSquare,
      config: [
        { name: 'modalId', label: 'Modal Component ID', type: 'text', placeholder: 'modal-1' },
        { name: 'title', label: 'Modal Title', type: 'text' },
        { name: 'content', label: 'Modal Content', type: 'textarea' }
      ]
    },
    { 
      value: 'openDialog', 
      label: 'Open Dialog', 
      icon: MessageSquare,
      config: [
        { name: 'dialogType', label: 'Dialog Type', type: 'select', options: [
          { label: 'Confirm', value: 'confirm' },
          { label: 'Alert', value: 'alert' },
          { label: 'Prompt', value: 'prompt' }
        ]},
        { name: 'title', label: 'Dialog Title', type: 'text' },
        { name: 'message', label: 'Dialog Message', type: 'textarea' }
      ]
    },
    { 
      value: 'toggleVisibility', 
      label: 'Toggle Visibility', 
      icon: Eye,
      config: [
        { name: 'targetId', label: 'Target Component ID', type: 'text', placeholder: 'component-id' },
        { name: 'action', label: 'Action', type: 'select', options: [
          { label: 'Show', value: 'show' },
          { label: 'Hide', value: 'hide' },
          { label: 'Toggle', value: 'toggle' }
        ]}
      ]
    },
    { 
      value: 'copyText', 
      label: 'Copy Text', 
      icon: Copy,
      config: [
        { name: 'text', label: 'Text to Copy', type: 'text' },
        { name: 'successMessage', label: 'Success Message', type: 'text', defaultValue: 'Copied to clipboard!' }
      ]
    },
    { 
      value: 'openUrl', 
      label: 'Open URL', 
      icon: ExternalLink,
      config: [
        { name: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
        { name: 'openInNewTab', label: 'Open in New Tab', type: 'checkbox', defaultValue: true }
      ]
    },
    { 
      value: 'sendEmail', 
      label: 'Send Email', 
      icon: Mail,
      config: [
        { name: 'to', label: 'To Email', type: 'text', placeholder: 'user@example.com' },
        { name: 'subject', label: 'Subject', type: 'text' },
        { name: 'body', label: 'Email Body', type: 'textarea' }
      ]
    },
    { 
      value: 'makeCall', 
      label: 'Make Phone Call', 
      icon: Phone,
      config: [
        { name: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1234567890' }
      ]
    },
    { 
      value: 'showToast', 
      label: 'Show Toast Message', 
      icon: MessageSquare,
      config: [
        { name: 'message', label: 'Toast Message', type: 'text' },
        { name: 'type', label: 'Toast Type', type: 'select', options: [
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
          { label: 'Warning', value: 'warning' },
          { label: 'Info', value: 'info' }
        ]},
        { name: 'duration', label: 'Duration (ms)', type: 'number', defaultValue: 3000 }
      ]
    },
    { 
      value: 'downloadFile', 
      label: 'Download File', 
      icon: Download,
      config: [
        { name: 'fileUrl', label: 'File URL', type: 'text' },
        { name: 'fileName', label: 'File Name', type: 'text', placeholder: 'download.pdf' }
      ]
    },
    { 
      value: 'shareContent', 
      label: 'Share Content', 
      icon: Share2,
      config: [
        { name: 'title', label: 'Share Title', type: 'text' },
        { name: 'text', label: 'Share Text', type: 'text' },
        { name: 'url', label: 'Share URL', type: 'text' }
      ]
    }
  ];

  const addAction = () => {
    const newAction: InteractionAction = {
      id: `action-${Date.now()}`,
      type: 'navigate',
      label: 'New Action',
      config: {}
    };
    onChange([...value, newAction]);
    setEditingAction(newAction.id);
  };

  const updateAction = (actionId: string, updates: Partial<InteractionAction>) => {
    onChange(value.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    ));
  };

  const deleteAction = (actionId: string) => {
    onChange(value.filter(action => action.id !== actionId));
  };

  const getActionIcon = (type: string) => {
    const actionType = actionTypes.find(at => at.value === type);
    return actionType?.icon || MousePointer;
  };

  const getActionConfig = (type: string) => {
    return actionTypes.find(at => at.value === type)?.config || [];
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 rounded cursor-pointer border-b border-border/50">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Label className="text-xs font-medium cursor-pointer">{label}</Label>
            {value.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {value.length} action{value.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 space-y-3 border-l-2 border-muted ml-2">
          {value.map((action) => {
            const ActionIcon = getActionIcon(action.type);
            const isEditing = editingAction === action.id;
            const actionType = actionTypes.find(at => at.value === action.type);
            const configFields = getActionConfig(action.type);
            
            return (
              <div key={action.id} className="border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ActionIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAction(isEditing ? null : action.id)}
                      className="h-6 px-2"
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAction(action.id)}
                      className="h-6 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {isEditing && (
                  <div className="space-y-3 mt-3 pt-3 border-t">
                    <div>
                      <Label className="text-xs">Action Label</Label>
                      <Input
                        value={action.label}
                        onChange={(e) => updateAction(action.id, { label: e.target.value })}
                        className="mt-1"
                        placeholder="Action name"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Action Type</Label>
                      <Select
                        value={action.type}
                        onValueChange={(type) => updateAction(action.id, { type: type as any, config: {} })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {actionTypes.map((actionType) => (
                            <SelectItem key={actionType.value} value={actionType.value}>
                              <div className="flex items-center gap-2">
                                <actionType.icon className="h-3 w-3" />
                                {actionType.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {configFields.map((field) => {
                      const showField = !field.showIf || action.config[field.showIf] === field.showIfValue;
                      
                      if (!showField) return null;
                      
                      return (
                        <div key={field.name}>
                          <Label className="text-xs">{field.label}</Label>
                          {field.type === 'select' ? (
                            <Select
                              value={action.config[field.name] || field.defaultValue || ''}
                              onValueChange={(value) => 
                                updateAction(action.id, {
                                  config: { ...action.config, [field.name]: value }
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {field.options?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              value={action.config[field.name] || field.defaultValue || ''}
                              onChange={(e) => 
                                updateAction(action.id, {
                                  config: { ...action.config, [field.name]: e.target.value }
                                })
                              }
                              className="mt-1"
                              placeholder={field.placeholder}
                              rows={3}
                            />
                          ) : field.type === 'checkbox' ? (
                            <div className="flex items-center space-x-2 mt-1">
                              <input
                                type="checkbox"
                                checked={action.config[field.name] || field.defaultValue || false}
                                onChange={(e) => 
                                  updateAction(action.id, {
                                    config: { ...action.config, [field.name]: e.target.checked }
                                  })
                                }
                              />
                              <Label className="text-xs">{field.label}</Label>
                            </div>
                          ) : (
                            <Input
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={action.config[field.name] || field.defaultValue || ''}
                              onChange={(e) => 
                                updateAction(action.id, {
                                  config: { ...action.config, [field.name]: e.target.value }
                                })
                              }
                              className="mt-1"
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {!isEditing && (
                  <div className="text-xs text-muted-foreground">
                    {actionType?.label} • Click Edit to configure
                  </div>
                )}
              </div>
            );
          })}
          
          <Button
            variant="outline"
            onClick={addAction}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Interaction
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}