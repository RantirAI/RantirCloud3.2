import { supabase } from "@/integrations/supabase/client";

export const createBulkInvoices = async (emails: string[]) => {
  const { data, error } = await supabase.functions.invoke('create-bulk-invoices', {
    body: { emails }
  });

  if (error) {
    throw new Error(`Failed to create invoices: ${error.message}`);
  }

  return data;
};
