import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Send
} from 'lucide-react';

interface ActionNodePaletteProps {
  onAddNode: (actionType: string, position: { x: number; y: number }) => void;
}

export function ActionNodePalette({ onAddNode }: ActionNodePaletteProps) {
  const actionCategories = [
    {
      name: 'Navigation',
      actions: [
        { type: 'navigate', label: 'Navigate to URL', icon: ExternalLink, description: 'Open external URL' },
        { type: 'navigateToPage', label: 'Navigate to Page', icon: ExternalLink, description: 'Navigate to app page' },
      ]
    },
    {
      name: 'User Interaction',
      actions: [
        { type: 'showAlert', label: 'Show Alert', icon: Bell, description: 'Display notification' },
        { type: 'openModal', label: 'Open Modal', icon: Square, description: 'Open modal dialog' },
        { type: 'closeModal', label: 'Close Modal', icon: X, description: 'Close modal dialog' },
      ]
    },
    {
      name: 'Logic & Control',
      actions: [
        { type: 'condition', label: 'Condition', icon: GitBranch, description: 'Conditional branching' },
        { type: 'delay', label: 'Delay', icon: Clock, description: 'Wait before next action' },
        { type: 'setVariable', label: 'Set Variable', icon: Variable, description: 'Store data in variable' },
      ]
    },
    {
      name: 'Advanced',
      actions: [
        { type: 'apiCall', label: 'API Call', icon: Send, description: 'Make HTTP request' },
        { type: 'executeCode', label: 'Execute Code', icon: Code, description: 'Run custom JavaScript' },
        { type: 'database', label: 'Database Query', icon: Database, description: 'Query database' },
      ]
    }
  ];

  const handleDragStart = (event: React.DragEvent, actionType: string) => {
    event.dataTransfer.setData('application/reactflow', actionType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (actionType: string) => {
    // Add node at a random position for now
    const position = {
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 200,
    };
    onAddNode(actionType, position);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Drag nodes to canvas or click to add
      </div>

      {actionCategories.map((category) => (
        <Card key={category.name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{category.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {category.actions.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                size="sm"
                className="w-full justify-start h-auto p-3 text-left"
                draggable
                onDragStart={(e) => handleDragStart(e, action.type)}
                onClick={() => handleAddNode(action.type)}
              >
                <div className="flex items-start gap-3">
                  <action.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted/50 rounded">
        <strong>Tip:</strong> Use Condition nodes to create branching logic. Connect the "True" output for success paths and "False" output for alternative paths.
      </div>
    </div>
  );
}