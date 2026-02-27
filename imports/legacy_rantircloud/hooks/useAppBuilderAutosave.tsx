import { useEffect, useRef, useState } from 'react';
import { AppProject } from '@/types/appBuilder';
import { appBuilderService } from '@/services/appBuilderService';
import { toast } from '@/components/ui/sonner';

interface UseAppBuilderAutosaveProps {
  project: AppProject | undefined;
  debounceTime?: number;
  onSaving?: () => void;
  onSaved?: () => void;
  onError?: (error: Error) => void;
}

export function useAppBuilderAutosave({
  project,
  debounceTime = 2000,
  onSaving,
  onSaved,
  onError
}: UseAppBuilderAutosaveProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousProjectRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Helper function to get project signature for comparison
  const getProjectSignature = (project: AppProject) => {
    return JSON.stringify({
      name: project.name,
      description: project.description,
      pages: project.pages,
      global_styles: project.global_styles,
      settings: project.settings
    });
  };

  // Helper function to save project data
  const saveProjectData = async () => {
    if (!project) return;

    try {
      setIsAutosaving(true);
      onSaving?.();
      
      await appBuilderService.updateAppProject(project.id, {
        name: project.name,
        description: project.description,
        pages: project.pages,
        global_styles: project.global_styles,
        settings: project.settings
      });
      
      const savedTime = new Date();
      setLastSavedTime(savedTime);
      
      console.log("App project autosaved");
      onSaved?.();
      
      // Show subtle success toast
      toast.success('Project autosaved', {
        description: `Last saved at ${savedTime.toLocaleTimeString()}`,
        duration: 2000
      });
    } catch (error) {
      console.error("Error autosaving app project:", error);
      onError?.(error as Error);
      
      toast.error('Autosave failed', {
        description: 'Failed to save project changes automatically'
      });
    } finally {
      setIsAutosaving(false);
    }
  };

  useEffect(() => {
    // Don't autosave if no project
    if (!project) return;
    
    // Don't autosave on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousProjectRef.current = getProjectSignature(project);
      return;
    }

    // Get current project signature
    const currentSignature = getProjectSignature(project);
    
    // Check if project has actually changed
    const hasChanged = previousProjectRef.current !== currentSignature;
    
    if (!hasChanged) return;

    // Update the previous signature reference
    previousProjectRef.current = currentSignature;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Use debounce for all changes
    timeoutRef.current = setTimeout(() => {
      console.log("App project autosave triggered");
      saveProjectData();
    }, debounceTime);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [project, debounceTime, onSaving, onSaved, onError]);

  // Force save function for manual saves
  const forceSave = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await saveProjectData();
  };

  return {
    isAutosaving,
    lastSavedTime,
    forceSave
  };
}