
import { supabase } from "@/integrations/supabase/client";

export interface FlowEnvironment {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  integration_type?: string;
  created_at: string;
  updated_at: string;
}

// Environment CRUD
export async function listEnvironments(): Promise<FlowEnvironment[]> {
  const { data, error } = await supabase
    .from('flow_environments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createEnvironment(env: { name: string; description?: string }): Promise<FlowEnvironment> {
  const { data, error } = await supabase
    .from('flow_environments')
    .insert([env])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEnvironment(id: string, updates: Partial<FlowEnvironment>): Promise<FlowEnvironment> {
  const { data, error } = await supabase
    .from('flow_environments')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEnvironment(id: string): Promise<void> {
  const { error } = await supabase
    .from('flow_environments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Variable CRUD
export async function listEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
  const { data, error } = await supabase
    .from('environment_variables')
    .select('*')
    .eq('environment_id', environmentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createVariable(variable: {
  environment_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  integration_type?: string;
}): Promise<EnvironmentVariable> {
  const { data, error } = await supabase
    .from('environment_variables')
    .insert([variable])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateVariable(id: string, updates: Partial<EnvironmentVariable>): Promise<EnvironmentVariable> {
  const { data, error } = await supabase
    .from('environment_variables')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVariable(id: string): Promise<void> {
  const { error } = await supabase
    .from('environment_variables')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
