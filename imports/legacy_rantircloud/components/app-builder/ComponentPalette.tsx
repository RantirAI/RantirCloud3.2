import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Type, Square, Columns, Grid3X3, MousePointer, Edit, FileText, CheckSquare, Circle, Image, CreditCard, Table, List, Navigation, Zap, Archive, Menu, Calendar, Upload, User, Tag, AlertCircle, BarChart, Minus, Play, Pause, Volume2, MapPin, Clock, Shield, Star, Heart, ThumbsUp, MessageSquare, Share, Search, Filter, Download, RefreshCw, Settings, Bell, Mail, Phone, Globe, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Plus, X, Check, Info, AlertTriangle, Loader, Video, Music, Bookmark, ShoppingCart, Wallet, PieChart, LineChart, Activity, Thermometer, Gauge, Layers, Move, Copy, Trash2, MoreHorizontal, Sliders, Radio, Mic, Camera, Gamepad2, Briefcase, Home, Building, Car, Plane, Ship, Train, Bike, Palette, Brush, Scissors, Ruler, Paperclip, Folder, FolderOpen, File, FileEdit, Code, Terminal, Database, Server, Wifi, Smartphone, Tablet, Monitor, Printer, Headphones, Volume1, VolumeX, SkipBack, SkipForward, Repeat, Shuffle, Maximize, Minimize, RotateCcw, RotateCw, ZoomIn, ZoomOut, Anchor, Award, Feather, Gift, Lightbulb, Magnet, Puzzle, Sparkles, Sunrise, Sunset, Umbrella, Compass, Route, Target, Flame, Snowflake, Droplet, Mountain, TreePine, Flower, Sun, Moon, Cloud, CloudRain, CloudSnow, Wind, Tornado, Rainbow, Atom, Dna, Microscope, Telescope, Rocket, Satellite, Cpu, HardDrive, MemoryStick, Usb, Bluetooth, Tv, Speaker, Webcam, Gamepad, Joystick, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Spade, Diamond, Club, Crown, Trophy, Medal, Flag, Pin, Inbox, Send, Reply, Forward, Trash, Delete, Edit2, Edit3, FilePlus, FileMinus, FileX, FileCheck, Save, SaveAll, Undo, Redo, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, ListOrdered, Hash, Quote, Link, Unlink, ExternalLink, Maximize2, Minimize2, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight, TrendingUp, TrendingDown, BarChart2, BarChart3, BarChart4, AreaChart } from 'lucide-react';
import { DatabaseIcon } from '@/components/DatabaseIcon';
import { ComponentType } from '@/types/appBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formComponentTemplates } from '@/lib/formComponentTemplates';

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

