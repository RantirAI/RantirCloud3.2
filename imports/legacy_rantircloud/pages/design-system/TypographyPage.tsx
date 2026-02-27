import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Download, Type, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface TypographyToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  category: 'heading' | 'body' | 'caption' | 'display' | 'custom';
  isActive: boolean;
}

const googleFonts = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
  'Raleway', 'PT Sans', 'Lora', 'Ubuntu', 'Playfair Display', 'Merriweather', 
  'Nunito', 'Poppins', 'Roboto Condensed', 'Noto Sans', 'Fira Sans'
];

const fontWeights = [
  { value: '100', label: 'Thin (100)' },
  { value: '200', label: 'Extra Light (200)' },
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
  { value: '900', label: 'Black (900)' },
];

const defaultTypography: TypographyToken[] = [
  { id: '1', name: 'Display Large', fontFamily: 'Inter', fontSize: '4rem', fontWeight: '700', lineHeight: '1.1', category: 'display', isActive: true },
  { id: '2', name: 'Display Medium', fontFamily: 'Inter', fontSize: '3rem', fontWeight: '600', lineHeight: '1.1', category: 'display', isActive: true },
  { id: '3', name: 'Display Small', fontFamily: 'Inter', fontSize: '2.25rem', fontWeight: '600', lineHeight: '1.2', category: 'display', isActive: true },
  { id: '4', name: 'Heading 1', fontFamily: 'Inter', fontSize: '2rem', fontWeight: '700', lineHeight: '1.2', category: 'heading', isActive: true },
  { id: '5', name: 'Heading 2', fontFamily: 'Inter', fontSize: '1.75rem', fontWeight: '600', lineHeight: '1.3', category: 'heading', isActive: true },
  { id: '6', name: 'Heading 3', fontFamily: 'Inter', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3', category: 'heading', isActive: true },
  { id: '7', name: 'Heading 4', fontFamily: 'Inter', fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4', category: 'heading', isActive: true },
  { id: '8', name: 'Body Large', fontFamily: 'Inter', fontSize: '1.125rem', fontWeight: '400', lineHeight: '1.6', category: 'body', isActive: true },
  { id: '9', name: 'Body Medium', fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.6', category: 'body', isActive: true },
  { id: '10', name: 'Body Small', fontFamily: 'Inter', fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.5', category: 'body', isActive: true },
  { id: '11', name: 'Caption', fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: '400', lineHeight: '1.4', letterSpacing: '0.025em', category: 'caption', isActive: true },
  { id: '12', name: 'Overline', fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: '600', lineHeight: '1.2', letterSpacing: '0.1em', category: 'caption', isActive: true },
];

const categories = [
  { id: 'display', label: 'Display', description: 'Large, impactful text for headlines' },
  { id: 'heading', label: 'Headings', description: 'Section and page titles' },
  { id: 'body', label: 'Body', description: 'Main content and paragraph text' },
  { id: 'caption', label: 'Caption', description: 'Small text and labels' },
  { id: 'custom', label: 'Custom', description: 'Custom typography styles' },
];

export function TypographyPage() {
  const [typography, setTypography] = useState<TypographyToken[]>(defaultTypography);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newToken, setNewToken] = useState({
    name: '',
    fontFamily: 'Inter',
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.5',
    letterSpacing: '',
    category: 'custom' as TypographyToken['category']
  });
  const [editingToken, setEditingToken] = useState<TypographyToken | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredTypography = selectedCategory === 'all' 
    ? typography 
    : typography.filter(token => token.category === selectedCategory);

  const handleAddToken = () => {
    if (!newToken.name.trim()) {
      toast.error('Please enter a token name');
      return;
    }

    const token: TypographyToken = {
      id: Date.now().toString(),
      name: newToken.name,
      fontFamily: newToken.fontFamily,
      fontSize: newToken.fontSize,
      fontWeight: newToken.fontWeight,
      lineHeight: newToken.lineHeight,
      letterSpacing: newToken.letterSpacing,
      category: newToken.category,
      isActive: true,
    };

    setTypography([...typography, token]);
    setNewToken({
      name: '',
      fontFamily: 'Inter',
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '',
      category: 'custom'
    });
    toast.success(`Typography token "${token.name}" added successfully`);
  };

  const handleEditToken = (token: TypographyToken) => {
    setEditingToken(token);
    setIsDialogOpen(true);
  };

  const handleUpdateToken = () => {
    if (!editingToken) return;

    setTypography(typography.map(token => 
      token.id === editingToken.id ? editingToken : token
    ));
    setEditingToken(null);
    setIsDialogOpen(false);
    toast.success('Typography token updated successfully');
  };

  const handleDeleteToken = (id: string) => {
    setTypography(typography.filter(token => token.id !== id));
    toast.success('Typography token deleted');
  };

  const exportTypographyTokens = () => {
    const cssTokens = typography
      .filter(token => token.isActive)
      .map(token => {
        const kebabName = token.name.toLowerCase().replace(/\s+/g, '-');
        return `  --typography-${kebabName}: ${token.fontSize}/${token.lineHeight} ${token.fontWeight} "${token.fontFamily}";`;
      })
      .join('\n');
    
    const cssOutput = `:root {\n${cssTokens}\n}`;
    
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typography-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Typography tokens exported as CSS');
  };

  const getPreviewStyle = (token: TypographyToken) => ({
    fontFamily: token.fontFamily,
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing || 'normal',
  });

  const getPreviewStyleFromPartial = (token: Partial<TypographyToken>) => ({
    fontFamily: token.fontFamily || 'Inter',
    fontSize: token.fontSize || '1rem',
    fontWeight: token.fontWeight || '400',
    lineHeight: token.lineHeight || '1.5',
    letterSpacing: token.letterSpacing || 'normal',
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Typography</h1>
          <p className="text-muted-foreground">Define font families, sizes, and text styles for your design system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={exportTypographyTokens} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSS
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Typography
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Typography Token</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Token Name</Label>
                    <Input
                      placeholder="e.g., Heading Large"
                      value={newToken.name}
                      onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Font Family</Label>
                    <Select value={newToken.fontFamily} onValueChange={(value) => setNewToken({ ...newToken, fontFamily: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {googleFonts.map(font => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Font Size</Label>
                    <Input
                      placeholder="e.g., 1.5rem, 24px"
                      value={newToken.fontSize}
                      onChange={(e) => setNewToken({ ...newToken, fontSize: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Font Weight</Label>
                    <Select value={newToken.fontWeight} onValueChange={(value) => setNewToken({ ...newToken, fontWeight: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontWeights.map(weight => (
                          <SelectItem key={weight.value} value={weight.value}>{weight.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Line Height</Label>
                    <Input
                      placeholder="e.g., 1.5, 24px"
                      value={newToken.lineHeight}
                      onChange={(e) => setNewToken({ ...newToken, lineHeight: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Letter Spacing (Optional)</Label>
                    <Input
                      placeholder="e.g., 0.025em, 1px"
                      value={newToken.letterSpacing}
                      onChange={(e) => setNewToken({ ...newToken, letterSpacing: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={newToken.category} onValueChange={(value) => setNewToken({ ...newToken, category: value as TypographyToken['category'] })}>
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
                </div>

                <div className="border border-border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-3 block">Preview</Label>
                  <div 
                    className="text-foreground"
                    style={getPreviewStyleFromPartial(newToken)}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground space-y-1">
                    <div>Font: {newToken.fontFamily}</div>
                    <div>Size: {newToken.fontSize}</div>
                    <div>Weight: {newToken.fontWeight}</div>
                    <div>Line Height: {newToken.lineHeight}</div>
                    {newToken.letterSpacing && <div>Letter Spacing: {newToken.letterSpacing}</div>}
                  </div>
                </div>
              </div>

              <Button onClick={handleAddToken} className="w-full">
                Add Typography Token
              </Button>
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
          All Typography ({typography.length})
        </Badge>
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label} ({typography.filter(t => t.category === category.id).length})
          </Badge>
        ))}
      </div>

      {/* Typography Tokens */}
      <div className="space-y-4">
        {filteredTypography.map(token => (
          <Card key={token.id} className="group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{token.name}</h3>
                    <Badge variant="outline">
                      {categories.find(c => c.id === token.category)?.label}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {token.fontFamily} · {token.fontSize} · {token.fontWeight}
                    </div>
                  </div>
                  
                  <div 
                    className="text-foreground"
                    style={getPreviewStyle(token)}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                  
                  <div className="text-xs font-mono text-muted-foreground">
                    font: {token.fontWeight} {token.fontSize}/{token.lineHeight} "{token.fontFamily}"
                    {token.letterSpacing && `, letter-spacing: ${token.letterSpacing}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditToken(token)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteToken(token.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTypography.length === 0 && (
        <div className="text-center py-12">
          <Type className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No typography tokens found</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? "Start building your typography system by adding your first token."
              : `No typography tokens in the ${categories.find(c => c.id === selectedCategory)?.label} category.`
            }
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Typography Token
          </Button>
        </div>
      )}

      {/* Edit Typography Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Typography Token</DialogTitle>
          </DialogHeader>
          {editingToken && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Token Name</Label>
                  <Input
                    value={editingToken.name}
                    onChange={(e) => setEditingToken({ ...editingToken, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Font Family</Label>
                  <Select value={editingToken.fontFamily} onValueChange={(value) => setEditingToken({ ...editingToken, fontFamily: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {googleFonts.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Input
                    value={editingToken.fontSize}
                    onChange={(e) => setEditingToken({ ...editingToken, fontSize: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Font Weight</Label>
                  <Select value={editingToken.fontWeight} onValueChange={(value) => setEditingToken({ ...editingToken, fontWeight: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontWeights.map(weight => (
                        <SelectItem key={weight.value} value={weight.value}>{weight.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Line Height</Label>
                  <Input
                    value={editingToken.lineHeight}
                    onChange={(e) => setEditingToken({ ...editingToken, lineHeight: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Letter Spacing</Label>
                  <Input
                    value={editingToken.letterSpacing || ''}
                    onChange={(e) => setEditingToken({ ...editingToken, letterSpacing: e.target.value })}
                  />
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <Label className="text-sm font-medium mb-3 block">Preview</Label>
                <div 
                  className="text-foreground"
                  style={getPreviewStyle(editingToken)}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <div>Font: {editingToken.fontFamily}</div>
                  <div>Size: {editingToken.fontSize}</div>
                  <div>Weight: {editingToken.fontWeight}</div>
                  <div>Line Height: {editingToken.lineHeight}</div>
                  {editingToken.letterSpacing && <div>Letter Spacing: {editingToken.letterSpacing}</div>}
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleUpdateToken} className="w-full">
            Update Typography Token
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}