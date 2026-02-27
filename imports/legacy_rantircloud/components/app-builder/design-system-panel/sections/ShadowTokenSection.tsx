/**
 * Shadow Token Section
 * Manages shadow/elevation scale tokens
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

export function ShadowTokenSection() {
  const { config, updateShadowToken, addShadowToken, removeShadowToken } = useDesignSystemStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  if (!config) return null;

  const shadowScale = config.shadows.scale;

  const handleAddToken = () => {
    addShadowToken({
      name: `custom-${Date.now()}`,
      cssVar: `--shadow-custom-${Date.now()}`,
      value: '0 4px 12px rgba(0, 0, 0, 0.15)',
      category: 'elevation',
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Shadow Preview Grid */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Elevation Scale</Label>
        <div className="grid grid-cols-3 gap-3">
          {shadowScale.filter(s => s.category === 'elevation').map(token => (
            <div
              key={token.id}
              className={cn(
                'group relative flex flex-col items-center p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer',
                editingId === token.id && 'ring-1 ring-primary'
              )}
              onClick={() => setEditingId(editingId === token.id ? null : token.id)}
            >
              <div
                className="w-12 h-12 bg-background rounded-lg border mb-1"
                style={{ boxShadow: token.value }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">{token.name}</span>
              
              {/* Delete button */}
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 bg-background border shadow-sm"
                  onClick={e => {
                    e.stopPropagation();
                    removeShadowToken(token.id);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inset Shadows */}
      {shadowScale.some(s => s.category === 'inset') && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Inset Shadows</Label>
          <div className="grid grid-cols-3 gap-3">
            {shadowScale.filter(s => s.category === 'inset').map(token => (
              <div
                key={token.id}
                className="flex flex-col items-center p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setEditingId(editingId === token.id ? null : token.id)}
              >
                <div
                  className="w-12 h-12 bg-muted rounded-lg mb-1"
                  style={{ boxShadow: token.value }}
                />
                <span className="text-[10px] font-mono text-muted-foreground">{token.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Selected Shadow */}
      {editingId && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium">Edit Shadow Value</Label>
          <Textarea
            value={shadowScale.find(s => s.id === editingId)?.value || ''}
            onChange={e => updateShadowToken(editingId, { value: e.target.value })}
            className="h-16 text-xs font-mono"
            placeholder="0 4px 6px rgba(0, 0, 0, 0.1)"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs flex-1"
              onClick={() => setEditingId(null)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Component Defaults */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Component Defaults</Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(config.shadows.componentDefaults).map(([component, tokenName]) => (
            <div key={component} className="flex items-center justify-between">
              <span className="text-muted-foreground capitalize">{component}</span>
              <Badge variant="outline" className="text-[10px]">{tokenName}</Badge>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddToken}
        className="w-full h-7 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Shadow Token
      </Button>
    </div>
  );
}
