import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Palette, Upload, Image, Save, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceCustomizationCardProps {
  workspaceId: string;
}

interface WorkspaceCustomization {
  id?: string;
  workspace_id: string;
  logo_url?: string;
  navigation_bg_color: string;
  navigation_text_color: string;
}

export function WorkspaceCustomizationCard({ workspaceId }: WorkspaceCustomizationCardProps) {
  const [customization, setCustomization] = useState<WorkspaceCustomization>({
    workspace_id: workspaceId,
    navigation_bg_color: '#ffffff',
    navigation_text_color: '#000000'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadCustomization();
  }, [workspaceId]);

  const loadCustomization = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_customization')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCustomization(data);
      }
    } catch (error) {
      console.error('Error loading customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Supabase Storage
      const fileName = `${workspaceId}/logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('enterprise-templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('enterprise-templates')
        .getPublicUrl(uploadData.path);

      setCustomization(prev => ({
        ...prev,
        logo_url: urlData.publicUrl
      }));

      toast({
        title: "Logo Uploaded",
        description: "Your logo has been uploaded successfully. Don't forget to save changes.",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload logo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [workspaceId, toast]);

  const handleSaveCustomization = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspace_customization')
        .upsert(customization, {
          onConflict: 'workspace_id'
        });

      if (error) throw error;

      // Dispatch custom event to update navigation
      window.dispatchEvent(new CustomEvent('workspaceCustomizationUpdated', {
        detail: customization
      }));

      toast({
        title: "Settings Saved",
        description: "Your workspace customization has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving customization:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save customization settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4" />
            Workspace Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading customization settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4" />
          Workspace Customization
        </CardTitle>
        <CardDescription>
          Customize your workspace branding and navigation appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Workspace Logo</Label>
          <div className="flex items-center gap-4">
            {customization.logo_url && (
              <div className="w-16 h-16 rounded-lg border overflow-hidden">
                <img 
                  src={customization.logo_url} 
                  alt="Workspace Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <Button
                variant="outline"
                className="relative w-full"
                disabled={uploading}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Image className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Choose Logo Image'}
              </Button>
              {uploading && (
                <div className="mt-2 space-y-1">
                  <Progress value={uploadProgress} className="h-1" />
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a logo image (max 5MB). Recommended size: 200x50px
          </p>
        </div>

        {/* Navigation Colors Section */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Navigation Colors</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bg-color" className="text-xs">Background Color</Label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    id="bg-color"
                    value={customization.navigation_bg_color}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      navigation_bg_color: e.target.value
                    }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-input cursor-pointer shadow-sm"
                    style={{ backgroundColor: customization.navigation_bg_color }}
                  />
                </div>
                <Input
                  value={customization.navigation_bg_color}
                  onChange={(e) => setCustomization(prev => ({
                    ...prev,
                    navigation_bg_color: e.target.value
                  }))}
                  placeholder="#ffffff"
                  className="text-xs flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-color" className="text-xs">Text Color</Label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    id="text-color"
                    value={customization.navigation_text_color}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      navigation_text_color: e.target.value
                    }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-input cursor-pointer shadow-sm"
                    style={{ backgroundColor: customization.navigation_text_color }}
                  />
                </div>
                <Input
                  value={customization.navigation_text_color}
                  onChange={(e) => setCustomization(prev => ({
                    ...prev,
                    navigation_text_color: e.target.value
                  }))}
                  placeholder="#000000"
                  className="text-xs flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs">Preview</Label>
            <div 
              className="p-3 rounded-lg border flex items-center gap-3"
              style={{
                backgroundColor: customization.navigation_bg_color,
                color: customization.navigation_text_color
              }}
            >
              {customization.logo_url ? (
                <img 
                  src={customization.logo_url} 
                  alt="Preview Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs">
                  Logo
                </div>
              )}
              <span className="text-sm font-medium">Navigation Preview</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveCustomization} disabled={saving}>
            {saving ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Info Section */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <h4 className="text-sm font-medium">Customization Info</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Changes will be applied to the top navigation bar</li>
            <li>• Logo will replace the default workspace icon</li>
            <li>• Colors will affect the entire navigation area</li>
            <li>• Changes are saved for your entire workspace</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}