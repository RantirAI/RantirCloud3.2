import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MousePointer, Eye, Link, Mail, Phone, Download, Share, Workflow, Sparkles, FolderOpen } from 'lucide-react';
import { PageSelector } from '../PageSelector';
import { ParameterMapper } from '../ParameterMapper';
import { ActionFlowBuilder } from '../ActionFlowBuilder';

interface ActionsTabProps {
  component: any;
}

interface ComponentAction {
  id: string;
  trigger: string;
  type: string;
  config: Record<string, any>;
}

// Define available actions based on component type
const getAvailableActions = (componentType: string) => {
  const baseActions = [
    { value: 'navigate', label: 'Navigate to URL', icon: Link },
    { value: 'navigateToPage', label: 'Navigate to Page', icon: Link },
    { value: 'openModal', label: 'Open Modal', icon: Eye },
    { value: 'toggleVisibility', label: 'Toggle Visibility', icon: Eye },
    { value: 'openUrl', label: 'Open URL', icon: Link },
    { value: 'sendEmail', label: 'Send Email', icon: Mail },
    { value: 'makeCall', label: 'Make Phone Call', icon: Phone },
    { value: 'download', label: 'Download File', icon: Download },
    { value: 'share', label: 'Share Content', icon: Share }
  ];

  return baseActions;
};

// Define available triggers based on component type
const getAvailableTriggers = (componentType: string) => {
  const baseTriggers = [
    { value: 'onClick', label: 'On Click' },
    { value: 'onHover', label: 'On Hover' },
    { value: 'onFocus', label: 'On Focus' }
  ];

  if (componentType === 'data-table') {
    return [
      ...baseTriggers,
      { value: 'onRowClick', label: 'On Row Click' },
      { value: 'onRowSelect', label: 'On Row Select' }
    ];
  }

  if (['input', 'textarea'].includes(componentType)) {
    return [
      ...baseTriggers,
      { value: 'onChange', label: 'On Change' },
      { value: 'onBlur', label: 'On Blur' }
    ];
  }

  if (componentType === 'image') {
    return [
      ...baseTriggers,
      { value: 'onLoad', label: 'On Load' },
      { value: 'onError', label: 'On Error' }
    ];
  }

  return baseTriggers;
};

