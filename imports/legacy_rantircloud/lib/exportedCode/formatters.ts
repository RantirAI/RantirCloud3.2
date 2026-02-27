/**
 * Formatter utilities for data display
 * This file is included in exported code to handle data formatting
 */

// Formatter caches to avoid re-creating Intl objects
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!numberFormatCache.has(key)) {
    numberFormatCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatCache.get(key)!;
}

function getDateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!dateFormatCache.has(key)) {
    dateFormatCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dateFormatCache.get(key)!;
}

export type FormatterType = 
  | 'none'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'titlecase'
  | 'currency_usd'
  | 'currency_eur'
  | 'currency_gbp'
  | 'currency_auto'
  | 'decimal_0'
  | 'decimal_1'
  | 'decimal_2'
  | 'percentage'
  | 'date_short'
  | 'date_long'
  | 'date_relative'
  | 'time_short'
  | 'datetime';

/**
 * Format a value using the specified formatter
 */
export function formatValue(value: any, formatter: FormatterType | string): string {
  if (value === null || value === undefined) return '';
  
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const strValue = String(value);
  const dateValue = new Date(value);
  const isValidDate = !isNaN(dateValue.getTime());
  const isValidNumber = !isNaN(numValue);

  switch (formatter) {
    // String formatters
    case 'uppercase':
      return strValue.toUpperCase();
    case 'lowercase':
      return strValue.toLowerCase();
    case 'capitalize':
      return strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase();
    case 'titlecase':
      return strValue
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    // Currency formatters
    case 'currency_usd':
      return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' })
        .format(isValidNumber ? numValue : 0);
    case 'currency_eur':
      return getNumberFormatter('de-DE', { style: 'currency', currency: 'EUR' })
        .format(isValidNumber ? numValue : 0);
    case 'currency_gbp':
      return getNumberFormatter('en-GB', { style: 'currency', currency: 'GBP' })
        .format(isValidNumber ? numValue : 0);
    case 'currency_auto':
      return getNumberFormatter('en-US', { style: 'currency', currency: 'USD' })
        .format(isValidNumber ? numValue : 0);

    // Number formatters
    case 'decimal_0':
      return getNumberFormatter('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        .format(isValidNumber ? numValue : 0);
    case 'decimal_1':
      return getNumberFormatter('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        .format(isValidNumber ? numValue : 0);
    case 'decimal_2':
      return getNumberFormatter('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(isValidNumber ? numValue : 0);
    case 'percentage':
      return getNumberFormatter('en-US', { style: 'percent' })
        .format(isValidNumber ? numValue / 100 : 0);

    // Date formatters
    case 'date_short':
      return isValidDate
        ? getDateFormatter('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
            .format(dateValue)
        : strValue;
    case 'date_long':
      return isValidDate
        ? getDateFormatter('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            .format(dateValue)
        : strValue;
    case 'date_relative': {
      if (!isValidDate) return strValue;
      const now = new Date();
      const diffMs = now.getTime() - dateValue.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    }
    case 'time_short':
      return isValidDate
        ? getDateFormatter('en-US', { hour: 'numeric', minute: '2-digit' })
            .format(dateValue)
        : strValue;
    case 'datetime':
      return isValidDate ? dateValue.toLocaleString('en-US') : strValue;

    case 'none':
    default:
      return strValue;
  }
}

/**
 * Replace binding placeholders in a string with actual values
 * Supports syntax: {{fieldName}} and {{fieldName|formatter}}
 */
export function replaceBindings(
  input: string,
  data: Record<string, any>
): string {
  if (!input || typeof input !== 'string') return input || '';
  if (!data) return input;

  return input.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (match, field, formatter) => {
    const fieldName = field.trim();
    
    // Try direct lookup
    let value = data[fieldName];
    
    // Case-insensitive fallback
    if (value === undefined) {
      const lowerField = fieldName.toLowerCase();
      const matchedKey = Object.keys(data).find(k => k.toLowerCase() === lowerField);
      if (matchedKey) value = data[matchedKey];
    }
    
    if (value === undefined) return match;
    
    // Apply formatter if specified
    if (formatter) {
      return formatValue(value, formatter.trim() as FormatterType);
    }
    
    return String(value);
  });
}

/**
 * Check if a string contains binding placeholders
 */
export function hasBindings(input: string): boolean {
  return /\{\{[^}]+\}\}/.test(input);
}
