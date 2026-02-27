import { supabase } from '@/integrations/supabase/client';
import { AIWallGeneration, AIWallVariant } from '@/stores/aiWallStore';

export interface AIWallSessionRow {
  id: string;
  user_id: string;
  prompt: string;
  preset_id: string | null;
  model: string;
  selected_variant_index: number;
  created_at: string;
  updated_at: string;
}

export interface AIWallVariantRow {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  layout_type: string;
  components: any;
  sort_order: number;
  created_at: string;
}

// Save a completed generation to the database
export async function saveGeneration(generation: AIWallGeneration): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('ai_wall_sessions')
      .insert({
        id: generation.id,
        user_id: user.id,
        prompt: generation.prompt,
        preset_id: generation.presetId || null,
        model: (generation as any).model || 'unknown',
        selected_variant_index: generation.selectedVariantIndex,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[AI Wall Persistence] Session save error:', sessionError);
      return null;
    }

    // Insert variants
    const variantRows = generation.variants.map((v, i) => ({
      id: v.id,
      session_id: session.id,
      name: v.name,
      description: v.description || null,
      layout_type: v.layoutType,
      components: v.components,
      sort_order: i,
    }));

    if (variantRows.length > 0) {
      const { error: variantError } = await supabase
        .from('ai_wall_variants')
        .insert(variantRows);

      if (variantError) {
        console.error('[AI Wall Persistence] Variants save error:', variantError);
      }
    }

    console.log(`[AI Wall Persistence] Saved session ${session.id} with ${variantRows.length} variants`);
    return session.id;
  } catch (err) {
    console.error('[AI Wall Persistence] Save failed:', err);
    return null;
  }
}

// Load all sessions for the current user (summary only, no variants)
export async function loadSessionList(): Promise<AIWallSessionRow[]> {
  try {
    const { data, error } = await supabase
      .from('ai_wall_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AI Wall Persistence] Load sessions error:', error);
      return [];
    }

    return (data || []) as AIWallSessionRow[];
  } catch (err) {
    console.error('[AI Wall Persistence] Load failed:', err);
    return [];
  }
}

// Load a full session with its variants
export async function loadSession(sessionId: string): Promise<AIWallGeneration | null> {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('ai_wall_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) return null;

    const { data: variants, error: variantError } = await supabase
      .from('ai_wall_variants')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true });

    if (variantError) {
      console.error('[AI Wall Persistence] Load variants error:', variantError);
      return null;
    }

    const s = session as AIWallSessionRow;
    return {
      id: s.id,
      prompt: s.prompt,
      presetId: s.preset_id || 'none',
      selectedVariantIndex: s.selected_variant_index,
      createdAt: new Date(s.created_at),
      model: s.model,
      variants: (variants || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description || '',
        layoutType: v.layout_type as AIWallVariant['layoutType'],
        components: v.components || [],
        createdAt: new Date(v.created_at),
      })),
    } as AIWallGeneration & { model: string };
  } catch (err) {
    console.error('[AI Wall Persistence] Load session failed:', err);
    return null;
  }
}

// Delete a session and its variants (cascade)
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_wall_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[AI Wall Persistence] Delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[AI Wall Persistence] Delete failed:', err);
    return false;
  }
}

// Update selected variant index
export async function updateSelectedVariant(sessionId: string, index: number): Promise<void> {
  await supabase
    .from('ai_wall_sessions')
    .update({ selected_variant_index: index })
    .eq('id', sessionId);
}
