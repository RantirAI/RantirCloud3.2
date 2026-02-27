
/**
 * Filter utility functions for the Data Table node
 */

export interface FilterCriterion {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'startsWith' | 'endsWith';
  value: any;
}

export interface SortCriterion {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Apply filter criteria to records
 */
export function applyFilters(records: any[], filterStr: string | null | undefined): any[] {
  if (!filterStr) return records;
  
  try {
    const filters = typeof filterStr === 'string' ? JSON.parse(filterStr) : filterStr;
    
    // Handle array of filters
    if (Array.isArray(filters)) {
      return records.filter(record => {
        return filters.every((filter: FilterCriterion) => {
          return evaluateFilterCriterion(record, filter);
        });
      });
    } 
    // Handle single filter object
    else if (filters && typeof filters === 'object') {
      return records.filter(record => evaluateFilterCriterion(record, filters as FilterCriterion));
    }
    
    return records;
  } catch (error) {
    console.error('Filter parsing error:', error);
    return records;
  }
}

/**
 * Apply sorting to records
 */
export function applySort(records: any[], sortStr: string | null | undefined): any[] {
  if (!sortStr) return records;
  
  try {
    const sortCriteria = typeof sortStr === 'string' ? JSON.parse(sortStr) : sortStr;
    
    if (sortCriteria && sortCriteria.field) {
      const direction = sortCriteria.direction === 'desc' ? -1 : 1;
      
      return [...records].sort((a, b) => {
        if (a[sortCriteria.field] < b[sortCriteria.field]) return -1 * direction;
        if (a[sortCriteria.field] > b[sortCriteria.field]) return 1 * direction;
        return 0;
      });
    }
    
    return records;
  } catch (error) {
    console.error('Sort parsing error:', error);
    return records;
  }
}

/**
 * Apply limit to records
 */
export function applyLimit(records: any[], limit: number | string | null | undefined): any[] {
  if (!limit || isNaN(Number(limit))) return records;
  
  const numLimit = Number(limit);
  return records.slice(0, numLimit);
}

/**
 * Evaluate a single filter criterion against a record
 */
function evaluateFilterCriterion(record: any, filter: FilterCriterion): boolean {
  if (!filter || !filter.field || !filter.operator) return true;
  
  const fieldValue = record[filter.field];
  const filterValue = filter.value;
  
  // Handle null or undefined field values
  if (fieldValue === null || fieldValue === undefined) {
    // If filtering for null values
    if (filterValue === null || filterValue === undefined) {
      return filter.operator === 'equals';
    }
    return filter.operator === 'notEquals';
  }
  
  switch (filter.operator) {
    case 'equals':
      return fieldValue === filterValue;
      
    case 'notEquals':
      return fieldValue !== filterValue;
      
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      
    case 'greaterThan':
      return Number(fieldValue) > Number(filterValue);
      
    case 'lessThan':
      return Number(fieldValue) < Number(filterValue);
      
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      
    case 'notIn':
      return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      
    case 'startsWith':
      return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      
    case 'endsWith':
      return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      
    default:
      return true;
  }
}
