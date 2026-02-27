import React, { useMemo, useState } from 'react';
import { PropertyField } from '@/lib/componentPropertyConfig';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/compact/Textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VisualSpacingEditor } from './VisualSpacingEditor';
import { VariableBindingField } from './VariableBindingField';
import { AlignmentControl } from './AlignmentControl';
import { DimensionControl } from './DimensionControl';
import { ColorAdvancedPicker } from './ColorAdvancedPicker';
import { DatabaseBindingField } from './DatabaseBindingField';
import { InteractionsField } from './InteractionsField';
import { VisualBorderRadiusEditor } from './VisualBorderRadiusEditor';
import { VisualBorderEditor } from './VisualBorderEditor';
import { IconPicker } from './IconPicker';
import { ClassSelector } from '../ClassSelector';
import { TypographyControl } from './TypographyControl';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { PropertyHighlightWrapper } from './PropertyHighlightWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/FileUploader';
import { Upload, Link2, Maximize2, Minimize2 } from 'lucide-react';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartFieldSelector } from '../charts/ChartFieldSelector';
import { BoxShadowsEditor, FiltersEditor, TransitionsEditor, TransformsEditor } from './effects';
import { ItemsEditor } from '../ItemsEditor';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AdvancedPropertyFieldRendererProps {
  field: PropertyField;
  value: any;
  onChange: (value: any) => void;
  component?: any; // Added to access component data including parent connection
}

