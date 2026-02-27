import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, CornerDownRight, Edit, Trash2, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface BorderRadiusToken {
  id: string;
  name: string;
  value: string;
  pixels: number;
  category: 'subtle' | 'moderate' | 'pronounced' | 'pill' | 'custom';
  description?: string;
  isActive: boolean;
}

const defaultRadii: BorderRadiusToken[] = [
  { id: '1', name: 'none', value: '0px', pixels: 0, category: 'subtle', description: 'No rounding', isActive: true },
  { id: '2', name: 'sm', value: '2px', pixels: 2, category: 'subtle', description: 'Subtle rounding', isActive: true },
  { id: '3', name: 'md', value: '6px', pixels: 6, category: 'moderate', description: 'Standard rounding', isActive: true },
  { id: '4', name: 'lg', value: '8px', pixels: 8, category: 'moderate', description: 'Moderate rounding', isActive: true },
  { id: '5', name: 'xl', value: '12px', pixels: 12, category: 'pronounced', description: 'Prominent rounding', isActive: true },
  { id: '6', name: '2xl', value: '16px', pixels: 16, category: 'pronounced', description: 'Strong rounding', isActive: true },
  { id: '7', name: '3xl', value: '24px', pixels: 24, category: 'pronounced', description: 'Very rounded', isActive: true },
  { id: '8', name: 'full', value: '9999px', pixels: 9999, category: 'pill', description: 'Fully rounded (pill)', isActive: true },
];

const categories = [
  { id: 'subtle', label: 'Subtle', description: '0-4px for minimal rounding', range: '0-4px' },
  { id: 'moderate', label: 'Moderate', description: '6-8px for standard UI elements', range: '6-8px' },
  { id: 'pronounced', label: 'Pronounced', description: '12-24px for cards and containers', range: '12-24px' },
  { id: 'pill', label: 'Pill', description: 'Full rounding for buttons and badges', range: 'Full' },
  { id: 'custom', label: 'Custom', description: 'Custom border radius values', range: 'Variable' },
];

export function BorderRadiusPage() {
  const [radii, setRadii] = useState<BorderRadiusToken[]>(defaultRadii);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newRadius, setNewRadius] = useState({
    name: '',
    pixels: 8,
    category: 'custom' as BorderRadiusToken['category'],
    description: ''
  });

  const filteredRadii = selectedCategory === 'all' 
    ? radii 
    : radii.filter(token => token.category === selectedCategory);

  const pixelsToValue = (pixels: number) => pixels === 9999 ? '9999px' : `${pixels}px`;

  const handleAddRadius = () => {
    if (!newRadius.name.trim()) {
      toast.error('Please enter a radius name');
      return;
    }

    const token: BorderRadiusToken = {
      id: Date.now().toString(),
      name: newRadius.name,
      value: pixelsToValue(newRadius.pixels),
      pixels: newRadius.pixels,
      category: newRadius.category,
      description: newRadius.description,
      isActive: true,
    };

    setRadii([...radii, token]);
    setNewRadius({
      name: '',
      pixels: 8,
      category: 'custom',
      description: ''
    });
    toast.success(`Border radius token "${token.name}" added successfully`);
  };

  const handleDeleteRadius = (id: string) => {
    setRadii(radii.filter(token => token.id !== id));
    toast.success('Border radius token deleted');
  };

  const handleCopyRadius = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Border radius value copied to clipboard');
  };

  const exportRadiusTokens = () => {
    const cssTokens = radii
      .filter(token => token.isActive)
      .map(token => `  --radius-${token.name}: ${token.value};`)
      .join('\n');
    
    const cssOutput = `:root {\n${cssTokens}\n}`;
    
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'border-radius-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Border radius tokens exported as CSS');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Border Radius</h1>
          <p className="text-muted-foreground">Define consistent border radius tokens for rounded corners</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={exportRadiusTokens} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Radius
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Border Radius Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Token Name</Label>
                  <Input
                    placeholder="e.g., card-radius"
                    value={newRadius.name}
                    onChange={(e) => setNewRadius({ ...newRadius, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Radius (pixels)</Label>
                  <div className="space-y-3">
                    <Slider
                      value={[newRadius.pixels === 9999 ? 50 : newRadius.pixels]}
                      onValueChange={([value]) => setNewRadius({ ...newRadius, pixels: value === 50 ? 9999 : value })}
                      max={50}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={newRadius.pixels === 9999 ? 'full' : newRadius.pixels}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewRadius({ 
                            ...newRadius, 
                            pixels: val === 'full' || parseInt(val) > 50 ? 9999 : parseInt(val) || 0 
                          });
                        }}
                        className="w-24"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewRadius({ ...newRadius, pixels: 9999 })}
                      >
                        Full
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                    value={newRadius.category}
                    onChange={(e) => setNewRadius({ ...newRadius, category: e.target.value as BorderRadiusToken['category'] })}
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
                    placeholder="e.g., Standard card rounding"
                    value={newRadius.description}
                    onChange={(e) => setNewRadius({ ...newRadius, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Preview</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <div 
                        className="w-24 h-24 bg-primary/20 border-2 border-primary/40"
                        style={{ borderRadius: pixelsToValue(newRadius.pixels) }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {newRadius.pixels === 9999 ? 'Full rounding' : `${newRadius.pixels}px radius`}
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddRadius} className="w-full">
                  Add Border Radius Token
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
          All Radii ({radii.length})
        </Badge>
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
            title={category.description}
          >
            {category.label} ({radii.filter(r => r.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Border Radius Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {filteredRadii.map(token => (
          <Card key={token.id} className="group">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-center">
                <div 
                  className="w-20 h-20 bg-primary/20 border-2 border-primary/40 transition-all group-hover:bg-primary/30"
                  style={{ borderRadius: token.value }}
                />
              </div>
              
              <div className="text-center space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{token.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {categories.find(c => c.id === token.category)?.label}
                  </Badge>
                </div>
                
                <button
                  className="w-full text-left text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => handleCopyRadius(token.value)}
                >
                  {token.value}
                </button>
                
                {token.description && (
                  <p className="text-xs text-muted-foreground">{token.description}</p>
                )}
              </div>

              <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeleteRadius(token.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRadii.length === 0 && (
        <div className="text-center py-12">
          <CornerDownRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No border radius tokens found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your border radius system by adding your first token."
              : `No border radius tokens in the ${categories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Border Radius Token
          </Button>
        </div>
      )}
    </div>
  );
}