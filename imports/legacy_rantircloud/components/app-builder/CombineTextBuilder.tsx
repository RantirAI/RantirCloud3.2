import { useState, useCallback, useMemo, useEffect, memo, useDeferredValue } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Trash2,
  GripVertical,
  Type,
  Hash,
  Database,
  Calendar,
  DollarSign,
  Percent,
  ArrowUpAZ,
  ArrowDownAZ,
  TextCursor,
  Eye,
  Layers,
  Sparkles,
  X,
  Code2,
  Wand2,
  Variable,
  Search,
  Check,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
}

// Segment types
type SegmentType = 'field' | 'text' | 'number';

// Available formatters
type FormatterType = 
  | 'none'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'titlecase'
  | 'currency_usd'
  | 'currency_eur'
  | 'currency_gbp'
  | 'currency_auto'
  | 'decimal_0'
  | 'decimal_1'
  | 'decimal_2'
  | 'percentage'
  | 'date_short'
  | 'date_long'
  | 'date_relative'
  | 'time_short'
  | 'datetime';

interface Segment {
  id: string;
  type: SegmentType;
  value: string;
  fieldName?: string;
  formatter?: FormatterType;
}

interface CombineTextBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (binding: string) => void;
  fields: Field[];
  currentBinding?: string;
  tableName?: string;
}

// Static formatter config - icons are rendered lazily
const FORMATTER_CONFIG: { value: FormatterType; label: string; iconType: string; category: string }[] = [
  { value: 'none', label: 'No Format', iconType: 'none', category: 'basic' },
  { value: 'uppercase', label: 'UPPERCASE', iconType: 'arrow-up', category: 'string' },
  { value: 'lowercase', label: 'lowercase', iconType: 'arrow-down', category: 'string' },
  { value: 'capitalize', label: 'Capitalize', iconType: 'text-cursor', category: 'string' },
  { value: 'titlecase', label: 'Title Case', iconType: 'type', category: 'string' },
  { value: 'currency_usd', label: '$ USD', iconType: 'dollar', category: 'currency' },
  { value: 'currency_eur', label: '€ EUR', iconType: 'dollar', category: 'currency' },
  { value: 'currency_gbp', label: '£ GBP', iconType: 'dollar', category: 'currency' },
  { value: 'currency_auto', label: 'Auto Currency', iconType: 'dollar', category: 'currency' },
  { value: 'decimal_0', label: 'Integer', iconType: 'hash', category: 'number' },
  { value: 'decimal_1', label: '1 Decimal', iconType: 'hash', category: 'number' },
  { value: 'decimal_2', label: '2 Decimals', iconType: 'hash', category: 'number' },
  { value: 'percentage', label: 'Percent %', iconType: 'percent', category: 'number' },
  { value: 'date_short', label: 'Short Date', iconType: 'calendar', category: 'date' },
  { value: 'date_long', label: 'Long Date', iconType: 'calendar', category: 'date' },
  { value: 'date_relative', label: 'Relative', iconType: 'calendar', category: 'date' },
  { value: 'time_short', label: 'Time', iconType: 'calendar', category: 'date' },
  { value: 'datetime', label: 'Date & Time', iconType: 'calendar', category: 'date' },
];

// Formatter caches to avoid re-creating Intl objects
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const getNumberFormatter = (locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!numberFormatCache.has(key)) {
    numberFormatCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatCache.get(key)!;
};

// Memoized icon component
const FormatterIcon = memo(({ type }: { type: string }) => {
  const className = "h-3.5 w-3.5";
  switch (type) {
    case 'arrow-up': return <ArrowUpAZ className={className} />;
    case 'arrow-down': return <ArrowDownAZ className={className} />;
    case 'text-cursor': return <TextCursor className={className} />;
    case 'type': return <Type className={className} />;
    case 'dollar': return <DollarSign className={className} />;
    case 'hash': return <Hash className={className} />;
    case 'percent': return <Percent className={className} />;
    case 'calendar': return <Calendar className={className} />;
    default: return null;
  }
});

// Field type icon helper
const getFieldTypeIcon = (type: string) => {
  const t = type?.toLowerCase() || 'string';
  if (t === 'number' || t === 'integer') return <Hash className="h-3.5 w-3.5" />;
  if (t === 'date' || t === 'datetime') return <Calendar className="h-3.5 w-3.5" />;
  if (t === 'boolean') return <Check className="h-3.5 w-3.5" />;
  return <Type className="h-3.5 w-3.5" />;
};

