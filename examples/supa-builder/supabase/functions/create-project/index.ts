/**
 * SupaBuilder - Create Project Edge Function
 *
 * This edge function orchestrates the creation of new Supabase Pico projects
 * via the Management API. It handles rate limiting, validation, encryption,
 * and audit logging.
 *
 * Flow:
 * 1. Verify JWT from Authorization header
 * 2. Parse & validate request
 * 3. Check rate limit (5 projects/hour)
 * 4. Create provisional project record
 * 5. Call Management API to create Pico project
 * 6. Encrypt and store service_role_key
 * 7. Update project record with credentials
 * 8. Create audit log entry
 * 9. Return project details
 */

import { createClient } from 'npm:@supabase/supabase-js@^2.93.3'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import {
  type CreateProjectRequest,
  type CreateProjectResponse,
  type ErrorResponse,
  validateCreateProjectRequest,
  isValidRegion,
} from '../_shared/types.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // =========================================================================
    // 1. VERIFY JWT AND GET USER INFO
    // =========================================================================

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Missing Authorization header', 401)
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Create Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verify JWT and get user - pass the JWT explicitly
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return jsonError('Unauthorized', 401)
    }

    console.log('User authenticated:', user.email)

    // Now create a client with the user's JWT for database operations
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // =========================================================================
    // 2. PARSE AND VALIDATE REQUEST
    // =========================================================================

    let requestData: CreateProjectRequest
    try {
      requestData = await req.json()
    } catch {
      return jsonError('Invalid JSON in request body', 400)
    }

    if (!validateCreateProjectRequest(requestData)) {
      return jsonError(
        'Invalid request: project_name (3-63 chars), organization_id, and region are required',
        400
      )
    }

    if (!isValidRegion(requestData.region)) {
      return jsonError(
        `Invalid region. Must be one of: us-east-1, us-west-1, us-west-2, eu-west-1, eu-west-2, eu-central-1, ap-southeast-1, ap-southeast-2, ap-northeast-1, sa-east-1`,
        400
      )
    }

    const { project_name, organization_id, region, purpose, description } =
      requestData

    // =========================================================================
    // 3. CHECK RATE LIMIT (if enabled)
    // =========================================================================

    const rateLimitingEnabled = Deno.env.get('ENABLE_RATE_LIMITING') !== 'false'

    if (rateLimitingEnabled) {
      const { data: rateLimitOk, error: rateLimitError } = await supabaseWithAuth.rpc(
        'check_rate_limit',
        {
          p_user_id: user.id,
          p_organization_id: organization_id,
          p_action: 'create_project',
          p_max_requests: 5,
          p_window_minutes: 60,
        }
      )

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
        return jsonError('Error checking rate limit', 500)
      }

      if (!rateLimitOk) {
        return jsonError(
          'Rate limit exceeded: Maximum 5 projects per hour',
          429
        )
      }

      // Record rate limit event
      await supabaseWithAuth.rpc('record_rate_limit', {
        p_user_id: user.id,
        p_organization_id: organization_id,
        p_action: 'create_project',
      })
    } else {
      console.log('Rate limiting disabled')
    }

    // =========================================================================
    // 4. CALL MANAGEMENT API
    // =========================================================================

    try {

      const managementAccessToken = Deno.env.get('MANAGEMENT_ACCESS_TOKEN')
      if (!managementAccessToken) {
        throw new Error('MANAGEMENT_ACCESS_TOKEN not configured')
      }

      const supabaseOrgSlug = Deno.env.get('ORGANIZATION_SLUG')
      if (!supabaseOrgSlug) {
        throw new Error('ORGANIZATION_SLUG not configured')
      }

      console.log(`Creating project via Management API: ${project_name}`)

      // Map region to smart group
      const regionMap: Record<string, string> = {
        'us-east-1': 'americas',
        'us-west-1': 'americas',
        'us-west-2': 'americas',
        'sa-east-1': 'americas',
        'eu-west-1': 'europe',
        'eu-west-2': 'europe',
        'eu-central-1': 'europe',
        'ap-southeast-1': 'asia-pacific',
        'ap-southeast-2': 'asia-pacific',
        'ap-northeast-1': 'asia-pacific',
      }

      const smartGroupCode = regionMap[region] || 'americas'

      // Generate a secure database password
      const dbPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

      // Create Pico project using direct API call
      const createResponse = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managementAccessToken}`,
        },
        body: JSON.stringify({
          name: project_name,
          organization_slug: supabaseOrgSlug,
          db_pass: dbPassword,
          region_selection: {
            type: 'smartGroup',
            code: smartGroupCode,
          },
          desired_instance_size: 'micro', // Pico instance that pause for inactivity. 
        }),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        throw new Error(`Management API error (${createResponse.status}): ${errorText}`)
      }

      const newProject = await createResponse.json()

      if (!newProject || !newProject.id) {
        throw new Error('Management API returned invalid response')
      }

      console.log(`Project created: ${newProject.id}`)

      const projectRef = newProject.id
      // Extract organization_id from Management API response
      const actualOrgId = newProject.organization_id || organization_id
      console.log(`Organization ID from Management API: ${actualOrgId}`)
      console.log(`Organization ID from request: ${organization_id}`)
      console.log(`Organization ID from API response: ${newProject.organization_id}`)

      // Validate that we have a valid organization_id
      if (!actualOrgId || actualOrgId === 'undefined') {
        throw new Error(`Invalid organization_id: ${actualOrgId}`)
      }

      // Wait for project to be ready and fetch API keys
      // The project needs time to provision before keys are available
      console.log('Waiting for project to provision...')

      // Poll for project status with exponential backoff (max 2 minutes)
      let keysResponse: Response | null = null
      const maxAttempts = 12 // 12 attempts over ~2 minutes
      let attempt = 0

      while (attempt < maxAttempts) {
        attempt++
        const waitTime = Math.min(5000 + (attempt * 2000), 15000) // 5s, 7s, 9s, ... up to 15s
        console.log(`Attempt ${attempt}/${maxAttempts}: Waiting ${waitTime}ms before checking project status...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))

        // Check if project is ready by fetching API keys
        keysResponse = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
          {
            headers: {
              'Authorization': `Bearer ${managementAccessToken}`,
            },
          }
        )

        if (keysResponse.ok) {
          console.log('Project is ready!')
          break
        }

        console.log(`Attempt ${attempt} failed with status ${keysResponse.status}, retrying...`)
      }

      if (!keysResponse || !keysResponse.ok) {
        throw new Error(`Failed to fetch API keys after ${maxAttempts} attempts: ${keysResponse?.status || 'unknown'}`)
      }

      const keysData = await keysResponse.json()

      // Extract anon and service_role keys
      const anonKey = keysData.find((k: any) => k.name === 'anon')?.api_key
      const serviceRoleKey = keysData.find((k: any) => k.name === 'service_role')?.api_key

      if (!anonKey || !serviceRoleKey) {
        throw new Error('Failed to retrieve API keys from Management API')
      }

      console.log('API keys retrieved successfully')

      // =========================================================================
      // 6. ENCRYPT SERVICE ROLE KEY
      // =========================================================================

      const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured')
      }

      const { data: encryptedKey, error: encryptError } = await supabaseWithAuth.rpc(
        'encrypt_service_role_key',
        {
          p_service_role_key: serviceRoleKey,
          p_encryption_key: encryptionKey,
        }
      )

      if (encryptError || !encryptedKey) {
        throw new Error(`Failed to encrypt service_role_key: ${encryptError?.message}`)
      }

      // =========================================================================
      // 7. CREATE PROJECT RECORD
      // =========================================================================

      const { data: createdProject, error: insertError } = await supabaseWithAuth
        .from('projects')
        .insert({
          project_name,
          organization_id: actualOrgId,
          region,
          purpose,
          description,
          creator_id: user.id,
          creator_email: user.email!,
          project_ref: projectRef,
          anon_key: anonKey,
          service_role_key_encrypted: encryptedKey,
          status: 'active',
          management_api_response: newProject,
        })
        .select('id')
        .single()

      if (insertError || !createdProject) {
        throw new Error(`Failed to create project record: ${insertError?.message}`)
      }

      const projectId = createdProject.id

      // =========================================================================
      // 8. CREATE AUDIT LOG
      // =========================================================================

      await supabaseWithAuth.rpc('create_audit_log', {
        p_project_id: projectId,
        p_action: 'create',
        p_actor_id: user.id,
        p_actor_email: user.email!,
        p_organization_id: actualOrgId,
        p_metadata: {
          project_name,
          region,
          project_ref: projectRef,
        },
      })

      // =========================================================================
      // 9. RETURN SUCCESS RESPONSE
      // =========================================================================

      const response: CreateProjectResponse = {
        success: true,
        project_id: projectId,
        project_ref: projectRef,
        anon_key: anonKey,
        message: 'Project created successfully',
      }

      return jsonResponse(response, 201)
    } catch (error) {
      // If project creation fails, log the error and return failure response
      console.error('Error creating project:', error)

      return jsonError(
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        500
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      500
    )
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function jsonResponse(data: CreateProjectResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(message: string, status = 400): Response {
  const error: ErrorResponse = {
    success: false,
    error: message,
  }

  return new Response(JSON.stringify(error), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
