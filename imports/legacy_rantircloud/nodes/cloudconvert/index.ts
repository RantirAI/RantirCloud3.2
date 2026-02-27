import { NodePlugin, ExecutionContext } from '@/types/node-plugin';

// Helper to resolve template variables like {{env.KEY}} or {{nodeId.output}}
function resolveTemplate(value: string, context: ExecutionContext): string {
  if (typeof value !== 'string') return value;
  
  // Handle environment variables {{env.KEY}}
  const envMatch = value.match(/^\{\{env\.(.+)\}\}$/);
  if (envMatch) {
    const envKey = envMatch[1];
    const envVars = context.envVars || {};
    return envVars[envKey] || '';
  }
  
  // Handle node output variables {{nodeId.output}}
  const nodeMatch = value.match(/^\{\{(.+)\.(.+)\}\}$/);
  if (nodeMatch) {
    const [, nodeId, outputName] = nodeMatch;
    const varKey = `${nodeId}.${outputName}`;
    const resolved = context.variables?.[varKey];
    if (resolved !== undefined) {
      return typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
    }
    return '';
  }
  
  return value;
}

// Resolve all string inputs
function resolveInputs(inputs: Record<string, any>, context: ExecutionContext): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      resolved[key] = resolveTemplate(value, context);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// Check if any value contains unresolved template
function hasUnresolvedTemplate(inputs: Record<string, any>): string | null {
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
      return key;
    }
  }
  return null;
}

