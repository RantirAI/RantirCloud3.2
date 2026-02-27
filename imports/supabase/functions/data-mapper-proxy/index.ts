import { corsHeaders } from '../_shared/cors.ts';

// Data Mapper - Server-side data transformation & mapping utility
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      inputData,
      mappingRules,
      targetData,
      sourceSchema,
      targetSchema,
      transformCode,
      flattenDepth,
      groupByKey,
      sortByKey,
      sortDirection,
      filterExpression,
      mergeArrays,
      pickKeys,
      omitKeys,
      renameKeys,
      defaultValues,
    } = body;

    console.log('Data Mapper proxy called with action:', action);

    let result: Record<string, any> = { success: true, error: null };

    // Parse input if string
    const parseInput = (data: any) => {
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return data; }
      }
      return data;
    };

    const input = parseInput(inputData);

    // Shared mapping logic
    const mapFields = (data: any, rules: any) => {
      // Ensure rules is an array
      let parsedRules = rules;
      if (typeof parsedRules === 'string') {
        try { parsedRules = JSON.parse(parsedRules); } catch { throw new Error('Invalid mapping rules JSON'); }
      }
      if (!Array.isArray(parsedRules)) {
        if (parsedRules && typeof parsedRules === 'object') {
          const keys = Object.keys(parsedRules);
          const hasSourceTarget = keys.includes('source') && keys.includes('target');
          if (!hasSourceTarget && keys.length > 0 && keys.every(k => typeof parsedRules[k] === 'string')) {
            // Simple key-value format: {"oldField": "newField"} → [{source, target}]
            console.log('Converting simple key-value mapping rules to verbose format');
            parsedRules = Object.entries(parsedRules).map(([src, tgt]) => ({ source: src, target: String(tgt) }));
          } else {
            // Single verbose rule object
            parsedRules = [parsedRules];
          }
        } else {
          throw new Error('Mapping rules must be an array or object, got: ' + typeof parsedRules);
        }
      }
      const mapSingle = (item: any) => {
        const mapped: Record<string, any> = {};
        for (const rule of parsedRules) {
          const { source, target, transform, defaultValue } = rule;
          if (!source || typeof source !== 'string' || !target || typeof target !== 'string') {
            console.warn('Skipping invalid mapping rule (missing/invalid source or target):', JSON.stringify(rule));
            continue;
          }
          let value = source.split('.').reduce((obj: any, key: string) => obj?.[key], item);
          
          if (value === undefined && defaultValue !== undefined) {
            value = defaultValue;
          }
          
          if (transform) {
            const fn = new Function('value', 'item', `return ${transform}`);
            value = fn(value, item);
          }
          
          const keys = target.split('.');
          let current = mapped;
          for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = current[keys[i]] || {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
        }
        return mapped;
      };

      return Array.isArray(data) ? data.map(mapSingle) : mapSingle(data);
    };

    switch (action) {
      // Composite action: mapping + optional groupBy + optional sort + optional custom transform
      case 'advancedMapping': {
        if (!input) throw new Error('Input data is required');

        console.log('Running advanced mapping pipeline');

        let data = input;

        // Step 1: If targetData provided, use it as the output template
        let template: Record<string, any> | null = null;
        if (targetData) {
          template = typeof targetData === 'string' ? JSON.parse(targetData) : targetData;
          console.log('Target data template keys:', Object.keys(template!));
        }

        // Step 2: Apply mapping rules to extract/transform from input
        if (mappingRules) {
          console.log('Processing mapping rules');
          let rules = typeof mappingRules === 'string' ? JSON.parse(mappingRules) : mappingRules;
          
          // Unwrap if wrapped in { mappingRules: [...] }
          if (rules && !Array.isArray(rules) && rules.mappingRules) {
            rules = rules.mappingRules;
          }

          // Normalize rule formats
          if (Array.isArray(rules)) {
            const applyRules = (item: any) => {
              const result: Record<string, any> = {};
              for (const rule of rules) {
                const targetKey = rule.target || rule.targetField;
                const sourceKey = rule.source || rule.sourceField;
                const sourceKeys = rule.sourceFields;
                const ruleType = rule.type || 'direct';

                if (!targetKey) continue;

                let value: any;
                if (ruleType === 'concat' && sourceKeys && Array.isArray(sourceKeys)) {
                  const sep = rule.separator || ' ';
                  value = sourceKeys.map((sk: string) => 
                    sk.split('.').reduce((o: any, k: string) => o?.[k], item)
                  ).filter((v: any) => v !== undefined && v !== null).join(sep);
                } else if (ruleType === 'calculate_age' && sourceKey) {
                  const raw = sourceKey.split('.').reduce((o: any, k: string) => o?.[k], item);
                  if (raw) {
                    const born = new Date(raw);
                    const now = new Date();
                    value = now.getFullYear() - born.getFullYear();
                    if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) value--;
                  }
                } else if (ruleType === 'date_format' && sourceKey) {
                  const raw = sourceKey.split('.').reduce((o: any, k: string) => o?.[k], item);
                  if (raw) {
                    const d = new Date(raw);
                    value = d.toISOString().split('T')[0]; // YYYY-MM-DD
                  }
                } else if (sourceKey) {
                  value = sourceKey.split('.').reduce((o: any, k: string) => o?.[k], item);
                }

                if (value === undefined && rule.defaultValue !== undefined) {
                  value = rule.defaultValue;
                }
                if (rule.transform) {
                  const fn = new Function('value', 'item', `return ${rule.transform}`);
                  value = fn(value, item);
                }
                result[targetKey] = value;
              }
              return result;
            };
            data = Array.isArray(data) ? data.map(applyRules) : applyRules(data);
          } else {
            // Simple {"old":"new"} or standard mapFields format
            data = mapFields(data, rules);
          }
        }

        // Step 3: If template provided, merge — template keys filled from mapped data, defaults kept
        if (template) {
          const fillTemplate = (mapped: any, tmpl: any) => {
            const result: Record<string, any> = {};
            // First fill template keys
            for (const key of Object.keys(tmpl)) {
              result[key] = (mapped && mapped[key] !== undefined) ? mapped[key] : tmpl[key];
            }
            // Include extra mapped keys not in template
            if (mapped && typeof mapped === 'object') {
              for (const key of Object.keys(mapped)) {
                if (result[key] === undefined) result[key] = mapped[key];
              }
            }
            return result;
          };
          data = Array.isArray(data)
            ? data.map((item: any) => fillTemplate(item, template))
            : fillTemplate(data, template);
        } else if (!mappingRules) {
          // No template, no rules — pass through
          console.log('No targetData or mappingRules, passing input through');
        }
        if (sortByKey && Array.isArray(data)) {
          const dir = sortDirection === 'desc' ? -1 : 1;
          data = [...data].sort((a: any, b: any) => {
            const aVal = sortByKey.split('.').reduce((o: any, k: string) => o?.[k], a);
            const bVal = sortByKey.split('.').reduce((o: any, k: string) => o?.[k], b);
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
            return 0;
          });
        }

        // Step 3: Group if groupByKey provided
        if (groupByKey && Array.isArray(data)) {
          const grouped: Record<string, any[]> = {};
          for (const item of data) {
            const key = String(groupByKey.split('.').reduce((o: any, k: string) => o?.[k], item) ?? 'undefined');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
          }
          data = grouped;
        }

        // Step 4: Custom JS transform if provided
        if (transformCode) {
          const fn = new Function('data', `return ${transformCode}`);
          data = fn(data);
        }

        result.data = data;
        break;
      }

      case 'mapFields': {
        if (!input) throw new Error('Input data is required');
        if (!mappingRules) throw new Error('Mapping rules are required');

        console.log('Mapping fields');
        const rules = typeof mappingRules === 'string' ? JSON.parse(mappingRules) : mappingRules;
        result.data = mapFields(input, rules);
        break;
      }

      case 'flatten': {
        if (!input) throw new Error('Input data is required');

        console.log('Flattening data');

        const depth = flattenDepth || Infinity;

        const flattenObj = (obj: any, prefix = '', d = 0): Record<string, any> => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(obj)) {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v) && d < depth) {
              Object.assign(out, flattenObj(v, key, d + 1));
            } else {
              out[key] = v;
            }
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(i => flattenObj(i)) : flattenObj(input);
        break;
      }

      case 'unflatten': {
        if (!input) throw new Error('Input data is required');

        console.log('Unflattening data');

        const unflattenObj = (obj: Record<string, any>) => {
          const out: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            const keys = key.split('.');
            let current = out;
            for (let i = 0; i < keys.length - 1; i++) {
              current[keys[i]] = current[keys[i]] || {};
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(unflattenObj) : unflattenObj(input);
        break;
      }

      case 'groupBy': {
        if (!input || !Array.isArray(input)) throw new Error('Input array is required');
        if (!groupByKey) throw new Error('Group by key is required');

        console.log('Grouping by:', groupByKey);

        const grouped: Record<string, any[]> = {};
        for (const item of input) {
          const key = String(groupByKey.split('.').reduce((o: any, k: string) => o?.[k], item) ?? 'undefined');
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        }

        result.data = grouped;
        break;
      }

      case 'sort': {
        if (!input || !Array.isArray(input)) throw new Error('Input array is required');
        if (!sortByKey) throw new Error('Sort key is required');

        console.log('Sorting by:', sortByKey);

        const dir = sortDirection === 'desc' ? -1 : 1;
        const sorted = [...input].sort((a, b) => {
          const aVal = sortByKey.split('.').reduce((o: any, k: string) => o?.[k], a);
          const bVal = sortByKey.split('.').reduce((o: any, k: string) => o?.[k], b);
          if (aVal < bVal) return -1 * dir;
          if (aVal > bVal) return 1 * dir;
          return 0;
        });

        result.data = sorted;
        break;
      }

      case 'pick': {
        if (!input) throw new Error('Input data is required');
        if (!pickKeys || !Array.isArray(pickKeys)) throw new Error('Pick keys array is required');

        console.log('Picking keys:', pickKeys);

        const pickFromObj = (obj: any) => {
          const out: Record<string, any> = {};
          for (const key of pickKeys) {
            if (key in obj) out[key] = obj[key];
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(pickFromObj) : pickFromObj(input);
        break;
      }

      case 'omit': {
        if (!input) throw new Error('Input data is required');
        if (!omitKeys || !Array.isArray(omitKeys)) throw new Error('Omit keys array is required');

        console.log('Omitting keys:', omitKeys);

        const omitFromObj = (obj: any) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (!omitKeys.includes(k)) out[k] = v;
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(omitFromObj) : omitFromObj(input);
        break;
      }

      case 'rename': {
        if (!input) throw new Error('Input data is required');
        if (!renameKeys) throw new Error('Rename keys mapping is required');

        console.log('Renaming keys');

        const renames = typeof renameKeys === 'string' ? JSON.parse(renameKeys) : renameKeys;

        const renameInObj = (obj: any) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(obj)) {
            out[renames[k] || k] = v;
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(renameInObj) : renameInObj(input);
        break;
      }

      case 'applyDefaults': {
        if (!input) throw new Error('Input data is required');
        if (!defaultValues) throw new Error('Default values are required');

        console.log('Applying defaults');

        const defaults = typeof defaultValues === 'string' ? JSON.parse(defaultValues) : defaultValues;

        const applyToObj = (obj: any) => {
          const out = { ...obj };
          for (const [k, v] of Object.entries(defaults)) {
            if (out[k] === undefined || out[k] === null) out[k] = v;
          }
          return out;
        };

        result.data = Array.isArray(input) ? input.map(applyToObj) : applyToObj(input);
        break;
      }

      case 'customTransform': {
        if (!input) throw new Error('Input data is required');
        if (!transformCode) throw new Error('Transform code is required');

        console.log('Applying custom transform');

        const fn = new Function('data', `return ${transformCode}`);
        result.data = fn(input);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Data Mapper operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Data Mapper proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
