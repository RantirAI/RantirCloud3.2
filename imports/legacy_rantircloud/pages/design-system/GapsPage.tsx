import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, Move, Edit, Trash2, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SpacingToken {
  id: string;
  name: string;
  value: string;
  pixels: number;
  category: 'micro' | 'small' | 'medium' | 'large' | 'macro' | 'custom';
  description?: string;
  isActive: boolean;
}

const defaultSpacing: SpacingToken[] = [
  { id: '1', name: 'xs', value: '0.25rem', pixels: 4, category: 'micro', description: 'Minimal spacing', isActive: true },
  { id: '2', name: 'sm', value: '0.5rem', pixels: 8, category: 'micro', description: 'Small spacing', isActive: true },
  { id: '3', name: 'md', value: '1rem', pixels: 16, category: 'small', description: 'Medium spacing', isActive: true },
  { id: '4', name: 'lg', value: '1.5rem', pixels: 24, category: 'medium', description: 'Large spacing', isActive: true },
  { id: '5', name: 'xl', value: '2rem', pixels: 32, category: 'medium', description: 'Extra large spacing', isActive: true },
  { id: '6', name: '2xl', value: '3rem', pixels: 48, category: 'large', description: 'Double extra large', isActive: true },
  { id: '7', name: '3xl', value: '4rem', pixels: 64, category: 'large', description: 'Triple extra large', isActive: true },
  { id: '8', name: '4xl', value: '6rem', pixels: 96, category: 'macro', description: 'Section spacing', isActive: true },
  { id: '9', name: '5xl', value: '8rem', pixels: 128, category: 'macro', description: 'Hero spacing', isActive: true },
];

const categories = [
  { id: 'micro', label: 'Micro', description: '1-8px spacing for fine details', range: '1-8px' },
  { id: 'small', label: 'Small', description: '12-16px for component spacing', range: '12-16px' },
  { id: 'medium', label: 'Medium', description: '24-32px for element groups', range: '24-32px' },
  { id: 'large', label: 'Large', description: '48-64px for sections', range: '48-64px' },
  { id: 'macro', label: 'Macro', description: '96px+ for major layouts', range: '96px+' },
  { id: 'custom', label: 'Custom', description: 'Custom spacing values', range: 'Variable' },
];

export function GapsPage() {
  const [spacing, setSpacing] = useState<SpacingToken[]>(defaultSpacing);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newSpacing, setNewSpacing] = useState({
    name: '',
    pixels: 16,
    category: 'custom' as SpacingToken['category'],
    description: ''
  });

  const filteredSpacing = selectedCategory === 'all' 
    ? spacing 
    : spacing.filter(token => token.category === selectedCategory);

  const pixelsToRem = (pixels: number) => `${pixels / 16}rem`;

  const handleAddSpacing = () => {
    if (!newSpacing.name.trim()) {
      toast.error('Please enter a spacing name');
      return;
    }

    const token: SpacingToken = {
      id: Date.now().toString(),
      name: newSpacing.name,
      value: pixelsToRem(newSpacing.pixels),
      pixels: newSpacing.pixels,
      category: newSpacing.category,
      description: newSpacing.description,
      isActive: true,
    };

    setSpacing([...spacing, token]);
    setNewSpacing({
      name: '',
      pixels: 16,
      category: 'custom',
      description: ''
    });
    toast.success(`Spacing token "${token.name}" added successfully`);
  };

  const handleDeleteSpacing = (id: string) => {
    setSpacing(spacing.filter(token => token.id !== id));
    toast.success('Spacing token deleted');
  };

  const handleCopySpacing = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Spacing value copied to clipboard');
  };

  const exportSpacingTokens = () => {
    const cssTokens = spacing
      .filter(token => token.isActive)
      .map(token => `  --spacing-${token.name}: ${token.value};`)
      .join('\n');
    
    const cssOutput = `:root {\n${cssTokens}\n}`;
    
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spacing-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Spacing tokens exported as CSS');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spacing & Gaps</h1>
          <p className="text-muted-foreground">Define consistent spacing tokens for layouts and components</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={exportSpacingTokens} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Spacing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Spacing Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Token Name</Label>
                  <Input
                    placeholder="e.g., section-gap"
                    value={newSpacing.name}
                    onChange={(e) => setNewSpacing({ ...newSpacing, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Size (pixels)</Label>
                  <div className="space-y-3">
                    <Slider
                      value={[newSpacing.pixels]}
                      onValueChange={([value]) => setNewSpacing({ ...newSpacing, pixels: value })}
                      max={200}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newSpacing.pixels}
                        onChange={(e) => setNewSpacing({ ...newSpacing, pixels: parseInt(e.target.value) || 0 })}
                        className="w-20"
                      />
                      <div className="text-sm text-muted-foreground self-center">
                        px = {pixelsToRem(newSpacing.pixels)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                    value={newSpacing.category}
                    onChange={(e) => setNewSpacing({ ...newSpacing, category: e.target.value as SpacingToken['category'] })}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.label} ({category.range})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="e.g., Standard component spacing"
                    value={newSpacing.description}
                    onChange={(e) => setNewSpacing({ ...newSpacing, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Preview</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary rounded" />
                      <div 
                        className="bg-muted rounded h-4"
                        style={{ width: `${Math.min(newSpacing.pixels * 2, 200)}px` }}
                      />
                      <div className="w-4 h-4 bg-primary rounded" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {newSpacing.pixels}px spacing preview
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddSpacing} className="w-full">
                  Add Spacing Token
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('all')}
        >
          All Spacing ({spacing.length})
        </Badge>
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
            title={category.description}
          >
            {category.label} ({spacing.filter(s => s.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Spacing Scale Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spacing Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSpacing
              .sort((a, b) => a.pixels - b.pixels)
              .map(token => (
                <div key={token.id} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                  <div className="w-20 text-sm font-mono">{token.name}</div>
                  
                  <div className="flex-1 flex items-center gap-3">
                    <div 
                      className="bg-primary rounded h-4 transition-all"
                      style={{ width: `${Math.min(token.pixels * 1.5, 300)}px` }}
                    />
                    <div className="text-sm text-muted-foreground min-w-0">
                      {token.pixels}px · {token.value}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {categories.find(c => c.id === token.category)?.label}
                    </Badge>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopySpacing(token.value)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDeleteSpacing(token.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {filteredSpacing.length === 0 && (
        <div className="text-center py-12">
          <Move className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No spacing tokens found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your spacing system by adding your first token."
              : `No spacing tokens in the ${categories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Spacing Token
          </Button>
        </div>
      )}
    </div>
  );
}