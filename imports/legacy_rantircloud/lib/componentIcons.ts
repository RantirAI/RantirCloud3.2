import {
  Type, Square, Columns, Grid3X3, MousePointer, Edit, FileText, CheckSquare, Circle, Image, CreditCard, Table, List, Navigation, Zap, Archive, Menu, Calendar, Upload, User, Tag, AlertCircle, BarChart, Minus, Play, Pause, Volume2, MapPin, Clock, Shield, Star, Heart, ThumbsUp, MessageSquare, Share, Search, Filter, Download, RefreshCw, Settings, Bell, Mail, Phone, Globe, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Plus, X, Check, Info, AlertTriangle, Loader, Video, Music, Bookmark, ShoppingCart, Wallet, PieChart, LineChart, Activity, Thermometer, Gauge, Layers, Move, Copy, Trash2, MoreHorizontal, Sliders, Radio, Mic, Camera, Gamepad2, Briefcase, Home, Building, Car, Plane, Ship, Train, Bike, Palette, Brush, Scissors, Ruler, Paperclip, Folder, FolderOpen, File, FileEdit, Code, Terminal, Database, Server, Wifi, Smartphone, Tablet, Monitor, Printer, Headphones, Volume1, VolumeX, SkipBack, SkipForward, Repeat, Shuffle, Maximize, Minimize, RotateCcw, RotateCw, ZoomIn, ZoomOut, Anchor, Award, Feather, Gift, Lightbulb, Magnet, Puzzle, Sparkles, Sunrise, Sunset, Umbrella, Compass, Route, Target, Flame, Snowflake, Droplet, Mountain, TreePine, Flower, Sun, Moon, Cloud, CloudRain, CloudSnow, Wind, Tornado, Rainbow, Atom, Dna, Microscope, Telescope, Rocket, Satellite, Cpu, HardDrive, MemoryStick, Usb, Bluetooth, Tv, Speaker, Webcam, Gamepad, Joystick, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Spade, Diamond, Club, Crown, Trophy, Medal, Flag, Pin, Inbox, Send, Reply, Forward, Trash, Delete, Edit2, Edit3, FilePlus, FileMinus, FileX, FileCheck, Save, SaveAll, Undo, Redo, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, ListOrdered, Hash, Quote, Link, Unlink, ExternalLink, Maximize2, Minimize2, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight, TrendingUp, TrendingDown, BarChart2, BarChart3, BarChart4, AreaChart, Heading
} from 'lucide-react';
import { DatabaseIcon } from '@/components/DatabaseIcon';
import { ComponentType } from '@/types/appBuilder';

// Icon mapping based on ComponentPalette.tsx
const componentIconMap: Record<ComponentType, React.ComponentType<any>> = {
  // Layout
  div: Square,
  section: Layers,
  container: CornerDownRight,
  row: Columns,
  column: Columns,
  grid: Grid3X3,
  spacer: Minus,
  separator: Minus,
  'aspect-ratio': Square,
  resizable: Move,

  // Typography
  text: Type,
  heading: Heading,
  blockquote: Quote,
  code: Code,
  codeblock: Terminal,
  link: Link,
  icon: Star,

  // Form Elements
  button: MousePointer,
  input: Edit,
  'password-input': Lock,
  textarea: FileText,
  select: ChevronDown,
  checkbox: CheckSquare,
  radio: Circle,
  'radio-group': Circle,
  'checkbox-group': CheckSquare,
  switch: Settings,
  slider: Sliders,
  form: FileText,
  'form-wrapper': FileText,
  'form-wizard': Layers,
  label: Tag,
  combobox: Search,
  'input-otp': Lock,

  // Media & Files
  image: Image,
  avatar: User,
  fileupload: Upload,
  video: Video,
  audio: Music,

  // Data Display
  datatable: DatabaseIcon,
  table: Table,
  list: List,
  'data-display': Database,
  card: CreditCard,
  chart: BarChart,
  badge: Tag,
  keyboard: Terminal,
  skeleton: Loader,

  // Navigation
  navigation: Navigation,
  'nav-horizontal': Navigation,
  'nav-vertical': Menu,
  header: Zap,
  footer: Archive,
  sidebar: Menu,
  tabs: Menu,
  'tab-item': Menu,
  'tab-trigger': Menu,
  'tab-content': FileText,
  breadcrumb: Route,
  pagination: MoreHorizontal,
  command: Terminal,
  menubar: Menu,
  'navigation-menu': Navigation,

  // Feedback
  alert: AlertCircle,
  toast: Bell,
  progress: BarChart,
  'alert-dialog': AlertTriangle,
  sonner: Bell,

  // Overlays
  modal: Square,
  dialog: Square,
  sheet: Square,
  popover: MessageSquare,
  tooltip: Info,
  'hover-card': MousePointer,
  'context-menu': MoreHorizontal,
  'dropdown-menu': ChevronDown,
  drawer: Square,

  // Interactive
  accordion: List,
  'accordion-item': List,
  'accordion-header': ChevronDown,
  'accordion-content': FileText,
  collapsible: ChevronDown,
  calendar: Calendar,
  datepicker: Calendar,
  carousel: Play,
  'carousel-slide': Layers,
  'carousel-slide-content': FileText,
  toggle: Settings,
  'toggle-group': Settings,

  // Utilities
  'scroll-area': Move,
  divider: Minus,
  loading: Loader,
  spinner: RefreshCw,
  'theme-toggle': Sun,

  // Auth components
  'login-form': Lock,
  'register-form': Lock,
  'user-profile': User,
  'auth-status': Lock,

  // Dynamic components
  'dynamic-list': List,
  'pro-dynamic-list': List,
  'dynamic-grid': Grid3X3,

  // User components
  'user-component': Puzzle,
};

export function getComponentIcon(componentType: ComponentType): React.ComponentType<any> {
  return componentIconMap[componentType] || Settings;
}

export function getComponentName(componentType: ComponentType): string {
  // Convert component type to display name
  return componentType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}