export const cloudconvertNode: NodePlugin = {
  type: 'cloudconvert',
  name: 'CloudConvert',
  description: 'File conversion API supporting 200+ formats',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cloudconvert.png',
  color: '#E53935',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your CloudConvert API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Convert File', value: 'convertFile' },
        { label: 'Capture Website', value: 'captureWebsite' },
        { label: 'Merge PDF', value: 'mergePdf' },
        { label: 'Download File', value: 'downloadFile' },
        { label: 'Archive File', value: 'archiveFile' },
        { label: 'Optimize File', value: 'optimizeFile' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    const formatOptions = [
      // Documents
      { label: 'PDF', value: 'pdf' },
      { label: 'DOCX (Word)', value: 'docx' },
      { label: 'DOC (Word 97-2003)', value: 'doc' },
      { label: 'XLSX (Excel)', value: 'xlsx' },
      { label: 'XLS (Excel 97-2003)', value: 'xls' },
      { label: 'PPTX (PowerPoint)', value: 'pptx' },
      { label: 'PPT (PowerPoint 97-2003)', value: 'ppt' },
      { label: 'ODT (OpenDocument Text)', value: 'odt' },
      { label: 'ODS (OpenDocument Spreadsheet)', value: 'ods' },
      { label: 'ODP (OpenDocument Presentation)', value: 'odp' },
      { label: 'RTF (Rich Text)', value: 'rtf' },
      { label: 'TXT (Plain Text)', value: 'txt' },
      { label: 'CSV', value: 'csv' },
      { label: 'HTML', value: 'html' },
      { label: 'EPUB', value: 'epub' },
      { label: 'MOBI', value: 'mobi' },
      // Images
      { label: 'PNG', value: 'png' },
      { label: 'JPG/JPEG', value: 'jpg' },
      { label: 'GIF', value: 'gif' },
      { label: 'WEBP', value: 'webp' },
      { label: 'SVG', value: 'svg' },
      { label: 'BMP', value: 'bmp' },
      { label: 'TIFF', value: 'tiff' },
      { label: 'ICO', value: 'ico' },
      { label: 'PSD (Photoshop)', value: 'psd' },
      { label: 'AI (Illustrator)', value: 'ai' },
      { label: 'EPS', value: 'eps' },
      { label: 'HEIC', value: 'heic' },
      { label: 'RAW', value: 'raw' },
      // Video
      { label: 'MP4', value: 'mp4' },
      { label: 'AVI', value: 'avi' },
      { label: 'MOV', value: 'mov' },
      { label: 'MKV', value: 'mkv' },
      { label: 'WEBM', value: 'webm' },
      { label: 'WMV', value: 'wmv' },
      { label: 'FLV', value: 'flv' },
      { label: 'M4V', value: 'm4v' },
      // Audio
      { label: 'MP3', value: 'mp3' },
      { label: 'WAV', value: 'wav' },
      { label: 'AAC', value: 'aac' },
      { label: 'FLAC', value: 'flac' },
      { label: 'OGG', value: 'ogg' },
      { label: 'M4A', value: 'm4a' },
      { label: 'WMA', value: 'wma' },
      // Archives
      { label: 'ZIP', value: 'zip' },
      { label: 'RAR', value: 'rar' },
      { label: '7Z', value: '7z' },
      { label: 'TAR', value: 'tar' },
      { label: 'TAR.GZ', value: 'tar.gz' },
      // CAD/3D
      { label: 'DWG', value: 'dwg' },
      { label: 'DXF', value: 'dxf' },
      { label: 'STL', value: 'stl' },
      { label: 'OBJ', value: 'obj' },
      // Fonts
      { label: 'TTF', value: 'ttf' },
      { label: 'OTF', value: 'otf' },
      { label: 'WOFF', value: 'woff' },
      { label: 'WOFF2', value: 'woff2' },
      // Ebooks
      { label: 'AZW3 (Kindle)', value: 'azw3' },
      { label: 'FB2', value: 'fb2' },
      // Vector
      { label: 'PDF (Vector)', value: 'pdf' },
      { label: 'EMF', value: 'emf' },
      { label: 'WMF', value: 'wmf' },
    ];

    if (action === 'convertFile') {
      inputs.push(
        { name: 'inputUrl', label: 'Input File URL', type: 'text' as const, required: true, description: 'URL of the file to convert' },
        { name: 'inputFormat', label: 'Input Format', type: 'select' as const, required: true, options: formatOptions, description: 'Format of the input file' },
        { name: 'outputFormat', label: 'Output Format', type: 'select' as const, required: true, options: formatOptions, description: 'Desired output format' },
        { name: 'filename', label: 'Output Filename', type: 'text' as const, required: false },
        { name: 'options', label: 'Conversion Options (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Format-specific options' }
      );
    } else if (action === 'captureWebsite') {
      inputs.push(
        { name: 'url', label: 'Website URL', type: 'text' as const, required: true, description: 'URL of the website to capture' },
        { name: 'outputFormat', label: 'Output Format', type: 'select' as const, required: true, options: [
          { label: 'PDF', value: 'pdf' },
          { label: 'PNG', value: 'png' },
          { label: 'JPG', value: 'jpg' },
          { label: 'WEBP', value: 'webp' },
        ]},
        { name: 'screenWidth', label: 'Screen Width (px)', type: 'number' as const, required: false, default: 1920 },
        { name: 'screenHeight', label: 'Screen Height (px)', type: 'number' as const, required: false, default: 1080 },
        { name: 'fullPage', label: 'Full Page', type: 'boolean' as const, required: false, default: false },
        { name: 'waitTime', label: 'Wait Time (ms)', type: 'number' as const, required: false, description: 'Time to wait before capture' }
      );
    } else if (action === 'mergePdf') {
      inputs.push(
        { name: 'inputUrls', label: 'Input File URLs (comma-separated)', type: 'textarea' as const, required: true, description: 'URLs of PDF files to merge' },
        { name: 'filename', label: 'Output Filename', type: 'text' as const, required: false }
      );
    } else if (action === 'downloadFile') {
      inputs.push(
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: true, description: 'ID of the completed task to download' }
      );
    } else if (action === 'archiveFile') {
      inputs.push(
        { name: 'inputUrls', label: 'Input File URLs (comma-separated)', type: 'textarea' as const, required: true },
        { name: 'inputFormat', label: 'Input Format (fallback)', type: 'select' as const, required: false, options: formatOptions, description: 'Used when URLs don\'t contain a file extension (e.g., /edit or /download)' },
        { name: 'outputFormat', label: 'Archive Format', type: 'select' as const, required: true, options: [
          { label: 'ZIP', value: 'zip' },
          { label: 'TAR', value: 'tar' },
          { label: 'TAR.GZ', value: 'tar.gz' },
          { label: '7Z', value: '7z' },
        ]},
        { name: 'filename', label: 'Output Filename', type: 'text' as const, required: false }
      );
    } else if (action === 'optimizeFile') {
      const optimizeFormats = [
        { label: 'PDF', value: 'pdf' },
        { label: 'PNG', value: 'png' },
        { label: 'JPG/JPEG', value: 'jpg' },
        { label: 'GIF', value: 'gif' },
        { label: 'WEBP', value: 'webp' },
        { label: 'SVG', value: 'svg' },
        { label: 'TIFF', value: 'tiff' },
      ];
      inputs.push(
        { name: 'inputUrl', label: 'Input File URL', type: 'text' as const, required: true },
        { name: 'inputFormat', label: 'Input Format', type: 'select' as const, required: true, options: optimizeFormats, description: 'Format of the file to optimize' },
        { name: 'profile', label: 'Optimization Profile', type: 'select' as const, required: false, options: [
          { label: 'Web', value: 'web' },
          { label: 'Print', value: 'print' },
          { label: 'Archive', value: 'archive' },
          { label: 'Max', value: 'max' },
        ]},
        { name: 'quality', label: 'Quality (1-100)', type: 'number' as const, required: false }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /jobs)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'downloadUrl', type: 'string', description: 'URL to download the converted file' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    // Resolve all template variables before calling edge function
    const resolvedInputs = resolveInputs(inputs, context);
    
    // Check for unresolved templates
    const unresolvedField = hasUnresolvedTemplate(resolvedInputs);
    if (unresolvedField) {
      return {
        success: false,
        data: null,
        downloadUrl: null,
        error: `Variable could not be resolved for field "${unresolvedField}". Ensure the source node ran and produced that output.`,
      };
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('cloudconvert-proxy', {
      body: resolvedInputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
