import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    console.log('AI Chart Assistant request:', { message, context });

    // Create a comprehensive system prompt for chart assistance
    const systemPrompt = `You are an AI Chart Assistant specialized in helping users create data visualizations. Your role is to:

1. Understand user requests for creating charts and data visualizations
2. Analyze available databases and tables to recommend appropriate chart types
3. Provide intelligent responses about data compatibility and chart recommendations
4. Guide users through the process of connecting data sources
5. Suggest dummy data when no databases are connected

Current Context:
- Available Databases: ${context.databases?.length || 0} (${context.databases?.map((db: any) => db.name).join(', ') || 'none'})
- Selected Database: ${context.selectedDatabase || 'none'}
- Available Tables: ${context.availableTables?.length || 0}
- Component ID: ${context.componentId}

Available Chart Types: bar, line, area, pie, donut, scatter

Guidelines:
- Always be helpful and specific about chart recommendations
- If no databases are connected, offer to help with dummy data or guide them to connect a database
- When analyzing tables, check for numeric fields (required for most charts)
- Recommend appropriate chart types based on data structure
- Be conversational and encouraging
- Provide actionable next steps

Respond with a JSON object containing:
{
  "message": "Your helpful response text",
  "actions": [optional array of action objects with type, label, and payload],
  "chartConfig": optional chart configuration object
}

Action types: "connect_database", "select_table", "add_dummy_data", "configure_chart"`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser Message: "${message}"`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    
    console.log('Claude AI response:', aiResponse);

    // Try to parse as JSON, fallback to text response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      // If JSON parsing fails, create a structured response
      parsedResponse = {
        message: aiResponse,
        actions: getContextualActions(message, context)
      };
    }

    // Ensure we have a valid response structure
    const finalResponse = {
      message: parsedResponse.message || aiResponse,
      actions: parsedResponse.actions || getContextualActions(message, context),
      chartConfig: parsedResponse.chartConfig || null
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-chart-assistant function:', error);
    
    const fallbackResponse = {
      message: "I'm here to help you create charts! I can connect to your databases, analyze your data, or provide dummy data for testing. What would you like to do?",
      actions: [
        { type: 'add_dummy_data', label: 'Add Sample Chart' },
        { type: 'connect_database', label: 'Connect Database' }
      ]
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getContextualActions(message: string, context: any) {
  const actions = [];
  
  // If no databases, suggest connecting or using dummy data
  if (!context.databases || context.databases.length === 0) {
    actions.push({ type: 'add_dummy_data', label: 'Use Sample Data' });
    actions.push({ type: 'connect_database', label: 'Connect Database' });
  } else if (!context.selectedDatabase) {
    // If databases exist but none selected, suggest selecting one
    actions.push({ type: 'connect_database', label: 'Select Database' });
    actions.push({ type: 'add_dummy_data', label: 'Use Sample Data' });
  } else if (!context.availableTables || context.availableTables.length === 0) {
    // If database selected but no tables
    actions.push({ type: 'add_dummy_data', label: 'Use Sample Data' });
  }
  
  // Always offer dummy data as an option
  if (actions.length === 0) {
    actions.push({ type: 'add_dummy_data', label: 'Try Sample Data' });
  }
  
  return actions;
}