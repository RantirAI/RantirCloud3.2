// Shared utility for generating images and videos for document sections
import { supabase } from '@/integrations/supabase/client';

export interface MediaSection {
  type: string;
  content?: string;
  imagePrompt?: string;
  imageUrl?: string;
  videoPrompt?: string;
  videoUrl?: string;
  [key: string]: any;
}

export interface GenerateMediaOptions {
  databaseId?: string;
  userId?: string;
  onProgress?: (message: string) => void;
}

/**
 * Generate actual image/video URLs for sections that have prompts but no URLs
 */
export async function generateMediaForSections(
  sections: MediaSection[],
  options: GenerateMediaOptions = {}
): Promise<MediaSection[]> {
  const { databaseId, userId, onProgress } = options;
  const processedSections: MediaSection[] = [];
  
  let imageCount = 0;
  let videoCount = 0;
  
  // Count media items first
  for (const section of sections) {
    if (section.type === 'image' && section.imagePrompt && !section.imageUrl) imageCount++;
    if (section.type === 'video' && section.videoPrompt && !section.videoUrl) videoCount++;
  }
  
  let currentImage = 0;
  let currentVideo = 0;
  
  for (const section of sections) {
    const processedSection = { ...section };
    
    // Generate image if we have a prompt but no URL
    if (section.type === 'image' && section.imagePrompt && !section.imageUrl) {
      currentImage++;
      const progressMsg = imageCount > 1 
        ? `Generating image ${currentImage}/${imageCount}...` 
        : `Generating image: ${section.imagePrompt.slice(0, 40)}...`;
      onProgress?.(progressMsg);
      
      try {
        const { data: imgData, error: imgError } = await supabase.functions.invoke('generate-document-image', {
          body: { 
            prompt: section.imagePrompt,
            databaseId,
            userId
          }
        });
        
        if (!imgError && imgData?.imageUrl) {
          processedSection.imageUrl = imgData.imageUrl;
          console.log('Generated image URL:', imgData.imageUrl?.slice(0, 100));
        } else {
          console.error('Failed to generate image:', imgError || 'No URL returned');
        }
      } catch (err) {
        console.error('Image generation error:', err);
      }
    }
    
    // Generate video if we have a prompt but no URL (using Google Veo 3.1)
    if (section.type === 'video' && section.videoPrompt && !section.videoUrl) {
      currentVideo++;
      const progressMsg = videoCount > 1 
        ? `Generating video ${currentVideo}/${videoCount}...` 
        : `Generating video: ${section.videoPrompt.slice(0, 40)}...`;
      onProgress?.(progressMsg);
      
      try {
        // Start video generation with Google Veo 3.1
        const { data: videoData, error: videoError } = await supabase.functions.invoke('generate-video', {
          body: { 
            prompt: section.videoPrompt
          }
        });
        
        if (videoError) {
          console.error('Failed to start video generation:', videoError);
        } else if (videoData?.requiresSetup) {
          console.warn('Video generation requires setup:', videoData.error);
        } else if (videoData?.operationName) {
          // Poll for completion using Google's operation endpoint (max 180 seconds for longer videos)
          let attempts = 0;
          const maxAttempts = 60; // 60 * 3 seconds = 180 seconds max
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-video', {
              body: { operationName: videoData.operationName }
            });
            
            if (statusError) {
              console.error('Error checking video status:', statusError);
              break;
            }
            
            if (statusData?.status === 'succeeded' && statusData?.output) {
              processedSection.videoUrl = statusData.output;
              console.log('Generated video URL:', statusData.output);
              break;
            } else if (statusData?.status === 'failed') {
              console.error('Video generation failed:', statusData?.error);
              break;
            }
            
            attempts++;
            onProgress?.(`Video processing... (${attempts * 3}s)`);
          }
          
          if (attempts >= maxAttempts && !processedSection.videoUrl) {
            console.warn('Video generation timed out after 180 seconds');
          }
        } else {
          console.error('Unexpected response from video generation:', videoData);
        }
      } catch (err) {
        console.error('Video generation error:', err);
      }
    }
    
    processedSections.push(processedSection);
  }
  
  return processedSections;
}

/**
 * Check if sections contain any media that needs generation
 */
export function sectionsNeedMediaGeneration(sections: MediaSection[]): boolean {
  return sections.some(section => 
    (section.type === 'image' && section.imagePrompt && !section.imageUrl) ||
    (section.type === 'video' && section.videoPrompt && !section.videoUrl)
  );
}
