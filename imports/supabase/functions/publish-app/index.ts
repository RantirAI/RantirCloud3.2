import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

interface PublishRequest {
  appProjectId: string;
  slug?: string;
  accessType: 'public' | 'password';
  password?: string;
  // Website info fields
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
}

interface DataConnection {
  tableId: string;
  tableName: string;
  databaseId: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Generate a unique, friendly slug from the app name
 */
async function generateUniqueSlug(name: string): Promise<string> {
  // Sanitize the name: lowercase, replace non-alphanumeric with hyphens, limit length
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
    .slice(0, 32);
  
  if (!baseSlug) {
    baseSlug = 'app';
  }
  
  // Check if slug is already taken
  const { data: existing } = await supabase
    .from('published_apps')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle();
  
  if (!existing) {
    return baseSlug;  // Slug is available
  }
  
  // Add a short random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${suffix}`;
}

/**
 * Check if a slug looks like a UUID
 */
function isUuidSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
}

/**
 * Scan app pages to extract all data source configurations
 */
function extractDataConnections(pages: any[]): DataConnection[] {
  const connections: DataConnection[] = [];
  const seenTableIds = new Set<string>();

  function scanComponent(component: any) {
    // Check for data source on component
    const dataSource = component?.dataSource || component?.props?.databaseConnection;
    
    if (dataSource?.tableProjectId && !seenTableIds.has(dataSource.tableProjectId)) {
      seenTableIds.add(dataSource.tableProjectId);
      connections.push({
        tableId: dataSource.tableProjectId,
        tableName: dataSource.tableName || 'Unknown',
        databaseId: dataSource.databaseId || '',
      });
    }

    // Recursively scan children
    if (component?.children && Array.isArray(component.children)) {
      component.children.forEach(scanComponent);
    }
  }

  // Scan all pages and their components
  pages?.forEach(page => {
    if (page?.components && Array.isArray(page.components)) {
      page.components.forEach(scanComponent);
    }
  });

  return connections;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user from the request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { appProjectId, slug, accessType, password, faviconUrl, metaTitle, metaDescription, ogImageUrl }: PublishRequest = await req.json();

    // Validate the app project exists and belongs to the user
    const { data: appProject, error: projectError } = await supabase
      .from('app_projects')
      .select('*')
      .eq('id', appProjectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !appProject) {
      return new Response(
        JSON.stringify({ error: 'App project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if app is already published
    const { data: existingPublishedApp } = await supabase
      .from('published_apps')
      .select('*, database_api_keys(id, key_prefix)')
      .eq('app_project_id', appProjectId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Determine the final slug
    let finalSlug: string;
    
    if (slug) {
      // User provided a custom slug - use it
      finalSlug = slug;
    } else if (existingPublishedApp && !isUuidSlug(existingPublishedApp.slug)) {
      // Keep existing friendly slug
      finalSlug = existingPublishedApp.slug;
    } else {
      // Generate a new friendly slug from the app name
      finalSlug = await generateUniqueSlug(appProject.name);
    }

    // Hash password if provided
    let passwordHash = null;
    if (accessType === 'password' && password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Extract data connections from the app
    const dataConnections = extractDataConnections(appProject.pages || []);
    console.log('Extracted data connections:', dataConnections);

    let publishedApp;
    let apiKeyPrefix = existingPublishedApp?.api_key_prefix;
    let apiKeyId = existingPublishedApp?.read_only_api_key_id;

    // Generate API key if there are data connections and no existing key
    if (dataConnections.length > 0 && !apiKeyId) {
      // Get the first database ID from connections (for scoping)
      const primaryDatabaseId = dataConnections.find(c => c.databaseId)?.databaseId || null;

      // Generate a read-only API key using the existing RPC function
      const { data: keyResult, error: keyError } = await supabase.rpc('generate_api_key', {
        p_user_id: user.id,
        p_database_id: primaryDatabaseId,
        p_name: `Published App: ${appProject.name}`,
        p_scopes: ['read'], // Read-only for published apps
        p_rate_limit_per_minute: 100,
        p_rate_limit_per_day: 50000,
        p_expires_at: null, // No expiration
      });

      if (keyError) {
        console.error('Failed to generate API key:', keyError);
        // Continue without API key - app will work but without dynamic data
      } else {
        apiKeyId = keyResult.id;
        apiKeyPrefix = keyResult.prefix;
        console.log('Generated read-only API key:', apiKeyPrefix);
      }
    }

    if (existingPublishedApp) {
      // Update existing published app
      const { data, error } = await supabase
        .from('published_apps')
        .update({
          slug: finalSlug,
          access_type: accessType,
          password_hash: passwordHash,
          status: 'published',
          data_connections: dataConnections,
          read_only_api_key_id: apiKeyId || existingPublishedApp.read_only_api_key_id,
          api_key_prefix: apiKeyPrefix || existingPublishedApp.api_key_prefix,
          favicon_url: faviconUrl ?? existingPublishedApp.favicon_url,
          meta_title: metaTitle ?? existingPublishedApp.meta_title,
          meta_description: metaDescription ?? existingPublishedApp.meta_description,
          og_image_url: ogImageUrl ?? existingPublishedApp.og_image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPublishedApp.id)
        .select()
        .single();

      if (error) throw error;
      publishedApp = data;
    } else {
      // Create new published app
      const { data, error } = await supabase
        .from('published_apps')
        .insert({
          app_project_id: appProjectId,
          user_id: user.id,
          slug: finalSlug,
          access_type: accessType,
          password_hash: passwordHash,
          status: 'published',
          data_connections: dataConnections,
          read_only_api_key_id: apiKeyId,
          api_key_prefix: apiKeyPrefix,
          favicon_url: faviconUrl,
          meta_title: metaTitle,
          meta_description: metaDescription,
          og_image_url: ogImageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      publishedApp = data;
    }

    // Generate URLs
    const appUrl = `https://${finalSlug}.rantir.cloud`;
    const embedCode = `<iframe src="${appUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    console.log('App published successfully:', {
      appProjectId,
      slug: finalSlug,
      accessType,
      appUrl,
      dataConnectionsCount: dataConnections.length,
      hasApiKey: !!apiKeyId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        publishedApp,
        appUrl,
        embedCode,
        dataConnections,
        apiKeyPrefix,
        message: 'App published successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error publishing app:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