const generateId = () => `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Build the binding string from segments
const buildBindingString = (segments: Segment[]): string => {
  return segments.map(segment => {
    if (segment.type === 'text' || segment.type === 'number') {
      return segment.value;
    }
    
    if (segment.type === 'field' && segment.fieldName) {
      const formatter = segment.formatter || 'none';
      if (formatter === 'none') {
        return `{{${segment.fieldName}}}`;
      }
      // Format: {{fieldName|formatter}}
      return `{{${segment.fieldName}|${formatter}}}`;
    }
    
    return '';
  }).join('');
};

// Parse existing binding string into segments
const parseBindingString = (binding: string, fields: Field[]): Segment[] => {
  if (!binding) return [];
  
  const segments: Segment[] = [];
  const regex = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(binding)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = binding.slice(lastIndex, match.index);
      if (textBefore) {
        segments.push({
          id: generateId(),
          type: 'text',
          value: textBefore,
        });
      }
    }
    
    // Add field segment
    const fieldName = match[1];
    const formatter = match[2] as FormatterType || 'none';
    segments.push({
      id: generateId(),
      type: 'field',
      value: `{{${fieldName}}}`,
      fieldName,
      formatter,
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < binding.length) {
    segments.push({
      id: generateId(),
      type: 'text',
      value: binding.slice(lastIndex),
    });
  }
  
  return segments;
};

// Field Picker Component - lightweight and optimized
const FieldPicker = memo(({ 
  fields, 
  onSelect, 
  onClose,
  currentFieldName 
}: { 
  fields: Field[]; 
  onSelect: (fieldName: string) => void; 
  onClose: () => void;
  currentFieldName?: string;
}) => {
  const [search, setSearch] = useState('');
  
  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields;
    const q = search.toLowerCase();
    return fields.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.type?.toLowerCase().includes(q)
    );
  }, [fields, search]);

  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="h-8 pl-8 text-sm bg-background"
            autoFocus
          />
        </div>
      </div>
      
      {/* Field List */}
      <ScrollArea className="max-h-48">
        <div className="p-1">
          {filteredFields.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No fields found
            </div>
          ) : (
            filteredFields.map(field => (
              <button
                key={field.id}
                onClick={() => {
                  onSelect(field.name);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors",
                  "hover:bg-accent/50",
                  currentFieldName === field.name && "bg-primary/10 text-primary"
                )}
              >
                <span className="text-muted-foreground">
                  {getFieldTypeIcon(field.type)}
                </span>
                <span className="flex-1 font-medium text-sm truncate">{field.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                  {field.type}
                </Badge>
                {currentFieldName === field.name && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

// Lightweight Formatter Picker - replaces heavy Select component
// Filters formatters based on field type for better UX
const FormatterPicker = memo(({ 
  value, 
  onChange,
  onClose,
  fieldType,
}: { 
  value: FormatterType;
  onChange: (value: FormatterType) => void;
  onClose: () => void;
  fieldType?: string;
}) => {
  // Filter categories based on field type
  const categories = useMemo(() => {
    const normalizedType = fieldType?.toLowerCase() || 'string';
    
    // Determine which categories to show based on field type
    const isNumeric = ['number', 'integer', 'float', 'decimal', 'currency', 'price'].includes(normalizedType);
    const isDate = ['date', 'datetime', 'timestamp', 'time'].includes(normalizedType);
    const isString = !isNumeric && !isDate;
    
    const allCategories = [
      { key: 'basic', label: 'Basic', items: FORMATTER_CONFIG.filter(f => f.category === 'basic'), show: true },
      { key: 'string', label: 'Text', items: FORMATTER_CONFIG.filter(f => f.category === 'string'), show: isString },
      { key: 'currency', label: 'Currency', items: FORMATTER_CONFIG.filter(f => f.category === 'currency'), show: isNumeric },
      { key: 'number', label: 'Number', items: FORMATTER_CONFIG.filter(f => f.category === 'number'), show: isNumeric },
      { key: 'date', label: 'Date & Time', items: FORMATTER_CONFIG.filter(f => f.category === 'date'), show: isDate },
    ];
    
    return allCategories.filter(cat => cat.show && cat.items.length > 0);
  }, [fieldType]);

  return (
    <div 
      className="absolute top-full right-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <ScrollArea className="max-h-64">
        <div className="p-1">
          {categories.map((cat, catIndex) => (
            <div key={cat.key}>
              {catIndex > 0 && <Separator className="my-1" />}
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {cat.label}
              </div>
              {cat.items.map(f => (
                <button
                  key={f.value}
                  onClick={() => {
                    onChange(f.value);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-sm transition-colors",
                    "hover:bg-accent/50",
                    value === f.value && "bg-primary/10 text-primary"
                  )}
                >
                  {f.iconType !== 'none' && (
                    <span className="text-muted-foreground">
                      <FormatterIcon type={f.iconType} />
                    </span>
                  )}
                  <span className="flex-1">{f.label}</span>
                  {value === f.value && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

// Memoized Segment Row Component
const SegmentRow = memo(({
  segment,
  index,
  fields,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: {
  segment: Segment;
  index: number;
  fields: Field[];
  onUpdate: (id: string, updates: Partial<Segment>) => void;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) => {
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showFormatterPicker, setShowFormatterPicker] = useState(false);

  const handleBindField = useCallback((fieldName: string) => {
    // Convert to field segment
    onUpdate(segment.id, {
      type: 'field',
      fieldName,
      value: `{{${fieldName}}}`,
      formatter: 'none',
    });
    setShowFieldPicker(false);
  }, [segment.id, onUpdate]);

  const handleUnbind = useCallback(() => {
    // Convert back to text segment
    onUpdate(segment.id, {
      type: 'text',
      fieldName: undefined,
      value: '',
      formatter: undefined,
    });
  }, [segment.id, onUpdate]);

  const handleFormatterChange = useCallback((value: FormatterType) => {
    onUpdate(segment.id, { formatter: value });
    setShowFormatterPicker(false);
  }, [segment.id, onUpdate]);

  const getSegmentTypeStyle = (type: SegmentType) => {
    switch (type) {
      case 'field':
        return {
          badge: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/50 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-blue-400 dark:border-blue-500/30',
          border: 'border-l-blue-500',
          icon: <Database className="h-3.5 w-3.5" />,
        };
      case 'text':
        return {
          badge: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
          border: 'border-l-emerald-500',
          icon: <Type className="h-3.5 w-3.5" />,
        };
      case 'number':
        return {
          badge: 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-600 border-violet-200/50 dark:from-violet-500/20 dark:to-purple-500/20 dark:text-violet-400 dark:border-violet-500/30',
          border: 'border-l-violet-500',
          icon: <Hash className="h-3.5 w-3.5" />,
        };
    }
  };

  const style = getSegmentTypeStyle(segment.type);
  const boundField = segment.type === 'field' ? fields.find(f => f.name === segment.fieldName) : null;
  const currentFormatter = FORMATTER_CONFIG.find(f => f.value === (segment.formatter || 'none'));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg bg-background border border-border/60 transition-all duration-200",
        "hover:border-border hover:shadow-sm",
        `border-l-[3px] ${style.border}`,
        isDragging && "opacity-50 border-primary shadow-lg"
      )}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Segment Type Badge */}
      <Badge 
        variant="outline" 
        className={cn(
          "shrink-0 gap-1.5 py-1 px-2.5 font-medium capitalize",
          style.badge
        )}
      >
        {style.icon}
        {segment.type}
      </Badge>

      {/* Value Input / Bind Button */}
      <div className="flex-1 min-w-0 relative">
        {segment.type === 'field' ? (
          // Field segment - show bound field with bind button
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className={cn(
                "flex items-center gap-2 h-9 px-3 rounded-md border transition-all w-full",
                boundField 
                  ? "bg-blue-50/50 border-blue-200/60 dark:bg-blue-500/10 dark:border-blue-500/30" 
                  : "bg-background/80 border-border/60 border-dashed hover:border-primary"
              )}
            >
              <Variable className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              {boundField ? (
                <>
                  <span className="font-medium text-sm truncate">{boundField.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal ml-auto shrink-0">
                    {boundField.type}
                  </Badge>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Click to bind field...</span>
              )}
            </button>
            {showFieldPicker && (
              <FieldPicker
                fields={fields}
                onSelect={handleBindField}
                onClose={() => setShowFieldPicker(false)}
                currentFieldName={segment.fieldName}
              />
            )}
          </div>
        ) : (
          // Text/Number segment - show input with bind icon
          <div className="flex items-center gap-2">
            <Input
              value={segment.value}
              onChange={(e) => onUpdate(segment.id, { value: e.target.value })}
              placeholder={segment.type === 'text' ? 'Enter text...' : 'Enter number...'}
              type="text"
              className="h-9 bg-background/80 border-border/60 hover:border-border focus:border-primary transition-colors"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              title="Bind to field"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            {showFieldPicker && (
              <FieldPicker
                fields={fields}
                onSelect={handleBindField}
                onClose={() => setShowFieldPicker(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Formatter (for fields only) - Lightweight picker */}
      {segment.type === 'field' && segment.fieldName && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowFormatterPicker(!showFormatterPicker)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-md border transition-all",
              "bg-background/80 border-border/60 hover:border-border min-w-[120px]"
            )}
          >
            <Wand2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{currentFormatter?.label || 'No Format'}</span>
          </button>
          {showFormatterPicker && (
            <FormatterPicker
              value={segment.formatter || 'none'}
              onChange={handleFormatterChange}
              onClose={() => setShowFormatterPicker(false)}
              fieldType={boundField?.type}
            />
          )}
        </div>
      )}

      {/* Unbind Button (for fields) */}
      {segment.type === 'field' && segment.fieldName && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUnbind}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all shrink-0"
          title="Unbind field"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(segment.id)}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

export function CombineTextBuilder({
  open,
  onOpenChange,
  onApply,
  fields,
  currentBinding,
  tableName = 'Database Table',
}: CombineTextBuilderProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize segments only when dialog opens - prevents lag
  useEffect(() => {
    if (open && !isInitialized) {
      // Use requestAnimationFrame to defer parsing after render
      requestAnimationFrame(() => {
        setSegments(parseBindingString(currentBinding || '', fields));
        setIsInitialized(true);
      });
    }
    if (!open) {
      setIsInitialized(false);
    }
  }, [open, currentBinding, fields, isInitialized]);

  // Preview the combined result
  const previewResult = useMemo(() => {
    return buildBindingString(segments);
  }, [segments]);

  // Defer segments for preview to avoid blocking UI
  const deferredSegments = useDeferredValue(segments);

  // Sample preview with mock data - uses deferred segments
  const samplePreview = useMemo(() => {
    return deferredSegments.map(segment => {
      if (segment.type === 'text' || segment.type === 'number') {
        return segment.value;
      }
      
      if (segment.type === 'field') {
        const formatter = segment.formatter || 'none';
        const mockValue = getMockValue(segment.fieldName || '', formatter, fields);
        return mockValue;
      }
      
      return '';
    }).join('');
  }, [deferredSegments, fields]);

  const addSegment = useCallback((type: SegmentType) => {
    const newSegment: Segment = {
      id: generateId(),
      type,
      value: type === 'text' ? '' : type === 'number' ? '' : '',
      formatter: 'none',
    };
    setSegments(prev => [...prev, newSegment]);
  }, []);

  const updateSegment = useCallback((id: string, updates: Partial<Segment>) => {
    setSegments(prev => prev.map(seg => 
      seg.id === id ? { ...seg, ...updates } : seg
    ));
  }, []);

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  }, []);

  const moveSegment = useCallback((fromIndex: number, toIndex: number) => {
    setSegments(prev => {
      const newSegments = [...prev];
      const [removed] = newSegments.splice(fromIndex, 1);
      newSegments.splice(toIndex, 0, removed);
      return newSegments;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveSegment(draggedIndex, index);
      setDraggedIndex(index);
    }
  }, [draggedIndex, moveSegment]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Don't render anything if dialog is closed - prevents unnecessary DOM
  // This MUST come after all hooks
  if (!open) return null;

  const handleApply = () => {
    const binding = buildBindingString(segments);
    onApply(binding);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                <Layers className="h-4.5 w-4.5 text-primary" />
              </div>
              Combine Text Builder
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/80">
              Build dynamic text by combining data fields, static text, and powerful formatters.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Add Segment Buttons */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSegment('field')}
                className="gap-2 h-9 px-4 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200/50 hover:border-blue-300 hover:bg-blue-50/50 dark:border-blue-500/30 dark:hover:bg-blue-500/10 transition-all"
              >
                <Database className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Field</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSegment('text')}
                className="gap-2 h-9 px-4 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border-emerald-200/50 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 transition-all"
              >
                <Type className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Text</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSegment('number')}
                className="gap-2 h-9 px-4 bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-200/50 hover:border-violet-300 hover:bg-violet-50/50 dark:border-violet-500/30 dark:hover:bg-violet-500/10 transition-all"
              >
                <Hash className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-violet-600 dark:text-violet-400 font-medium">Number</span>
              </Button>
            </div>
          </div>

          {/* Segments List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Segments
              </span>
              <Badge variant="secondary" className="text-xs font-mono">
                {segments.length}
              </Badge>
            </div>
            
            <div className="border rounded-xl bg-muted/20 overflow-hidden">
              <ScrollArea className="h-[240px]">
                <div className="p-3 space-y-2">
                  {segments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-3 rounded-full bg-muted/50 mb-3">
                        <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No segments yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Click the buttons above to start building
                      </p>
                    </div>
                  ) : (
                    segments.map((segment, index) => (
                      <SegmentRow
                        key={segment.id}
                        segment={segment}
                        index={index}
                        fields={fields}
                        onUpdate={updateSegment}
                        onRemove={removeSegment}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex === index}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Binding Expression */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expression</span>
                </div>
                <code className="text-sm font-mono text-foreground/90 break-all leading-relaxed">
                  {previewResult || <span className="text-muted-foreground italic">Empty</span>}
                </code>
              </div>

              {/* Sample Output */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">Sample Output</span>
                </div>
                <div className="text-sm font-medium text-foreground leading-relaxed">
                  {samplePreview || <span className="text-muted-foreground italic">Empty</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSegments([])}
            disabled={segments.length === 0}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-4"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={segments.length === 0}
              className="px-6 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Apply Binding
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to generate mock values for preview - with cached formatters
function getMockValue(fieldName: string, formatter: FormatterType, fields: Field[]): string {
  const field = fields.find(f => f.name === fieldName);
  const fieldType = field?.type?.toLowerCase() || 'string';
  
  // Generate mock value based on field type
  let mockValue: string | number | Date;
  
  if (fieldType === 'number' || fieldType === 'integer') {
    mockValue = 1234.56;
  } else if (fieldType === 'date' || fieldType === 'datetime') {
    mockValue = new Date();
  } else if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('amount')) {
    mockValue = 99.99;
  } else if (fieldName.toLowerCase().includes('name')) {
    mockValue = 'John Doe';
  } else if (fieldName.toLowerCase().includes('email')) {
    mockValue = 'john@example.com';
  } else {
    mockValue = 'Sample Value';
  }

  // Apply formatter with cached Intl objects
  switch (formatter) {
    case 'uppercase':
      return String(mockValue).toUpperCase();
    case 'lowercase':
      return String(mockValue).toLowerCase();
    case 'capitalize':
      return String(mockValue).charAt(0).toUpperCase() + String(mockValue).slice(1).toLowerCase();
    case 'titlecase':
      return String(mockValue).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'currency_usd':
      return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' }).format(Number(mockValue) || 0);
    case 'currency_eur':
      return getNumberFormatter('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(mockValue) || 0);
    case 'currency_gbp':
      return getNumberFormatter('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(mockValue) || 0);
    case 'currency_auto':
      return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' }).format(Number(mockValue) || 0);
    case 'decimal_0':
      return getNumberFormatter('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(mockValue) || 0);
    case 'decimal_1':
      return getNumberFormatter('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(mockValue) || 0);
    case 'decimal_2':
      return getNumberFormatter('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(mockValue) || 0);
    case 'percentage':
      return getNumberFormatter('en-US', { style: 'percent' }).format(Number(mockValue) / 100 || 0);
    case 'date_short':
      return mockValue instanceof Date ? mockValue.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : String(mockValue);
    case 'date_long':
      return mockValue instanceof Date ? mockValue.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : String(mockValue);
    case 'date_relative':
      return '2 days ago';
    case 'time_short':
      return mockValue instanceof Date ? mockValue.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : String(mockValue);
    case 'datetime':
      return mockValue instanceof Date ? mockValue.toLocaleString('en-US') : String(mockValue);
    default:
      return String(mockValue);
  }
}
