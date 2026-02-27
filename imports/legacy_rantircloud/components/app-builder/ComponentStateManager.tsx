import { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer, 
  Hand, 
  Focus, 
  Eye,
  Globe,
  Keyboard
} from 'lucide-react';

type ComponentState = 'normal' | 'hover' | 'pressed' | 'focused' | 'focus-visible' | 'focus-within';

interface StateConfig {
  id: ComponentState;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const stateConfigs: StateConfig[] = [
  {
    id: 'normal',
    label: 'Normal',
    icon: MousePointer,
    description: 'Default component state'
  },
  {
    id: 'hover',
    label: 'Hover',
    icon: Hand,
    description: 'When user hovers over the component'
  },
  {
    id: 'pressed',
    label: 'Pressed',
    icon: Hand,
    description: 'When component is being pressed or clicked'
  },
  {
    id: 'focused',
    label: 'Focused',
    icon: Focus,
    description: 'When component has focus (clicked or tabbed to)'
  },
  {
    id: 'focus-visible',
    label: 'Focus Visible',
    icon: Focus,
    description: 'When component is focused via keyboard (:focus-visible)'
  },
  {
    id: 'focus-within',
    label: 'Focus Within',
    icon: Focus,
    description: 'When a child element has focus (:focus-within)'
  }
];

interface ComponentStateManagerProps {
  componentId: string;
  onStateChange: (state: ComponentState) => void;
  currentState: ComponentState;
}

export function ComponentStateManager({ 
  componentId, 
  onStateChange, 
  currentState 
}: ComponentStateManagerProps) {
  const { currentProject, currentPage, updateComponent } = useAppBuilderStore();
  const [activeStateTab, setActiveStateTab] = useState<ComponentState>('normal');

  if (!currentProject || !currentPage) return null;

  const pageData = currentProject.pages.find(p => p.id === currentPage);
  const component = pageData?.components.find(c => c.id === componentId);

  if (!component) return null;

  const handleStateSelect = (state: ComponentState) => {
    setActiveStateTab(state);
    onStateChange(state);
  };

  const getStateStyles = (state: ComponentState) => {
    return component.style?.[`${state}State`] || {};
  };

  const updateStateStyles = (state: ComponentState, styles: Record<string, any>) => {
    const updatedStyle = {
      ...component.style,
      [`${state}State`]: {
        ...getStateStyles(state),
        ...styles
      }
    };

    updateComponent(componentId, { style: updatedStyle });
  };

  const hasStateStyles = (state: ComponentState) => {
    const styles = getStateStyles(state);
    return Object.keys(styles).length > 0;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Component States</CardTitle>
          <CardDescription className="text-xs">
            Configure styles for different component states independently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeStateTab} onValueChange={(value) => handleStateSelect(value as ComponentState)}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              {stateConfigs.slice(0, 3).map((config) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={config.id}
                    value={config.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                    {hasStateStyles(config.id) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Additional states */}
            <div className="grid grid-cols-3 gap-1 mb-4">
              {stateConfigs.slice(3).map((config) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={config.id}
                    variant={activeStateTab === config.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStateSelect(config.id)}
                    className="h-7 text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                    {hasStateStyles(config.id) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />
                    )}
                  </Button>
                );
              })}
            </div>

            <Separator className="my-3" />

            {/* Current state info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {stateConfigs.find(s => s.id === activeStateTab)?.label}
                  </Badge>
                  {currentState === activeStateTab && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                      Current
                    </Badge>
                  )}
                </div>
                {hasStateStyles(activeStateTab) && (
                  <Badge variant="secondary" className="text-xs">
                    Has Custom Styles
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {stateConfigs.find(s => s.id === activeStateTab)?.description}
              </p>
            </div>

            {/* State-specific content */}
            {stateConfigs.map((config) => (
              <TabsContent key={config.id} value={config.id} className="mt-4">
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Modify properties in the Properties panel to apply styles to the <strong>{config.label}</strong> state.
                    Changes will only affect this specific state.
                  </div>
                  
                  {hasStateStyles(config.id) && (
                    <div className="p-2 border border-border rounded bg-muted/30">
                      <div className="text-xs font-medium mb-1">Active State Styles:</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {Object.entries(getStateStyles(config.id)).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export { type ComponentState };