const componentGroups: ComponentGroup[] = [{
  name: 'Layout',
  components: [{
    type: 'div',
    name: 'Div',
    icon: Square,
    description: 'Basic div element - fundamental HTML building block'
  }, {
    type: 'section',
    name: 'Section',
    icon: Layers,
    description: 'Semantic section element'
  }, {
    type: 'container',
    name: 'Container',
    icon: CornerDownRight,
    description: 'Centered container with max-width'
  }, {
    type: 'spacer',
    name: 'Spacer',
    icon: Minus,
    description: 'Empty space'
  }, {
    type: 'separator',
    name: 'Separator',
    icon: Minus,
    description: 'Visual divider line'
  }]
}, {
  name: 'Typography',
  components: [{
    type: 'text',
    name: 'Text',
    icon: Type,
    description: 'Simple text element'
  }, {
    type: 'heading',
    name: 'Heading',
    icon: Type,
    description: 'Heading element (H1-H6)'
  }, {
    type: 'blockquote',
    name: 'Blockquote',
    icon: Quote,
    description: 'Quote block'
  }, {
    type: 'code',
    name: 'Code',
    icon: Code,
    description: 'Inline code'
  }, {
    type: 'codeblock',
    name: 'Code Block',
    icon: Terminal,
    description: 'Code block'
  }, {
    type: 'link',
    name: 'Link',
    icon: Link,
    description: 'Hyperlink'
  }, {
    type: 'icon',
    name: 'Icon',
    icon: Star,
    description: 'Lucide icon'
  }]
}, {
  name: 'Form Elements',
  components: [{
    type: 'form-wrapper',
    name: 'Form Wrapper',
    icon: FileText,
    description: 'Smart form container with submission handling'
  }, {
    type: 'form-wizard',
    name: 'Form Wizard',
    icon: Layers,
    description: 'Multi-step form with progress indicators'
  }, {
    type: 'button',
    name: 'Button',
    icon: MousePointer,
    description: 'Interactive button'
  }, {
    type: 'input',
    name: 'Input',
    icon: Edit,
    description: 'Text input field'
  }, {
    type: 'password-input',
    name: 'Password Input',
    icon: Lock,
    description: 'Password with show/hide toggle'
  }, {
    type: 'textarea',
    name: 'Textarea',
    icon: FileText,
    description: 'Multi-line text input'
  }, {
    type: 'select',
    name: 'Select',
    icon: ChevronDown,
    description: 'Dropdown selection'
  }, {
    type: 'checkbox',
    name: 'Checkbox',
    icon: CheckSquare,
    description: 'Checkbox input'
  }, {
    type: 'checkbox-group',
    name: 'Checkbox Group',
    icon: CheckSquare,
    description: 'Multiple checkbox selection'
  }, {
    type: 'radio',
    name: 'Radio',
    icon: Circle,
    description: 'Radio button input'
  }, {
    type: 'radio-group',
    name: 'Radio Group',
    icon: Circle,
    description: 'Radio button group'
  }, {
    type: 'switch',
    name: 'Switch',
    icon: Settings,
    description: 'Toggle switch'
  }, {
    type: 'slider',
    name: 'Slider',
    icon: Sliders,
    description: 'Range slider'
  }, {
    type: 'form',
    name: 'Form',
    icon: FileText,
    description: 'Form container'
  }, {
    type: 'label',
    name: 'Label',
    icon: Tag,
    description: 'Form label'
  }, {
    type: 'combobox',
    name: 'Combobox',
    icon: Search,
    description: 'Searchable select'
  }, {
    type: 'input-otp',
    name: 'OTP Input',
    icon: Lock,
    description: 'One-time password input'
  }, {
    type: 'datepicker',
    name: 'Date Picker',
    icon: Calendar,
    description: 'Date selection with popup calendar'
  }]
}, {
  name: 'Media & Files',
  components: [{
    type: 'image',
    name: 'Image',
    icon: Image,
    description: 'Image element'
  }, {
    type: 'video',
    name: 'Video',
    icon: Video,
    description: 'Video player'
  }]
}, {
  name: 'Data Display',
  components: [{
    type: 'datatable',
    name: 'Data Table',
    icon: DatabaseIcon,
    description: 'Connected data table'
  }, {
    type: 'list',
    name: 'List',
    icon: List,
    description: 'List component'
  }, {
    type: 'data-display',
    name: 'Data Display',
    icon: Database,
    description: 'Advanced data display with templates, search, and pagination'
  }, {
    type: 'chart',
    name: 'Chart',
    icon: BarChart,
    description: 'Chart component'
  }, {
    type: 'badge',
    name: 'Badge',
    icon: Tag,
    description: 'Status badge'
  }, {
    type: 'alert',
    name: 'Alert',
    icon: AlertCircle,
    description: 'Alert message'
  }, {
    type: 'progress',
    name: 'Progress',
    icon: BarChart,
    description: 'Progress indicator'
  }, {
    type: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    description: 'Calendar display for dates'
  }]
}, {
  name: 'Navigation',
  components: [{
    type: 'nav-horizontal',
    name: 'Horizontal Menu',
    icon: Navigation,
    description: 'Header navigation bar'
  }, {
    type: 'nav-vertical',
    name: 'Sidebar Menu',
    icon: Menu,
    description: 'Sidebar navigation'
  }, {
    type: 'dropdown-menu',
    name: 'Dropdown Menu',
    icon: ChevronDown,
    description: 'Dropdown menu with options'
  }, {
    type: 'tabs',
    name: 'Tabs',
    icon: Layers,
    description: 'Tabbed content navigation'
  }, {
    type: 'accordion',
    name: 'Accordion',
    icon: List,
    description: 'Collapsible content sections'
  }, {
  type: 'theme-toggle',
    name: 'Theme Toggle',
    icon: Sun,
    description: 'Light/dark mode toggle'
  }, {
    type: 'carousel',
    name: 'Carousel',
    icon: Layers,
    description: 'Slideshow with customizable slides'
  }]
}];
interface DraggableComponentProps {
  type: ComponentType;
  name: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  description: string;
  onHover?: (isHovered: boolean) => void;
  isHovered?: boolean;
}
const getComponentPreview = (type: ComponentType) => {
  switch (type) {
    case 'button':
      return <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">Button</div>;
    case 'input':
      return <div className="border rounded px-2 py-1 text-xs w-full">Input field</div>;
    case 'text':
      return <div className="text-xs">Sample text</div>;
    case 'heading':
      return <div className="text-sm font-bold">Heading</div>;
    case 'image':
      return <div className="bg-muted rounded flex items-center justify-center text-xs w-full h-6">Image</div>;
    case 'section':
      return <div className="border border-primary border-dashed rounded p-2 text-xs">Section</div>;
    case 'container':
      return <div className="border border-dashed rounded p-2 text-xs">Container</div>;
    case 'card':
      return <div className="border rounded p-2 text-xs shadow-sm">Card</div>;
    case 'badge':
      return <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">Badge</div>;
    case 'alert':
      return <div className="border border-yellow-200 bg-yellow-50 px-2 py-1 rounded text-xs">Alert</div>;
    case 'progress':
      return <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary h-2 rounded-full w-1/2"></div></div>;
    case 'avatar':
      return <div className="bg-muted rounded-full w-6 h-6 flex items-center justify-center text-xs">U</div>;
    case 'checkbox':
      return <div className="border rounded w-3 h-3 bg-primary"></div>;
    case 'radio':
      return <div className="border rounded-full w-3 h-3 bg-primary"></div>;
    case 'list':
      return <div className="text-xs space-y-1"><div>• Item 1</div><div>• Item 2</div></div>;
    case 'chart':
      return <div className="flex items-end gap-1 h-6"><div className="bg-primary w-2 h-4"></div><div className="bg-primary w-2 h-6"></div><div className="bg-primary w-2 h-3"></div></div>;
    case 'calendar':
      return <div className="border rounded p-1 text-xs grid grid-cols-3 gap-1"><div>1</div><div>2</div><div>3</div></div>;
    case 'tabs':
      return <div className="border-b text-xs"><div className="inline-block border-b-2 border-primary px-2">Tab 1</div><div className="inline-block px-2">Tab 2</div></div>;
    case 'modal':
      return <div className="border rounded p-2 shadow-lg text-xs bg-background">Modal</div>;
    case 'accordion':
      return <div className="border rounded text-xs"><div className="border-b p-1">Accordion</div><div className="p-1">Content</div></div>;
    case 'navigation':
      return <div className="flex gap-2 text-xs"><div className="px-2 py-1 bg-primary text-primary-foreground rounded">Nav</div><div className="px-2 py-1">Link</div></div>;
    case 'switch':
      return <div className="bg-primary rounded-full w-8 h-4 flex items-center"><div className="bg-card rounded-full w-3 h-3 ml-auto mr-0.5"></div></div>;
    case 'slider':
      return <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary h-2 rounded-full w-1/3"></div></div>;
    case 'textarea':
      return <div className="border rounded p-2 text-xs w-full h-8">Textarea</div>;
    case 'select':
      return <div className="border rounded px-2 py-1 text-xs w-full flex justify-between items-center">Select <ChevronDown className="h-3 w-3" /></div>;
    case 'dialog':
      return <div className="border rounded p-2 shadow-lg text-xs bg-background">Dialog</div>;
    case 'sheet':
      return <div className="border rounded p-2 shadow-lg text-xs bg-background">Sheet</div>;
    case 'popover':
      return <div className="border rounded p-1 shadow text-xs bg-background">Popover</div>;
    case 'tooltip':
      return <div className="bg-foreground text-background px-2 py-1 rounded text-xs">Tooltip</div>;
    case 'toast':
      return <div className="border rounded p-2 shadow text-xs bg-background">Toast</div>;
    case 'breadcrumb':
      return <div className="text-xs flex items-center gap-1">Home <span>/</span> Page</div>;
    case 'pagination':
      return <div className="flex gap-1 text-xs"><div className="border rounded w-6 h-6 flex items-center justify-center">1</div><div className="border rounded w-6 h-6 flex items-center justify-center">2</div></div>;
    case 'command':
      return <div className="border rounded p-2 text-xs">⌘ Command</div>;
    case 'scroll-area':
      return <div className="border rounded p-1 text-xs">Scroll Area</div>;
    case 'separator':
      return <div className="w-full h-px bg-border"></div>;
    case 'collapsible':
      return <div className="border rounded text-xs"><div className="p-1 border-b">Collapsible</div></div>;
    case 'toggle':
      return <div className="border rounded px-2 py-1 text-xs bg-primary text-primary-foreground">Toggle</div>;
    case 'skeleton':
      return <div className="bg-muted rounded w-full h-4 animate-pulse"></div>;
    case 'loading':
      return <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>;
    case 'spinner':
      return <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>;
    case 'carousel':
      return <div className="border rounded p-1 text-xs flex gap-1"><div className="w-4 h-4 bg-muted rounded"></div><div className="w-4 h-4 bg-primary rounded"></div></div>;
    case 'hover-card':
      return <div className="border rounded p-1 shadow text-xs bg-background">Hover Card</div>;
    case 'context-menu':
      return <div className="border rounded p-1 shadow text-xs bg-background">Context</div>;
    case 'dropdown-menu':
      return <div className="border rounded p-1 shadow text-xs bg-background">Dropdown</div>;
    case 'menubar':
      return <div className="border rounded p-1 text-xs flex gap-2"><div>File</div><div>Edit</div></div>;
    case 'alert-dialog':
      return <div className="border rounded p-2 shadow-lg text-xs bg-background">Alert Dialog</div>;
    case 'drawer':
      return <div className="border rounded p-2 shadow text-xs bg-background">Drawer</div>;
    case 'keyboard':
      return <div className="border rounded px-1 text-xs bg-muted">⌘K</div>;
    case 'label':
      return <div className="text-xs font-medium">Label</div>;
    case 'combobox':
      return <div className="border rounded px-2 py-1 text-xs w-full flex justify-between items-center">Combobox <Search className="h-3 w-3" /></div>;
    case 'input-otp':
      return <div className="flex gap-1"><div className="border rounded w-6 h-6 text-xs flex items-center justify-center">1</div><div className="border rounded w-6 h-6"></div></div>;
    case 'blockquote':
      return <div className="border-l-2 border-primary pl-2 text-xs italic">Quote</div>;
    case 'code':
      return <div className="bg-muted px-1 rounded text-xs font-mono">code</div>;
    case 'codeblock':
      return <div className="bg-muted rounded p-2 text-xs font-mono">function() {}</div>;
    case 'link':
      return <div className="text-primary underline text-xs">Link</div>;
    case 'icon':
      return <div className="flex items-center justify-center"><Star className="h-4 w-4" /></div>;
    case 'video':
      return <div className="bg-muted rounded flex items-center justify-center text-xs w-full h-6">▶ Video</div>;
    case 'audio':
      return <div className="bg-muted rounded flex items-center justify-center text-xs w-full h-4">♪ Audio</div>;
    case 'toggle-group':
      return <div className="flex border rounded"><div className="px-2 py-1 text-xs bg-primary text-primary-foreground">A</div><div className="px-2 py-1 text-xs">B</div></div>;
    case 'sonner':
      return <div className="border rounded p-2 shadow text-xs bg-background">Sonner</div>;
    case 'aspect-ratio':
      return <div className="border border-dashed rounded p-2 text-xs">16:9</div>;
    case 'resizable':
      return <div className="border rounded p-1 text-xs flex"><div className="flex-1 border-r pr-1">Panel 1</div><div className="flex-1 pl-1">Panel 2</div></div>;
    case 'datepicker':
      return <div className="border rounded px-2 py-1 text-xs w-full flex justify-between items-center">Select date <Calendar className="h-3 w-3" /></div>;
    case 'navigation-menu':
      return <div className="flex gap-2 text-xs"><div className="px-2 py-1 bg-primary text-primary-foreground rounded">Nav</div><div className="px-2 py-1">Menu</div></div>;
    case 'login-form':
      return <div className="border rounded p-2 text-xs space-y-1"><div>📧 Email</div><div>🔒 Password</div><div className="bg-primary text-primary-foreground px-2 py-1 rounded">Login</div></div>;
    case 'register-form':
      return <div className="border rounded p-2 text-xs space-y-1"><div>📧 Email</div><div>🔒 Password</div><div className="bg-primary text-primary-foreground px-2 py-1 rounded">Sign Up</div></div>;
    case 'user-profile':
      return <div className="border rounded p-2 text-xs space-y-1"><div className="flex items-center gap-1">👤 User</div><div>user@email.com</div></div>;
    case 'auth-status':
      return <div className="flex items-center gap-1 text-xs"><div className="w-2 h-2 bg-green-500 rounded-full"></div><div>Authenticated</div></div>;
    default:
      return <div className="bg-muted rounded flex items-center justify-center text-xs w-full h-6">{type}</div>;
  }
};
function DraggableComponent({
  type,
  name,
  icon: Icon,
  description,
  onHover,
  isHovered
}: DraggableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `component-${type}`,
    data: {
      type: 'component',
      data: (() => {
        // Check if this is a form template component
        const template = formComponentTemplates.find(t => t.type === type);
        if (template) {
          return {
            template: template.createComponents()[0], // Get the first (and usually only) component from template
            type,
            name
          };
        }
        return { type, name };
      })()
    }
  });
  
  const [hoverCardRef, setHoverCardRef] = useState<HTMLDivElement | null>(null);
  const [componentRef, setComponentRef] = useState<HTMLDivElement | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0, showLeft: false });

  useEffect(() => {
    if (isHovered && componentRef) {
      const rect = componentRef.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Card dimensions (estimated)
      const cardWidth = 256; // w-64 = 16rem = 256px
      const cardHeight = 200; // estimated height
      
      // Determine horizontal position
      const spaceOnRight = viewportWidth - rect.right;
      const spaceOnLeft = rect.left;
      const showLeft = spaceOnRight < cardWidth + 16 && spaceOnLeft > cardWidth + 16;
      
      // Calculate position
      let left = showLeft ? rect.left - cardWidth - 8 : rect.right + 8;
      let top = rect.top;
      
      // Ensure card doesn't go off-screen vertically
      if (top + cardHeight > viewportHeight - 20) {
        top = viewportHeight - cardHeight - 20;
      }
      if (top < 20) {
        top = 20;
      }
      
      // Ensure card doesn't go off-screen horizontally
      if (left < 8) {
        left = 8;
      }
      if (left + cardWidth > viewportWidth - 8) {
        left = viewportWidth - cardWidth - 8;
      }
      
      setCardPosition({ top, left, showLeft });
    }
  }, [isHovered, componentRef]);
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1
  } : undefined;
  
  return <>
    <div 
      ref={(el) => {
        setNodeRef(el);
        setComponentRef(el);
      }} 
      style={style} 
      {...listeners} 
      {...attributes} 
      className="relative group flex flex-col items-center gap-1 p-2 rounded-md border border-border/30 hover:border-border hover:bg-accent/50 dark:bg-zinc-700/50 cursor-grab active:cursor-grabbing transition-all duration-200" 
      onMouseEnter={() => onHover?.(true)} 
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="w-6 h-6 flex items-center justify-center rounded bg-muted/50 group-hover:bg-primary/10 relative">
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
      </div>
      <span className="text-[10px] font-medium text-center leading-tight">{name}</span>
    </div>
    
    {/* Fixed positioned hover card to escape container boundaries */}
    {isHovered && (
      <div 
        ref={setHoverCardRef}
        className="fixed w-64 bg-background border border-border rounded-lg shadow-xl p-4 pointer-events-none backdrop-blur-sm animate-fade-in"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          zIndex: 50,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backgroundColor: 'hsl(var(--background))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">{name}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        
        <div className="p-3 bg-muted/30 rounded-md border border-border/30">
          {getComponentPreview(type)}
        </div>
      </div>
    )}
  </>;
}
interface ComponentPaletteProps {
  searchFilter?: string;
}

