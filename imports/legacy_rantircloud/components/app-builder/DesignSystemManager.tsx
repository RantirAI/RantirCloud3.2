import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { 
  Plus, 
  Type, 
  Palette, 
  MousePointer, 
  Edit3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Save,
  RefreshCw,
  Settings
} from 'lucide-react';
import { ColorAdvancedPicker } from './properties/ColorAdvancedPicker';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { designTokenService, DesignToken, ButtonPreset } from '@/services/designTokenService';

export function DesignSystemManager({ trigger }: { trigger?: React.ReactNode }) {
  const { currentProject } = useAppBuilderStore();
  const { loadProjectTokens } = useDesignTokenStore();

  // Sync zustand store after any token mutation so canvas + style panel update in real-time
  const syncTokenStore = async () => {
    if (currentProject?.id) {
      await loadProjectTokens(currentProject.id);
    }
  };
  const [designTokens, setDesignTokens] = useState<DesignToken[]>([]);
  const [buttonPresets, setButtonPresets] = useState<ButtonPreset[]>([]);
  const [selectedToken, setSelectedToken] = useState<DesignToken | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ButtonPreset | null>(null);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [activeTab, setActiveTab] = useState('colors');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      setDesignTokens(tokens);
      setButtonPresets(presets);
    } catch (error: any) {
      toast.error('Failed to load design system', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToken = async (category: DesignToken['category']) => {
    if (!newTokenName || !newTokenValue || !currentProject?.id) return;
    
    setIsSaving(true);
    try {
      const newToken = await designTokenService.saveDesignToken(currentProject.id, {
        name: newTokenName,
        value: newTokenValue,
        category,
        isActive: true
      });
      
      setDesignTokens(prev => [...prev, newToken]);
      setNewTokenName('');
      setNewTokenValue('');
      
      // Sync zustand store
      await syncTokenStore();
      
      toast.success('Design token created', {
        description: `${newTokenName} has been added to your design system`
      });
    } catch (error: any) {
      toast.error('Failed to create token', {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateToken = async (tokenId: string, updates: Partial<DesignToken>) => {
    try {
      await designTokenService.updateDesignToken(tokenId, updates);
      setDesignTokens(tokens => 
        tokens.map(token => 
          token.id === tokenId ? { ...token, ...updates } : token
        )
      );
      
      if (selectedToken?.id === tokenId) {
        setSelectedToken(prev => prev ? { ...prev, ...updates } : null);
      }
      
      // Sync zustand store so canvas + style panel update in real-time
      await syncTokenStore();
    } catch (error: any) {
      toast.error('Failed to update token', {
        description: error.message
      });
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await designTokenService.deleteDesignToken(tokenId);
      setDesignTokens(tokens => tokens.filter(token => token.id !== tokenId));
      
      if (selectedToken?.id === tokenId) {
        setSelectedToken(null);
      }
      
      // Sync zustand store
      await syncTokenStore();
      
      toast.success('Token deleted');
    } catch (error: any) {
      toast.error('Failed to delete token', {
        description: error.message
      });
    }
  };

  const colorTokens = designTokens.filter(token => token.category === 'color');
  const fontTokens = designTokens.filter(token => token.category === 'font');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading design system...</p>
        </div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Design System
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Design System
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Manage your design tokens and presets</p>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-6 pt-4">
            <div className="flex items-center justify-between">
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="buttons" className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  Components
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 p-6 overflow-hidden">
              <TabsContent value="colors" className="mt-0 h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Color Tokens List */}
              <Card className="flex flex-col overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle>Color Tokens</CardTitle>
                    <CardDescription>Define your color palette</CardDescription>
                  </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                  <div className="flex gap-2 flex-shrink-0">
                    <Input
                      placeholder="Token name"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="HSL value"
                      value={newTokenValue}
                      onChange={(e) => setNewTokenValue(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleAddToken('color')}
                      disabled={isSaving || !newTokenName || !newTokenValue}
                      className="h-8 px-3 flex-shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-2">
                      {colorTokens.map((token) => (
                        <div
                          key={token.id}
                          className={`flex items-center gap-2 sm:gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedToken?.id === token.id ? 'bg-muted/70 border-primary/50' : ''
                          }`}
                          onClick={() => setSelectedToken(token)}
                        >
                          <div 
                            className="w-4 h-4 sm:w-6 sm:h-6 rounded border border-border flex-shrink-0"
                            style={{ backgroundColor: token.value }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate">{token.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {token.value}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateToken(token.id, { isActive: !token.isActive });
                              }}
                            >
                              {token.isActive ? (
                                <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              ) : (
                                <EyeOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteToken(token.id);
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {colorTokens.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No color tokens yet</p>
                          <p className="text-xs">Add your first color token above</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Color Editor */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-base">
                    {selectedToken ? `Edit ${selectedToken.name}` : 'Select a Color Token'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {selectedToken && selectedToken.category === 'color' ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Token Name</Label>
                        <Input
                          value={selectedToken.name}
                          onChange={(e) => handleUpdateToken(selectedToken.id, { name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Color Value</Label>
                        <div className="mt-1">
                          <ColorAdvancedPicker
                            label=""
                            value={selectedToken.value}
                            onChange={(colorValue) => {
                              // Extract raw color string from ColorValue object
                              const rawValue = typeof colorValue.value === 'string' 
                                ? colorValue.value 
                                : colorValue.value?.value || selectedToken.value;
                              handleUpdateToken(selectedToken.id, { value: rawValue });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <Input
                          value={selectedToken.description || ''}
                          onChange={(e) => handleUpdateToken(selectedToken.id, { description: e.target.value })}
                          placeholder="Optional description"
                          className="mt-1"
                        />
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Preview</Label>
                          <div 
                            className="w-8 h-8 rounded border border-border"
                            style={{ backgroundColor: selectedToken.value }}
                          />
                        </div>
                        <div className="mt-2 p-3 rounded border" style={{ backgroundColor: `${selectedToken.value}20` }}>
                          <p className="text-sm" style={{ color: selectedToken.value }}>
                            Sample text with this color
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a color token to edit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-2">
                {/* Root Body Typography */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Root (Body) Typography</CardTitle>
                    <CardDescription className="text-xs">Global defaults inherited by all pages and text elements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Base Font Size</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={designTokens.find(t => t.name === 'font-size-base')?.value || '16'}
                            onChange={async (e) => {
                              const existing = designTokens.find(t => t.name === 'font-size-base');
                              if (existing) {
                                await handleUpdateToken(existing.id, { value: e.target.value });
                              } else if (currentProject?.id) {
                                const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                  name: 'font-size-base', value: e.target.value, category: 'font', isActive: true
                                });
                                setDesignTokens(prev => [...prev, newToken]);
                                await syncTokenStore();
                              }
                            }}
                            className="h-7 text-xs"
                            placeholder="16"
                          />
                          <span className="text-[10px] text-muted-foreground">px</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Line Height</Label>
                        <Input
                          value={designTokens.find(t => t.name === 'body-line-height')?.value || '1.5'}
                          onChange={async (e) => {
                            const existing = designTokens.find(t => t.name === 'body-line-height');
                            if (existing) {
                              await handleUpdateToken(existing.id, { value: e.target.value });
                            } else if (currentProject?.id) {
                              const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                name: 'body-line-height', value: e.target.value, category: 'font', isActive: true
                              });
                              setDesignTokens(prev => [...prev, newToken]);
                              await syncTokenStore();
                            }
                          }}
                          className="h-7 text-xs mt-1"
                          placeholder="1.5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Text Color</Label>
                        <Input
                          value={designTokens.find(t => t.name === 'body-color')?.value || '#000000'}
                          onChange={async (e) => {
                            const existing = designTokens.find(t => t.name === 'body-color');
                            if (existing) {
                              await handleUpdateToken(existing.id, { value: e.target.value });
                            } else if (currentProject?.id) {
                              const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                name: 'body-color', value: e.target.value, category: 'color', isActive: true
                              });
                              setDesignTokens(prev => [...prev, newToken]);
                              await syncTokenStore();
                            }
                          }}
                          className="h-7 text-xs mt-1"
                          placeholder="#000000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Page Background</Label>
                        <Input
                          value={designTokens.find(t => t.name === 'page-background')?.value || '#ffffff'}
                          onChange={async (e) => {
                            const existing = designTokens.find(t => t.name === 'page-background');
                            if (existing) {
                              await handleUpdateToken(existing.id, { value: e.target.value });
                            } else if (currentProject?.id) {
                              const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                name: 'page-background', value: e.target.value, category: 'color', isActive: true
                              });
                              setDesignTokens(prev => [...prev, newToken]);
                              await syncTokenStore();
                            }
                          }}
                          className="h-7 text-xs mt-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Heading Scale */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Heading Scale</CardTitle>
                    <CardDescription className="text-xs">Default font sizes for H1–H6. Headings auto-connect to these values.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { level: 1, defaultSize: '64' },
                        { level: 2, defaultSize: '48' },
                        { level: 3, defaultSize: '40' },
                        { level: 4, defaultSize: '32' },
                        { level: 5, defaultSize: '24' },
                        { level: 6, defaultSize: '18' },
                      ].map(({ level, defaultSize }) => {
                        const tokenName = `heading-${level}-size`;
                        const existingToken = designTokens.find(t => t.name === tokenName);
                        const currentValue = existingToken?.value || defaultSize;
                        
                        return (
                          <div key={level} className="flex items-center gap-3">
                            <span className="text-xs font-medium w-8 text-muted-foreground">H{level}</span>
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={currentValue}
                                onChange={async (e) => {
                                  if (existingToken) {
                                    await handleUpdateToken(existingToken.id, { value: e.target.value });
                                  } else if (currentProject?.id) {
                                    const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                      name: tokenName, value: e.target.value, category: 'font', isActive: true
                                    });
                                    setDesignTokens(prev => [...prev, newToken]);
                                    await syncTokenStore();
                                  }
                                }}
                                className="h-7 text-xs"
                                type="number"
                                min="8"
                                max="200"
                              />
                              <span className="text-[10px] text-muted-foreground">px</span>
                            </div>
                            <span 
                              className="text-[10px] font-semibold truncate max-w-[120px]"
                              style={{ fontSize: `${Math.min(parseInt(currentValue) / 4, 16)}px` }}
                            >
                              Heading {level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Font Tokens */}
                <Card className="flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="text-sm">Font Families</CardTitle>
                    <CardDescription className="text-xs">Define your font families (heading, body, mono)</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 overflow-hidden">
                    <div className="flex gap-2 flex-shrink-0">
                      <Input
                        placeholder="Font name"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Font family"
                        value={newTokenValue}
                        onChange={(e) => setNewTokenValue(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToken('font')}
                        disabled={isSaving || !newTokenName || !newTokenValue}
                        className="h-8 px-3 flex-shrink-0"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {fontTokens.map((token) => (
                        <div
                          key={token.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedToken?.id === token.id ? 'bg-muted/70 border-primary/50' : ''
                          }`}
                          onClick={() => setSelectedToken(token)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate" style={{ fontFamily: token.value }}>
                              {token.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {token.value}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateToken(token.id, { isActive: !token.isActive });
                              }}
                            >
                              {token.isActive ? (
                                <Eye className="h-2.5 w-2.5" />
                              ) : (
                                <EyeOff className="h-2.5 w-2.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteToken(token.id);
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {fontTokens.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          <Type className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No font tokens yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="buttons" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-2">
                {/* Button Default Tokens */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Button Defaults</CardTitle>
                    <CardDescription className="text-xs">Global button styling tokens. All non-detached buttons inherit these.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <Input
                          value={designTokens.find(t => t.name === 'button-bg')?.value || '#2563eb'}
                          onChange={async (e) => {
                            const existing = designTokens.find(t => t.name === 'button-bg');
                            if (existing) {
                              await handleUpdateToken(existing.id, { value: e.target.value });
                            } else if (currentProject?.id) {
                              const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                name: 'button-bg', value: e.target.value, category: 'color', isActive: true
                              });
                              setDesignTokens(prev => [...prev, newToken]);
                              await syncTokenStore();
                            }
                          }}
                          className="h-7 text-xs mt-1"
                          placeholder="#2563eb"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Text Color</Label>
                        <Input
                          value={designTokens.find(t => t.name === 'button-color')?.value || '#ffffff'}
                          onChange={async (e) => {
                            const existing = designTokens.find(t => t.name === 'button-color');
                            if (existing) {
                              await handleUpdateToken(existing.id, { value: e.target.value });
                            } else if (currentProject?.id) {
                              const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                name: 'button-color', value: e.target.value, category: 'color', isActive: true
                              });
                              setDesignTokens(prev => [...prev, newToken]);
                              await syncTokenStore();
                            }
                          }}
                          className="h-7 text-xs mt-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Padding X</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={designTokens.find(t => t.name === 'button-padding-x')?.value || '12'}
                            onChange={async (e) => {
                              const existing = designTokens.find(t => t.name === 'button-padding-x');
                              if (existing) {
                                await handleUpdateToken(existing.id, { value: e.target.value });
                              } else if (currentProject?.id) {
                                const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                  name: 'button-padding-x', value: e.target.value, category: 'spacing', isActive: true
                                });
                                setDesignTokens(prev => [...prev, newToken]);
                                await syncTokenStore();
                              }
                            }}
                            className="h-7 text-xs"
                            type="number"
                            min="0"
                          />
                          <span className="text-[10px] text-muted-foreground">px</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Padding Y</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={designTokens.find(t => t.name === 'button-padding-y')?.value || '8'}
                            onChange={async (e) => {
                              const existing = designTokens.find(t => t.name === 'button-padding-y');
                              if (existing) {
                                await handleUpdateToken(existing.id, { value: e.target.value });
                              } else if (currentProject?.id) {
                                const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                  name: 'button-padding-y', value: e.target.value, category: 'spacing', isActive: true
                                });
                                setDesignTokens(prev => [...prev, newToken]);
                                await syncTokenStore();
                              }
                            }}
                            className="h-7 text-xs"
                            type="number"
                            min="0"
                          />
                          <span className="text-[10px] text-muted-foreground">px</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Radius</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={designTokens.find(t => t.name === 'button-radius')?.value || '0'}
                            onChange={async (e) => {
                              const existing = designTokens.find(t => t.name === 'button-radius');
                              if (existing) {
                                await handleUpdateToken(existing.id, { value: e.target.value });
                              } else if (currentProject?.id) {
                                const newToken = await designTokenService.saveDesignToken(currentProject.id, {
                                  name: 'button-radius', value: e.target.value, category: 'border', isActive: true
                                });
                                setDesignTokens(prev => [...prev, newToken]);
                                await syncTokenStore();
                              }
                            }}
                            className="h-7 text-xs"
                            type="number"
                            min="0"
                          />
                          <span className="text-[10px] text-muted-foreground">px</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Button Presets */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-base">Button Presets</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Pre-configured button components</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                  <Button size="sm" className="w-full flex-shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Preset
                  </Button>
                  
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-2">
                      {buttonPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className={`p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedPreset?.id === preset.id ? 'bg-muted/70 border-primary/50' : ''
                          }`}
                          onClick={() => setSelectedPreset(preset)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-xs sm:text-sm truncate">{preset.name}</div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {preset.variant}
                            </Badge>
                          </div>
                          
                          {/* Button Preview */}
                          <div 
                            className="inline-flex items-center justify-center rounded cursor-pointer transition-colors px-3 py-1.5 text-xs sm:text-sm"
                            style={preset.styles}
                          >
                            Button Preview
                          </div>
                        </div>
                      ))}
                      
                      {buttonPresets.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <MousePointer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No button presets yet</p>
                          <p className="text-xs">Create your first preset above</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Button Editor */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-base">
                    {selectedPreset ? `Edit ${selectedPreset.name}` : 'Select a Button Preset'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {selectedPreset ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Preset Name</Label>
                        <Input
                          value={selectedPreset.name}
                          onChange={(e) => {
                            setButtonPresets(presets =>
                              presets.map(p =>
                                p.id === selectedPreset.id ? { ...p, name: e.target.value } : p
                              )
                            );
                            setSelectedPreset({ ...selectedPreset, name: e.target.value });
                          }}
                          className="mt-1"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm font-medium">States</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Normal</Badge>
                            <Button size="sm" variant="ghost" className="h-6">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Hover</Badge>
                            <Button size="sm" variant="ghost" className="h-6">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Pressed</Badge>
                            <Button size="sm" variant="ghost" className="h-6">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Focused</Badge>
                            <Button size="sm" variant="ghost" className="h-6">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <MousePointer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a button preset to edit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
              </div>
            </ScrollArea>
          </TabsContent>
          </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}