import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Grid, List, LayoutGrid, Columns } from 'lucide-react';

interface ListLayoutConfiguratorProps {
  config: any;
  onChange: (config: any) => void;
}

export function ListLayoutConfigurator({ config, onChange }: ListLayoutConfiguratorProps) {
  const layoutOptions = [
    { value: 'list', label: 'List', icon: List, description: 'Vertical stack of items' },
    { value: 'grid', label: 'Grid', icon: Grid, description: 'Responsive grid layout' },
    { value: 'masonry', label: 'Masonry', icon: LayoutGrid, description: 'Pinterest-style layout' },
    { value: 'columns', label: 'Columns', icon: Columns, description: 'Fixed column layout' }
  ];

  const currentLayout = config.type || 'list';

  const handleConfigChange = (key: string, value: any) => {
    onChange({
      ...config,
      [key]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Layout Type Selection */}
      <div>
        <Label className="text-base font-medium">Layout Type</Label>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {layoutOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  currentLayout === option.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleConfigChange('type', option.value)}
              >
                <CardContent className="p-4 text-center">
                  <Icon className="h-8 w-8 mx-auto mb-2" />
                  <h4 className="font-medium">{option.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Layout-specific Configuration */}
      {currentLayout === 'grid' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Grid Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Columns</Label>
              <div className="mt-2">
                <Slider
                  value={[config.columns || 3]}
                  onValueChange={([value]) => handleConfigChange('columns', value)}
                  min={1}
                  max={6}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span className="font-medium">{config.columns || 3} columns</span>
                  <span>6</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Gap Size</Label>
              <Select
                value={config.gap || 'medium'}
                onValueChange={(value) => handleConfigChange('gap', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (0.5rem)</SelectItem>
                  <SelectItem value="medium">Medium (1rem)</SelectItem>
                  <SelectItem value="large">Large (1.5rem)</SelectItem>
                  <SelectItem value="xl">Extra Large (2rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Responsive</Label>
              <Switch
                checked={config.responsive !== false}
                onCheckedChange={(checked) => handleConfigChange('responsive', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentLayout === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">List Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Item Spacing</Label>
              <Select
                value={config.spacing || 'medium'}
                onValueChange={(value) => handleConfigChange('spacing', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Dividers</Label>
              <Switch
                checked={config.showDividers || false}
                onCheckedChange={(checked) => handleConfigChange('showDividers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Zebra Striping</Label>
              <Switch
                checked={config.zebraStriping || false}
                onCheckedChange={(checked) => handleConfigChange('zebraStriping', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentLayout === 'masonry' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Masonry Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Column Width</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={config.columnWidth || 300}
                  onChange={(e) => handleConfigChange('columnWidth', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">px</span>
              </div>
            </div>

            <div>
              <Label>Gap Size</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={config.gapSize || 16}
                  onChange={(e) => handleConfigChange('gapSize', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">px</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pagination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Pagination</Label>
            <Switch
              checked={config.pagination?.enabled !== false}
              onCheckedChange={(checked) => 
                handleConfigChange('pagination', { ...config.pagination, enabled: checked })
              }
            />
          </div>

          {config.pagination?.enabled !== false && (
            <>
              <div>
                <Label>Items Per Page</Label>
                <Select
                  value={String(config.pagination?.itemsPerPage || 10)}
                  onValueChange={(value) => 
                    handleConfigChange('pagination', { 
                      ...config.pagination, 
                      itemsPerPage: parseInt(value) 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 items</SelectItem>
                    <SelectItem value="10">10 items</SelectItem>
                    <SelectItem value="20">20 items</SelectItem>
                    <SelectItem value="50">50 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pagination Style</Label>
                <Select
                  value={config.pagination?.style || 'numbered'}
                  onValueChange={(value) => 
                    handleConfigChange('pagination', { 
                      ...config.pagination, 
                      style: value 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numbered">Numbered</SelectItem>
                    <SelectItem value="loadMore">Load More Button</SelectItem>
                    <SelectItem value="infinite">Infinite Scroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Search</Label>
            <Switch
              checked={config.search?.enabled || false}
              onCheckedChange={(checked) => 
                handleConfigChange('search', { ...config.search, enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable Sorting</Label>
            <Switch
              checked={config.sorting?.enabled || false}
              onCheckedChange={(checked) => 
                handleConfigChange('sorting', { ...config.sorting, enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable Filtering</Label>
            <Switch
              checked={config.filtering?.enabled || false}
              onCheckedChange={(checked) => 
                handleConfigChange('filtering', { ...config.filtering, enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}