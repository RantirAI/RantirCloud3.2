import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  email: string;
  name?: string;
  priceId: string;
}

export const createStripeCustomersWithSubscriptions = async (
  customers: CustomerData[]
) => {
  const { data, error } = await supabase.functions.invoke(
    'create-stripe-customers-with-subscriptions',
    {
      body: { customers }
    }
  );

  if (error) {
    throw new Error(`Failed to create customers: ${error.message}`);
  }

  return data;
};