export function AdvancedPropertyFieldRenderer({ field, value, onChange, component }: AdvancedPropertyFieldRendererProps) {
  const currentValue = value !== undefined ? value : field.defaultValue;
  const { getPropertyOrigin } = useStylePropertyOrigin(component?.props);
  
  // State for code-editor expanded mode - must be at top level
  const [isCodeEditorExpanded, setIsCodeEditorExpanded] = useState(false);

  // Extract available fields from connected data source for chart-field type
  const connectedFields = useMemo(() => {
    if (field.type !== 'chart-field') return [];
    
    const dataSource = component?.props?.dataSource;
    if (!dataSource?.table) return [];
    
    const table = dataSource.table;
    const fields = table.fields || table.schema || [];
    return Array.isArray(fields) ? fields : [];
  }, [field.type, component?.props?.dataSource]);

  // Handle variable binding for regular fields
  if (field.allowVariableBinding && field.type !== 'variable-binding') {
    return (
      <VariableBindingField
        label={field.label}
        value={currentValue}
        onChange={onChange}
        placeholder={field.placeholder}
        type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
        parentConnection={component?.props?._parentConnection || component?._parentConnection}
        component={component}
      />
    );
  }
  
  // Get property origin for basic inputs
  const propertyPath = field.name;
  const originInfo = getPropertyOrigin(propertyPath, currentValue);

  const renderField = () => {
    switch (field.type) {
      case 'spacing':
        return (
          <VisualSpacingEditor
            label={field.label}
            type="combined"
            value={currentValue || { 
              margin: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' },
              padding: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' }
            }}
            onChange={onChange}
            componentProps={component?.props}
            componentType={component?.type}
            defaultValue={field.defaultValue}
          />
        );

      case 'dimension':
        return (
          <DimensionControl
            label={field.label}
            value={currentValue}
            onChange={onChange}
            allowAuto={true}
            componentProps={component?.props}
            propertyName={field.name}
          />
        );

      case 'alignment':
        return (
          <AlignmentControl
            label={field.label}
            value={currentValue}
            onChange={onChange}
            type={field.name?.includes('vertical') || field.name?.includes('Vertical') ? 'vertical' : 'horizontal'}
          />
        );

      case 'color-advanced':
        return (
          <ColorAdvancedPicker
            label={field.label}
            value={currentValue}
            onChange={onChange}
            componentProps={component?.props}
            propertyName={field.name}
          />
        );

      case 'variable-binding':
        // Simple approach - just use what's already on the component
        const parentConnection = component?.props?._parentConnection || component?._parentConnection || null;
        
        // Check if this is a content field that should use rich text editor
        const isContentField = field.name === 'content' || field.label.toLowerCase().includes('content');
        
        return (
          <VariableBindingField
            label={field.label}
            value={currentValue}
            onChange={onChange}
            placeholder={field.placeholder}
            allowExpression={true}
            parentConnection={parentConnection}
            component={component}
            richText={isContentField}
          />
        );

      case 'chart-field':
        return (
          <ChartFieldSelector
            label={field.label}
            value={currentValue || ''}
            onChange={onChange}
            fields={connectedFields}
            placeholder={field.placeholder || 'Select field...'}
            allowEmpty={field.name !== 'xField' && field.name !== 'yField'}
          />
        );

      case 'database-binding':
        return (
          <DatabaseBindingField
            label={field.label}
            value={currentValue}
            onChange={onChange}
            description={field.description}
          />
        );

      case 'interactions':
        return (
          <InteractionsField
            label={field.label}
            value={currentValue || []}
            onChange={onChange}
          />
        );

      case 'border-radius':
        return (
          <VisualBorderRadiusEditor
            label={field.label}
            value={currentValue || { topLeft: '0', topRight: '0', bottomRight: '0', bottomLeft: '0', unit: 'px' }}
            onChange={onChange}
            componentProps={component?.props}
            componentType={component?.type}
          />
        );

      case 'box-shadows':
        return (
          <BoxShadowsEditor
            label={field.label}
            value={currentValue || []}
            onChange={onChange}
          />
        );

      case 'filters':
        return (
          <FiltersEditor
            label={field.label}
            value={currentValue || []}
            onChange={onChange}
          />
        );

      case 'transitions':
        return (
          <TransitionsEditor
            label={field.label}
            value={currentValue || []}
            onChange={onChange}
          />
        );

      case 'transforms':
        return (
          <TransformsEditor
            label={field.label}
            value={currentValue}
            onChange={onChange}
          />
        );

      case 'border':
        return (
          <VisualBorderEditor
            label={field.label}
            value={currentValue || { 
              width: '0', 
              style: 'none', 
              color: '#000000', 
              unit: 'px',
              sides: { top: true, right: true, bottom: true, left: true }
            }}
            onChange={onChange}
            componentProps={component?.props}
            componentType={component?.type}
          />
        );

      case 'items-editor':
        // Determine item type based on component type
        const itemType = component?.type === 'accordion' ? 'accordion' : 'tabs';
        
        // Define fields based on item type
        const itemFields = itemType === 'accordion' 
          ? [
              { name: 'title', label: 'Title', type: 'text' as const, placeholder: 'Section title' },
              { name: 'content', label: 'Content', type: 'textarea' as const, placeholder: 'Section content' }
            ]
          : [
              { name: 'label', label: 'Label', type: 'text' as const, placeholder: 'Tab label' },
              { name: 'content', label: 'Content', type: 'textarea' as const, placeholder: 'Tab content' }
            ];
        
        // Parse items from JSON string or use array directly
        let parsedItems: Array<{ id: string; [key: string]: any }> = [];
        try {
          if (typeof currentValue === 'string') {
            parsedItems = JSON.parse(currentValue);
          } else if (Array.isArray(currentValue)) {
            parsedItems = currentValue;
          }
        } catch {
          parsedItems = [];
        }
        
        // Ensure each item has an id
        if (parsedItems.length === 0) {
          parsedItems = itemType === 'accordion' 
            ? [{ id: 'section-1', title: 'Section 1', content: 'Content for section 1' }]
            : [{ id: 'tab-1', label: 'Tab 1', content: 'Content for tab 1' }];
        }
        
        return (
          <div className="w-full -mx-1">
            <ItemsEditor
              items={parsedItems}
              onChange={(newItems) => onChange(JSON.stringify(newItems))}
              itemType={itemType}
              fields={itemFields}
              className="w-full"
              componentId={component?.id}
            />
          </div>
        );

      case 'icon-picker':
        return (
          <IconPicker
            value={currentValue || 'Home2'}
            variant={component?.props?.iconVariant || 'Bold'}
            onChange={(iconName, variant) => {
              onChange(iconName);
              // Also update the iconVariant property using updateComponent
              if (component?.id) {
                const { updateComponent } = useAppBuilderStore.getState();
                updateComponent(component.id, {
                  props: { ...component.props, iconName, iconVariant: variant }
                });
              }
            }}
          />
        );

      case 'typography':
        return (
          <TypographyControl
            label={field.label}
            value={currentValue}
            onChange={onChange}
            componentProps={component?.props}
          />
        );


      case 'text':
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={currentValue || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={field.placeholder}
                  style={{ color: originInfo.color }}
                  className="w-full"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{originInfo.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'number':
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  type="number"
                  value={currentValue || ''}
                  onChange={(e) => onChange(Number(e.target.value))}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  style={{ color: originInfo.color }}
                  className="w-full"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{originInfo.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'textarea':
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Textarea
                  value={currentValue || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  style={{ color: originInfo.color }}
                  className="w-full"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{originInfo.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'code-editor':
        // Get language from component props if available (for codeblock/code)
        const codeLanguage = component?.props?.language || 'html';
        const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">{field.label}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsCodeEditorExpanded(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Inline editor - simple Monaco like CodeSettingsPopup */}
            <div className="border border-border rounded-md overflow-hidden">
              <Editor
                height="150px"
                language={codeLanguage}
                theme={isDarkMode ? 'vs-dark' : 'vs'}
                value={currentValue || ''}
                onChange={(v) => onChange(v || '')}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  roundedSelection: false,
                  automaticLayout: true,
                  fontSize: 12,
                  tabSize: 2,
                  wordWrap: 'on',
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            </div>
            
            {/* Expanded dialog */}
            <Dialog open={isCodeEditorExpanded} onOpenChange={setIsCodeEditorExpanded}>
              <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Edit Code</span>
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      {codeLanguage}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 border border-border rounded-md overflow-hidden">
                  <Editor
                    height="100%"
                    language={codeLanguage}
                    theme={isDarkMode ? 'vs-dark' : 'vs'}
                    value={currentValue || ''}
                    onChange={(v) => onChange(v || '')}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      roundedSelection: false,
                      automaticLayout: true,
                      fontSize: 13,
                      tabSize: 2,
                      wordWrap: 'on',
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                      },
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'select':
        return (
          <Select
            value={currentValue?.toString() || ''}
            onValueChange={(newValue) => {
              const option = field.options?.find(opt => opt.value.toString() === newValue);
              onChange(option ? option.value : newValue);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {field.options?.map((option) => (
                <SelectItem key={option.value.toString()} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) => onChange(Boolean(checked))}
            />
            <span className="text-sm">
              {field.label}
            </span>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{field.min || 0}</span>
              <span className="font-medium">{currentValue}</span>
              <span>{field.max || 100}</span>
            </div>
            <Slider
              value={[currentValue || field.defaultValue || 0]}
              onValueChange={(values) => onChange(values[0])}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              className="w-full"
            />
          </div>
        );

      case 'color':
        return (
          <div className="flex space-x-1">
            <Input
              type="color"
              value={currentValue || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 p-1 border rounded"
            />
            <Input
              value={currentValue || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        );

      case 'url':
        // Detect image-specific URL fields
        const isImageField = field.label?.toLowerCase().includes('image') ||
                             field.name?.toLowerCase() === 'src' ||
                             field.name?.toLowerCase().includes('image');

        if (isImageField) {
          return (
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-2">
                <Input
                  type="url"
                  value={currentValue || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={field.placeholder || 'https://example.com/image.jpg'}
                  className="w-full"
                />
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <FileUploader
                  type="image"
                  value={currentValue || null}
                  onChange={(url) => onChange(url)}
                />
              </TabsContent>
            </Tabs>
          );
        }

        return (
          <Input
            type="url"
            value={currentValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'https://example.com'}
            className="w-full"
          />
        );

      case 'active-item-selector':
        // Get items from component props (tabs have 'items', accordion has 'items')
        const selectorItems = component?.props?.items || [];
        const parsedSelectorItems = Array.isArray(selectorItems) ? selectorItems : 
          (typeof selectorItems === 'string' ? (() => { try { return JSON.parse(selectorItems); } catch { return []; } })() : []);
        
        return (
          <div className="space-y-2">
            <RadioGroup 
              value={currentValue || ''} 
              onValueChange={(val) => onChange(val)}
              className="space-y-1"
            >
              <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="" id="active-none" className="h-3.5 w-3.5" />
                <Label htmlFor="active-none" className="text-xs font-normal cursor-pointer flex-1">
                  None
                </Label>
              </div>
              {parsedSelectorItems.map((item: any, index: number) => {
                const itemId = item.id || `item-${index + 1}`;
                const itemLabel = item.label || item.title || `Item ${index + 1}`;
                return (
                  <div 
                    key={itemId} 
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <RadioGroupItem value={itemId} id={`active-${itemId}`} className="h-3.5 w-3.5" />
                    <Label htmlFor={`active-${itemId}`} className="text-xs font-normal cursor-pointer flex-1">
                      {itemLabel}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            {parsedSelectorItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No items configured yet</p>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
          />
        );
    }
  };

  // Special field types that handle their own labels/layout
  if (['checkbox', 'spacing', 'alignment', 'dimension', 'color-advanced', 'variable-binding', 'database-binding', 'interactions', 'border-radius', 'icon-picker', 'typography', 'chart-field', 'items-editor', 'active-item-selector', 'code-editor'].includes(field.type)) {
    return (
      <PropertyHighlightWrapper propertyName={field.name} componentProps={component?.props} componentType={component?.type}>
        <div className="space-y-2">
          {renderField()}
          {field.description && (
            <p className="text-[10px] text-muted-foreground">{field.description}</p>
          )}
        </div>
      </PropertyHighlightWrapper>
    );
  }

  // Standard fields with labels - use origin-based coloring
  const labelColorClass = originInfo.origin === 'active' 
    ? 'text-[#1677ff]' 
    : originInfo.origin === 'inherited' || originInfo.origin === 'parent'
      ? 'text-[#d9a800]'
      : 'text-muted-foreground';
      
  return (
    <PropertyHighlightWrapper propertyName={field.name} componentProps={component?.props} componentType={component?.type}>
      <div className="space-y-1">
        <Label className={`text-xs font-medium ${labelColorClass}`}>{field.label}</Label>
        {renderField()}
        {field.description && (
          <p className="text-[10px] text-muted-foreground">{field.description}</p>
        )}
      </div>
    </PropertyHighlightWrapper>
  );
}