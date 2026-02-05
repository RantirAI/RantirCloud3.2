import * as Sentry from '@sentry/nextjs'
import { CustomerioTrackClient } from '~/lib/customerio'
import { isValidEmail, isCompanyEmail } from '~/lib/email-validation'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function POST(req: Request) {
  const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID
  const HUBSPOT_FORM_GUID = process.env.HUBSPOT_BYOC_FORM_GUID

  const body = await req.json()
  const { firstName, lastName, companyName, supabaseOrgName, email } = body

  // Validate required fields
  if (!firstName || !lastName || !companyName || !email) {
    return new Response(JSON.stringify({ message: 'All required fields must be filled' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 422,
    })
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ message: 'Invalid email address' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 422,
    })
  }

  // Validate company email
  if (!isCompanyEmail(email)) {
    return new Response(JSON.stringify({ message: 'Please use a company email address' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 422,
    })
  }

  try {
    // Submit to HubSpot
    if (HUBSPOT_PORTAL_ID && HUBSPOT_FORM_GUID) {
      const hubspotResponse = await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: [
              { objectTypeId: '0-1', name: 'firstname', value: firstName },
              { objectTypeId: '0-1', name: 'lastname', value: lastName },
              { objectTypeId: '0-1', name: 'company', value: companyName },
              { objectTypeId: '0-1', name: 'email', value: email },
              ...(supabaseOrgName
                ? [{ objectTypeId: '0-1', name: 'supabase_organization_name', value: supabaseOrgName }]
                : []),
            ],
            context: {
              pageUri: 'https://supabase.com/byoc',
              pageName: 'BYOC Early Access Request',
            },
            legalConsentOptions: {
              consent: {
                consentToProcess: true,
                text: 'By submitting this form, I confirm that I have read and understood the Privacy Policy.',
              },
            },
          }),
        }
      )

      if (!hubspotResponse.ok) {
        const errorData = await hubspotResponse.json()
        console.error('HubSpot submission failed:', errorData)
        // Continue with Customer.io even if HubSpot fails
      }
    }

    // Submit to Customer.io
    const customerioSiteId = process.env.CUSTOMERIO_SITE_ID
    const customerioApiKey = process.env.CUSTOMERIO_API_KEY

    if (customerioSiteId && customerioApiKey) {
      try {
        const customerioClient = new CustomerioTrackClient(customerioSiteId, customerioApiKey)

        // Create or update profile in Customer.io
        await customerioClient.createOrUpdateProfile(email, {
          first_name: firstName,
          last_name: lastName,
          email: email,
          company_name: companyName,
          supabase_org_name: supabaseOrgName || undefined,
        })

        // Track the early_access_requested event with specified metadata
        const customerioEvent = {
          userId: email,
          type: 'track' as const,
          event: 'early_access_requested',
          properties: {
            product_name: 'byoc',
            product_stage: 'early access',
            source: 'web form',
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            supabase_org_name: supabaseOrgName || null,
            submitted_at: new Date().toISOString(),
          },
          timestamp: customerioClient.isoToUnixTimestamp(new Date().toISOString()),
        }

        await customerioClient.trackEvent(email, customerioEvent)
      } catch (error) {
        console.error('Customer.io integration failed:', error)
        // Don't fail the whole request if Customer.io fails
      }
    }

    return new Response(JSON.stringify({ message: 'Submission successful' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}
