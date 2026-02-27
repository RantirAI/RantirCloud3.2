import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Plus, Loader2, Save, Palette, Type, Square, Grid3X3, Container, Move, CornerDownRight, Sparkles, FormInput, Layout } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { designTokenService, DesignToken, ButtonPreset } from '@/services/designTokenService';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';

// Google Fonts list
const googleFonts = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Slabo 27px',
  'Raleway', 'PT Sans', 'Lora', 'Ubuntu', 'Playfair Display', 'Merriweather', 'Nunito', 'Poppins',
  'Roboto Condensed', 'Noto Sans', 'Fira Sans', 'PT Serif', 'Roboto Slab', 'Crimson Text',
  'Droid Sans', 'Work Sans', 'Libre Baskerville', 'Source Serif Pro', 'Rubik', 'IBM Plex Sans',
  'Mukti', 'Dancing Script', 'Inconsolata', 'Cabin', 'Arimo', 'Hind', 'Catamaran', 'Archivo',
  'Titillium Web', 'Muli', 'Karla', 'Abel', 'Nunito Sans', 'Libre Franklin', 'Fjalla One',
  'Oxygen', 'Asap', 'Quicksand', 'PT Sans Narrow', 'Shadows Into Light', 'Merriweather Sans',
  'Barlow', 'Assistant', 'Exo 2', 'Pacifico', 'Josefin Sans', 'ABeeZee', 'Dosis', 'Varela Round',
  'Lobster', 'Anton', 'Fira Code', 'Comfortaa', 'Righteous', 'Bitter', 'Francois One'
];

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

