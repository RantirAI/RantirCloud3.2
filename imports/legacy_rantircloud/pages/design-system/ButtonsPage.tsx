import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Square, Edit, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ButtonVariant {
  id: string;
  name: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size: 'default' | 'sm' | 'lg' | 'icon';
  customStyles?: Record<string, string>;
  category: 'primary' | 'secondary' | 'utility' | 'custom';
  isActive: boolean;
}

const defaultButtons: ButtonVariant[] = [
  { id: '1', name: 'Primary', variant: 'default', size: 'default', category: 'primary', isActive: true },
  { id: '2', name: 'Secondary', variant: 'secondary', size: 'default', category: 'secondary', isActive: true },
  { id: '3', name: 'Destructive', variant: 'destructive', size: 'default', category: 'utility', isActive: true },
  { id: '4', name: 'Outline', variant: 'outline', size: 'default', category: 'secondary', isActive: true },
  { id: '5', name: 'Ghost', variant: 'ghost', size: 'default', category: 'utility', isActive: true },
  { id: '6', name: 'Link', variant: 'link', size: 'default', category: 'utility', isActive: true },
  { id: '7', name: 'Small Primary', variant: 'default', size: 'sm', category: 'primary', isActive: true },
  { id: '8', name: 'Large Primary', variant: 'default', size: 'lg', category: 'primary', isActive: true },
];

const variants = [
  { value: 'default', label: 'Default' },
  { value: 'destructive', label: 'Destructive' },
  { value: 'outline', label: 'Outline' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'link', label: 'Link' },
];

const sizes = [
  { value: 'sm', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'lg', label: 'Large' },
  { value: 'icon', label: 'Icon' },
];

const categories = [
  { id: 'primary', label: 'Primary', description: 'Main action buttons' },
  { id: 'secondary', label: 'Secondary', description: 'Supporting action buttons' },
  { id: 'utility', label: 'Utility', description: 'Functional buttons' },
  { id: 'custom', label: 'Custom', description: 'Custom button variants' },
];

export function ButtonsPage() {
  const [buttons, setButtons] = useState<ButtonVariant[]>(defaultButtons);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newButton, setNewButton] = useState({
    name: '',
    variant: 'default' as ButtonVariant['variant'],
    size: 'default' as ButtonVariant['size'],
    category: 'custom' as ButtonVariant['category']
  });

  const filteredButtons = selectedCategory === 'all' 
    ? buttons 
    : buttons.filter(button => button.category === selectedCategory);

  const handleAddButton = () => {
    if (!newButton.name.trim()) {
      toast.error('Please enter a button name');
      return;
    }

    const button: ButtonVariant = {
      id: Date.now().toString(),
      name: newButton.name,
      variant: newButton.variant,
      size: newButton.size,
      category: newButton.category,
      isActive: true,
    };

    setButtons([...buttons, button]);
    setNewButton({
      name: '',
      variant: 'default',
      size: 'default',
      category: 'custom'
    });
    toast.success(`Button variant "${button.name}" added successfully`);
  };

  const handleDeleteButton = (id: string) => {
    setButtons(buttons.filter(button => button.id !== id));
    toast.success('Button variant deleted');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buttons</h1>
          <p className="text-muted-foreground">Create and customize button components for your design system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Button
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Button Variant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Button Name</Label>
                  <Input
                    placeholder="e.g., CTA Button"
                    value={newButton.name}
                    onChange={(e) => setNewButton({ ...newButton, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Variant</Label>
                  <Select value={newButton.variant} onValueChange={(value: ButtonVariant['variant']) => setNewButton({ ...newButton, variant: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map(variant => (
                        <SelectItem key={variant.value} value={variant.value}>{variant.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Size</Label>
                  <Select value={newButton.size} onValueChange={(value: ButtonVariant['size']) => setNewButton({ ...newButton, size: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={newButton.category} onValueChange={(value: ButtonVariant['category']) => setNewButton({ ...newButton, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Preview</Label>
                  <Button variant={newButton.variant} size={newButton.size}>
                    {newButton.name || 'Button Preview'}
                  </Button>
                </div>

                <Button onClick={handleAddButton} className="w-full">
                  Add Button Variant
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
          All Buttons ({buttons.length})
        </Badge>
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label} ({buttons.filter(b => b.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Button Variants Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredButtons.map(button => (
          <Card key={button.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{button.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {categories.find(c => c.id === button.category)?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-muted/30 rounded-lg">
                <Button variant={button.variant} size={button.size}>
                  {button.name}
                </Button>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>Variant: {button.variant}</div>
                <div>Size: {button.size}</div>
              </div>

              <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteButton(button.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredButtons.length === 0 && (
        <div className="text-center py-12">
          <Square className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No button variants found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your button system by adding your first variant."
              : `No button variants in the ${categories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Button Variant
          </Button>
        </div>
      )}
    </div>
  );
}