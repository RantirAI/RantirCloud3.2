import { supabase } from '@/integrations/supabase/client';

/**
 * Update Bika integration name to Bika.ai in the integrations table
 */
export async function updateBikaIntegrationName() {
  try {
    console.log('Updating Bika integration name to Bika.ai...');
    
    const { data, error } = await supabase.functions.invoke('update-integration-name', {
      body: {
        nodeType: 'bika',
        newName: 'Bika.ai',
      },
    });

    if (error) {
      console.error('Error updating integration name:', error);
      throw error;
    }

    console.log('Integration name updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to update integration name:', error);
    throw error;
  }
}

// Export for manual execution
// You can run this from the console: updateBikaIntegrationName()