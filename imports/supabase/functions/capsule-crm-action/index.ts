import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { 
      apiKey, action, 
      firstName, lastName, email, contactId,
      opportunityName, opportunityId, value,
      projectName, taskDescription, dueDate,
      entityType, entityId, note
    } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    let url = 'https://api.capsulecrm.com/api/v2';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'createContact':
        if (!firstName || !lastName) throw new Error('First name and last name are required');
        url += '/parties';
        method = 'POST';
        body = JSON.stringify({
          party: {
            type: 'person',
            firstName,
            lastName,
            emailAddresses: email ? [{ address: email, type: 'Work' }] : [],
          },
        });
        break;
      
      case 'updateContact':
        if (!contactId) throw new Error('Contact ID is required');
        url += `/parties/${contactId}`;
        method = 'PUT';
        body = JSON.stringify({
          party: {
            type: 'person',
            firstName,
            lastName,
            emailAddresses: email ? [{ address: email, type: 'Work' }] : [],
          },
        });
        break;
      
      case 'createOpportunity':
        if (!opportunityName) throw new Error('Opportunity name is required');
        url += '/opportunities';
        method = 'POST';
        body = JSON.stringify({
          opportunity: {
            name: opportunityName,
            value: value ? { amount: value, currency: 'USD' } : undefined,
          },
        });
        break;
      
      case 'updateOpportunity':
        if (!opportunityId) throw new Error('Opportunity ID is required');
        url += `/opportunities/${opportunityId}`;
        method = 'PUT';
        body = JSON.stringify({
          opportunity: {
            name: opportunityName,
            value: value ? { amount: value, currency: 'USD' } : undefined,
          },
        });
        break;
      
      case 'createProject':
        if (!projectName) throw new Error('Project name is required');
        url += '/kases';
        method = 'POST';
        body = JSON.stringify({
          kase: {
            name: projectName,
          },
        });
        break;
      
      case 'createTask':
        if (!taskDescription) throw new Error('Task description is required');
        url += '/tasks';
        method = 'POST';
        body = JSON.stringify({
          task: {
            description: taskDescription,
            dueOn: dueDate || undefined,
          },
        });
        break;
      
      case 'addNoteToEntity':
        if (!entityType || !entityId || !note) {
          throw new Error('Entity type, entity ID, and note are required');
        }
        url += `/${entityType}s/${entityId}/notes`;
        method = 'POST';
        body = JSON.stringify({
          note: {
            note,
          },
        });
        break;
      
      case 'findContact':
        if (!email) throw new Error('Email is required to find contact');
        url += `/parties?email=${encodeURIComponent(email)}`;
        break;
      
      case 'findProject':
        if (!projectName) throw new Error('Project name is required');
        url += `/kases?name=${encodeURIComponent(projectName)}`;
        break;
      
      case 'findOpportunity':
        if (!opportunityName) throw new Error('Opportunity name is required');
        url += `/opportunities?name=${encodeURIComponent(opportunityName)}`;
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Capsule CRM: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Capsule CRM API error:', errorText);
      throw new Error(`Capsule CRM API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in capsule-crm-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
