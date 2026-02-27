/**
 * Clipboard Inspector - Based on evercoder/clipboard-inspector pattern
 * Captures all clipboard formats and provides detailed metadata
 */

export interface ClipboardItemData {
  type: string;          // MIME type
  kind: 'string' | 'file';
  size?: number;
  content?: string | Blob;
  rawData?: any;
}

export interface ClipboardInspection {
  items: ClipboardItemData[];
  formats: string[];
  primaryText: string | null;
  primaryHTML: string | null;
  files: File[];
  timestamp: number;
  error?: ClipboardError;
}

export interface ClipboardError {
  type: 'permission' | 'empty' | 'unsupported' | 'unknown';
  message: string;
  originalError?: Error;
}

/**
 * Inspect clipboard from a paste event (synchronous, most reliable)
 */
export function inspectPasteEvent(event: ClipboardEvent): ClipboardInspection {
  const timestamp = Date.now();
  const items: ClipboardItemData[] = [];
  const formats: string[] = [];
  const files: File[] = [];
  let primaryText: string | null = null;
  let primaryHTML: string | null = null;

  try {
    const clipboardData = event.clipboardData;
    
    if (!clipboardData) {
      return {
        items: [],
        formats: [],
        primaryText: null,
        primaryHTML: null,
        files: [],
        timestamp,
        error: {
          type: 'unsupported',
          message: 'ClipboardData not available in this event'
        }
      };
    }

    // Get all types (formats)
    const types = clipboardData.types;
    formats.push(...types);

    // Iterate through DataTransferItemList (clipboard-inspector pattern)
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        const itemData: ClipboardItemData = {
          type: item.type,
          kind: item.kind as 'string' | 'file'
        };

        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
            itemData.size = file.size;
            itemData.content = file;
          }
        }

        items.push(itemData);
      }
    }

    // Get text/plain content
    if (types.includes('text/plain')) {
      primaryText = clipboardData.getData('text/plain');
      const textItem = items.find(i => i.type === 'text/plain');
      if (textItem) {
        textItem.content = primaryText;
        textItem.size = primaryText?.length || 0;
      }
    }

    // Get text/html content
    if (types.includes('text/html')) {
      primaryHTML = clipboardData.getData('text/html');
      const htmlItem = items.find(i => i.type === 'text/html');
      if (htmlItem) {
        htmlItem.content = primaryHTML;
        htmlItem.size = primaryHTML?.length || 0;
      }
    }

    // Try to get any custom formats (like application/json)
    for (const type of types) {
      if (type !== 'text/plain' && type !== 'text/html' && !type.startsWith('Files')) {
        try {
          const data = clipboardData.getData(type);
          const item = items.find(i => i.type === type);
          if (item && data) {
            item.content = data;
            item.size = data.length;
          } else if (data) {
            items.push({
              type,
              kind: 'string',
              content: data,
              size: data.length
            });
          }
        } catch {
          // Some types may not be readable
        }
      }
    }

    // Check for empty clipboard
    if (items.length === 0 && !primaryText && !primaryHTML && files.length === 0) {
      return {
        items,
        formats,
        primaryText,
        primaryHTML,
        files,
        timestamp,
        error: {
          type: 'empty',
          message: 'Clipboard is empty or contains unsupported content'
        }
      };
    }

    return {
      items,
      formats,
      primaryText,
      primaryHTML,
      files,
      timestamp
    };
  } catch (error) {
    return {
      items: [],
      formats: [],
      primaryText: null,
      primaryHTML: null,
      files: [],
      timestamp,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Failed to inspect clipboard',
        originalError: error instanceof Error ? error : undefined
      }
    };
  }
}

/**
 * Inspect clipboard using async Clipboard API
 */