export function ActionsTab({ component }: ActionsTabProps) {
  const { selectedComponent, updateComponent, connectedFlows } = useAppBuilderStore();
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [editingFlowTrigger, setEditingFlowTrigger] = useState<string | null>(null);
  const [newAction, setNewAction] = useState<Partial<ComponentAction>>({
    trigger: '',
    type: '',
    config: {}
  });

  const actions: ComponentAction[] = component.props?.actions || [];
  const availableActions = getAvailableActions(component.type);
  const availableTriggers = getAvailableTriggers(component.type);

  const handleAddAction = () => {
    if (!newAction.trigger || !newAction.type) return;

    const action: ComponentAction = {
      id: `action-${Date.now()}`,
      trigger: newAction.trigger!,
      type: newAction.type!,
      config: newAction.config || {}
    };

    const updatedActions = [...actions, action];
    
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        actions: updatedActions
      }
    });

    setNewAction({ trigger: '', type: '', config: {} });
    setIsAddingAction(false);
  };

  const handleRemoveAction = (actionId: string) => {
    const updatedActions = actions.filter(action => action.id !== actionId);
    
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        actions: updatedActions
      }
    });
  };

  const handleUpdateAction = (actionId: string, updates: Partial<ComponentAction>) => {
    const updatedActions = actions.map(action =>
      action.id === actionId ? { ...action, ...updates } : action
    );

    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        actions: updatedActions
      }
    });
  };

  const handleCreateFlow = (trigger: string) => {
    setEditingFlowTrigger(trigger);
    setShowFlowBuilder(true);
  };

  const handleSaveFlow = (flowData: any) => {
    const trigger = flowData.trigger || editingFlowTrigger || 'onClick';
    
    // Save to actionFlows (the format the executor expects)
    const existingActionFlows = component.actionFlows || {};
    const updatedActionFlows = {
      ...existingActionFlows,
      [trigger]: {
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        trigger: trigger
      }
    };

    // Also keep a reference in actions for UI display
    const existingFlowIndex = actions.findIndex(
      a => a.type === 'flow' && a.trigger === trigger
    );

    let updatedActions = [...actions];
    if (existingFlowIndex >= 0) {
      updatedActions[existingFlowIndex] = {
        ...updatedActions[existingFlowIndex],
        config: {
          flowData: updatedActionFlows[trigger]
        }
      };
    } else {
      const flowAction: ComponentAction = {
        id: `flow-${Date.now()}`,
        trigger: trigger,
        type: 'flow',
        config: {
          flowData: updatedActionFlows[trigger]
        }
      };
      updatedActions = [...actions, flowAction];
    }

    updateComponent(selectedComponent!, {
      actionFlows: updatedActionFlows,
      props: {
        ...component.props,
        actions: updatedActions
      }
    });

    setShowFlowBuilder(false);
    setEditingFlowTrigger(null);
  };

  const getActionIcon = (type: string) => {
    if (type === 'flow') return Workflow;
    const action = availableActions.find(a => a.value === type);
    return action?.icon || MousePointer;
  };

  const renderActionConfig = (action: ComponentAction) => {
    switch (action.type) {
      case 'navigate':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">URL</Label>
            <Input
              value={action.config.url || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, url: e.target.value }
              })}
              placeholder="https://example.com"
              className="h-6 text-[10px]"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={action.config.target === '_blank'}
                onChange={(e) => handleUpdateAction(action.id, {
                  config: { ...action.config, target: e.target.checked ? '_blank' : '_self' }
                })}
                className="w-3 h-3"
              />
              <Label className="text-[10px]">Open in new tab</Label>
            </div>
          </div>
        );

      case 'navigateToPage':
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-[10px]">Target Page</Label>
              <PageSelector
                value={action.config.pageId || ''}
                onValueChange={(pageId) => handleUpdateAction(action.id, {
                  config: { ...action.config, pageId }
                })}
                placeholder="Select a page"
              />
            </div>
            {action.config.pageId && (
              <ParameterMapper
                pageId={action.config.pageId}
                parameterValues={action.config.parameters || {}}
                onParameterChange={(paramName, value) => handleUpdateAction(action.id, {
                  config: {
                    ...action.config,
                    parameters: {
                      ...action.config.parameters,
                      [paramName]: value
                    }
                  }
                })}
              />
            )}
          </div>
        );

      case 'openModal':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">Modal Component ID</Label>
            <Input
              value={action.config.modalId || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, modalId: e.target.value }
              })}
              placeholder="modal-component-id"
              className="h-6 text-[10px]"
            />
          </div>
        );

      case 'toggleVisibility':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">Target Component ID</Label>
            <Input
              value={action.config.targetId || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, targetId: e.target.value }
              })}
              placeholder="component-id"
              className="h-6 text-[10px]"
            />
          </div>
        );

      case 'openUrl':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">URL</Label>
            <Input
              value={action.config.url || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, url: e.target.value }
              })}
              placeholder="https://example.com"
              className="h-6 text-[10px]"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={action.config.openInNewTab || false}
                onChange={(e) => handleUpdateAction(action.id, {
                  config: { ...action.config, openInNewTab: e.target.checked }
                })}
                className="w-3 h-3"
              />
              <Label className="text-[10px]">Open in new tab</Label>
            </div>
          </div>
        );

      case 'sendEmail':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">Email Address</Label>
            <Input
              value={action.config.email || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, email: e.target.value }
              })}
              placeholder="user@example.com"
              className="h-6 text-[10px]"
            />
            <Label className="text-[10px]">Subject</Label>
            <Input
              value={action.config.subject || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, subject: e.target.value }
              })}
              placeholder="Email subject"
              className="h-6 text-[10px]"
            />
          </div>
        );

      case 'makeCall':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">Phone Number</Label>
            <Input
              value={action.config.phoneNumber || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, phoneNumber: e.target.value }
              })}
              placeholder="+1234567890"
              className="h-6 text-[10px]"
            />
          </div>
        );

      case 'download':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">File URL</Label>
            <Input
              value={action.config.fileUrl || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, fileUrl: e.target.value }
              })}
              placeholder="https://example.com/file.pdf"
              className="h-6 text-[10px]"
            />
            <Label className="text-[10px]">File Name</Label>
            <Input
              value={action.config.fileName || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, fileName: e.target.value }
              })}
              placeholder="document.pdf"
              className="h-6 text-[10px]"
            />
          </div>
        );

      case 'share':
        return (
          <div className="space-y-1">
            <Label className="text-[10px]">Title</Label>
            <Input
              value={action.config.title || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, title: e.target.value }
              })}
              placeholder="Share title"
              className="h-6 text-[10px]"
            />
            <Label className="text-[10px]">Text</Label>
            <Textarea
              value={action.config.text || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, text: e.target.value }
              })}
              placeholder="Content to share"
              className="text-[10px]"
              rows={2}
            />
            <Label className="text-[10px]">URL</Label>
            <Input
              value={action.config.url || ''}
              onChange={(e) => handleUpdateAction(action.id, {
                config: { ...action.config, url: e.target.value }
              })}
              placeholder="https://example.com"
              className="h-6 text-[10px]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="p-2 space-y-3">
        <div className="border rounded-lg bg-card">
          <div className="p-3 border-b space-y-3">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-semibold">Actions & Interactions</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure actions that trigger when users interact with this component
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => handleCreateFlow('onClick')}
                className="justify-start gap-2 h-9"
              >
                <Sparkles className="h-4 w-4" />
                Create New Flow
              </Button>
              {connectedFlows.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Use the first connected flow as a template
                    const flow = connectedFlows[0];
                    handleCreateFlow('onClick');
                  }}
                  className="justify-start gap-2 h-9"
                >
                  <FolderOpen className="h-4 w-4 text-purple-500" />
                  From Workspace Flow
                </Button>
              )}
              <Button
                onClick={() => setIsAddingAction(true)}
                className="justify-start gap-2 h-9"
              >
                <Plus className="h-4 w-4" />
                Add Action
              </Button>
            </div>
            
            {/* Connected Flows */}
            {connectedFlows.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected Flows</Label>
                {connectedFlows.map((flow) => (
                  <div key={flow.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/5">
                    <Workflow className="h-3 w-3 text-purple-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400 truncate">{flow.name}</span>
                    <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-4 border-purple-500/30 text-purple-600">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 space-y-2">
            {/* Existing Actions */}
            {actions.map((action) => {
              const ActionIcon = getActionIcon(action.type);
              const trigger = availableTriggers.find(t => t.value === action.trigger);
              const actionType = action.type === 'flow' 
                ? { label: 'Action Flow', value: 'flow' }
                : availableActions.find(a => a.value === action.type);

              return (
                <div key={action.id} className="p-2 border rounded bg-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <ActionIcon className="h-3 w-3 text-primary" />
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {trigger?.label}
                        </Badge>
                        <span className="text-[10px]">→</span>
                        <Badge variant={action.type === 'flow' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0 h-4">
                          {actionType?.label}
                        </Badge>
                        {action.type === 'flow' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {action.config.flowData?.nodes?.length - 1 || 0} steps
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {action.type === 'flow' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFlowTrigger(action.trigger);
                            setShowFlowBuilder(true);
                          }}
                          className="h-5 w-5 p-0"
                        >
                          <Workflow className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAction(action.id)}
                        className="h-5 w-5 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {action.type !== 'flow' && renderActionConfig(action)}
                  
                  {action.type === 'flow' && (
                    <div className="text-[10px] text-muted-foreground">
                      Flow with {action.config.flowData?.nodes?.length - 1 || 0} action steps
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add New Action Form */}
            {isAddingAction && (
              <div className="p-2 border border-dashed rounded bg-muted/20 space-y-2">
                <h5 className="text-[12px] font-medium">Add New Action</h5>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Trigger</Label>
                    <Select
                      value={newAction.trigger}
                      onValueChange={(value) => setNewAction(prev => ({ ...prev, trigger: value }))}
                    >
                      <SelectTrigger className="h-6 text-[10px]">
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTriggers.map((trigger) => (
                          <SelectItem key={trigger.value} value={trigger.value}>
                            {trigger.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Action</Label>
                    <Select
                      value={newAction.type}
                      onValueChange={(value) => setNewAction(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="h-6 text-[10px]">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableActions.map((action) => (
                          <SelectItem key={action.value} value={action.value}>
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    onClick={handleAddAction}
                    disabled={!newAction.trigger || !newAction.type}
                    className="h-6 text-[10px] px-2"
                  >
                    Add Action
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddingAction(false)}
                    className="h-6 text-[10px] px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {actions.length === 0 && !isAddingAction && (
              <div className="text-center py-4 text-muted-foreground">
                <div className="text-[10px]">No actions configured</div>
                <div className="text-[10px]">Add an action to make this component interactive</div>
              </div>
            )}
          </div>
        </div>

        {/* Flow Builder Dialog */}
        {showFlowBuilder && (
          <ActionFlowBuilder
            isOpen={showFlowBuilder}
            onClose={() => {
              setShowFlowBuilder(false);
              setEditingFlowTrigger(null);
            }}
            componentId={selectedComponent || ''}
            trigger={editingFlowTrigger || 'onClick'}
            existingFlow={
              // Check actionFlows first (new format), then fall back to props.actions
              component.actionFlows?.[editingFlowTrigger || 'onClick'] ||
              actions.find(a => a.type === 'flow' && a.trigger === (editingFlowTrigger || 'onClick'))
                ?.config?.flowData
            }
            onSave={handleSaveFlow}
          />
        )}
      </div>
    </div>
  );
}
