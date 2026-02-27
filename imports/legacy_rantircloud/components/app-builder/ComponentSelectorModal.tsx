import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Plus, Sparkles } from 'lucide-react';
import { ComponentType } from '@/types/appBuilder';
import { useComponentUsageStore } from '@/stores/componentUsageStore';
import { cn } from '@/lib/utils';

// Import component groups from ComponentPalette
import { 
  Type, Square, Columns, Grid3X3, MousePointer, Edit, FileText, CheckSquare, 
  Circle, Image, CreditCard, Table, List, Navigation, Zap, Archive, Menu, 
  Calendar, Upload, User, Tag, AlertCircle, BarChart, Minus, Play, Pause, 
  Volume2, MapPin, Clock, Shield, Heart, ThumbsUp, MessageSquare, Share, 
  Filter, Download, RefreshCw, Settings, Bell, Mail, Phone, Globe, Lock, 
  Eye, EyeOff, ChevronDown, ChevronUp, X, Check, Info, AlertTriangle, 
  Loader, Video, Music, Bookmark, ShoppingCart, Wallet, PieChart, LineChart, 
  Activity, Thermometer, Gauge, Layers, Move, Copy, Trash2, MoreHorizontal, 
  Sliders, Radio, Mic, Camera, Gamepad2, Briefcase, Home, Building, Car, 
  Plane, Ship, Train, Bike, Palette, Brush, Scissors, Ruler, Paperclip, 
  Folder, FolderOpen, File, FileEdit, Code, Terminal, Database, Server, 
  Wifi, Smartphone, Tablet, Monitor, Printer, Headphones, Volume1, VolumeX, 
  SkipBack, SkipForward, Repeat, Shuffle, Maximize, Minimize, RotateCcw, 
  RotateCw, ZoomIn, ZoomOut, Anchor, Award, Feather, Gift, Lightbulb, 
  Magnet, Puzzle, Sunrise, Sunset, Umbrella, Quote, Link, Route
} from 'lucide-react';
import { DatabaseIcon } from '@/components/DatabaseIcon';

interface ComponentGroup {
  name: string;
  components: Array<{
    type: ComponentType;
    name: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
    description: string;
  }>;
}

const componentGroups: ComponentGroup[] = [
  {
    name: 'Layout',
    components: [
      { type: 'section', name: 'Section', icon: Square, description: 'Semantic section element' },
      { type: 'container', name: 'Container', icon: Square, description: 'Basic container element' },
      { type: 'grid', name: 'Grid', icon: Grid3X3, description: 'CSS Grid container' },
      { type: 'separator', name: 'Separator', icon: Minus, description: 'Divider line' }
    ]
  },
  {
    name: 'Typography',
    components: [
      { type: 'text', name: 'Text', icon: Type, description: 'Simple text element' },
      { type: 'heading', name: 'Heading', icon: Type, description: 'Heading element (H1-H6)' },
      { type: 'blockquote', name: 'Blockquote', icon: Quote, description: 'Quote block' },
      { type: 'code', name: 'Code', icon: Code, description: 'Inline code' },
      { type: 'codeblock', name: 'Code Block', icon: Terminal, description: 'Code block' },
      { type: 'link', name: 'Link', icon: Link, description: 'Hyperlink' },
      { type: 'icon', name: 'Icon', icon: Sparkles, description: 'Lucide icon' }
    ]
  },
  {
    name: 'Form Elements',
    components: [
      { type: 'button', name: 'Button', icon: MousePointer, description: 'Interactive button' },
      { type: 'input', name: 'Input', icon: Edit, description: 'Text input field' },
      { type: 'textarea', name: 'Textarea', icon: FileText, description: 'Multi-line text input' },
      { type: 'select', name: 'Select', icon: ChevronDown, description: 'Dropdown selection' },
      { type: 'checkbox', name: 'Checkbox', icon: CheckSquare, description: 'Checkbox input' },
      { type: 'radio', name: 'Radio', icon: Circle, description: 'Radio button input' },
      { type: 'switch', name: 'Switch', icon: Settings, description: 'Toggle switch' },
      { type: 'slider', name: 'Slider', icon: Sliders, description: 'Range slider' },
      { type: 'form', name: 'Form', icon: FileText, description: 'Form container' },
      { type: 'label', name: 'Label', icon: Tag, description: 'Form label' },
      { type: 'combobox', name: 'Combobox', icon: Search, description: 'Searchable select' },
      { type: 'input-otp', name: 'OTP Input', icon: Lock, description: 'One-time password input' }
    ]
  },
  {
    name: 'Media & Files',
    components: [
      { type: 'image', name: 'Image', icon: Image, description: 'Image element' },
      { type: 'video', name: 'Video', icon: Video, description: 'Video player' }
    ]
  },
  {
    name: 'Data Display',
    components: [
      { type: 'datatable', name: 'Data Table', icon: DatabaseIcon, description: 'Connected data table' },
      { type: 'list', name: 'List', icon: List, description: 'List component' },
      { type: 'data-display', name: 'Data Display', icon: Database, description: 'Advanced data display with templates' },
      { type: 'chart', name: 'Chart', icon: BarChart, description: 'Chart component' },
      { type: 'badge', name: 'Badge', icon: Tag, description: 'Status badge' }
    ]
  },
  {
    name: 'Navigation',
    components: [
      { type: 'sidebar', name: 'Sidebar', icon: Menu, description: 'Sidebar navigation' }
    ]
  },
  {
    name: 'Feedback',
    components: [
      { type: 'alert', name: 'Alert', icon: AlertCircle, description: 'Alert message' },
      { type: 'progress', name: 'Progress', icon: Activity, description: 'Progress bar' }
    ]
  }
];

