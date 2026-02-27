import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as Iconsax from 'iconsax-react';
import { Search } from 'lucide-react';

type IconVariant = 'Linear' | 'Outline' | 'Bold' | 'Bulk' | 'Broken' | 'TwoTone';

interface IconPickerProps {
  value: string;
  variant?: IconVariant;
  onChange: (iconName: string, variant: IconVariant) => void;
}

const ICON_VARIANTS: IconVariant[] = ['Linear', 'Outline', 'Bold', 'Bulk', 'Broken', 'TwoTone'];

// Get all Iconsax icon names
const getIconsaxIcons = () => {
  const icons: string[] = [];
  Object.keys(Iconsax).forEach((name) => {
    const component = (Iconsax as any)[name];
    // Check if it's a valid React component (has $$typeof or is a function)
    if (
      name !== 'default' && 
      !name.startsWith('_') &&
      component &&
      (typeof component === 'function' || 
       (typeof component === 'object' && component.$$typeof))
    ) {
      icons.push(name);
    }
  });
  return icons.sort();
};

// Categorize icons by common prefixes/patterns
const categorizeIcons = (icons: string[]) => {
  const categories: Record<string, string[]> = {
    'All': icons,
    'Arrows': icons.filter(i => i.toLowerCase().includes('arrow') || i.toLowerCase().includes('direction')),
    'Media': icons.filter(i => i.toLowerCase().includes('video') || i.toLowerCase().includes('music') || i.toLowerCase().includes('play') || i.toLowerCase().includes('camera')),
    'Communication': icons.filter(i => i.toLowerCase().includes('message') || i.toLowerCase().includes('call') || i.toLowerCase().includes('chat') || i.toLowerCase().includes('sms')),
    'Files': icons.filter(i => i.toLowerCase().includes('document') || i.toLowerCase().includes('folder') || i.toLowerCase().includes('file')),
    'User': icons.filter(i => i.toLowerCase().includes('user') || i.toLowerCase().includes('people') || i.toLowerCase().includes('profile')),
    'Shopping': icons.filter(i => i.toLowerCase().includes('shop') || i.toLowerCase().includes('cart') || i.toLowerCase().includes('bag') || i.toLowerCase().includes('buy')),
    'Settings': icons.filter(i => i.toLowerCase().includes('setting') || i.toLowerCase().includes('edit') || i.toLowerCase().includes('filter')),
    'Security': icons.filter(i => i.toLowerCase().includes('lock') || i.toLowerCase().includes('shield') || i.toLowerCase().includes('security') || i.toLowerCase().includes('key')),
    'Weather': icons.filter(i => i.toLowerCase().includes('sun') || i.toLowerCase().includes('moon') || i.toLowerCase().includes('cloud') || i.toLowerCase().includes('rain')),
  };
  return categories;
};

export function IconPicker({ value, variant = 'Bold', onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVariant, setSelectedVariant] = useState<IconVariant>(variant);

  const allIcons = useMemo(() => getIconsaxIcons(), []);
  const categories = useMemo(() => categorizeIcons(allIcons), [allIcons]);

  const filteredIcons = useMemo(() => {
    const categoryIcons = categories[selectedCategory] || allIcons;
    const q = search.trim().toLowerCase();
    if (!q) return categoryIcons;
    return categoryIcons.filter((name) => name.toLowerCase().includes(q));
  }, [allIcons, categories, selectedCategory, search]);

  const selectedIconName = value || 'Home2';
  const SelectedIcon = (Iconsax as any)[selectedIconName];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          {SelectedIcon ? (
            <SelectedIcon size={18} variant={variant} />
          ) : (
            <div className="h-[18px] w-[18px] rounded bg-muted" />
          )}
          <span className="flex-1 text-left truncate">{selectedIconName}</span>
          <span className="text-xs text-muted-foreground">{variant}</span>
          <Search className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-6">
        <DialogHeader className="mb-4">
          <DialogTitle>Select Icon</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Variant Selector */}
          <div className="flex gap-1 flex-wrap">
            {ICON_VARIANTS.map((v) => (
              <Button
                key={v}
                variant={selectedVariant === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVariant(v)}
                className="text-xs"
              >
                {v}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${allIcons.length} icons...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent justify-start">
              {Object.keys(categories).map((cat) => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1"
                >
                  {cat} ({categories[cat].length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="flex-1 mt-4 min-h-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-8 gap-2">
                  {filteredIcons.map((iconName) => {
                    const IconComp = (Iconsax as any)[iconName];
                    const isSelected = iconName === selectedIconName;

                    if (!IconComp) return null;

                    return (
                      <Button
                        key={iconName}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-12 w-12 p-0 flex flex-col items-center justify-center gap-0.5"
                        title={iconName}
                        onClick={() => {
                          onChange(iconName, selectedVariant);
                          setIsOpen(false);
                        }}
                      >
                        <IconComp size={20} variant={selectedVariant} />
                      </Button>
                    );
                  })}
                </div>

                {filteredIcons.length === 0 && (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    No icons found
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Selected icon preview */}
          {selectedIconName && SelectedIcon && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <SelectedIcon size={32} variant={selectedVariant} />
              <div className="flex-1">
                <p className="font-medium text-sm">{selectedIconName}</p>
                <p className="text-xs text-muted-foreground">Variant: {selectedVariant}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
