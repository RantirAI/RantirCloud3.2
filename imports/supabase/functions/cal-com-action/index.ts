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
    const { apiKey, action, eventTypeId, startTime, attendeeEmail, attendeeName, attendeeTimezone, bookingId, cancellationReason } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    let url = 'https://api.cal.com/v1';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'createBooking':
        if (!eventTypeId || !startTime || !attendeeEmail || !attendeeName || !attendeeTimezone) {
          throw new Error('Event Type ID, start time, attendee email, attendee name, and timezone are required for creating a booking');
        }
        url += '/bookings';
        method = 'POST';
        body = JSON.stringify({
          eventTypeId: parseInt(eventTypeId),
          start: startTime,
          timeZone: attendeeTimezone,
          responses: {
            name: attendeeName,
            email: attendeeEmail,
          },
        });
        break;
      
      case 'cancelBooking':
        if (!bookingId) throw new Error('Booking ID is required for cancellation');
        url += `/bookings/${bookingId}/cancel`;
        method = 'DELETE';
        if (cancellationReason) {
          body = JSON.stringify({ cancellationReason });
        }
        break;
      
      case 'rescheduleBooking':
        if (!bookingId || !startTime) {
          throw new Error('Booking ID and new start time are required for rescheduling');
        }
        url += `/bookings/${bookingId}/reschedule`;
        method = 'PATCH';
        body = JSON.stringify({ start: startTime });
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    url += `?apiKey=${apiKey}`;

    console.log(`Cal.com: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com API error:', errorText);
      throw new Error(`Cal.com API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cal-com-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
