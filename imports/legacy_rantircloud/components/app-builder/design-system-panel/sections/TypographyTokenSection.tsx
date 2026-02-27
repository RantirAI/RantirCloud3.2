/**
 * Typography Token Section
 * Manages font families, type styles (sizes, weights, line heights)
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'system-ui',
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extrabold' },
];

export function TypographyTokenSection() {
  const { config, updateFontFamily, updateTypographyToken, addTypographyToken, removeTypographyToken } = useDesignSystemStore();
  const [expandedStyle, setExpandedStyle] = React.useState<string | null>(null);
  
  if (!config) return null;

  const { fontFamilies, typeStyles } = config.typography;

  const handleAddTypeStyle = () => {
    addTypographyToken({
      name: `Custom ${typeStyles.length + 1}`,
      cssVar: `--type-custom-${Date.now()}`,
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
      category: 'body',
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Font Families */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Font Families</Label>
        <div className="space-y-2">
          {fontFamilies.map(font => (
            <div key={font.id} className="flex items-center gap-2">
              <Badge variant="outline" className="w-16 justify-center text-[10px]">
                {font.category}
              </Badge>
              <Select
                value={font.value.split(',')[0].replace(/"/g, '').trim()}
                onValueChange={value => updateFontFamily(font.id, { value: `"${value}", system-ui, sans-serif` })}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(fontName => (
                    <SelectItem key={fontName} value={fontName} className="text-xs">
                      <span style={{ fontFamily: fontName }}>{fontName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Type Styles */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Type Styles</Label>
        <div className="space-y-1">
          {typeStyles.map(style => (
            <div key={style.id} className="rounded-md border bg-background overflow-hidden">
              {/* Style Header */}
              <div
                className={cn(
                  'flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 transition-colors',
                  expandedStyle === style.id && 'bg-muted/30'
                )}
                onClick={() => setExpandedStyle(expandedStyle === style.id ? null : style.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{style.name}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 h-4">
                    {style.category}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {style.fontSize} / {style.fontWeight}
                </span>
              </div>

              {/* Expanded Edit */}
              {expandedStyle === style.id && (
                <div className="p-2 border-t bg-muted/20 space-y-2">
                  {/* Preview */}
                  <div
                    className="p-2 bg-background rounded border text-foreground"
                    style={{
                      fontFamily: style.fontFamily,
                      fontSize: style.fontSize,
                      fontWeight: style.fontWeight as any,
                      lineHeight: style.lineHeight,
                      letterSpacing: style.letterSpacing,
                    }}
                  >
                    The quick brown fox
                  </div>

                  {/* Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Size</Label>
                      <Input
                        value={style.fontSize}
                        onChange={e => updateTypographyToken(style.id, { fontSize: e.target.value })}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Weight</Label>
                      <Select
                        value={style.fontWeight}
                        onValueChange={value => updateTypographyToken(style.id, { fontWeight: value })}
                      >
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHTS.map(weight => (
                            <SelectItem key={weight.value} value={weight.value} className="text-xs">
                              {weight.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Line Height</Label>
                      <Input
                        value={style.lineHeight}
                        onChange={e => updateTypographyToken(style.id, { lineHeight: e.target.value })}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
                      <Input
                        value={style.letterSpacing || ''}
                        onChange={e => updateTypographyToken(style.id, { letterSpacing: e.target.value })}
                        className="h-6 text-xs"
                        placeholder="normal"
                      />
                    </div>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-6 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      removeTypographyToken(style.id);
                      setExpandedStyle(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove Style
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddTypeStyle}
          className="w-full h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Type Style
        </Button>
      </div>
    </div>
  );
}
