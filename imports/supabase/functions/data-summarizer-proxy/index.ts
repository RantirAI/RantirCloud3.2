import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data: rawData, numericField, countField } = await req.json();

    let records: any[];
    try {
      records = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      throw new Error('Invalid JSON data input');
    }

    if (!Array.isArray(records)) {
      throw new Error('Data must be an array of objects');
    }

    const recordCount = records.length;
    let summary: any = {};
    let text = '';

    switch (action) {
      case 'calculateAverage': {
        if (!numericField) throw new Error('Numeric field is required');
        const values = records.map(r => parseFloat(r[numericField])).filter(v => !isNaN(v));
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        summary = { average: avg, count: values.length };
        text = `Average of ${numericField}: ${avg.toFixed(2)} (from ${values.length} records)`;
        break;
      }

      case 'calculateSum': {
        if (!numericField) throw new Error('Numeric field is required');
        const values = records.map(r => parseFloat(r[numericField])).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        summary = { sum, count: values.length };
        text = `Sum of ${numericField}: ${sum} (from ${values.length} records)`;
        break;
      }

      case 'countUniques': {
        if (!countField) throw new Error('Count field is required');
        const uniqueValues = new Set(records.map(r => String(r[countField] ?? 'null')));
        const freq: Record<string, number> = {};
        for (const r of records) {
          const key = String(r[countField] ?? 'null');
          freq[key] = (freq[key] || 0) + 1;
        }
        summary = { uniqueCount: uniqueValues.size, values: freq };
        const top3 = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
        text = `${uniqueValues.size} unique values in ${countField}. Top: ${top3.map(([k, v]) => `${k} (${v})`).join(', ')}`;
        break;
      }

      case 'getMinMax': {
        if (!numericField) throw new Error('Numeric field is required');
        const values = records.map(r => parseFloat(r[numericField])).filter(v => !isNaN(v));
        const min = values.length ? Math.min(...values) : 0;
        const max = values.length ? Math.max(...values) : 0;
        summary = { min, max, count: values.length };
        text = `${numericField}: min=${min}, max=${max} (from ${values.length} records)`;
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ summary, text, recordCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Data Summarizer error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
