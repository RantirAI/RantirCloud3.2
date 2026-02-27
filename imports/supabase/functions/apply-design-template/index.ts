import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DesignSystemTemplate {
  id: string;
  name: string;
  tokens: {
    colors?: Array<{ name: string; value: string; category: string }>;
    fonts?: Array<{ name: string; value: string; category: string }>;
    spacing?: Array<{ name: string; value: string; category: string }>;
    shadows?: Array<{ name: string; value: string; category: string }>;
  };
  button_presets: Array<{
    name: string;
    variant: string;
    styles: Record<string, any>;
    states?: Record<string, any>;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header. Please sign in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    // Parse request body
    const { appProjectId, templateId } = await req.json();
    
    if (!appProjectId || !templateId) {
      return new Response(
        JSON.stringify({ error: 'Missing appProjectId or templateId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Applying template:', templateId, 'to project:', appProjectId);

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('design_system_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typedTemplate = template as DesignSystemTemplate;
    console.log('Template loaded:', typedTemplate.name);

    // Delete existing tokens and presets for this project
    const { error: deleteTokensError } = await supabase
      .from('design_tokens')
      .delete()
      .eq('app_project_id', appProjectId);

    if (deleteTokensError) {
      console.error('Error deleting existing tokens:', deleteTokensError);
    }

    const { error: deletePresetsError } = await supabase
      .from('button_presets')
      .delete()
      .eq('app_project_id', appProjectId);

    if (deletePresetsError) {
      console.error('Error deleting existing presets:', deletePresetsError);
    }

    let tokensCreated = 0;
    let presetsCreated = 0;

    // Create tokens from template
    const allTokens = [
      ...(typedTemplate.tokens?.colors || []),
      ...(typedTemplate.tokens?.fonts || []),
      ...(typedTemplate.tokens?.spacing || []),
      ...(typedTemplate.tokens?.shadows || [])
    ];

    console.log('Creating', allTokens.length, 'tokens');

    for (const token of allTokens) {
      const { error: insertError } = await supabase
        .from('design_tokens')
        .insert({
          app_project_id: appProjectId,
          user_id: userId,
          name: token.name,
          value: token.value,
          category: token.category,
          is_active: true,
          description: `From ${typedTemplate.name} template`
        });

      if (insertError) {
        console.error('Error creating token:', token.name, insertError);
      } else {
        tokensCreated++;
      }
    }

    // Create button presets from template
    const buttonPresets = typedTemplate.button_presets || [];
    console.log('Creating', buttonPresets.length, 'button presets');

    for (const preset of buttonPresets) {
      const { error: insertError } = await supabase
        .from('button_presets')
        .insert({
          app_project_id: appProjectId,
          user_id: userId,
          name: preset.name,
          variant: preset.variant || 'default',
          styles: preset.styles || {},
          states: preset.states || {}
        });

      if (insertError) {
        console.error('Error creating preset:', preset.name, insertError);
      } else {
        presetsCreated++;
      }
    }

    console.log('Successfully created', tokensCreated, 'tokens and', presetsCreated, 'presets');

    return new Response(
      JSON.stringify({ 
        success: true,
        tokensCreated, 
        presetsCreated,
        templateName: typedTemplate.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
