import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HexColorPicker } from 'react-colorful';
import { Plus, Trash2, Copy, Edit, Eye, EyeOff, Download, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface ColorToken {
  id: string;
  name: string;
  value: string;
  category: 'primary' | 'secondary' | 'neutral' | 'semantic' | 'custom';
  description?: string;
  isActive: boolean;
}

const defaultColors: ColorToken[] = [
  { id: '1', name: 'Primary', value: '#3b82f6', category: 'primary', description: 'Main brand color', isActive: true },
  { id: '2', name: 'Primary Light', value: '#60a5fa', category: 'primary', description: 'Light variant of primary', isActive: true },
  { id: '3', name: 'Primary Dark', value: '#1d4ed8', category: 'primary', description: 'Dark variant of primary', isActive: true },
  { id: '4', name: 'Secondary', value: '#64748b', category: 'secondary', description: 'Secondary brand color', isActive: true },
  { id: '5', name: 'Success', value: '#22c55e', category: 'semantic', description: 'Success state color', isActive: true },
  { id: '6', name: 'Warning', value: '#f59e0b', category: 'semantic', description: 'Warning state color', isActive: true },
  { id: '7', name: 'Error', value: '#ef4444', category: 'semantic', description: 'Error state color', isActive: true },
  { id: '8', name: 'Info', value: '#3b82f6', category: 'semantic', description: 'Informational color', isActive: true },
  { id: '9', name: 'Gray 50', value: '#f8fafc', category: 'neutral', description: 'Lightest gray', isActive: true },
  { id: '10', name: 'Gray 100', value: '#f1f5f9', category: 'neutral', description: 'Very light gray', isActive: true },
  { id: '11', name: 'Gray 500', value: '#64748b', category: 'neutral', description: 'Medium gray', isActive: true },
  { id: '12', name: 'Gray 900', value: '#0f172a', category: 'neutral', description: 'Darkest gray', isActive: true },
];

const colorCategories = [
  { id: 'primary', label: 'Primary', color: '#3b82f6' },
  { id: 'secondary', label: 'Secondary', color: '#64748b' },
  { id: 'neutral', label: 'Neutral', color: '#94a3b8' },
  { id: 'semantic', label: 'Semantic', color: '#22c55e' },
  { id: 'custom', label: 'Custom', color: '#8b5cf6' },
];

export function ColorsPage() {
  const [colors, setColors] = useState<ColorToken[]>(defaultColors);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newColor, setNewColor] = useState({ name: '', value: '#3b82f6', category: 'custom' as ColorToken['category'], description: '' });
  const [editingColor, setEditingColor] = useState<ColorToken | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredColors = selectedCategory === 'all' 
    ? colors 
    : colors.filter(color => color.category === selectedCategory);

  const handleAddColor = () => {
    if (!newColor.name.trim()) {
      toast.error('Please enter a color name');
      return;
    }

    const color: ColorToken = {
      id: Date.now().toString(),
      name: newColor.name,
      value: newColor.value,
      category: newColor.category,
      description: newColor.description,
      isActive: true,
    };

    setColors([...colors, color]);
    setNewColor({ name: '', value: '#3b82f6', category: 'custom', description: '' });
    toast.success(`Color "${color.name}" added successfully`);
  };

  const handleEditColor = (color: ColorToken) => {
    setEditingColor(color);
    setIsDialogOpen(true);
  };

  const handleUpdateColor = () => {
    if (!editingColor) return;

    setColors(colors.map(color => 
      color.id === editingColor.id ? editingColor : color
    ));
    setEditingColor(null);
    setIsDialogOpen(false);
    toast.success('Color updated successfully');
  };

  const handleDeleteColor = (id: string) => {
    setColors(colors.filter(color => color.id !== id));
    toast.success('Color deleted');
  };

  const handleToggleActive = (id: string) => {
    setColors(colors.map(color => 
      color.id === id ? { ...color, isActive: !color.isActive } : color
    ));
  };

  const handleCopyColor = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Color value copied to clipboard');
  };

  const exportColorTokens = () => {
    const cssTokens = colors
      .filter(color => color.isActive)
      .map(color => `  --color-${color.name.toLowerCase().replace(/\s+/g, '-')}: ${color.value};`)
      .join('\n');
    
    const cssOutput = `:root {\n${cssTokens}\n}`;
    
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Color tokens exported as CSS');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Color Tokens</h1>
          <p className="text-muted-foreground">Manage your color palette and design tokens</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={exportColorTokens} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Color
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Color</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Color Name</Label>
                  <Input
                    placeholder="e.g., Primary Blue"
                    value={newColor.name}
                    onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Color Value</Label>
                  <div className="flex gap-3 mt-2">
                    <div className="flex-1">
                      <HexColorPicker
                        color={newColor.value}
                        onChange={(value) => setNewColor({ ...newColor, value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <div 
                        className="w-16 h-16 rounded-lg border border-border"
                        style={{ backgroundColor: newColor.value }}
                      />
                      <Input
                        value={newColor.value}
                        onChange={(e) => setNewColor({ ...newColor, value: e.target.value })}
                        className="w-24"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                    value={newColor.category}
                    onChange={(e) => setNewColor({ ...newColor, category: e.target.value as ColorToken['category'] })}
                  >
                    {colorCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="e.g., Main brand color for buttons"
                    value={newColor.description}
                    onChange={(e) => setNewColor({ ...newColor, description: e.target.value })}
                  />
                </div>

                <Button onClick={handleAddColor} className="w-full">
                  Add Color Token
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
          All Colors ({colors.length})
        </Badge>
        {colorCategories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
          >
            <div 
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: category.color }}
            />
            {category.label} ({colors.filter(c => c.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Colors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredColors.map(color => (
          <Card key={color.id} className="group relative overflow-hidden">
            <div 
              className="h-24 relative"
              style={{ backgroundColor: color.value }}
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={() => handleToggleActive(color.id)}
                >
                  {color.isActive ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditColor(color)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeleteColor(color.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {!color.isActive && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <EyeOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{color.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {colorCategories.find(c => c.id === color.category)?.label}
                  </Badge>
                </div>
                
                <button
                  className="w-full text-left text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => handleCopyColor(color.value)}
                >
                  {color.value}
                </button>
                
                {color.description && (
                  <p className="text-xs text-muted-foreground">{color.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredColors.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No colors found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your color palette by adding your first color token."
              : `No colors in the ${colorCategories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Color Token
          </Button>
        </div>
      )}

      {/* Edit Color Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Color</DialogTitle>
          </DialogHeader>
          {editingColor && (
            <div className="space-y-4">
              <div>
                <Label>Color Name</Label>
                <Input
                  value={editingColor.name}
                  onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Color Value</Label>
                <div className="flex gap-3 mt-2">
                  <div className="flex-1">
                    <HexColorPicker
                      color={editingColor.value}
                      onChange={(value) => setEditingColor({ ...editingColor, value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <div 
                      className="w-16 h-16 rounded-lg border border-border"
                      style={{ backgroundColor: editingColor.value }}
                    />
                    <Input
                      value={editingColor.value}
                      onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={editingColor.description || ''}
                  onChange={(e) => setEditingColor({ ...editingColor, description: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingColor.isActive}
                  onCheckedChange={(checked) => setEditingColor({ ...editingColor, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <Button onClick={handleUpdateColor} className="w-full">
                Update Color
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}