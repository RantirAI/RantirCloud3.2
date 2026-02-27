import { corsHeaders } from "../_shared/cors.ts";

const AVOMA_API_BASE = "https://api.avoma.com/v1";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      action, 
      meetingTitle, 
      meetingDate, 
      participants, 
      meetingId,
      externalId,
      userEmail,
      source,
      startTime,
      fromPhone,
      toPhone,
      direction,
      recordingUrl
    } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    console.log(`[Avoma] Action: ${action}`);

    let url = AVOMA_API_BASE;
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createCall':
        if (!externalId || !userEmail || !source || !startTime || !fromPhone || !toPhone || !direction) {
          throw new Error('External ID, user email, source, start time, from phone, to phone, and direction are required');
        }
        url = `${AVOMA_API_BASE}/calls`;
        method = 'POST';
        body = {
          external_id: externalId,
          user_email: userEmail,
          source: source,
          start_time: startTime,
          from: fromPhone,
          to: toPhone,
          direction: direction,
          ...(recordingUrl && { recording_url: recordingUrl }),
          ...(participants && { participants: JSON.parse(participants) })
        };
        break;

      case 'getMeetingRecording':
        if (!meetingId) throw new Error('Meeting ID is required');
        url = `${AVOMA_API_BASE}/recordings/?meeting_uuid=${meetingId}`;
        break;

      case 'getMeetingTranscription':
        if (!meetingId) throw new Error('Meeting ID is required');
        url = `${AVOMA_API_BASE}/transcriptions/?meeting_uuid=${meetingId}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[Avoma] Request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    // Check if response is HTML (common for 404 errors)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      throw new Error(
        `Avoma API endpoint not found. This usually means:\n` +
        `1. The meeting ID "${meetingId || 'N/A'}" doesn't exist\n` +
        `2. The recording/transcription is not ready yet\n` +
        `3. You don't have access to this meeting`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Avoma] Error:', errorText);
      
      let errorMessage = `Avoma API request failed with status ${response.status}`;
      
      if (response.status === 404) {
        errorMessage += `\n- Meeting ID "${meetingId || 'N/A'}" not found or not accessible`;
        errorMessage += `\n- Verify the meeting ID is correct`;
        errorMessage += `\n- Check if recording/transcription is ready`;
      } else if (response.status === 403) {
        errorMessage += `\n- Permission denied. Check your API key permissions`;
      } else if (response.status === 429) {
        errorMessage += `\n- Rate limit exceeded. Please wait before retrying`;
      }
      
      errorMessage += `\n\nDetails: ${errorText.substring(0, 200)}`;
      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    console.log('[Avoma] Success');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Avoma] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
