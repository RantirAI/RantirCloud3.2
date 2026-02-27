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
    const { accessToken, action, eventId, summary, description, startTime, endTime } = await req.json();
    
    if (!accessToken) {
      throw new Error("Google Calendar access token is required");
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const calendarId = 'primary';
    let result;

    if (action === 'create_event') {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            summary,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Calendar API error (${response.status}): ${errorText || 'Failed to create event. Check your access token and permissions.'}`);
      }

      result = await response.json();
    } else if (action === 'list_events') {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        { headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Calendar API error (${response.status}): ${errorText || 'Failed to list events. Check your access token and permissions.'}`);
      }

      result = await response.json();
    } else if (action === 'update_event') {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            summary,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Calendar API error (${response.status}): ${errorText || 'Failed to update event. Check your access token and permissions.'}`);
      }

      result = await response.json();
    } else if (action === 'delete_event') {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        { method: 'DELETE', headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Calendar API error (${response.status}): ${errorText || 'Failed to delete event. Check your access token and permissions.'}`);
      }

      result = { success: response.ok };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
