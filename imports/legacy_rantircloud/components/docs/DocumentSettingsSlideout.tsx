import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Image, FileImage, Upload, Smile, Maximize2, Minimize2, AlignJustify } from 'lucide-react';
import { Document } from '@/services/documentService';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface DocumentSettingsSlideoutProps {
  document: Document;
  databaseId: string;
  onUpdate: (updates: Partial<Document>) => void;
  trigger?: React.ReactNode;
}

export function DocumentSettingsSlideout({ 
  document,
  databaseId,
  onUpdate,
  trigger 
}: DocumentSettingsSlideoutProps) {
  const [icon, setIcon] = useState(document.icon || '');
  const [logo, setLogo] = useState(document.logo || '');
  const [coverImage, setCoverImage] = useState(document.cover_image || '');
  const [widthMode, setWidthMode] = useState<'narrow' | 'full'>(
    (document.width_mode as 'narrow' | 'full') || 'narrow'
  );
  const [showPageBreaks, setShowPageBreaks] = useState(document.show_page_breaks || false);
  const [headerContent, setHeaderContent] = useState(document.header_content || '');
  const [footerContent, setFooterContent] = useState(document.footer_content || '');
  const [open, setOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'logo' | 'cover'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${document.id}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `${databaseId}/${document.id}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('document-attachments')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('document-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const url = await uploadFile(file, 'logo');
      setLogo(url);
      toast.success('Logo uploaded');
    } catch (error: any) {
      toast.error('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const url = await uploadFile(file, 'cover');
      setCoverImage(url);
      toast.success('Cover uploaded');
    } catch (error: any) {
      toast.error('Failed to upload cover: ' + error.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = () => {
    onUpdate({
      icon: icon || null,
      logo: logo || null,
      cover_image: coverImage || null,
      width_mode: widthMode,
      show_page_breaks: showPageBreaks,
      header_content: headerContent || null,
      footer_content: footerContent || null,
    });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Document Settings</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="appearance" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="page">Page Setup</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance" className="space-y-6 mt-4">
            {/* Icon */}
            <div className="space-y-2">
              <Label>Document Icon</Label>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-20 h-20 text-4xl flex items-center justify-center"
                    >
                      {icon || <Smile className="h-6 w-6 text-muted-foreground" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => setIcon(emojiData.emoji)}
                      searchPlaceholder="Search emoji..."
                      width={350}
                      height={400}
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Choose an emoji</p>
                  <p className="text-xs text-muted-foreground">
                    Click to select an emoji that represents your document
                  </p>
                  {icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIcon('')}
                      className="h-7 text-xs"
                    >
                      Remove icon
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Logo
              </Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {logo && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <img 
                      src={logo} 
                      alt="Logo preview" 
                      className="h-16 object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogo('')}
                      className="mt-2 h-7 text-xs"
                    >
                      Remove logo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Cover/Banner Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Cover Banner
              </Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingCover ? 'Uploading...' : 'Upload Cover'}
                </Button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                {coverImage && (
                  <div className="border rounded-lg overflow-hidden bg-muted/50">
                    <img 
                      src={coverImage} 
                      alt="Cover preview" 
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCoverImage('')}
                      className="m-2 h-7 text-xs"
                    >
                      Remove cover
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="layout" className="space-y-6 mt-4">
            {/* Width Mode */}
            <div className="space-y-4">
              <Label>Page Width</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={widthMode === 'narrow' ? 'default' : 'outline'}
                  onClick={() => setWidthMode('narrow')}
                  className="justify-start"
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Narrow
                </Button>
                <Button
                  variant={widthMode === 'full' ? 'default' : 'outline'}
                  onClick={() => setWidthMode('full')}
                  className="justify-start"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Full Width
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose how wide your document content should be displayed
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="page" className="space-y-6 mt-4">
            {/* Page Breaks */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show Page Breaks</Label>
                <p className="text-xs text-muted-foreground">
                  Display dotted lines to indicate page boundaries
                </p>
              </div>
              <Switch
                checked={showPageBreaks}
                onCheckedChange={setShowPageBreaks}
              />
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlignJustify className="h-4 w-4" />
                Page Header
              </Label>
              <Textarea
                value={headerContent}
                onChange={(e) => setHeaderContent(e.target.value)}
                placeholder="Add header content (shown at top of each page)"
                className="min-h-[80px]"
              />
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlignJustify className="h-4 w-4" />
                Page Footer
              </Label>
              <Textarea
                value={footerContent}
                onChange={(e) => setFooterContent(e.target.value)}
                placeholder="Add footer content (shown at bottom of each page)"
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6">
          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
