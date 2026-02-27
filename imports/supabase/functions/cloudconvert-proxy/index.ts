import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to derive filename from URL
function deriveFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      return decodeURIComponent(lastSegment);
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to sanitize filename for CloudConvert
function sanitizeFilename(name: string): string {
  let sanitized = name.trim();
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');
  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');
  // Remove characters outside safe allowlist (keep alphanumeric, dots, dashes, underscores)
  sanitized = sanitized.replace(/[^A-Za-z0-9._-]/g, '');
  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  // Enforce max length
  if (sanitized.length > 120) {
    sanitized = sanitized.substring(0, 120);
  }
  return sanitized || 'file';
}

// Helper to extract file extension from URL
function getExtensionFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const lastSegment = decodeURIComponent(segments[segments.length - 1]);
      const match = lastSegment.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        return match[1].toLowerCase();
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to ensure filename has an extension
function ensureExtension(name: string, ext?: string): string {
  if (!ext) return name;
  const lowerName = name.toLowerCase();
  const lowerExt = ext.toLowerCase();
  // Check if already has the extension
  if (lowerName.endsWith(`.${lowerExt}`)) {
    return name;
  }
  // For multi-part extensions like tar.gz
  if (lowerExt.includes('.') && lowerName.endsWith(`.${lowerExt.split('.')[0]}`)) {
    return name;
  }
  return `${name}.${ext}`;
}

// Get a safe import filename - always ensures an extension is present
function getSafeImportFilename(providedFilename: string | undefined, inputUrl: string, inputFormat?: string): string {
  let filename: string;
  
  if (providedFilename && providedFilename.trim() && !providedFilename.includes('{{')) {
    filename = sanitizeFilename(providedFilename);
  } else {
    const derived = deriveFilenameFromUrl(inputUrl);
    if (derived && derived.length > 0) {
      filename = sanitizeFilename(derived);
    } else {
      filename = 'input';
    }
  }
  
  // Determine extension: inputFormat > URL extension > 'bin' fallback
  const urlExtension = getExtensionFromUrl(inputUrl);
  const ext = inputFormat || urlExtension || 'bin';
  
  // Always ensure extension is present
  filename = ensureExtension(filename, ext);
  
  console.log(`CloudConvert: computed import filename = "${filename}"`);
  return filename;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.cloudconvert.com/v2';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'convertFile': {
        endpoint = '/jobs';
        method = 'POST';
        
        // Always set a safe filename for import
        const importFilename = getSafeImportFilename(params.filename, params.inputUrl, params.inputFormat);
        
        const tasks: any = {
          'import-file': {
            operation: 'import/url',
            url: params.inputUrl,
            filename: importFilename,
          },
          'convert-file': {
            operation: 'convert',
            input: ['import-file'],
            input_format: params.inputFormat,
            output_format: params.outputFormat,
            ...(params.options ? JSON.parse(params.options) : {}),
          },
          'export-file': {
            operation: 'export/url',
            input: ['convert-file'],
          },
        };
        body = { tasks };
        break;
      }

      case 'captureWebsite': {
        endpoint = '/jobs';
        method = 'POST';
        const captureTasks: any = {
          'capture-website': {
            operation: 'capture-website',
            url: params.url,
            output_format: params.outputFormat || 'pdf',
            screen_width: params.screenWidth || 1920,
            screen_height: params.screenHeight || 1080,
            full_page: params.fullPage || false,
            ...(params.waitTime ? { wait_time: params.waitTime } : {}),
          },
          'export-file': {
            operation: 'export/url',
            input: ['capture-website'],
          },
        };
        body = { tasks: captureTasks };
        break;
      }

      case 'mergePdf': {
        endpoint = '/jobs';
        method = 'POST';
        const urls = params.inputUrls.split(',').map((u: string) => u.trim());
        const mergeTasks: any = {};
        
        urls.forEach((url: string, index: number) => {
          const importFilename = getSafeImportFilename(undefined, url, 'pdf');
          mergeTasks[`import-${index}`] = {
            operation: 'import/url',
            url,
            filename: importFilename,
          };
        });
        
        mergeTasks['merge-files'] = {
          operation: 'merge',
          input: urls.map((_: string, index: number) => `import-${index}`),
          output_format: 'pdf',
        };
        
        const mergeExportTask: any = {
          operation: 'export/url',
          input: ['merge-files'],
        };
        if (params.filename && !params.filename.includes('{{')) {
          mergeExportTask.filename = sanitizeFilename(params.filename);
        }
        mergeTasks['export-file'] = mergeExportTask;
        
        body = { tasks: mergeTasks };
        break;
      }

      case 'downloadFile': {
        endpoint = `/tasks/${params.taskId}`;
        method = 'GET';
        break;
      }

      case 'archiveFile': {
        endpoint = '/jobs';
        method = 'POST';
        const urls = params.inputUrls.split(',').map((u: string) => u.trim());
        const archiveTasks: any = {};
        
        urls.forEach((url: string, index: number) => {
          // Use inputFormat from UI as fallback (like convertFile), getSafeImportFilename handles the rest
          const importFilename = getSafeImportFilename(undefined, url, params.inputFormat);
          archiveTasks[`import-${index}`] = {
            operation: 'import/url',
            url,
            filename: importFilename,
          };
        });
        
        archiveTasks['archive-files'] = {
          operation: 'archive',
          input: urls.map((_: string, index: number) => `import-${index}`),
          output_format: params.outputFormat || 'zip',
        };
        
        const archiveExportTask: any = {
          operation: 'export/url',
          input: ['archive-files'],
        };
        if (params.filename && !params.filename.includes('{{')) {
          archiveExportTask.filename = sanitizeFilename(params.filename);
        }
        archiveTasks['export-file'] = archiveExportTask;
        
        body = { tasks: archiveTasks };
        break;
      }

      case 'optimizeFile': {
        endpoint = '/jobs';
        method = 'POST';
        
        // Always set a safe filename for import
        const importFilename = getSafeImportFilename(params.filename, params.inputUrl, params.inputFormat);
        
        const optimizeTasks: any = {
          'import-file': {
            operation: 'import/url',
            url: params.inputUrl,
            filename: importFilename,
          },
          'optimize-file': {
            operation: 'optimize',
            input: ['import-file'],
            input_format: params.inputFormat,
            ...(params.profile ? { profile: params.profile } : {}),
            ...(params.quality ? { quality: params.quality } : {}),
          },
          'export-file': {
            operation: 'export/url',
            input: ['optimize-file'],
          },
        };
        body = { tasks: optimizeTasks };
        break;
      }

      case 'customApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`CloudConvert: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('CloudConvert API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract download URL if available
    let downloadUrl = null;
    if (data.data?.tasks) {
      const exportTask = data.data.tasks.find((t: any) => t.operation === 'export/url' && t.status === 'finished');
      if (exportTask?.result?.files?.[0]?.url) {
        downloadUrl = exportTask.result.files[0].url;
      }
    }
    // For downloadFile action, get the URL from task result
    if (action === 'downloadFile' && data.data?.result?.files?.[0]?.url) {
      downloadUrl = data.data.result.files[0].url;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data, 
      downloadUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CloudConvert proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
