/**
 * Smart context-aware project naming utility
 * Extracts meaningful names from prompts by filtering action words and formatting properly
 */

// Action verbs to filter out
const ACTION_WORDS = [
  'generate', 'create', 'make', 'build', 'design', 'develop', 
  'write', 'draft', 'compose', 'prepare', 'produce', 'set', 'up',
  'add', 'new', 'start', 'begin', 'setup', 'configure', 'implement'
];

// Articles and prepositions to filter
const FILTER_WORDS = [
  'a', 'an', 'the', 'my', 'our', 'your', 'their', 'its',
  'for', 'about', 'on', 'with', 'to', 'that', 'which', 'this',
  'some', 'any', 'please', 'can', 'could', 'would', 'should',
  'i', 'we', 'you', 'need', 'want', 'like', 'me'
];

// Type keywords to filter (avoid duplicating type in name)
const TYPE_KEYWORDS = [
  'database', 'flow', 'workflow', 'app', 'application', 
  'website', 'site', 'document', 'report', 'logic', 'project',
  'table', 'tables', 'system'
];

/**
 * Extracts a smart, context-aware project name from a user prompt
 * @param prompt - The user's input prompt
 * @param projectType - Optional project type to avoid including in name
 * @returns A clean, title-cased project name (2-4 words)
 */
export function extractSmartProjectName(prompt: string, projectType?: string): string {
  // First, check for explicit naming patterns
  const explicitPatterns = [
    /(?:project\s+name|called|titled|named|name\s+it|call\s+it)\s*[:\s]+["']?([^"'\n,]+)["']?/i,
    /["']([^"']+)["']\s+(?:project|app|database|flow|website|site)/i,
  ];
  
  for (const pattern of explicitPatterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      return toTitleCase(match[1].trim()).slice(0, 50);
    }
  }
  
  // Clean and tokenize
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  // Find first meaningful word index (skip leading action/filter words)
  let startIdx = 0;
  for (let i = 0; i < Math.min(words.length, 5); i++) {
    if (ACTION_WORDS.includes(words[i]) || FILTER_WORDS.includes(words[i])) {
      startIdx = i + 1;
    } else {
      break;
    }
  }
  
  // Extract meaningful words (skip type keywords and filter words)
  const meaningfulWords = words
    .slice(startIdx)
    .filter(w => !FILTER_WORDS.includes(w) && !ACTION_WORDS.includes(w))
    .filter(w => {
      // Only filter type keywords if a projectType was specified
      if (projectType) {
        return !TYPE_KEYWORDS.includes(w);
      }
      return true;
    })
    .slice(0, 4);
  
  if (meaningfulWords.length === 0) {
    // Fallback: try to get any non-action words
    const fallback = words
      .filter(w => !ACTION_WORDS.includes(w) && !FILTER_WORDS.includes(w))
      .slice(0, 2);
    
    if (fallback.length > 0) {
      return toTitleCase(fallback.join(' '));
    }
    
    return 'New Project';
  }
  
  return toTitleCase(meaningfulWords.join(' '));
}

/**
 * Converts a string to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 50);
}

/**
 * Generates a project name with optional type suffix (for fallbacks only)
 * @param prompt - The user's input prompt  
 * @param projectType - The type of project (database, flow, app)
 * @param includeSuffix - Whether to include the type as a suffix (default: false)
 */
export function generateProjectName(
  prompt: string, 
  projectType: string,
  includeSuffix: boolean = false
): string {
  const baseName = extractSmartProjectName(prompt, projectType);
  
  if (includeSuffix && baseName === 'New Project') {
    return `New ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`;
  }
  
  return baseName;
}
