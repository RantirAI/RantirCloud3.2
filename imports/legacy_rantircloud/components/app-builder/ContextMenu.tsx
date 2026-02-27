import { useState, useRef, useEffect } from 'react';
import { AppComponent } from '@/types/appBuilder';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { 
  Copy, 
  Trash2, 
  Edit3, 
  Layers, 
  ArrowUp, 
  ArrowDown,
  Eye,
  EyeOff,
  Settings,
  Copy as CopyIcon,
  Sparkles,
  Square,
  Package,
  MessageSquare
} from 'lucide-react';

interface ContextMenuProps {
  component: AppComponent;
  position: { x: number; y: number };
  onClose: () => void;
  onSendToAI?: () => void;
}

export function ContextMenu({ component, position, onClose, onSendToAI }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { 
    deleteComponent, 
    duplicateComponent, 
    updateComponent,
    selectComponent,
    setAIContext,
    setPendingCommentElement
  } = useAppBuilderStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleEdit = () => {
    selectComponent(component.id);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateComponent(component.id);
    onClose();
  };

  const handleDelete = () => {
    deleteComponent(component.id);
    onClose();
  };

  const handleToggleVisibility = () => {
    updateComponent(component.id, { 
      props: { 
        ...component.props, 
        hidden: !component.props?.hidden
      } 
    });
    onClose();
  };

  const handleEditModal = () => {
    // TODO: Implement modal editing
    console.log('Edit modal:', component.id);
    onClose();
  };

  const handleConfigureChart = () => {
    // TODO: Implement chart configuration
    console.log('Configure chart:', component.id);
    onClose();
  };

  const handleBringToFront = () => {
    updateComponent(component.id, { 
      props: { 
        ...component.props, 
        zIndex: 1000 
      } 
    });
    onClose();
  };

  const handleSendToBack = () => {
    updateComponent(component.id, { 
      props: { 
        ...component.props, 
        zIndex: 1 
      } 
    });
    onClose();
  };

  const handleSendToAI = () => {
    setAIContext(component);
    selectComponent(component.id);
    onSendToAI?.();
    onClose();
  };

  const handleAddComment = () => {
    setPendingCommentElement(component.id);
    onClose();
  };

  const { openSaveDialog } = useUserComponentStore();

  const handleSaveAsComponent = () => {
    openSaveDialog(component);
    onClose();
  };

  // Check if this is a user component instance
  const isUserComponentInstance = !!component.userComponentRef;

  const handleEditComponentDefinition = () => {
    if (component.userComponentRef?.userComponentId) {
      const { components, openEditDialog } = useUserComponentStore.getState();
      const userComp = components.find(c => c.id === component.userComponentRef?.userComponentId);
      if (userComp) {
        openEditDialog(userComp);
      }
    }
    onClose();
  };

  const menuItems = [
    {
      label: 'Edit Properties',
      icon: Edit3,
      action: handleEdit,
      shortcut: 'Enter'
    },
    {
      label: 'Duplicate',
      icon: CopyIcon,
      action: handleDuplicate,
      shortcut: 'Ctrl+D'
    },
    {
      label: 'Send to AI',
      icon: Sparkles,
      action: handleSendToAI,
      shortcut: 'Alt+A'
    },
    {
      label: 'Save as Component',
      icon: Package,
      action: handleSaveAsComponent,
      shortcut: 'Ctrl+Shift+S'
    },
    {
      label: 'Add Comment',
      icon: MessageSquare,
      action: handleAddComment,
      shortcut: 'C'
    },
    ...(isUserComponentInstance ? [{
      label: 'Edit Component Definition',
      icon: Edit3,
      action: handleEditComponentDefinition,
      shortcut: 'Ctrl+E'
    }] : []),
    { type: 'separator' },
    {
      label: component.props?.hidden ? 'Show' : 'Hide',
      icon: component.props?.hidden ? Eye : EyeOff,
      action: handleToggleVisibility,
      shortcut: 'Ctrl+H'
    },
    {
      label: 'Bring to Front',
      icon: ArrowUp,
      action: handleBringToFront,
      shortcut: 'Ctrl+]'
    },
    {
      label: 'Send to Back',
      icon: ArrowDown,
      action: handleSendToBack,
      shortcut: 'Ctrl+['
    },
    { type: 'separator' },
    ...(component.type === 'modal' || component.type === 'dialog' ? [{
      label: 'Edit Modal Content',
      icon: Settings,
      action: handleEditModal,
      shortcut: 'Double-click'
    }] : []),
    ...(component.type === 'chart' ? [{
      label: 'Configure Chart',
      icon: Settings,
      action: handleConfigureChart,
      shortcut: 'C'
    }] : []),
    { type: 'separator' },
    {
      label: 'Delete',
      icon: Trash2,
      action: handleDelete,
      shortcut: 'Del',
      className: 'text-destructive hover:text-destructive'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-popover border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1 z-[9999] min-w-[200px]"
      style={{
        left: position.x,
        top: position.y + 10
      }}
    >
      <div className="px-2 py-1.5 text-xs font-medium border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        {(() => {
          const Icon = component.type === 'container' ? Square : Settings;
          return <Icon className="h-3 w-3 text-primary" />;
        })()}
        <span className="text-foreground">{component.type} Component</span>
      </div>
      
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-px bg-border my-1" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.action}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${item.className || ''}`}
          >
            <Icon className="h-3 w-3" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}