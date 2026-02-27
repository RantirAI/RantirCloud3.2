import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Presentation, Monitor, Tablet, Smartphone } from 'lucide-react';

export type DocumentSize = 'a4' | 'letter' | 'a3' | 'a5' | 'a6' | 'b4' | 'b5' | 'legal' | 'tabloid' | 'executive' | 'folio' | 'slides-16-9' | 'slides-4-3' | 'slides-16-10' | 'instagram-square' | 'instagram-portrait' | 'instagram-story' | 'facebook-post' | 'twitter-post' | 'linkedin-post' | 'youtube-thumbnail' | 'web-desktop' | 'web-tablet' | 'web-mobile' | 'iphone-14' | 'ipad-pro' | 'macbook-pro' | 'banner-leaderboard' | 'banner-skyscraper' | 'custom';

interface CreateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, size: DocumentSize) => void;
}

const documentSizes = [
  // Paper Sizes
  {
    id: 'a4' as const,
    name: 'A4 Paper',
    description: '210 × 297 mm',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'letter' as const,
    name: 'Letter',
    description: '8.5 × 11 in',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'a3' as const,
    name: 'A3 Paper',
    description: '297 × 420 mm',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'a5' as const,
    name: 'A5 Paper',
    description: '148 × 210 mm',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'a6' as const,
    name: 'A6 Paper',
    description: '105 × 148 mm',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'legal' as const,
    name: 'Legal',
    description: '8.5 × 14 in',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'tabloid' as const,
    name: 'Tabloid',
    description: '11 × 17 in',
    icon: FileText,
    category: 'paper'
  },
  {
    id: 'executive' as const,
    name: 'Executive',
    description: '7.25 × 10.5 in',
    icon: FileText,
    category: 'paper'
  },
  // Presentation Sizes
  {
    id: 'slides-16-9' as const,
    name: 'Slides (16:9)',
    description: 'Widescreen',
    icon: Presentation,
    category: 'presentation'
  },
  {
    id: 'slides-4-3' as const,
    name: 'Slides (4:3)',
    description: 'Standard',
    icon: Presentation,
    category: 'presentation'
  },
  {
    id: 'slides-16-10' as const,
    name: 'Slides (16:10)',
    description: 'Wide Standard',
    icon: Presentation,
    category: 'presentation'
  },
  // Social Media Sizes
  {
    id: 'instagram-square' as const,
    name: 'Instagram Square',
    description: '1080 × 1080 px',
    icon: Monitor,
    category: 'social'
  },
  {
    id: 'instagram-portrait' as const,
    name: 'Instagram Portrait',
    description: '1080 × 1350 px',
    icon: Monitor,
    category: 'social'
  },
  {
    id: 'instagram-story' as const,
    name: 'Instagram Story',
    description: '1080 × 1920 px',
    icon: Smartphone,
    category: 'social'
  },
  {
    id: 'facebook-post' as const,
    name: 'Facebook Post',
    description: '1200 × 630 px',
    icon: Monitor,
    category: 'social'
  },
  {
    id: 'twitter-post' as const,
    name: 'Twitter Post',
    description: '1200 × 675 px',
    icon: Monitor,
    category: 'social'
  },
  {
    id: 'linkedin-post' as const,
    name: 'LinkedIn Post',
    description: '1200 × 627 px',
    icon: Monitor,
    category: 'social'
  },
  {
    id: 'youtube-thumbnail' as const,
    name: 'YouTube Thumbnail',
    description: '1280 × 720 px',
    icon: Monitor,
    category: 'social'
  },
  // Web/Device Sizes
  {
    id: 'web-desktop' as const,
    name: 'Desktop (FHD)',
    description: '1920 × 1080 px',
    icon: Monitor,
    category: 'web'
  },
  {
    id: 'web-tablet' as const,
    name: 'Tablet',
    description: '768 × 1024 px',
    icon: Tablet,
    category: 'web'
  },
  {
    id: 'web-mobile' as const,
    name: 'Mobile',
    description: '375 × 667 px',
    icon: Smartphone,
    category: 'web'
  },
  {
    id: 'iphone-14' as const,
    name: 'iPhone 14',
    description: '390 × 844 px',
    icon: Smartphone,
    category: 'web'
  },
  {
    id: 'ipad-pro' as const,
    name: 'iPad Pro',
    description: '1024 × 1366 px',
    icon: Tablet,
    category: 'web'
  },
  {
    id: 'macbook-pro' as const,
    name: 'MacBook Pro',
    description: '1440 × 900 px',
    icon: Monitor,
    category: 'web'
  },
  // Banner/Ad Sizes
  {
    id: 'banner-leaderboard' as const,
    name: 'Leaderboard Banner',
    description: '728 × 90 px',
    icon: Monitor,
    category: 'banner'
  },
  {
    id: 'banner-skyscraper' as const,
    name: 'Skyscraper Banner',
    description: '160 × 600 px',
    icon: Monitor,
    category: 'banner'
  },
];

export function CreateDocumentModal({ open, onOpenChange, onConfirm }: CreateDocumentModalProps) {
  const [name, setName] = useState('');
  const [size, setSize] = useState<DocumentSize>('a4');
  const [selectedCategory, setSelectedCategory] = useState<string>('paper');

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm(name.trim(), size);
    setName('');
    setSize('a4');
    setSelectedCategory('paper');
    onOpenChange(false);
  };

  const categories = [
    { id: 'paper', name: 'Paper' },
    { id: 'presentation', name: 'Presentation' },
    { id: 'social', name: 'Social Media' },
    { id: 'web', name: 'Web/Device' },
    { id: 'banner', name: 'Banners' },
  ];

  const filteredSizes = documentSizes.filter(s => s.category === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogDescription>
            Give your document a name and choose a page size
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleConfirm();
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>Page Size Category</Label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Page Size</Label>
            <RadioGroup value={size} onValueChange={(value) => setSize(value as DocumentSize)}>
              <div className="grid grid-cols-2 gap-3">
                {filteredSizes.map((docSize) => {
                  const Icon = docSize.icon;
                  return (
                    <label
                      key={docSize.id}
                      htmlFor={docSize.id}
                      className={`relative flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                        size === docSize.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={docSize.id} id={docSize.id} className="mt-0.5" />
                      <div className="flex items-start gap-2 flex-1">
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium leading-none">
                            {docSize.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {docSize.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
