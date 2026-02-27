// Chart Query Language Parser
// Parses a SQL-like query string into a ChartQuery object

import {
  ChartQuery,
  ChartField,
  AggregationConfig,
  AggregationType,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  GroupConfig,
  SortConfig,
  SortDirection,
  TableReference,
  QueryParseResult,
  ParsedQueryToken,
} from '@/types/chartQuery';

// ============================================
// TOKENIZER
// ============================================

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET',
  'AND', 'OR', 'NOT', 'AS', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'FULL', 'ON',
  'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE',
];

const AGGREGATION_FUNCTIONS: AggregationType[] = [
  'sum', 'avg', 'count', 'min', 'max', 'median', 'distinct', 'first', 'last'
];

const OPERATORS = ['=', '!=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '%'];

function tokenize(query: string): ParsedQueryToken[] {
  const tokens: ParsedQueryToken[] = [];
  let position = 0;
  
  while (position < query.length) {
    // Skip whitespace
    if (/\s/.test(query[position])) {
      position++;
      continue;
    }
    
    // Check for strings (single or double quoted)
    if (query[position] === "'" || query[position] === '"') {
      const quote = query[position];
      let value = '';
      position++;
      while (position < query.length && query[position] !== quote) {
        if (query[position] === '\\' && position + 1 < query.length) {
          position++;
        }
        value += query[position];
        position++;
      }
      position++; // Skip closing quote
      tokens.push({ type: 'value', value, position: position - value.length - 2 });
      continue;
    }
    
    // Check for numbers
    if (/[0-9]/.test(query[position]) || (query[position] === '-' && /[0-9]/.test(query[position + 1]))) {
      let value = '';
      if (query[position] === '-') {
        value = '-';
        position++;
      }
      while (position < query.length && /[0-9.]/.test(query[position])) {
        value += query[position];
        position++;
      }
      tokens.push({ type: 'value', value, position: position - value.length });
      continue;
    }
    
    // Check for operators
    const twoCharOp = query.slice(position, position + 2);
    if (['<=', '>=', '!=', '<>'].includes(twoCharOp)) {
      tokens.push({ type: 'operator', value: twoCharOp, position });
      position += 2;
      continue;
    }
    if (OPERATORS.includes(query[position])) {
      tokens.push({ type: 'operator', value: query[position], position });
      position++;
      continue;
    }
    
    // Check for punctuation
    if (['(', ')', ',', '.'].includes(query[position])) {
      tokens.push({ type: 'punctuation', value: query[position], position });
      position++;
      continue;
    }
    
    // Check for identifiers/keywords
    if (/[a-zA-Z_]/.test(query[position])) {
      let value = '';
      const startPos = position;
      while (position < query.length && /[a-zA-Z0-9_]/.test(query[position])) {
        value += query[position];
        position++;
      }
      
      const upperValue = value.toUpperCase();
      if (KEYWORDS.includes(upperValue)) {
        tokens.push({ type: 'keyword', value: upperValue, position: startPos });
      } else if (AGGREGATION_FUNCTIONS.includes(value.toLowerCase() as AggregationType)) {
        tokens.push({ type: 'function', value: value.toLowerCase(), position: startPos });
      } else {
        tokens.push({ type: 'identifier', value, position: startPos });
      }
      continue;
    }
    
    // Unknown character, skip
    position++;
  }
  
  return tokens;
}

// ============================================
// PARSER
// ============================================

class QueryParser {
  private tokens: ParsedQueryToken[] = [];
  private position = 0;
  
  parse(queryString: string): QueryParseResult {
    try {
      this.tokens = tokenize(queryString);
      this.position = 0;
      
      if (this.tokens.length === 0) {
        return {
          success: false,
          error: { message: 'Empty query', position: 0, line: 1, column: 1 }
        };
      }
      
      const query = this.parseQuery();
      return { success: true, query, tokens: this.tokens };
    } catch (error: any) {
      const currentToken = this.tokens[this.position] || { position: 0 };
      return {
        success: false,
        tokens: this.tokens,
        error: {
          message: error.message,
          position: currentToken.position,
          line: 1,
          column: currentToken.position + 1
        }
      };
    }
  }
  
  private parseQuery(): ChartQuery {
    const query: ChartQuery = {
      id: `query-${Date.now()}`,
      source: { tableProjectId: '', tableName: '' },
      select: [],
    };
    
    // Parse SELECT clause
    this.expect('keyword', 'SELECT');
    const { fields, aggregations } = this.parseSelectClause();
    query.select = fields;
    if (aggregations.length > 0) {
      query.aggregations = aggregations;
    }
    
    // Parse FROM clause
    this.expect('keyword', 'FROM');
    query.source = this.parseTableReference();
    
    // Parse optional clauses
    while (this.position < this.tokens.length) {
      const token = this.current();
      
      if (token.type === 'keyword') {
        switch (token.value) {
          case 'WHERE':
            this.advance();
            query.where = this.parseFilterGroup();
            break;
          case 'GROUP':
            this.advance();
            this.expect('keyword', 'BY');
            query.groupBy = this.parseGroupByClause();
            break;
          case 'HAVING':
            this.advance();
            query.having = this.parseFilterGroup();
            break;
          case 'ORDER':
            this.advance();
            this.expect('keyword', 'BY');
            query.orderBy = this.parseOrderByClause();
            break;
          case 'LIMIT':
            this.advance();
            const limitToken = this.expect('value');
            query.limit = parseInt(limitToken.value, 10);
            break;
          case 'OFFSET':
            this.advance();
            const offsetToken = this.expect('value');
            query.offset = parseInt(offsetToken.value, 10);
            break;
          default:
            this.advance(); // Skip unknown keywords
        }
      } else {
        break;
      }
    }
    
    return query;
  }
  
  private parseSelectClause(): { fields: ChartField[], aggregations: AggregationConfig[] } {
    const fields: ChartField[] = [];
    const aggregations: AggregationConfig[] = [];
    
    do {
      // Skip comma if present
      if (this.position > 0 && this.current()?.value === ',') {
        this.advance();
      }
      
      const token = this.current();
      
      if (token.type === 'function') {
        // Parse aggregation function
        const funcName = token.value as AggregationType;
        this.advance();
        this.expect('punctuation', '(');
        const fieldToken = this.expect('identifier');
        this.expect('punctuation', ')');
        
        let alias = fieldToken.value;
        if (this.current()?.value === 'AS') {
          this.advance();
          alias = this.expect('identifier').value;
        }
        
        aggregations.push({
          id: `agg-${Date.now()}-${aggregations.length}`,
          field: fieldToken.value,
          operation: funcName,
          alias,
        });
        
        fields.push({
          id: `field-${Date.now()}-${fields.length}`,
          name: fieldToken.value,
          type: 'number',
          alias,
        });
      } else if (token.type === 'identifier' || token.value === '*') {
        this.advance();
        let alias: string | undefined;
        
        if (this.current()?.value === 'AS') {
          this.advance();
          alias = this.expect('identifier').value;
        }
        
        fields.push({
          id: `field-${Date.now()}-${fields.length}`,
          name: token.value,
          type: 'string', // Default type, will be inferred later
          alias,
        });
      } else {
        break;
      }
    } while (this.current()?.value === ',');
    
    return { fields, aggregations };
  }
  
  private parseTableReference(): TableReference {
    const tableName = this.expect('identifier').value;
    let alias: string | undefined;
    
    if (this.current()?.value === 'AS') {
      this.advance();
      alias = this.expect('identifier').value;
    }
    
    return {
      tableProjectId: tableName, // Will be resolved later
      tableName,
      alias,
    };
  }
  
  private parseFilterGroup(): FilterGroup {
    const conditions: (FilterCondition | FilterGroup)[] = [];
    let logic: 'and' | 'or' = 'and';
    
    do {
      // Skip logic operators
      if (this.current()?.value === 'AND') {
        logic = 'and';
        this.advance();
      } else if (this.current()?.value === 'OR') {
        logic = 'or';
        this.advance();
      }
      
      // Check for nested group
      if (this.current()?.value === '(') {
        this.advance();
        conditions.push(this.parseFilterGroup());
        this.expect('punctuation', ')');
      } else if (this.current()?.type === 'identifier') {
        conditions.push(this.parseFilterCondition());
      } else {
        break;
      }
    } while (
      this.current()?.value === 'AND' || 
      this.current()?.value === 'OR'
    );
    
    return {
      id: `filter-group-${Date.now()}`,
      logic,
      conditions,
    };
  }
  
  private parseFilterCondition(): FilterCondition {
    const field = this.expect('identifier').value;
    
    // Parse operator
    let operator: FilterOperator = 'equals';
    const opToken = this.current();
    
    if (opToken.type === 'operator') {
      this.advance();
      switch (opToken.value) {
        case '=': operator = 'equals'; break;
        case '!=':
        case '<>': operator = 'notEquals'; break;
        case '>': operator = 'greaterThan'; break;
        case '<': operator = 'lessThan'; break;
        case '>=': operator = 'greaterThanOrEqual'; break;
        case '<=': operator = 'lessThanOrEqual'; break;
      }
    } else if (opToken.value === 'LIKE') {
      this.advance();
      operator = 'contains';
    } else if (opToken.value === 'IN') {
      this.advance();
      operator = 'in';
    } else if (opToken.value === 'BETWEEN') {
      this.advance();
      operator = 'between';
    } else if (opToken.value === 'IS') {
      this.advance();
      if (this.current()?.value === 'NOT') {
        this.advance();
        this.expect('keyword', 'NULL');
        operator = 'isNotNull';
      } else {
        this.expect('keyword', 'NULL');
        operator = 'isNull';
      }
      
      return {
        id: `condition-${Date.now()}`,
        field,
        operator,
        value: null,
      };
    }
    
    // Parse value(s)
    let value: any;
    let valueEnd: any;
    
    if (operator === 'in') {
      this.expect('punctuation', '(');
      const values: any[] = [];
      do {
        if (this.current()?.value === ',') this.advance();
        values.push(this.parseValue());
      } while (this.current()?.value === ',');
      this.expect('punctuation', ')');
      value = values;
    } else if (operator === 'between') {
      value = this.parseValue();
      this.expect('keyword', 'AND');
      valueEnd = this.parseValue();
    } else {
      value = this.parseValue();
    }
    
    return {
      id: `condition-${Date.now()}`,
      field,
      operator,
      value,
      valueEnd,
    };
  }
  
  private parseValue(): any {
    const token = this.current();
    this.advance();
    
    if (token.type === 'value') {
      // Try to parse as number
      const num = parseFloat(token.value);
      if (!isNaN(num)) return num;
      return token.value;
    }
    
    if (token.value === 'TRUE') return true;
    if (token.value === 'FALSE') return false;
    if (token.value === 'NULL') return null;
    
    return token.value;
  }
  
  private parseGroupByClause(): GroupConfig[] {
    const groups: GroupConfig[] = [];
    
    do {
      if (this.current()?.value === ',') this.advance();
      
      const field = this.expect('identifier').value;
      groups.push({ field });
    } while (this.current()?.value === ',');
    
    return groups;
  }
  
  private parseOrderByClause(): SortConfig[] {
    const sorts: SortConfig[] = [];
    
    do {
      if (this.current()?.value === ',') this.advance();
      
      const field = this.expect('identifier').value;
      let direction: SortDirection = 'asc';
      let nullsFirst: boolean | undefined;
      
      if (this.current()?.value === 'ASC') {
        direction = 'asc';
        this.advance();
      } else if (this.current()?.value === 'DESC') {
        direction = 'desc';
        this.advance();
      }
      
      if (this.current()?.value === 'NULLS') {
        this.advance();
        if (this.current()?.value === 'FIRST') {
          nullsFirst = true;
          this.advance();
        } else if (this.current()?.value === 'LAST') {
          nullsFirst = false;
          this.advance();
        }
      }
      
      sorts.push({ field, direction, nullsFirst });
    } while (this.current()?.value === ',');
    
    return sorts;
  }
  
  private current(): ParsedQueryToken {
    return this.tokens[this.position] || { type: 'identifier', value: '', position: 0 };
  }
  
  private advance(): ParsedQueryToken {
    return this.tokens[this.position++];
  }
  
  private expect(type?: string, value?: string): ParsedQueryToken {
    const token = this.current();
    
    if (type && token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} "${token.value}"`);
    }
    
    if (value && token.value !== value) {
      throw new Error(`Expected "${value}" but got "${token.value}"`);
    }
    
    return this.advance();
  }
}

// ============================================
// EXPORTS
// ============================================

export const chartQueryParser = new QueryParser();

export function parseChartQuery(queryString: string): QueryParseResult {
  return chartQueryParser.parse(queryString);
}

export function generateQueryString(query: ChartQuery): string {
  let sql = 'SELECT ';
  
  // Generate SELECT clause
  const selectParts: string[] = [];
  
  // Add aggregations
  if (query.aggregations) {
    query.aggregations.forEach(agg => {
      const alias = agg.alias ? ` AS ${agg.alias}` : '';
      selectParts.push(`${agg.operation.toUpperCase()}(${agg.field})${alias}`);
    });
  }
  
  // Add regular fields
  query.select.forEach(field => {
    if (!query.aggregations?.some(a => a.field === field.name)) {
      const alias = field.alias ? ` AS ${field.alias}` : '';
      selectParts.push(`${field.name}${alias}`);
    }
  });
  
  sql += selectParts.join(', ');
  
  // Generate FROM clause
  sql += ` FROM ${query.source.tableName}`;
  if (query.source.alias) {
    sql += ` AS ${query.source.alias}`;
  }
  
  // Generate WHERE clause
  if (query.where && query.where.conditions.length > 0) {
    sql += ' WHERE ' + generateFilterGroupString(query.where);
  }
  
  // Generate GROUP BY clause
  if (query.groupBy && query.groupBy.length > 0) {
    sql += ' GROUP BY ' + query.groupBy.map(g => g.field).join(', ');
  }
  
  // Generate HAVING clause
  if (query.having && query.having.conditions.length > 0) {
    sql += ' HAVING ' + generateFilterGroupString(query.having);
  }
  
  // Generate ORDER BY clause
  if (query.orderBy && query.orderBy.length > 0) {
    sql += ' ORDER BY ' + query.orderBy.map(s => {
      let part = s.field;
      if (s.direction) part += ` ${s.direction.toUpperCase()}`;
      if (s.nullsFirst !== undefined) {
        part += ` NULLS ${s.nullsFirst ? 'FIRST' : 'LAST'}`;
      }
      return part;
    }).join(', ');
  }
  
  // Generate LIMIT/OFFSET
  if (query.limit) {
    sql += ` LIMIT ${query.limit}`;
  }
  if (query.offset) {
    sql += ` OFFSET ${query.offset}`;
  }
  
  return sql;
}

function generateFilterGroupString(group: FilterGroup): string {
  const parts = group.conditions.map(condition => {
    if ('logic' in condition) {
      return `(${generateFilterGroupString(condition as FilterGroup)})`;
    }
    
    const cond = condition as FilterCondition;
    let part = cond.field;
    
    switch (cond.operator) {
      case 'equals': part += ` = ${formatValue(cond.value)}`; break;
      case 'notEquals': part += ` != ${formatValue(cond.value)}`; break;
      case 'greaterThan': part += ` > ${formatValue(cond.value)}`; break;
      case 'lessThan': part += ` < ${formatValue(cond.value)}`; break;
      case 'greaterThanOrEqual': part += ` >= ${formatValue(cond.value)}`; break;
      case 'lessThanOrEqual': part += ` <= ${formatValue(cond.value)}`; break;
      case 'contains': part += ` LIKE ${formatValue(cond.value)}`; break;
      case 'in': part += ` IN (${(cond.value as any[]).map(formatValue).join(', ')})`; break;
      case 'between': part += ` BETWEEN ${formatValue(cond.value)} AND ${formatValue(cond.valueEnd)}`; break;
      case 'isNull': part += ' IS NULL'; break;
      case 'isNotNull': part += ' IS NOT NULL'; break;
      default: part += ` = ${formatValue(cond.value)}`;
    }
    
    return part;
  });
  
  return parts.join(` ${group.logic.toUpperCase()} `);
}

function formatValue(value: any): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  return `'${value}'`;
}
