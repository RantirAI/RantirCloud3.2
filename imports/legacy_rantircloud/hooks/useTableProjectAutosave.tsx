
import { useState, useEffect, useCallback } from 'react';
import { tableService, TableProject } from '@/services/tableService';
import { toast } from '@/components/ui/sonner';
import { debounce } from 'lodash';

const AUTOSAVE_DELAY = 1000; // 1 second delay

export function useTableProjectAutosave(
  projectId: string | undefined, 
  records: any[], 
  schema: any
) {
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const autoSave = useCallback(
    debounce(async () => {
      if (!projectId) return;

      try {
        setIsAutosaving(true);
        
        await tableService.updateTableProject(projectId, {
          records: records,
          schema: schema
        });

        const savedTime = new Date();
        setLastSavedTime(savedTime);
        
        // Optionally, show a subtle toast for feedback
        toast.info('Project autosaved', {
          description: `Last saved at ${savedTime.toLocaleTimeString()}`,
          duration: 2000,
          position: 'bottom-right'
        });
      } catch (error: any) {
        toast.error('Autosave failed', {
          description: error.message || 'Unable to save project changes'
        });
      } finally {
        setIsAutosaving(false);
      }
    }, AUTOSAVE_DELAY),
    [projectId, records, schema]
  );

  // Trigger autosave when records or schema change
  useEffect(() => {
    if ((records && records.length > 0) || schema) {
      autoSave();
    }
  }, [records, schema, autoSave]);

  return {
    isAutosaving,
    lastSavedTime
  };
}