interface ComponentSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectComponent: (componentType: ComponentType) => void;
  parentComponentName?: string;
}

export function ComponentSelectorModal({ 
  open, 
  onOpenChange, 
  onSelectComponent,
  parentComponentName 
}: ComponentSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { getTopUsedComponents } = useComponentUsageStore();

  // Get all components flattened
  const allComponents = useMemo(() => {
    return componentGroups.flatMap(group => 
      group.components.map(comp => ({ ...comp, group: group.name }))
    );
  }, []);

  // Get top used components
  const topUsedComponents = useMemo(() => {
    const topUsed = getTopUsedComponents(8);
    return topUsed.map(({ type }) => 
      allComponents.find(comp => comp.type === type)
    ).filter(Boolean);
  }, [allComponents, getTopUsedComponents]);

  // Filter components based on search
  const filteredComponents = useMemo(() => {
    let components = allComponents;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      components = components.filter(comp => 
        comp.name.toLowerCase().includes(term) ||
        comp.description.toLowerCase().includes(term) ||
        comp.type.toLowerCase().includes(term)
      );
    }

    if (selectedGroup) {
      components = components.filter(comp => comp.group === selectedGroup);
    }

    return components;
  }, [allComponents, searchTerm, selectedGroup]);

  const handleSelectComponent = (componentType: ComponentType) => {
    onSelectComponent(componentType);
    onOpenChange(false);
    setSearchTerm('');
    setSelectedGroup(null);
  };

  const groups = componentGroups.map(g => g.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Add Component
            {parentComponentName && (
              <span className="text-sm font-normal text-muted-foreground">
                to {parentComponentName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 flex-1 min-h-0 px-6 py-4">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Group filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedGroup === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGroup(null)}
              className="h-8"
            >
              All
            </Button>
            {groups.map(group => (
              <Button
                key={group}
                variant={selectedGroup === group ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGroup(group)}
                className="h-8"
              >
                {group}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1 -mx-2">
            <div className="space-y-8 px-2">
              {/* Most Used Section */}
              {!searchTerm && !selectedGroup && topUsedComponents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <h3 className="font-semibold text-base">Most Used</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                    {topUsedComponents.map((component) => {
                      const IconComponent = component.icon;
                      return (
                        <Button
                          key={component.type}
                          variant="outline"
                          className="h-auto p-2 flex flex-col items-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all relative group"
                          onClick={() => handleSelectComponent(component.type)}
                        >
                          <Star className="absolute top-1 right-1 h-2.5 w-2.5 text-yellow-500 fill-current" />
                          <IconComponent className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                          <div className="text-center w-full">
                            <div className="text-[10px] font-medium leading-tight">{component.name}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Component Groups */}
              {filteredComponents.length > 0 ? (
                <div>
                  {!searchTerm && !selectedGroup && topUsedComponents.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-semibold text-base">All Components</h3>
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
                    {filteredComponents.map((component) => {
                      const IconComponent = component.icon;
                      const isTopUsed = topUsedComponents.some(tc => tc?.type === component.type);
                      return (
                        <Button
                          key={component.type}
                          variant="outline"
                          className={cn(
                            "h-auto p-2 flex flex-col items-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group",
                            isTopUsed && "bg-yellow-50/50 border-yellow-200/50 hover:bg-yellow-50"
                          )}
                          onClick={() => handleSelectComponent(component.type)}
                        >
                          <IconComponent className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                          <div className="text-center w-full">
                            <div className="text-[10px] font-medium leading-tight mb-1">{component.name}</div>
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-muted/50 h-auto">
                              {component.group}
                            </Badge>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-base font-medium mb-2">No components found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}