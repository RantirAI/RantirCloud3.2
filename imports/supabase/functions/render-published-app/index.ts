import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';
import { generatePasswordPage, generateErrorPage } from './pages.ts';
import { generateCustomCSS } from './styles.ts';
import { generateRuntimeCode } from './runtime.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabase = createClient(
  supabaseUrl,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const RUNTIME_CDN_URL = Deno.env.get('RANTIR_RUNTIME_CDN_URL') || 'https://cdn.rantir.cloud';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const subdomain = url.searchParams.get('subdomain') || url.searchParams.get('domain');
    const password = url.searchParams.get('password');
    const pagePath = url.searchParams.get('page') || '/';
    
    if (!subdomain) {
      return new Response('Missing subdomain or domain parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const { data: publishedApp, error } = await supabase
      .from('published_apps')
      .select(`
        *,
        app_projects (
          id, name, description, pages, global_styles, settings, style_classes, user_components
        ),
        database_api_keys (
          id, key_prefix, is_active
        )
      `)
      .or(`slug.eq.${subdomain},custom_domain.eq.${subdomain}`)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !publishedApp) {
      console.error('App not found:', { subdomain, error });
      return new Response(generateErrorPage('App not found', 'The app you are looking for does not exist or has been unpublished.'), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    }

    if (publishedApp.access_type === 'password' && publishedApp.password_hash) {
      if (!password) {
        return new Response(generatePasswordPage(subdomain, publishedApp.app_projects?.name), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (passwordHash !== publishedApp.password_hash) {
        return new Response(generatePasswordPage(subdomain, publishedApp.app_projects?.name, 'Invalid password'), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }
    }

    // Track analytics (async, don't await)
    const visitorId = crypto.randomUUID();
    supabase
      .from('app_analytics')
      .insert({
        published_app_id: publishedApp.id,
        visitor_id: visitorId,
        page_path: pagePath,
        user_agent: req.headers.get('User-Agent'),
        referrer: req.headers.get('Referer')
      })
      .then(() => {});

    supabase
      .from('published_apps')
      .update({
        views: (publishedApp.views || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', publishedApp.id)
      .then(() => {});

    let runtimeApiKey = null;
    if (publishedApp.read_only_api_key_id && publishedApp.database_api_keys?.is_active) {
      runtimeApiKey = await generateRuntimeToken(publishedApp.id, publishedApp.user_id);
    }

    const appHtml = generateFullAppHTML(
      publishedApp.app_projects, 
      publishedApp,
      runtimeApiKey,
      publishedApp.data_connections || [],
      pagePath
    );

    console.log('Published app rendered:', {
      subdomain,
      appId: publishedApp.id,
      appName: publishedApp.app_projects?.name,
      pageCount: publishedApp.app_projects?.pages?.length || 0,
      hasDataConnections: (publishedApp.data_connections || []).length > 0,
      hasApiKey: !!runtimeApiKey
    });

    const headers = new Headers({
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'X-Powered-By': 'Rantir',
    });
    headers.set('Content-Type', 'text/html; charset=utf-8');

    return new Response(appHtml, { headers });

  } catch (error) {
    console.error('Error rendering app:', error);
    const headers = new Headers({ ...corsHeaders });
    headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(
      generateErrorPage('Something went wrong', 'We encountered an error while loading this app. Please try again later.'),
      { status: 500, headers }
    );
  }
});

async function generateRuntimeToken(publishedAppId: string, userId: string): Promise<string> {
  const payload = {
    type: 'published_app',
    appId: publishedAppId,
    userId: userId,
    exp: Date.now() + (24 * 60 * 60 * 1000),
  };
  
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const secret = encoder.encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'fallback-secret');
  
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `pub_${btoa(JSON.stringify(payload))}.${signatureHex}`;
}

function generateFullAppHTML(
  appProject: any, 
  publishedApp: any,
  runtimeApiKey: string | null,
  dataConnections: any[],
  currentPath: string
): string {
  const appName = appProject?.name || 'Untitled App';
  const appDescription = appProject?.description || '';
  const pages = appProject?.pages || [];
  const globalStyles = appProject?.global_styles || {};
  const settings = appProject?.settings || {};
  const styleClasses = appProject?.style_classes || {};
  const userComponents = appProject?.user_components || {};

  const DEFAULT_HSL_TOKENS: Record<string, string> = {
    primary: '222.2 84% 4.9%',
    secondary: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
  };

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const hexToHslTriplet = (hexRaw: string): string | null => {
    const hex = hexRaw.trim();
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!match) return null;
    let h = match[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max2 = Math.max(r, g, b);
    const min2 = Math.min(r, g, b);
    const delta = max2 - min2;
    let hue = 0;
    if (delta !== 0) {
      if (max2 === r) hue = ((g - b) / delta) % 6;
      else if (max2 === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }
    const lightness = (max2 + min2) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    const sPct = Math.round(saturation * 1000) / 10;
    const lPct = Math.round(lightness * 1000) / 10;
    return `${clamp(hue, 0, 360)} ${clamp(sPct, 0, 100)}% ${clamp(lPct, 0, 100)}%`;
  };

  const toHslTriplet = (value: any, fallback: string): string => {
    if (!value) return fallback;
    if (typeof value === 'string') {
      const v = value.trim();
      if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(v)) return v;
      const hsl = /^hsl\(\s*([^\)]+)\s*\)$/i.exec(v);
      if (hsl) {
        const inner = hsl[1].replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (inner.includes('var(')) return fallback;
        return inner;
      }
      const maybeHex = hexToHslTriplet(v);
      if (maybeHex) return maybeHex;
    }
    return fallback;
  };

  const primaryTriplet = toHslTriplet(globalStyles?.primaryColor, DEFAULT_HSL_TOKENS.primary);
  const secondaryTriplet = toHslTriplet(globalStyles?.secondaryColor, DEFAULT_HSL_TOKENS.secondary);
  const accentTriplet = toHslTriplet(globalStyles?.accentColor, DEFAULT_HSL_TOKENS.accent);
  const backgroundTriplet = toHslTriplet(globalStyles?.backgroundColor, DEFAULT_HSL_TOKENS.background);
  const foregroundTriplet = toHslTriplet(globalStyles?.textColor, DEFAULT_HSL_TOKENS.foreground);
  
  const metaTitle = publishedApp.meta_title || appName;
  const metaDescription = publishedApp.meta_description || appDescription;
  const faviconUrl = publishedApp.favicon_url || '';
  const ogImageUrl = publishedApp.og_image_url || '';
  
  const currentPage = pages.find((p: any) => p.path === currentPath) || pages[0];
  
  const runtimeConfig = {
    appId: publishedApp.id,
    appName,
    apiBaseUrl: `${supabaseUrl}/functions/v1/database-api`,
    apiKey: runtimeApiKey,
    dataConnections,
    pages: pages.map((p: any) => ({
      id: p.id, name: p.name, path: p.path || '/',
      components: p.components || [], pageSettings: p.pageSettings || {}
    })),
    globalStyles, settings, styleClasses, userComponents,
    currentPageId: currentPage?.id
  };

  const customCSS = generateCustomCSS(globalStyles, styleClasses);
  
  const navLinks = pages.map((p: any) => `
    <a href="?page=${encodeURIComponent(p.path || '/')}" 
       class="px-4 py-2 rounded-lg transition-colors ${currentPage?.id === p.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}"
    >${p.name || 'Page'}</a>
  `).join('');

  const faviconLink = faviconUrl 
    ? `<link rel="icon" href="${faviconUrl}" type="image/${faviconUrl.endsWith('.svg') ? 'svg+xml' : faviconUrl.endsWith('.ico') ? 'x-icon' : 'png'}">`
    : '';

  const ogImageMeta = ogImageUrl 
    ? `<meta property="og:image" content="${ogImageUrl}">
  <meta name="twitter:image" content="${ogImageUrl}">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle}</title>
  ${faviconLink}
  <meta name="description" content="${metaDescription}">
  <meta property="og:title" content="${metaTitle}">
  <meta property="og:description" content="${metaDescription}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${metaTitle}">
  <meta name="twitter:description" content="${metaDescription}">
  ${ogImageMeta}
  
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: 'hsl(var(--primary))',
            secondary: 'hsl(var(--secondary))',
            accent: 'hsl(var(--accent))',
          },
          fontFamily: {
            sans: ['${globalStyles?.fontFamily || 'Inter'}', 'sans-serif'],
          },
        }
      }
    }
  </script>
  
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <style>
    :root {
      --primary: ${primaryTriplet};
      --secondary: ${secondaryTriplet};
      --accent: ${accentTriplet};
      --background: ${backgroundTriplet};
      --foreground: ${foregroundTriplet};
    }
    
    body {
      font-family: '${globalStyles?.fontFamily || 'Inter'}', sans-serif;
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    
    .rantir-app {
      min-height: 100vh;
    }
    
    ${customCSS}
  </style>
</head>
<body>
  <div id="rantir-app" class="rantir-app"></div>
  
  <script>
    window.__RANTIR_APP_CONFIG__ = ${JSON.stringify(runtimeConfig)};
    
    window.__RANTIR_FETCH_DATA__ = async function(tableId, options) {
      if (!options) options = {};
      var config = window.__RANTIR_APP_CONFIG__;
      if (!config.apiKey) {
        console.warn('No API key available for data fetching');
        return { data: [], error: 'No API key configured' };
      }
      
      try {
        var params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        if (options.sort) params.append('sort', options.sort);
        if (options.order) params.append('order', options.order);
        if (options.filters) params.append('filters', JSON.stringify(options.filters));
        
        var url = config.apiBaseUrl + '/tables/' + tableId + '/records?' + params.toString();
        
        var response = await fetch(url, {
          method: 'GET',
          headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' },
        });
        
        var result = await response.json();
        return result.success ? { data: result.data } : { data: [], error: result.error && result.error.message };
      } catch (error) {
        console.error('Data fetch error:', error);
        return { data: [], error: error.message };
      }
    };
    
    window.__RANTIR_NAVIGATE__ = function(path) {
      var url = new URL(window.location);
      url.searchParams.set('page', path);
      window.location.href = url.toString();
    };
  </script>
  
  <script>
    ${generateRuntimeCode()}
  </script>
</body>
</html>`;
}
