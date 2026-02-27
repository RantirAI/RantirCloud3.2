import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getErrorMessage } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, inputs } = await req.json();

    if (!apiKey) {
      throw new Error('API Key is required');
    }

    let url: string;
    let method = 'GET';
    let body: any = null;

    // Build the API URL and method based on action
    switch (action) {
      case 'zoomCreateMeeting':
        url = 'https://api.zoom.us/v2/users/me/meetings';
        method = 'POST';
        body = {
          topic: inputs.topic,
          type: 2, // Scheduled meeting
          start_time: inputs.startTime,
          duration: parseInt(inputs.duration) || 60,
          timezone: inputs.timezone || 'UTC',
          settings: {
            host_video: inputs.hostVideo !== false,
            participant_video: inputs.participantVideo !== false,
            join_before_host: inputs.joinBeforeHost === true,
            mute_upon_entry: inputs.muteUponEntry === true,
            watermark: inputs.watermark === true,
            use_pmi: inputs.usePmi === true,
            approval_type: inputs.approvalType || 2,
            audio: inputs.audio || 'both',
            auto_recording: inputs.autoRecording || 'none'
          }
        };
        break;

      case 'zoomCreateMeetingRegistrant':
        url = `https://api.zoom.us/v2/meetings/${inputs.meetingId}/registrants`;
        method = 'POST';
        body = {
          email: inputs.email,
          first_name: inputs.firstName,
          last_name: inputs.lastName,
          ...(inputs.address && { address: inputs.address }),
          ...(inputs.city && { city: inputs.city }),
          ...(inputs.country && { country: inputs.country }),
          ...(inputs.zip && { zip: inputs.zip }),
          ...(inputs.state && { state: inputs.state }),
          ...(inputs.phone && { phone: inputs.phone }),
          ...(inputs.industry && { industry: inputs.industry }),
          ...(inputs.org && { org: inputs.org }),
          ...(inputs.jobTitle && { job_title: inputs.jobTitle }),
          ...(inputs.purchasingTimeFrame && { purchasing_time_frame: inputs.purchasingTimeFrame }),
          ...(inputs.roleInPurchaseProcess && { role_in_purchase_process: inputs.roleInPurchaseProcess }),
          ...(inputs.noOfEmployees && { no_of_employees: inputs.noOfEmployees }),
          ...(inputs.comments && { comments: inputs.comments })
        };
        break;

      case 'createCustomApiCallAction':
        url = `https://api.zoom.us/v2/${inputs.endpoint.replace(/^\//, '')}`;
        method = inputs.method || 'GET';
        if (inputs.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          body = JSON.parse(inputs.body);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      result,
      ...(result.id && { meetingId: result.id }),
      ...(result.join_url && { joinUrl: result.join_url }),
      ...(result.start_url && { startUrl: result.start_url })
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in zoom-proxy function:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});