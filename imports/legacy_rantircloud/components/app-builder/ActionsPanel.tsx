import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ComponentAction, ActionType, ActionTrigger } from '@/types/appBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Settings,
  Zap,
  MousePointer,
  Eye,
  Database,
  Code,
  Navigation,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actionTypes: Array<{ type: ActionType; label: string; icon: React.ComponentType<any>; description: string }> = [
  { type: 'navigate', label: 'Navigate', icon: Navigation, description: 'Navigate to another page' },
  { type: 'openModal', label: 'Open Modal', icon: Eye, description: 'Open a modal dialog' },
  { type: 'closeModal', label: 'Close Modal', icon: Eye, description: 'Close a modal dialog' },
  { type: 'showAlert', label: 'Show Alert', icon: Bell, description: 'Show an alert message' },
  { type: 'apiCall', label: 'API Call', icon: Zap, description: 'Make an HTTP request' },
  { type: 'databaseQuery', label: 'Database Query', icon: Database, description: 'Query the database' },
  { type: 'executeCode', label: 'Execute Code', icon: Code, description: 'Run custom JavaScript' },
  { type: 'toggleVisibility', label: 'Toggle Visibility', icon: Eye, description: 'Show/hide components' },
  { type: 'updateComponent', label: 'Update Component', icon: Settings, description: 'Update component properties' },
];

const triggerTypes: Array<{ type: ActionTrigger; label: string }> = [
  { type: 'click', label: 'Click' },
  { type: 'hover', label: 'Hover' },
  { type: 'focus', label: 'Focus' },
  { type: 'submit', label: 'Submit' },
  { type: 'change', label: 'Change' },
  { type: 'load', label: 'Load' },
];

interface ActionEditorProps {
  action: ComponentAction;
  onUpdate: (action: ComponentAction) => void;
  onDelete: () => void;
}

