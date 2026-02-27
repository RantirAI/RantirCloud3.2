
import React, { useState } from 'react';
import { PropertyField } from '@/lib/componentPropertyConfig';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/compact/Textarea';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Palette, Upload, Link2 } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from './RichTextEditor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PropertyFieldRendererProps {
  field: PropertyField;
  value: any;
  onChange: (value: any) => void;
  componentProps?: Record<string, any>;
}

export function PropertyFieldRenderer({ field, value, onChange, componentProps }: PropertyFieldRendererProps) {
  const currentValue = value !== undefined ? value : field.defaultValue;

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="w-full"
          />
        );

      case 'textarea':
        // Check if this is a content field that should support rich text
        const isRichTextField = field.name === 'content' || field.allowVariableBinding;
        
        if (isRichTextField) {
          return (
            <RichTextEditor
              value={currentValue || ''}
              onChange={onChange}
              placeholder={field.placeholder}
            />
          );
        }
        
        return (
          <Textarea
            value={currentValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="w-full"
          />
        );

      case 'select':
        return (
          <Select
            value={currentValue?.toString() || ''}
            onValueChange={(newValue) => {
              // Convert back to appropriate type
              const option = field.options?.find(opt => opt.value.toString() === newValue);
              onChange(option ? option.value : newValue);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
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
            <Label className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
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
          <div className="flex space-x-2">
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
        // Check if this is an image URL field (for images)
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
        const items = componentProps?.items || [];
        const parsedItems = Array.isArray(items) ? items : 
          (typeof items === 'string' ? (() => { try { return JSON.parse(items); } catch { return []; } })() : []);
        
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
              {parsedItems.map((item: any, index: number) => {
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
            {parsedItems.length === 0 && (
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

  if (field.type === 'checkbox') {
    // Checkbox renders its own label
    return (
      <div className="space-y-2">
        {renderField()}
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{field.label}</Label>
      {renderField()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
