import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Container, Edit, Trash2, Download, Monitor, Tablet, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface ContainerToken {
  id: string;
  name: string;
  maxWidth: string;
  breakpoint?: string;
  padding: string;
  category: 'page' | 'section' | 'component' | 'custom';
  description?: string;
  isActive: boolean;
}

const defaultContainers: ContainerToken[] = [
  { 
    id: '1', 
    name: 'Full Width', 
    maxWidth: '100%', 
    padding: '1rem', 
    category: 'page', 
    description: 'Full viewport width container',
    isActive: true 
  },
  { 
    id: '2', 
    name: 'Desktop', 
    maxWidth: '1200px', 
    padding: '2rem', 
    category: 'page', 
    description: 'Standard desktop container',
    isActive: true 
  },
  { 
    id: '3', 
    name: 'Content', 
    maxWidth: '768px', 
    padding: '1.5rem', 
    category: 'section', 
    description: 'Readable content width',
    isActive: true 
  },
  { 
    id: '4', 
    name: 'Narrow', 
    maxWidth: '600px', 
    padding: '1rem', 
    category: 'section', 
    description: 'Forms and narrow content',
    isActive: true 
  },
  { 
    id: '5', 
    name: 'Card', 
    maxWidth: '400px', 
    padding: '1rem', 
    category: 'component', 
    description: 'Card component container',
    isActive: true 
  },
  { 
    id: '6', 
    name: 'Wide', 
    maxWidth: '1400px', 
    padding: '3rem', 
    category: 'page', 
    description: 'Wide layout container',
    isActive: true 
  },
];

const categories = [
  { id: 'page', label: 'Page', description: 'Full page layout containers' },
  { id: 'section', label: 'Section', description: 'Content section containers' },
  { id: 'component', label: 'Component', description: 'Component-level containers' },
  { id: 'custom', label: 'Custom', description: 'Custom container sizes' },
];

const breakpoints = [
  { label: 'Mobile', width: '375px', icon: Smartphone },
  { label: 'Tablet', width: '768px', icon: Tablet },
  { label: 'Desktop', width: '1200px', icon: Monitor },
];

export function ContainerPage() {
  const [containers, setContainers] = useState<ContainerToken[]>(defaultContainers);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string>('1200px');
  const [newContainer, setNewContainer] = useState({
    name: '',
    maxWidth: '800px',
    padding: '1rem',
    category: 'custom' as ContainerToken['category'],
    description: ''
  });

  const filteredContainers = selectedCategory === 'all' 
    ? containers 
    : containers.filter(container => container.category === selectedCategory);

  const handleAddContainer = () => {
    if (!newContainer.name.trim()) {
      toast.error('Please enter a container name');
      return;
    }

    const container: ContainerToken = {
      id: Date.now().toString(),
      name: newContainer.name,
      maxWidth: newContainer.maxWidth,
      padding: newContainer.padding,
      category: newContainer.category,
      description: newContainer.description,
      isActive: true,
    };

    setContainers([...containers, container]);
    setNewContainer({
      name: '',
      maxWidth: '800px',
      padding: '1rem',
      category: 'custom',
      description: ''
    });
    toast.success(`Container "${container.name}" added successfully`);
  };

  const handleDeleteContainer = (id: string) => {
    setContainers(containers.filter(container => container.id !== id));
    toast.success('Container deleted');
  };

  const exportContainerTokens = () => {
    const cssTokens = containers
      .filter(container => container.isActive)
      .map(container => {
        const kebabName = container.name.toLowerCase().replace(/\s+/g, '-');
        return `  --container-${kebabName}: ${container.maxWidth};\n  --container-${kebabName}-padding: ${container.padding};`;
      })
      .join('\n');
    
    const cssOutput = `:root {\n${cssTokens}\n}`;
    
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'container-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Container tokens exported as CSS');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Container Sizes</h1>
          <p className="text-muted-foreground">Configure container max-widths and responsive breakpoints</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={exportContainerTokens} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Container
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Container Token</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Container Name</Label>
                    <Input
                      placeholder="e.g., Article Width"
                      value={newContainer.name}
                      onChange={(e) => setNewContainer({ ...newContainer, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Max Width</Label>
                    <Input
                      placeholder="e.g., 800px, 50rem, 100%"
                      value={newContainer.maxWidth}
                      onChange={(e) => setNewContainer({ ...newContainer, maxWidth: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Padding</Label>
                    <Input
                      placeholder="e.g., 1rem, 24px"
                      value={newContainer.padding}
                      onChange={(e) => setNewContainer({ ...newContainer, padding: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                      value={newContainer.category}
                      onChange={(e) => setNewContainer({ ...newContainer, category: e.target.value as ContainerToken['category'] })}
                    >
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      placeholder="e.g., Optimal reading width for articles"
                      value={newContainer.description}
                      onChange={(e) => setNewContainer({ ...newContainer, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-3 block">Preview</Label>
                  <div className="bg-muted/50 p-4 rounded space-y-3">
                    <div 
                      className="bg-primary/20 border-2 border-dashed border-primary/40 p-4 rounded mx-auto"
                      style={{ 
                        maxWidth: newContainer.maxWidth,
                        padding: newContainer.padding 
                      }}
                    >
                      <div className="text-xs text-center text-muted-foreground">
                        {newContainer.name || 'Container Preview'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Max Width: {newContainer.maxWidth}</div>
                      <div>Padding: {newContainer.padding}</div>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleAddContainer} className="w-full">
                Add Container Token
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breakpoint Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Viewport Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Label className="text-sm">Preview at:</Label>
            {breakpoints.map(breakpoint => {
              const Icon = breakpoint.icon;
              return (
                <Button
                  key={breakpoint.width}
                  variant={selectedBreakpoint === breakpoint.width ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBreakpoint(breakpoint.width)}
                >
                  <Icon className="h-3 w-3 mr-2" />
                  {breakpoint.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory('all')}
        >
          All Containers ({containers.length})
        </Badge>
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label} ({containers.filter(c => c.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Container Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Container Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredContainers
              .sort((a, b) => {
                const aWidth = parseInt(a.maxWidth) || (a.maxWidth === '100%' ? 9999 : 0);
                const bWidth = parseInt(b.maxWidth) || (b.maxWidth === '100%' ? 9999 : 0);
                return bWidth - aWidth;
              })
              .map(container => (
                <div key={container.id} className="group space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{container.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {categories.find(c => c.id === container.category)?.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {container.maxWidth} · {container.padding} padding
                      </span>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteContainer(container.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div 
                      className="bg-primary/20 border-2 border-dashed border-primary/40 rounded mx-auto transition-all duration-300"
                      style={{ 
                        maxWidth: container.maxWidth === '100%' ? selectedBreakpoint : container.maxWidth,
                        padding: container.padding,
                        minHeight: '60px'
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-center text-muted-foreground">
                          <div className="font-medium">{container.name}</div>
                          {container.description && (
                            <div className="text-xs mt-1">{container.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {filteredContainers.length === 0 && (
        <div className="text-center py-12">
          <Container className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No containers found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your container system by adding your first token."
              : `No containers in the ${categories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Container Token
          </Button>
        </div>
      )}
    </div>
  );
}