function ActionEditor({ action, onUpdate, onDelete }: ActionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTriggerChange = (trigger: ActionTrigger) => {
    onUpdate({ ...action, trigger });
  };

  const handleTypeChange = (type: ActionType) => {
    onUpdate({ ...action, type, config: {} });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      ...action,
      config: { ...action.config, [key]: value }
    });
  };

  const actionTypeInfo = actionTypes.find(at => at.type === action.type);
  const Icon = actionTypeInfo?.icon || Zap;

  const renderConfigFields = () => {
    switch (action.type) {
      case 'navigate':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={action.config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="/dashboard"
              />
            </div>
            <div>
              <Label htmlFor="target">Target</Label>
              <Select value={action.config.target || '_self'} onValueChange={(value) => handleConfigChange('target', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Tab</SelectItem>
                  <SelectItem value="_blank">New Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'openModal':
      case 'closeModal':
        return (
          <div>
            <Label htmlFor="modalId">Modal ID</Label>
            <Input
              id="modalId"
              value={action.config.modalId || ''}
              onChange={(e) => handleConfigChange('modalId', e.target.value)}
              placeholder="modal-1"
            />
          </div>
        );

      case 'showAlert':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={action.config.message || ''}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                placeholder="Action completed successfully!"
              />
            </div>
            <div>
              <Label htmlFor="alertType">Type</Label>
              <Select value={action.config.type || 'info'} onValueChange={(value) => handleConfigChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'apiCall':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="method">Method</Label>
              <Select value={action.config.method || 'GET'} onValueChange={(value) => handleConfigChange('method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={action.config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={action.config.headers || ''}
                onChange={(e) => handleConfigChange('headers', e.target.value)}
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="body">Body (JSON)</Label>
              <Textarea
                id="body"
                value={action.config.body || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
              />
            </div>
          </div>
        );

      case 'databaseQuery':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="table">Table</Label>
              <Input
                id="table"
                value={action.config.table || ''}
                onChange={(e) => handleConfigChange('table', e.target.value)}
                placeholder="users"
              />
            </div>
            <div>
              <Label htmlFor="operation">Operation</Label>
              <Select value={action.config.operation || 'select'} onValueChange={(value) => handleConfigChange('operation', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="query">Query</Label>
              <Textarea
                id="query"
                value={action.config.query || ''}
                onChange={(e) => handleConfigChange('query', e.target.value)}
                placeholder="SELECT * FROM users WHERE active = true"
                rows={3}
              />
            </div>
          </div>
        );

      case 'executeCode':
        return (
          <div>
            <Label htmlFor="code">JavaScript Code</Label>
            <Textarea
              id="code"
              value={action.config.code || ''}
              onChange={(e) => handleConfigChange('code', e.target.value)}
              placeholder="console.log('Hello, World!');"
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        );

      case 'toggleVisibility':
        return (
          <div>
            <Label htmlFor="targetId">Target Component ID</Label>
            <Input
              id="targetId"
              value={action.config.targetId || ''}
              onChange={(e) => handleConfigChange('targetId', e.target.value)}
              placeholder="component-id"
            />
          </div>
        );

      case 'updateComponent':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="targetId">Target Component ID</Label>
              <Input
                id="targetId"
                value={action.config.targetId || ''}
                onChange={(e) => handleConfigChange('targetId', e.target.value)}
                placeholder="component-id"
              />
            </div>
            <div>
              <Label htmlFor="properties">Properties (JSON)</Label>
              <Textarea
                id="properties"
                value={action.config.properties || ''}
                onChange={(e) => handleConfigChange('properties', e.target.value)}
                placeholder='{"text": "Updated text", "color": "blue"}'
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground text-sm py-4">
            No configuration needed for this action type
          </div>
        );
    }
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <CardTitle className="text-sm">{actionTypeInfo?.label || action.type}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {action.trigger}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <Label htmlFor="trigger">Trigger</Label>
              <Select value={action.trigger} onValueChange={handleTriggerChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.type} value={trigger.type}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actionType">Action Type</Label>
              <Select value={action.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((actionType) => (
                    <SelectItem key={actionType.type} value={actionType.type}>
                      <div className="flex items-center gap-2">
                        <actionType.icon className="h-4 w-4" />
                        <div>
                          <div>{actionType.label}</div>
                          <div className="text-xs text-muted-foreground">{actionType.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderConfigFields()}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function ActionsPanel() {
  const { currentProject, currentPage, selectedComponent, updateComponent } = useAppBuilderStore();

  if (!currentProject || !currentPage || !selectedComponent) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MousePointer className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">Select a component to manage actions</div>
        </div>
      </div>
    );
  }

  const pageData = currentProject.pages.find(p => p.id === currentPage);
  const findComponent = (components: any[], id: string): any => {
    for (const comp of components) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = findComponent(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const component = findComponent(pageData?.components || [], selectedComponent);
  const actions = component?.actions || [];

  const handleAddAction = () => {
    const newAction: ComponentAction = {
      id: `action-${Date.now()}`,
      trigger: 'click',
      type: 'showAlert',
      config: {}
    };

    const updatedActions = [...actions, newAction];
    updateComponent(selectedComponent, {
      actions: updatedActions
    });
  };

  const handleUpdateAction = (actionId: string, updatedAction: ComponentAction) => {
    const updatedActions = actions.map((action: ComponentAction) =>
      action.id === actionId ? updatedAction : action
    );
    updateComponent(selectedComponent, {
      actions: updatedActions
    });
  };

  const handleDeleteAction = (actionId: string) => {
    const updatedActions = actions.filter((action: ComponentAction) => action.id !== actionId);
    updateComponent(selectedComponent, {
      actions: updatedActions
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Actions</h3>
          <Button size="sm" onClick={handleAddAction}>
            <Plus className="h-4 w-4 mr-1" />
            Add Action
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {actions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm mb-2">No actions yet</div>
              <Button size="sm" variant="outline" onClick={handleAddAction}>
                Add your first action
              </Button>
            </div>
          ) : (
            actions.map((action: ComponentAction) => (
              <ActionEditor
                key={action.id}
                action={action}
                onUpdate={(updatedAction) => handleUpdateAction(action.id, updatedAction)}
                onDelete={() => handleDeleteAction(action.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}