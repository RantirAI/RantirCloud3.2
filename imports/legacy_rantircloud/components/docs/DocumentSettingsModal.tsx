import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Image, Upload, Trash2 } from 'lucide-react';
import { Document } from '@/services/documentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DocumentSettingsModalProps {
  document: Document;
  databaseId: string;
  onUpdate: (updates: Partial<Document>) => void;
  onDelete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pageSizes = [
  { value: 'a4', label: 'A4 (8.27 × 11.69 in)' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'slides-16-9', label: 'Slides 16:9' },
  { value: 'slides-4-3', label: 'Slides 4:3' },
];

export function DocumentSettingsModal({ 
  document,
  databaseId,
  onUpdate,
  onDelete,
  open,
  onOpenChange,
}: DocumentSettingsModalProps) {
  const [documentName, setDocumentName] = useState(document.title);
  const [pageSize, setPageSize] = useState(document.page_size || 'a4');
  const [logo, setLogo] = useState(document.logo || '');
  const [headerImage, setHeaderImage] = useState(document.header_content || '');
  const [footerImage, setFooterImage] = useState(document.footer_content || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingFooter, setUploadingFooter] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'logo' | 'header' | 'footer'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${document.id}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `${databaseId}/${fileName}`;

    // Try to upload to the databases bucket
    const { error: uploadError } = await supabase.storage
      .from('databases')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('databases')
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

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingHeader(true);
      const url = await uploadFile(file, 'header');
      setHeaderImage(url);
      toast.success('Header image uploaded');
    } catch (error: any) {
      toast.error('Failed to upload header: ' + error.message);
    } finally {
      setUploadingHeader(false);
    }
  };

  const handleFooterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFooter(true);
      const url = await uploadFile(file, 'footer');
      setFooterImage(url);
      toast.success('Footer image uploaded');
    } catch (error: any) {
      toast.error('Failed to upload footer: ' + error.message);
    } finally {
      setUploadingFooter(false);
    }
  };

  const handleSave = async () => {
    try {
      await onUpdate({
        title: documentName,
        page_size: pageSize,
        logo: logo || null,
        header_content: headerImage || null,
        footer_content: footerImage || null,
      });
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Settings</DialogTitle>
          <DialogDescription>
            Configure your document's properties and appearance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 px-2">
          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input
              id="doc-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              className="px-4 py-3"
            />
          </div>

          {/* Page Size */}
          <div className="space-y-2">
            <Label htmlFor="page-size">Page Size</Label>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger id="page-size" className="px-4 py-3 h-auto">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {logo && (
                <div className="w-20 h-20 border rounded-md overflow-hidden bg-muted">
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? 'Uploading...' : logo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
              {logo && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLogo('')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Header Image */}
          <div className="space-y-2">
            <Label>Header Image</Label>
            <div className="flex items-center gap-3">
              {headerImage && (
                <div className="w-20 h-20 border rounded-md overflow-hidden bg-muted">
                  <img src={headerImage} alt="Header" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => headerInputRef.current?.click()}
                  disabled={uploadingHeader}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingHeader ? 'Uploading...' : headerImage ? 'Change Header' : 'Upload Header'}
                </Button>
                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeaderUpload}
                  className="hidden"
                />
              </div>
              {headerImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHeaderImage('')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Footer Image */}
          <div className="space-y-2">
            <Label>Footer Image</Label>
            <div className="flex items-center gap-3">
              {footerImage && (
                <div className="w-20 h-20 border rounded-md overflow-hidden bg-muted">
                  <img src={footerImage} alt="Footer" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => footerInputRef.current?.click()}
                  disabled={uploadingFooter}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFooter ? 'Uploading...' : footerImage ? 'Change Footer' : 'Upload Footer'}
                </Button>
                <input
                  ref={footerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFooterUpload}
                  className="hidden"
                />
              </div>
              {footerImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFooterImage('')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Document
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