export function SystemView() {
  const { currentProject } = useAppBuilderStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  
  // Design tokens state
  const [designTokens, setDesignTokens] = useState<DesignToken[]>([]);
  const [buttonPresets, setButtonPresets] = useState<ButtonPreset[]>([]);
  const [selectedToken, setSelectedToken] = useState<DesignToken | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ButtonPreset | null>(null);
  
  // Input states
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Default theme colors that can be edited but not deleted
  const defaultColors = [
    { name: 'primary', value: 'hsl(221.2 83.2% 53.3%)', category: 'color' as const, isDefault: true },
    { name: 'secondary', value: 'hsl(210 40% 98%)', category: 'color' as const, isDefault: true },
    { name: 'destructive', value: 'hsl(0 84.2% 60.2%)', category: 'color' as const, isDefault: true },
    { name: 'muted', value: 'hsl(210 40% 96%)', category: 'color' as const, isDefault: true },
    { name: 'accent', value: 'hsl(210 40% 96%)', category: 'color' as const, isDefault: true },
    { name: 'warning', value: 'hsl(38 92% 50%)', category: 'color' as const, isDefault: true },
  ];

  useEffect(() => {
    if (currentProject?.id) {
      loadData();
    }
  }, [currentProject?.id]);

  const loadData = async () => {
    if (!currentProject?.id) return;
    
    setIsLoading(true);
    try {
      const [tokens, presets] = await Promise.all([
        designTokenService.loadDesignTokens(currentProject.id),
        designTokenService.loadButtonPresets(currentProject.id)
      ]);
      
      // Combine default colors with loaded tokens, avoiding duplicates
      const existingColorNames = tokens.filter(t => t.category === 'color').map(t => t.name);
      const missingDefaults = defaultColors.filter(def => !existingColorNames.includes(def.name));
      const allTokens = [...tokens, ...missingDefaults.map(def => ({
        ...def,
        id: `default-${def.name}`,
        description: `Default ${def.name} color`,
        isActive: true,
        appProjectId: currentProject.id,
        userId: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }))];
      
      setDesignTokens(allTokens);
      setButtonPresets(presets);
    } catch (error) {
      console.error('Failed to load design system data:', error);
      toast.error('Failed to load design system data');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'fonts', label: 'Typography', icon: Type },
    { id: 'buttons', label: 'Buttons', icon: Square },
    { id: 'gaps', label: 'Gaps', icon: Move },
    { id: 'container', label: 'Container', icon: Container },
    { id: 'radius', label: 'Border Radius', icon: CornerDownRight },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'forms', label: 'Forms', icon: FormInput },
    { id: 'components', label: 'Components', icon: Layout },
  ];

  const handleAddToken = async (category: 'color' | 'font', colorValue?: string) => {
    const valueToSave = colorValue || newTokenValue.trim();
    if (!currentProject?.id || !newTokenName.trim() || !valueToSave) return;

    setIsSaving(true);
    try {
      const newToken = await designTokenService.saveDesignToken(currentProject.id, {
        name: newTokenName.trim(),
        value: valueToSave,
        category,
        isActive: true
      });

      setDesignTokens(prev => [...prev, newToken]);
      setNewTokenName('');
      setNewTokenValue('');
      toast.success(`${category} token added successfully`);
    } catch (error) {
      console.error('Failed to add token:', error);
      toast.error('Failed to add token');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateToken = async (tokenId: string, updates: Partial<DesignToken>) => {
    setIsSaving(true);
    try {
      await designTokenService.updateDesignToken(tokenId, updates);
      setDesignTokens(prev =>
        prev.map(token => token.id === tokenId ? { ...token, ...updates } : token)
      );
      if (selectedToken?.id === tokenId) {
        setSelectedToken(prev => prev ? { ...prev, ...updates } : null);
      }
      toast.success('Token updated successfully');
    } catch (error) {
      console.error('Failed to update token:', error);
      toast.error('Failed to update token');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    setIsSaving(true);
    try {
      await designTokenService.deleteDesignToken(tokenId);
      setDesignTokens(prev => prev.filter(token => token.id !== tokenId));
      if (selectedToken?.id === tokenId) {
        setSelectedToken(null);
      }
      toast.success('Token deleted successfully');
    } catch (error) {
      console.error('Failed to delete token:', error);
      toast.error('Failed to delete token');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading design system...</span>
        </div>
      </div>
    );
  }

  const colorTokens = designTokens.filter(token => token.category === 'color');
  const fontTokens = designTokens.filter(token => token.category === 'font');

  return (
    <div className="h-full bg-background flex">
      {/* Vertical Sidebar Tabs */}
      <div className="w-[220px] border-r border-border bg-muted/30 overflow-y-auto scrollbar-hide flex-shrink-0">
        <div className="p-3">
          {/* Compact Header */}
          <div className="flex items-center gap-2 mb-4 px-2">
            <Palette className="h-4 w-4 text-primary" />
            <div>
              <h1 className="text-sm font-medium">Design System</h1>
              <p className="text-xs text-muted-foreground">{currentProject?.name}</p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Width Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'colors' && (
          <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="border-b border-border px-6 py-3 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Colors</h2>
                  <p className="text-xs text-muted-foreground">{colorTokens.length} color tokens</p>
                </div>
                
                <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-2" />
                      Add Color
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="color-name" className="text-xs">Color Name</Label>
                        <Input
                          id="color-name"
                          placeholder="e.g. primary-blue"
                          value={newTokenName}
                          onChange={(e) => setNewTokenName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Color</Label>
                        <div className="mt-2">
                          <HexColorPicker 
                            color={selectedColor} 
                            onChange={(color) => {
                              setSelectedColor(color);
                              setNewTokenValue(color);
                            }} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded border border-border/20"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <Input
                          value={selectedColor}
                          onChange={(e) => {
                            setSelectedColor(e.target.value);
                            setNewTokenValue(e.target.value);
                          }}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowColorPicker(false);
                            setNewTokenName('');
                            setNewTokenValue('');
                            setSelectedColor('#3B82F6');
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            if (newTokenName.trim() && selectedColor) {
                              handleAddToken('color', selectedColor);
                              setShowColorPicker(false);
                              setNewTokenName('');
                              setNewTokenValue('');
                              setSelectedColor('#3B82F6');
                            }
                          }}
                          disabled={!newTokenName.trim() || isSaving}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                        >
                          Add Color
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Colors Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {colorTokens.map((token) => (
                  <div
                    key={token.id}
                    className="group relative bg-card rounded border border-border hover:border-border/80 transition-all duration-200 overflow-hidden"
                  >
                    {/* Color Preview */}
                    <div
                      className="w-full h-12 relative"
                      style={{ backgroundColor: token.value }}
                    >
                      {!token.id?.startsWith('default-') && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => token.id && handleDeleteToken(token.id)}
                            className="h-5 w-5 p-0 bg-black/20 hover:bg-black/40 text-white border-0"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Token Info */}
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-xs truncate">{token.name}</h3>
                        <Switch
                          checked={token.isActive}
                          onCheckedChange={(checked) => 
                            token.id && handleUpdateToken(token.id, { isActive: checked })
                          }
                          className="scale-75"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{token.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="border-b border-border px-6 py-3 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Typography</h2>
                  <p className="text-xs text-muted-foreground">Font hierarchy and styles</p>
                </div>
              </div>
            </div>

            {/* Typography Hierarchy */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              <div className="space-y-3">
                {typographyHierarchy.map((typo) => (
                  <div
                    key={typo.key}
                    className="flex items-center gap-4 p-3 rounded border border-border hover:border-border/80 transition-colors bg-card"
                  >
                    <div className="w-24 text-xs text-muted-foreground">{typo.label}</div>
                    <div className="flex-1">
                      <Select defaultValue="Inter">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {googleFonts.map((font) => (
                            <SelectItem key={font} value={font} className="text-xs">
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-16">
                      <Input defaultValue={typo.size} className="h-8 text-xs text-center" />
                    </div>
                    <div className="w-16">
                      <Input defaultValue={typo.weight} className="h-8 text-xs text-center" />
                    </div>
                    <div 
                      className="flex-1 text-sm truncate"
                      style={{ fontSize: typo.size, fontWeight: typo.weight }}
                    >
                      The quick brown fox
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buttons' && (
          <div className="h-full flex flex-col">
            {/* Compact Header */}
            <div className="border-b border-border px-6 py-3 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Buttons</h2>
                  <p className="text-xs text-muted-foreground">Button variants and states</p>
                </div>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-2" />
                  Add Button
                </Button>
              </div>
            </div>

            {/* Button Variants */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              <div className="space-y-3">
                {['Primary', 'Secondary', 'Outline', 'Ghost', 'Link'].map((variant) => (
                  <div key={variant} className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card">
                    <div className="w-24 font-medium text-sm">{variant}</div>
                    <div className="flex gap-2">
                      <Button variant={variant.toLowerCase() as any} size="xs" className={variant === 'Primary' ? 'bg-primary hover:bg-primary/90' : ''}>
                        XS
                      </Button>
                      <Button variant={variant.toLowerCase() as any} size="sm" className={variant === 'Primary' ? 'bg-primary hover:bg-primary/90' : ''}>
                        SM
                      </Button>
                      <Button variant={variant.toLowerCase() as any} className={variant === 'Primary' ? 'bg-primary hover:bg-primary/90' : ''}>
                        Default
                      </Button>
                      <Button variant={variant.toLowerCase() as any} size="lg" className={variant === 'Primary' ? 'bg-primary hover:bg-primary/90' : ''}>
                        LG
                      </Button>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Input placeholder="Height" className="w-16 h-7 text-xs" defaultValue="40px" />
                      <Input placeholder="Padding" className="w-16 h-7 text-xs" defaultValue="16px" />
                      <Input placeholder="Border" className="w-16 h-7 text-xs" defaultValue="1px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {['gaps', 'container', 'radius', 'effects', 'forms', 'components'].includes(activeTab) && (
          <div className="h-full flex flex-col">
            <div className="border-b border-border px-6 py-3 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium capitalize">{activeTab}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'gaps' && 'Spacing and gap utilities'}
                    {activeTab === 'container' && 'Container max-widths and breakpoints'}
                    {activeTab === 'radius' && 'Border radius values'}
                    {activeTab === 'effects' && 'Glass, blur and visual effects'}
                    {activeTab === 'forms' && 'Input and form element styles'}
                    {activeTab === 'components' && 'Custom project components'}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-2" />
                  Add {activeTab.slice(0, -1)}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center">
                  <Square className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="font-medium mb-1 capitalize text-sm">{activeTab}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}