export function ComponentPalette({ searchFilter = '' }: ComponentPaletteProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    // Start with Layout and Form Elements open by default
    const initialState: Record<string, boolean> = {};
    componentGroups.forEach(group => {
      initialState[group.name] = ['Layout', 'Typography', 'Form Elements'].includes(group.name);
    });
    return initialState;
  });

  // Flatten all components for search
  const allComponents = useMemo(() => {
    return componentGroups.flatMap(group => group.components.map(component => ({
      ...component,
      groupName: group.name
    })));
  }, []);

  // Filter components based on search (using searchFilter prop)
  const filteredComponents = useMemo(() => {
    if (!searchFilter) {
      return selectedGroup ? componentGroups.filter(group => group.name === selectedGroup) : componentGroups;
    }
    const filtered = allComponents.filter(component => component.name.toLowerCase().includes(searchFilter.toLowerCase()) || component.description.toLowerCase().includes(searchFilter.toLowerCase()) || component.groupName.toLowerCase().includes(searchFilter.toLowerCase()));
    if (filtered.length === 0) return [];

    // Group filtered components by their original groups
    const groupedFiltered = componentGroups.map(group => ({
      ...group,
      components: filtered.filter(component => component.groupName === group.name)
    })).filter(group => group.components.length > 0);
    return groupedFiltered;
  }, [searchFilter, selectedGroup, allComponents]);
  const handleComponentHover = (componentType: string, isHovered: boolean) => {
    setHoveredComponent(isHovered ? componentType : null);
  };
  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };
  return <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0" scrollbarVariant="hover-show">
        <div className="p-0 space-y-4">
          {/* Group Filter Pills */}
          <div className="overflow-x-auto scrollbar-hide pl-[6px] pr-2 pt-2">
            <div className="flex gap-1 min-w-max">
              <Button variant={selectedGroup === null ? "default" : "outline"} size="sm" onClick={() => setSelectedGroup(null)} className="h-6 px-2 text-xs flex-shrink-0">
                All
              </Button>
              {componentGroups.map(group => <Button key={group.name} variant={selectedGroup === group.name ? "default" : "outline"} size="sm" onClick={() => setSelectedGroup(group.name)} className="h-6 px-2 text-xs flex-shrink-0">
                  {group.name}
                </Button>)}
            </div>
          </div>

          {/* Components Grid */}
          {filteredComponents.length === 0 ? <div className="text-center text-muted-foreground py-8">
              <Info className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No components found</p>
            </div> : <div className="space-y-2">
              {filteredComponents.map(group => <Collapsible key={group.name} open={openSections[group.name]} onOpenChange={() => toggleSection(group.name)}>
                  <CollapsibleTrigger asChild className="px-[8px]">
                    <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                      <div className="flex items-center gap-2">
                        {openSections[group.name] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />}
                        <span className="font-medium text-xs text-foreground">{group.name}</span>
                        <span className="text-[10px] text-muted-foreground">({group.components.length})</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-3 gap-2 mt-2 mb-4 px-3">
                      {group.components.map(component => <DraggableComponent key={component.type} type={component.type} name={component.name} icon={component.icon} description={component.description} onHover={isHovered => handleComponentHover(component.type, isHovered)} isHovered={hoveredComponent === component.type} />)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>)}
            </div>}
        </div>
      </ScrollArea>
    </div>;
}