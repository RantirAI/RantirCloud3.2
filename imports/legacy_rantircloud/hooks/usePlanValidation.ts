import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: string;
  tableId: string;
}

interface UsePlanValidationResult {
  isValidating: boolean;
  isValid: boolean;
  plan: Plan | null;
  error: string | null;
  validatePlan: () => Promise<void>;
}

export function usePlanValidation(planId?: string, tableId?: string): UsePlanValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validatePlan = async () => {
    if (!planId || !tableId) {
      setError("Missing plan or table information");
      setIsValid(false);
      setPlan(null);
      return;
    }

    setIsValidating(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://appdmmjexevclmpyvtss.supabase.co/functions/v1/validate-plan?planId=${encodeURIComponent(planId)}&tableId=${encodeURIComponent(tableId)}`
      );
      
      const data = await response.json();
      
      if (data.valid && data.plan) {
        setIsValid(true);
        setPlan(data.plan);
        setError(null);
      } else {
        setIsValid(false);
        setPlan(null);
        setError(data.error || "Plan validation failed");
      }
    } catch (err) {
      setIsValid(false);
      setPlan(null);
      setError("Failed to validate subscription plan");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (planId && tableId) {
      validatePlan();
    }
  }, [planId, tableId]);

  return {
    isValidating,
    isValid,
    plan,
    error,
    validatePlan,
  };
}