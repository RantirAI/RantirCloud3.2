/**
 * Project Asset Service
 * 
 * Handles image/file uploads for app builder projects WITHOUT requiring 
 * a database drive connection. Files are stored in a dedicated storage 
 * bucket organized by project ID.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProjectAsset {
  id: string;
  project_id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
  thumbnail_url?: string | null;
  metadata?: Record<string, any>;
}

const BUCKET_NAME = 'app-project-assets';

export const projectAssetService = {
  /**
   * Upload a file to the project's asset folder
   */
  async uploadAsset(
    projectId: string,
    file: File
  ): Promise<ProjectAsset> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${projectId}/${uniqueName}`;

    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload asset: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Create asset record - store in localStorage for now as we don't have a dedicated table
    // This can be migrated to a database table later if needed
    const asset: ProjectAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      name: file.name,
      file_path: publicUrl,
      file_size: file.size,
      file_type: fileExt,
      mime_type: file.type,
      uploaded_by: user.id,
      created_at: new Date().toISOString(),
    };

    // Store in localStorage project assets list
    const assets = this.getProjectAssetsFromStorage(projectId);
    assets.push(asset);
    this.saveProjectAssetsToStorage(projectId, assets);

    return asset;
  },

  /**
   * Get all assets for a project
   */
  async getProjectAssets(projectId: string): Promise<ProjectAsset[]> {
    // Get from localStorage
    const localAssets = this.getProjectAssetsFromStorage(projectId);

    // Also try to list files from storage bucket directly
    try {
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(projectId, {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.warn('Could not list project assets from storage:', error);
        return localAssets;
      }

      if (files && files.length > 0) {
        // Merge storage files with local records
        const storageAssets: ProjectAsset[] = files
          .filter(f => !f.name.startsWith('.')) // Skip hidden files
          .map(f => {
            const { data: { publicUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(`${projectId}/${f.name}`);

            // Check if we have local metadata for this file
            const localAsset = localAssets.find(
              la => la.file_path.includes(f.name)
            );

            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext);
            const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);

            return {
              id: localAsset?.id || `asset-${f.id || f.name}`,
              project_id: projectId,
              name: localAsset?.name || f.name,
              file_path: publicUrl,
              file_size: f.metadata?.size || 0,
              file_type: ext,
              mime_type: isImage 
                ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
                : isVideo
                  ? `video/${ext}`
                  : 'application/octet-stream',
              uploaded_by: localAsset?.uploaded_by || '',
              created_at: f.created_at || new Date().toISOString(),
              thumbnail_url: isImage ? publicUrl : undefined,
              metadata: localAsset?.metadata,
            };
          });

        return storageAssets;
      }
    } catch (err) {
      console.warn('Error fetching project assets:', err);
    }

    return localAssets;
  },

  /**
   * Delete an asset
   */
  async deleteAsset(projectId: string, assetId: string): Promise<void> {
    const assets = this.getProjectAssetsFromStorage(projectId);
    const asset = assets.find(a => a.id === assetId);

    if (asset) {
      // Extract file path from URL
      try {
        const url = new URL(asset.file_path);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const storagePath = `${projectId}/${fileName}`;

        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);
      } catch (err) {
        console.warn('Could not delete from storage:', err);
      }

      // Remove from local storage
      const updatedAssets = assets.filter(a => a.id !== assetId);
      this.saveProjectAssetsToStorage(projectId, updatedAssets);
    }
  },

  /**
   * Update asset metadata (e.g., alt text)
   */
  async updateAssetMetadata(
    projectId: string,
    assetId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const assets = this.getProjectAssetsFromStorage(projectId);
    const assetIndex = assets.findIndex(a => a.id === assetId);

    if (assetIndex >= 0) {
      assets[assetIndex] = {
        ...assets[assetIndex],
        metadata: {
          ...assets[assetIndex].metadata,
          ...metadata,
        },
      };
      this.saveProjectAssetsToStorage(projectId, assets);
    }
  },

  // Helper: Get assets from localStorage
  getProjectAssetsFromStorage(projectId: string): ProjectAsset[] {
    try {
      const stored = localStorage.getItem(`project-assets-${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Helper: Save assets to localStorage
  saveProjectAssetsToStorage(projectId: string, assets: ProjectAsset[]): void {
    try {
      localStorage.setItem(`project-assets-${projectId}`, JSON.stringify(assets));
    } catch (err) {
      console.error('Failed to save project assets to localStorage:', err);
    }
  },

  /**
   * Check if the asset bucket exists and is accessible
   */
  async checkBucketExists(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Get a file type category for filtering
   */
  getAssetCategory(asset: ProjectAsset): 'Images' | 'Videos' | 'Documents' | 'Other' {
    const ext = asset.file_type.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) {
      return 'Images';
    }
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return 'Videos';
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext)) {
      return 'Documents';
    }
    return 'Other';
  },
};
