import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ColorPicker';
import { StyleClass } from '@/types/classes';
import { Palette, Type, Layout, Eye, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { designTokenService, DesignToken } from '@/services/designTokenService';

interface ClassStyleEditorProps {
  styleClass: StyleClass;
  onUpdate: (updates: Partial<StyleClass>) => void;
}

export function ClassStyleEditor({ styleClass, onUpdate }: ClassStyleEditorProps) {
  const { currentProject } = useAppBuilderStore();
  const [activeTab, setActiveTab] = useState('design-tokens');
  const [previewMode, setPreviewMode] = useState(false);
  const [designTokens, setDesignTokens] = useState<DesignToken[]>([]);

  useEffect(() => {
    if (currentProject?.id) {
      loadDesignTokens();
    }
  }, [currentProject?.id]);

  const loadDesignTokens = async () => {
    if (!currentProject?.id) return;
    
    try {
      const tokens = await designTokenService.loadDesignTokens(currentProject.id);
      setDesignTokens(tokens);
    } catch (error) {
      console.error('Failed to load design tokens:', error);
    }
  };

  const updateStyles = (newStyles: Record<string, any>) => {
    onUpdate({
      styles: {
        ...styleClass.styles,
        ...newStyles
      }
    });
  };

  const removeStyle = (property: string) => {
    const newStyles = { ...styleClass.styles };
    delete newStyles[property];
    onUpdate({ styles: newStyles });
  };

  // Typography hierarchy from design system
  const typographyHierarchy = [
    { key: 'h1', label: 'Heading 1', size: '2.25rem', weight: '700' },
    { key: 'h2', label: 'Heading 2', size: '1.875rem', weight: '600' },
    { key: 'h3', label: 'Heading 3', size: '1.5rem', weight: '600' },
    { key: 'h4', label: 'Heading 4', size: '1.25rem', weight: '600' },
    { key: 'h5', label: 'Heading 5', size: '1.125rem', weight: '600' },
    { key: 'h6', label: 'Heading 6', size: '1rem', weight: '600' },
    { key: 'body', label: 'Body Text', size: '1rem', weight: '400' },
    { key: 'title', label: 'Title', size: '1.125rem', weight: '500' },
    { key: 'paragraph', label: 'Paragraph', size: '0.875rem', weight: '400' },
  ];

  // Get color and font tokens from design system
  const colorTokens = designTokens.filter(token => token.category === 'color' && token.isActive);
  const fontTokens = designTokens.filter(token => token.category === 'font' && token.isActive);

  // Common style presets
  const sizePresets = [
    { name: 'Small', styles: { width: '200px', height: 'auto', padding: '8px' } },
    { name: 'Medium', styles: { width: '300px', height: 'auto', padding: '16px' } },
    { name: 'Large', styles: { width: '500px', height: 'auto', padding: '24px' } },
    { name: 'Full Width', styles: { width: '100%', height: 'auto', padding: '16px' } },
    { name: 'Card Size', styles: { width: '320px', height: '200px', padding: '20px', borderRadius: '8px' } }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {styleClass.name} Styles
          </h3>
          <Button
            variant={previewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {previewMode && (
        <div className="p-4 border-b border-border bg-muted/30">
          <Label className="text-sm font-medium mb-2 block">Preview</Label>
          <div 
            className="border-2 border-dashed border-primary/30 p-4 rounded-lg bg-background"
            style={styleClass.styles}
          >
            <div>Sample content with applied styles</div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="design-tokens" className="text-xs">Design System</TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
          <TabsTrigger value="styling" className="text-xs">Styling</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="design-tokens" className="space-y-4 p-4">
            <Card>
              <CardHeader className="py-2 px-3">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Typography Styles
                </Label>
              </CardHeader>
              <CardContent className="space-y-3">
                {typographyHierarchy.map((typo) => (
                  <Button
                    key={typo.key}
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => updateStyles({ 
                      fontSize: typo.size, 
                      fontWeight: typo.weight,
                      lineHeight: typo.key.startsWith('h') ? '1.2' : '1.5'
                    })}
                  >
                    <span>{typo.label}</span>
                    <span className="text-xs text-muted-foreground">{typo.size} · {typo.weight}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Color Tokens
                </Label>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Background Colors</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorTokens.map((token) => (
                      <Button
                        key={`bg-${token.id}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => updateStyles({ backgroundColor: token.value })}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2 border border-border" 
                          style={{ backgroundColor: token.value }}
                        />
                        {token.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Text Colors</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorTokens.map((token) => (
                      <Button
                        key={`color-${token.id}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => updateStyles({ color: token.value })}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2 border border-border" 
                          style={{ backgroundColor: token.value }}
                        />
                        {token.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Type className="h-3 w-3" />
                  Font Families
                </Label>
              </CardHeader>
              <CardContent className="space-y-2">
                {fontTokens.map((token) => (
                  <Button
                    key={token.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => updateStyles({ fontFamily: token.value })}
                    style={{ fontFamily: token.value }}
                  >
                    {token.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  Quick Combinations
                </Label>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateStyles({ 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))',
                    padding: '16px',
                    borderRadius: '8px'
                  })}
                >
                  Primary Card Style
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateStyles({ 
                    backgroundColor: 'hsl(var(--muted))', 
                    color: 'hsl(var(--muted-foreground))',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid hsl(var(--border))'
                  })}
                >
                  Muted Container Style
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateStyles({ 
                    fontSize: '2.25rem',
                    fontWeight: '700',
                    lineHeight: '1.2',
                    color: 'hsl(var(--foreground))'
                  })}
                >
                  Hero Heading Style
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateStyles({ 
                    fontSize: '1rem',
                    fontWeight: '400',
                    lineHeight: '1.6',
                    color: 'hsl(var(--muted-foreground))'
                  })}
                >
                  Body Text Style
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4 p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Size Presets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sizePresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => updateStyles(preset.styles)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Input
                    placeholder="e.g., 300px, 100%, auto"
                    value={styleClass.styles.width || ''}
                    onChange={(e) => updateStyles({ width: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input
                    placeholder="e.g., 200px, 100%, auto"
                    value={styleClass.styles.height || ''}
                    onChange={(e) => updateStyles({ height: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display</Label>
                <Select value={styleClass.styles.display || 'block'} onValueChange={(value) => updateStyles({ display: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="flex">Flex</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="inline-block">Inline Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {styleClass.styles.display === 'flex' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flex Direction</Label>
                    <Select value={styleClass.styles.flexDirection || 'row'} onValueChange={(value) => updateStyles({ flexDirection: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="row">Row</SelectItem>
                        <SelectItem value="column">Column</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Justify Content</Label>
                    <Select value={styleClass.styles.justifyContent || 'flex-start'} onValueChange={(value) => updateStyles({ justifyContent: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flex-start">Start</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="flex-end">End</SelectItem>
                        <SelectItem value="space-between">Space Between</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Padding</Label>
                <Input
                  placeholder="e.g., 16px, 1rem, 16px 24px"
                  value={styleClass.styles.padding || ''}
                  onChange={(e) => updateStyles({ padding: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Margin</Label>
                <Input
                  placeholder="e.g., 8px, 1rem, 8px auto"
                  value={styleClass.styles.margin || ''}
                  onChange={(e) => updateStyles({ margin: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="styling" className="space-y-4 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <ColorPicker
                  value={styleClass.styles.backgroundColor || '#ffffff'}
                  onChange={(color) => updateStyles({ backgroundColor: color })}
                />
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <ColorPicker
                  value={styleClass.styles.color || '#000000'}
                  onChange={(color) => updateStyles({ color: color })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Input
                    placeholder="e.g., 16px, 1.2rem"
                    value={styleClass.styles.fontSize || ''}
                    onChange={(e) => updateStyles({ fontSize: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select value={styleClass.styles.fontWeight || '400'} onValueChange={(value) => updateStyles({ fontWeight: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light</SelectItem>
                      <SelectItem value="400">Normal</SelectItem>
                      <SelectItem value="500">Medium</SelectItem>
                      <SelectItem value="600">Semi Bold</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Border Radius</Label>
                <div className="space-y-2">
                  <Slider
                    value={[parseInt(styleClass.styles.borderRadius?.replace('px', '') || '0')]}
                    onValueChange={([value]) => updateStyles({ borderRadius: `${value}px` })}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    {styleClass.styles.borderRadius || '0px'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Border</Label>
                <Input
                  placeholder="e.g., 1px solid #ccc"
                  value={styleClass.styles.border || ''}
                  onChange={(e) => updateStyles({ border: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Box Shadow</Label>
                <Select value={styleClass.styles.boxShadow || 'none'} onValueChange={(value) => updateStyles({ boxShadow: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="0 1px 3px rgba(0,0,0,0.1)">Small</SelectItem>
                    <SelectItem value="0 4px 6px rgba(0,0,0,0.1)">Medium</SelectItem>
                    <SelectItem value="0 10px 15px rgba(0,0,0,0.1)">Large</SelectItem>
                    <SelectItem value="0 25px 50px rgba(0,0,0,0.25)">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Custom CSS Properties</Label>
                <div className="space-y-2">
                  {Object.entries(styleClass.styles).map(([property, value]) => (
                    <div key={property} className="flex gap-2">
                      <Input
                        placeholder="Property"
                        value={property}
                        readOnly
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={value as string}
                        onChange={(e) => updateStyles({ [property]: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeStyle(property)}
                        className="px-2"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add New Property</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Property (e.g., transform)"
                    id="new-property"
                  />
                  <Input
                    placeholder="Value (e.g., scale(1.1))"
                    id="new-value"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const propertyInput = document.getElementById('new-property') as HTMLInputElement;
                      const valueInput = document.getElementById('new-value') as HTMLInputElement;
                      
                      if (propertyInput?.value && valueInput?.value) {
                        updateStyles({ [propertyInput.value]: valueInput.value });
                        propertyInput.value = '';
                        valueInput.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>CSS Output</Label>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {`.${styleClass.name} {\n${Object.entries(styleClass.styles)
                    .map(([prop, val]) => `  ${prop}: ${val};`)
                    .join('\n')}\n}`}
                </pre>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}