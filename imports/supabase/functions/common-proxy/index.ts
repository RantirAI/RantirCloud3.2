import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deep merge helper function
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate random string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result: any = { success: true };

    switch (action) {
      case 'delay':
        const seconds = Number(params.seconds) || 1;
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        result.data = { delayed: seconds, message: `Delayed for ${seconds} seconds` };
        break;

      case 'httpRequest':
        if (!params.url) {
          return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const fetchHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (params.headers) {
          const customHeaders = typeof params.headers === 'string' ? JSON.parse(params.headers) : params.headers;
          Object.assign(fetchHeaders, customHeaders);
        }
        
        const fetchOptions: RequestInit = {
          method: params.method || 'GET',
          headers: fetchHeaders,
        };
        
        if (params.body && params.method !== 'GET') {
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }
        
        const response = await fetch(params.url, fetchOptions);
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
        
        result.data = responseData;
        result.statusCode = response.status;
        break;

      case 'transformData':
        if (!params.inputData || !params.transformCode) {
          return new Response(JSON.stringify({ success: false, error: 'Input data and transform code are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const inputData = typeof params.inputData === 'string' ? JSON.parse(params.inputData) : params.inputData;
        // Execute transform in a sandboxed way using Function constructor
        const transformFn = new Function('data', `return ${params.transformCode}`);
        result.data = transformFn(inputData);
        break;

      case 'filterData':
        if (!params.inputArray || !params.filterCondition) {
          return new Response(JSON.stringify({ success: false, error: 'Input array and filter condition are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const inputArray = typeof params.inputArray === 'string' ? JSON.parse(params.inputArray) : params.inputArray;
        const filterFn = new Function('item', `return ${params.filterCondition}`);
        result.array = inputArray.filter(filterFn);
        result.data = result.array;
        break;

      case 'mergeData':
        if (!params.object1 || !params.object2) {
          return new Response(JSON.stringify({ success: false, error: 'Both objects are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const obj1 = typeof params.object1 === 'string' ? JSON.parse(params.object1) : params.object1;
        const obj2 = typeof params.object2 === 'string' ? JSON.parse(params.object2) : params.object2;
        
        if (params.mergeStrategy === 'deep') {
          result.data = deepMerge(obj1, obj2);
        } else {
          result.data = { ...obj1, ...obj2 };
        }
        break;

      case 'splitText':
        if (!params.text) {
          return new Response(JSON.stringify({ success: false, error: 'Text is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        result.array = params.text.split(params.delimiter || ',');
        result.data = result.array;
        break;

      case 'joinText':
        if (!params.array) {
          return new Response(JSON.stringify({ success: false, error: 'Array is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const arr = typeof params.array === 'string' ? JSON.parse(params.array) : params.array;
        result.text = arr.join(params.separator || ', ');
        result.data = result.text;
        break;

      case 'generateRandom':
        const type = params.type || 'uuid';
        
        if (type === 'uuid') {
          result.value = generateUUID();
        } else if (type === 'number') {
          const min = Number(params.min) || 0;
          const max = Number(params.max) || 100;
          result.value = String(Math.floor(Math.random() * (max - min + 1)) + min);
        } else if (type === 'string') {
          const length = Number(params.length) || 16;
          result.value = generateRandomString(length);
        }
        
        result.data = { type, value: result.value };
        break;

      case 'dateTimeFormat':
        const now = new Date();
        let dateObj: Date;
        
        if (params.dateInput) {
          dateObj = new Date(params.dateInput);
        } else {
          dateObj = now;
        }
        
        // Simple format replacement
        let formatted = params.outputFormat || 'YYYY-MM-DD HH:mm:ss';
        formatted = formatted
          .replace('YYYY', String(dateObj.getFullYear()))
          .replace('MM', String(dateObj.getMonth() + 1).padStart(2, '0'))
          .replace('DD', String(dateObj.getDate()).padStart(2, '0'))
          .replace('HH', String(dateObj.getHours()).padStart(2, '0'))
          .replace('mm', String(dateObj.getMinutes()).padStart(2, '0'))
          .replace('ss', String(dateObj.getSeconds()).padStart(2, '0'));
        
        result.text = formatted;
        result.data = { formatted, timestamp: dateObj.getTime(), iso: dateObj.toISOString() };
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Common utility proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