export async function inspectClipboardAsync(): Promise<ClipboardInspection> {
  const timestamp = Date.now();
  const items: ClipboardItemData[] = [];
  const formats: string[] = [];
  const files: File[] = [];
  let primaryText: string | null = null;
  let primaryHTML: string | null = null;

  try {
    // Check if Clipboard API is available
    if (!navigator.clipboard) {
      return {
        items: [],
        formats: [],
        primaryText: null,
        primaryHTML: null,
        files: [],
        timestamp,
        error: {
          type: 'unsupported',
          message: 'Clipboard API not available. Try using Ctrl/Cmd+V instead.'
        }
      };
    }

    // Try to use the modern read() method first
    if (navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const clipboardItem of clipboardItems) {
          formats.push(...clipboardItem.types);
          
          for (const type of clipboardItem.types) {
            try {
              const blob = await clipboardItem.getType(type);
              const itemData: ClipboardItemData = {
                type,
                kind: 'string',
                size: blob.size
              };

              if (type.startsWith('text/') || type === 'application/json') {
                const text = await blob.text();
                itemData.content = text;
                
                if (type === 'text/plain') {
                  primaryText = text;
                } else if (type === 'text/html') {
                  primaryHTML = text;
                }
              } else if (type.startsWith('image/')) {
                itemData.kind = 'file';
                itemData.content = blob;
                // Convert blob to File for consistency
                const file = new File([blob], `image.${type.split('/')[1]}`, { type });
                files.push(file);
              } else {
                itemData.content = blob;
              }

              items.push(itemData);
            } catch {
              // Skip unreadable types
            }
          }
        }
      } catch (readError) {
        // Fall back to readText if read() fails (common due to permissions)
        if (readError instanceof DOMException && readError.name === 'NotAllowedError') {
          // Try just reading text
          try {
            primaryText = await navigator.clipboard.readText();
            if (primaryText) {
              items.push({
                type: 'text/plain',
                kind: 'string',
                content: primaryText,
                size: primaryText.length
              });
              formats.push('text/plain');
            }
          } catch {
            return {
              items: [],
              formats: [],
              primaryText: null,
              primaryHTML: null,
              files: [],
              timestamp,
              error: {
                type: 'permission',
                message: 'Clipboard access denied. Click the text area and use Ctrl/Cmd+V to paste.'
              }
            };
          }
        } else {
          throw readError;
        }
      }
    } else {
      // Fallback to readText only
      try {
        primaryText = await navigator.clipboard.readText();
        if (primaryText) {
          items.push({
            type: 'text/plain',
            kind: 'string',
            content: primaryText,
            size: primaryText.length
          });
          formats.push('text/plain');
        }
      } catch (textError) {
        if (textError instanceof DOMException && textError.name === 'NotAllowedError') {
          return {
            items: [],
            formats: [],
            primaryText: null,
            primaryHTML: null,
            files: [],
            timestamp,
            error: {
              type: 'permission',
              message: 'Clipboard access denied. Click the text area and use Ctrl/Cmd+V to paste.'
            }
          };
        }
        throw textError;
      }
    }

    // Check for empty result
    if (items.length === 0 && !primaryText && files.length === 0) {
      return {
        items,
        formats,
        primaryText,
        primaryHTML,
        files,
        timestamp,
        error: {
          type: 'empty',
          message: 'Clipboard is empty'
        }
      };
    }

    return {
      items,
      formats,
      primaryText,
      primaryHTML,
      files,
      timestamp
    };
  } catch (error) {
    return {
      items: [],
      formats: [],
      primaryText: null,
      primaryHTML: null,
      files: [],
      timestamp,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Failed to read clipboard',
        originalError: error instanceof Error ? error : undefined
      }
    };
  }
}

/**
 * Get a summary of clipboard contents for display
 */
export function getClipboardInspectionSummary(inspection: ClipboardInspection): string {
  if (inspection.error) {
    return inspection.error.message;
  }

  const parts: string[] = [];

  if (inspection.files.length > 0) {
    parts.push(`${inspection.files.length} file(s)`);
  }

  if (inspection.primaryText) {
    const textLength = inspection.primaryText.length;
    if (textLength > 1000) {
      parts.push(`${(textLength / 1000).toFixed(1)}KB of text`);
    } else {
      parts.push(`${textLength} chars of text`);
    }
  }

  if (inspection.primaryHTML && !inspection.primaryText) {
    parts.push('HTML content');
  }

  if (inspection.formats.length > 0) {
    const customFormats = inspection.formats.filter(
      f => f !== 'text/plain' && f !== 'text/html' && !f.startsWith('Files')
    );
    if (customFormats.length > 0) {
      parts.push(`Formats: ${customFormats.join(', ')}`);
    }
  }

  return parts.length > 0 ? parts.join(' • ') : 'Unknown content';
}

/**
 * Get the best content from clipboard inspection for parsing
 */
export function getBestClipboardContent(inspection: ClipboardInspection): string | null {
  // Prefer text/plain as it usually contains the structured data
  if (inspection.primaryText && inspection.primaryText.trim()) {
    return inspection.primaryText;
  }

  // Fall back to HTML
  if (inspection.primaryHTML && inspection.primaryHTML.trim()) {
    return inspection.primaryHTML;
  }

  // Try to find any text content in items
  for (const item of inspection.items) {
    if (typeof item.content === 'string' && item.content.trim()) {
      return item.content;
    }
  }

  return null;
}
