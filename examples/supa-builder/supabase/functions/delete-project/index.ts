/**
 * SupaBuilder - Delete Project Edge Function
 *
 * This edge function handles deletion of Supabase projects via the Management API.
 * Only admins can delete projects.
 *
 * Flow:
 * 1. Verify JWT from Authorization header
 * 2. Parse & validate request (project_id)
 * 3. Verify user is admin for the project's organization
 * 4. Fetch project details (to get project_ref)
 * 5. Call Management API to delete the project
 * 6. Update project record in database (soft delete)
 * 7. Create audit log entry
 * 8. Return success response
 */

import { createClient } from 'npm:@supabase/supabase-js@^2.93.3'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface DeleteProjectRequest {
  project_id: string
}

interface DeleteProjectResponse {
  success: boolean
  message: string
  project_id?: string
}

interface ErrorResponse {
  success: false
  error: string
  details?: unknown
}

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

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Verify JWT and get user
    const {
      data: { user },
      error: authError,
    } = await supabaseWithAuth.auth.getUser(jwt)

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return jsonError('Authentication failed', 401)
    }

    console.log(`Delete project request from user: ${user.email}`)

    // =========================================================================
    // 2. PARSE AND VALIDATE REQUEST
    // =========================================================================

    let requestData: DeleteProjectRequest
    try {
      requestData = await req.json()
    } catch {
      return jsonError('Invalid JSON in request body', 400)
    }

    const { project_id } = requestData

    if (!project_id) {
      return jsonError('project_id is required', 400)
    }

    console.log(`Deleting project: ${project_id}`)

    // =========================================================================
    // 3. FETCH PROJECT DETAILS
    // =========================================================================

    const { data: project, error: projectError } = await supabaseWithAuth
      .from('projects')
      .select('id, project_ref, project_name, organization_id, status')
      .eq('id', project_id)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      console.error('Project not found:', projectError)
      return jsonError('Project not found or already deleted', 404)
    }

    // =========================================================================
    // 4. VERIFY USER IS ADMIN
    // =========================================================================

    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single()

    if (roleError || !userRole || userRole.role !== 'admin') {
      console.error('Permission denied: User is not admin')
      return jsonError('Only admins can delete projects', 403)
    }

    console.log(`User ${user.email} is admin for organization ${project.organization_id}`)

    // =========================================================================
    // 5. CALL MANAGEMENT API TO DELETE PROJECT
    // =========================================================================

    const managementAccessToken = Deno.env.get('MANAGEMENT_ACCESS_TOKEN')
    if (!managementAccessToken) {
      throw new Error('MANAGEMENT_ACCESS_TOKEN not configured')
    }

    console.log(`Calling Management API to delete project: ${project.project_ref}`)

    const deleteResponse = await fetch(
      `https://api.supabase.com/v1/projects/${project.project_ref}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${managementAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // Management API returns 200 or 204 on success
    if (!deleteResponse.ok && deleteResponse.status !== 204) {
      const errorText = await deleteResponse.text()
      console.error(`Management API error (${deleteResponse.status}):`, errorText)

      // If project is already deleted on Supabase side, we'll still mark it deleted locally
      if (deleteResponse.status === 404) {
        console.log('Project not found in Management API, proceeding with local deletion')
      } else {
        throw new Error(`Management API error (${deleteResponse.status}): ${errorText}`)
      }
    }

    console.log('Project successfully deleted from Management API')

    // =========================================================================
    // 6. UPDATE PROJECT RECORD (SOFT DELETE)
    // =========================================================================

    const { error: updateError } = await supabaseWithAuth
      .from('projects')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', project_id)

    if (updateError) {
      console.error('Failed to update project record:', updateError)
      throw new Error(`Failed to update project record: ${updateError.message}`)
    }

    console.log('Project record updated with deleted status')

    // =========================================================================
    // 7. CREATE AUDIT LOG
    // =========================================================================

    await supabaseWithAuth.rpc('create_audit_log', {
      p_project_id: project_id,
      p_action: 'delete',
      p_actor_id: user.id,
      p_actor_email: user.email!,
      p_organization_id: project.organization_id,
      p_metadata: {
        project_name: project.project_name,
        project_ref: project.project_ref,
        previous_status: project.status,
      },
    })

    console.log('Audit log created')

    // =========================================================================
    // 8. RETURN SUCCESS RESPONSE
    // =========================================================================

    const response: DeleteProjectResponse = {
      success: true,
      message: 'Project deleted successfully',
      project_id: project_id,
    }

    return jsonResponse(response, 200)
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

function jsonResponse(data: DeleteProjectResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(error: string, status: number): Response {
  const response: ErrorResponse = {
    success: false,
    error,
  }
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
