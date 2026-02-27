import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Play, ExternalLink, MousePointer } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { PageSelector } from './PageSelector';
import { ParameterMapper } from './ParameterMapper';

import { ComponentAction, ActionTrigger, ActionType, ActionConfig } from '@/types/appBuilder';

interface ComponentActionsProps {
  component: any;
}

export function ComponentActions({ component }: ComponentActionsProps) {
  const { updateComponent } = useAppBuilderStore();
  const [actions, setActions] = useState<ComponentAction[]>(component.actions || []);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newAction, setNewAction] = useState<Partial<ComponentAction>>({
    type: 'navigate',
    trigger: 'click',
    config: {}
  });

  const handleAddAction = () => {
    const action: ComponentAction = {
      id: Date.now().toString(),
      type: newAction.type as ActionType,
      trigger: newAction.trigger as ActionTrigger,
      config: { ...newAction.config }
    };

    const updatedActions = [...actions, action];
    setActions(updatedActions);
    updateComponent(component.id, { actions: updatedActions });
    
    setIsAddingAction(false);
    setNewAction({ type: 'navigate', trigger: 'click', config: {} });
  };

  const handleRemoveAction = (actionId: string) => {
    const updatedActions = actions.filter(action => action.id !== actionId);
    setActions(updatedActions);
    updateComponent(component.id, { actions: updatedActions });
  };

  const handleUpdateAction = (actionId: string, updates: Partial<ComponentAction>) => {
    const updatedActions = actions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    );
    setActions(updatedActions);
    updateComponent(component.id, { actions: updatedActions });
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'apiCall':
        return <Play className="h-4 w-4" />;
      case 'navigate':
        return <ExternalLink className="h-4 w-4" />;
      case 'executeCode':
        return <Play className="h-4 w-4" />;
      default:
        return <MousePointer className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Actions</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddingAction(true)}
          disabled={isAddingAction}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Action
        </Button>
      </div>

      {actions.length === 0 && !isAddingAction && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              No actions configured. Add an action to make this component interactive.
            </div>
          </CardContent>
        </Card>
      )}

      {actions.map((action) => (
        <Card key={action.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getActionIcon(action.type)}
                <CardTitle className="text-sm capitalize">{action.type} Action</CardTitle>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveAction(action.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <Label className="text-xs">Trigger Event</Label>
              <Select 
                value={action.trigger} 
                onValueChange={(value) => handleUpdateAction(action.id, { trigger: value as ActionTrigger })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="hover">Hover</SelectItem>
                  <SelectItem value="focus">Focus</SelectItem>
                  <SelectItem value="change">Change</SelectItem>
                  {component.type === 'form' && <SelectItem value="submit">Submit</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {action.type === 'apiCall' && (
              <div>
                <Label className="text-xs">API Endpoint</Label>
                <Input
                  className="h-8"
                  value={action.config.url || ''}
                  onChange={(e) => handleUpdateAction(action.id, { 
                    config: { ...action.config, url: e.target.value }
                  })}
                  placeholder="Enter API endpoint"
                />
              </div>
            )}

            {action.type === 'navigate' && (
              <>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    className="h-8"
                    value={action.config.url || ''}
                    onChange={(e) => handleUpdateAction(action.id, { 
                      config: { ...action.config, url: e.target.value }
                    })}
                    placeholder="Enter URL"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target</Label>
                  <Select 
                    value={action.config.target || '_self'} 
                    onValueChange={(value) => handleUpdateAction(action.id, { 
                      config: { ...action.config, target: value as any }
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_self">Same Window</SelectItem>
                      <SelectItem value="_blank">New Window</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {action.type === 'navigateToPage' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Target Page</Label>
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
            )}

            {action.type === 'executeCode' && (
              <div>
                <Label className="text-xs">JavaScript Code</Label>
                <Input
                  className="h-8"
                  value={action.config.code || ''}
                  onChange={(e) => handleUpdateAction(action.id, { 
                    config: { ...action.config, code: e.target.value }
                  })}
                  placeholder="Enter JavaScript code"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {isAddingAction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Action</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <Label className="text-xs">Action Type</Label>
              <Select 
                value={newAction.type} 
                onValueChange={(value) => setNewAction({ ...newAction, type: value as ActionType })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="navigate">Navigate to URL</SelectItem>
                  <SelectItem value="navigateToPage">Navigate to Page</SelectItem>
                  <SelectItem value="apiCall">API Call</SelectItem>
                  <SelectItem value="executeCode">Execute Code</SelectItem>
                  <SelectItem value="showAlert">Show Alert</SelectItem>
                  <SelectItem value="openModal">Open Modal</SelectItem>
                  <SelectItem value="closeModal">Close Modal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Trigger Event</Label>
              <Select 
                value={newAction.trigger} 
                onValueChange={(value) => setNewAction({ ...newAction, trigger: value as ActionTrigger })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="hover">Hover</SelectItem>
                  <SelectItem value="focus">Focus</SelectItem>
                  <SelectItem value="change">Change</SelectItem>
                  {component.type === 'form' && <SelectItem value="submit">Submit</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {newAction.type === 'apiCall' && (
              <div>
                <Label className="text-xs">API Endpoint</Label>
                <Input
                  className="h-8"
                  value={newAction.config?.url || ''}
                  onChange={(e) => setNewAction({ 
                    ...newAction, 
                    config: { ...newAction.config, url: e.target.value }
                  })}
                  placeholder="Enter API endpoint"
                />
              </div>
            )}

            {newAction.type === 'navigate' && (
              <>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    className="h-8"
                    value={newAction.config?.url || ''}
                    onChange={(e) => setNewAction({ 
                      ...newAction, 
                      config: { ...newAction.config, url: e.target.value }
                    })}
                    placeholder="Enter URL"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target</Label>
                  <Select 
                    value={newAction.config?.target || '_self'} 
                    onValueChange={(value) => setNewAction({ 
                      ...newAction, 
                      config: { ...newAction.config, target: value as any }
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_self">Same Window</SelectItem>
                      <SelectItem value="_blank">New Window</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {newAction.type === 'navigateToPage' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Target Page</Label>
                  <PageSelector
                    value={newAction.config?.pageId || ''}
                    onValueChange={(pageId) => setNewAction({ 
                      ...newAction, 
                      config: { ...newAction.config, pageId }
                    })}
                    placeholder="Select a page"
                  />
                </div>
                {newAction.config?.pageId && (
                  <ParameterMapper
                    pageId={newAction.config.pageId}
                    parameterValues={newAction.config.parameters || {}}
                    onParameterChange={(paramName, value) => setNewAction({
                      ...newAction,
                      config: {
                        ...newAction.config,
                        parameters: {
                          ...newAction.config.parameters,
                          [paramName]: value
                        }
                      }
                    })}
                  />
                )}
              </div>
            )}

            {newAction.type === 'executeCode' && (
              <div>
                <Label className="text-xs">JavaScript Code</Label>
                <Input
                  className="h-8"
                  value={newAction.config?.code || ''}
                  onChange={(e) => setNewAction({ 
                    ...newAction, 
                    config: { ...newAction.config, code: e.target.value }
                  })}
                  placeholder="Enter JavaScript code"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAction}>
                Add Action
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAddingAction(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}