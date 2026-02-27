import { supabase } from '@/integrations/supabase/client';

export interface FlowSecret {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSecretParams {
  flowProjectId: string;
  name: string;
  value: string;
  description?: string;
}

export interface UpdateSecretParams {
  flowProjectId: string;
  name: string;
  value: string;
}

export interface DeleteSecretParams {
  flowProjectId: string;
  secretId: string;
}

/**
 * Create a new encrypted secret in the Supabase Vault
 */
export async function createFlowSecret(params: CreateSecretParams): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('secrets-manager', {
    body: {
      action: 'create',
      flowProjectId: params.flowProjectId,
      name: params.name,
      value: params.value,
      description: params.description,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to create secret');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * List all secrets for a flow project (returns metadata only, not values)
 */
export async function listFlowSecrets(flowProjectId: string): Promise<FlowSecret[]> {
  const { data, error } = await supabase.functions.invoke('secrets-manager', {
    body: {
      action: 'list',
      flowProjectId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to list secrets');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data || [];
}

/**
 * Update an existing secret's value (value is encrypted, never returned)
 */
export async function updateFlowSecret(params: UpdateSecretParams): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('secrets-manager', {
    body: {
      action: 'update',
      flowProjectId: params.flowProjectId,
      name: params.name,
      value: params.value,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to update secret');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Delete a secret from the Vault
 */
export async function deleteFlowSecret(params: DeleteSecretParams): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('secrets-manager', {
    body: {
      action: 'delete',
      flowProjectId: params.flowProjectId,
      secretId: params.secretId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to delete secret');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
