'use server'

/**
 * SupaBuilder Server Actions
 *
 * Server-side actions for project management that bridge Next.js and
 * Supabase edge functions.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// TYPES
// ============================================================================

export interface CreateProjectInput {
  project_name: string
  organization_id: string
  region: string
  purpose?: string
  description?: string
}

export interface Project {
  id: string
  project_ref: string
  project_name: string
  organization_id: string
  anon_key: string
  region: string
  status: 'provisioning' | 'active' | 'paused' | 'failed' | 'deleted'
  purpose?: string
  description?: string
  creator_id: string
  creator_email: string
  created_at: string
  updated_at: string
}

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorDetails?: {
    statusCode?: number
    statusText?: string
    requestUrl?: string
    responseBody?: unknown
  }
}

// ============================================================================
// CREATE PROJECT
// ============================================================================

export async function createProject(
  input: CreateProjectInput
): Promise<ActionResult<{ project_id: string; project_ref: string; anon_key: string }>> {
  const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/create-project'

  try {
    const supabase = await createClient()

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('[createProject] Session error:', sessionError)
      return {
        success: false,
        error: 'You must be logged in to create a project',
      }
    }

    // Log the request we're about to make
    console.log('[createProject] Calling edge function:', {
      url: functionUrl,
      project_name: input.project_name,
      organization_id: input.organization_id,
      region: input.region,
      hasToken: !!session.access_token,
      tokenLength: session.access_token?.length,
    })

    // Call edge function to create project
    let response: Response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
    } catch (fetchError) {
      // Network error - couldn't reach edge function
      console.error('[createProject] Network error reaching edge function:', {
        error: fetchError,
        url: functionUrl,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
      })
      return {
        success: false,
        error: `Network error: Could not reach edge function. ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        errorDetails: {
          requestUrl: functionUrl,
        },
      }
    }

    // Log response status
    console.log('[createProject] Edge function response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })

    // Try to parse response body
    let result: any
    const responseText = await response.text()
    console.log('[createProject] Response body:', responseText)

    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[createProject] Failed to parse response as JSON:', {
        parseError,
        responseText: responseText.substring(0, 500), // Log first 500 chars
        statusCode: response.status,
      })
      return {
        success: false,
        error: `Invalid response from edge function (HTTP ${response.status}). Response was not valid JSON.`,
        errorDetails: {
          statusCode: response.status,
          statusText: response.statusText,
          requestUrl: functionUrl,
          responseBody: responseText.substring(0, 500),
        },
      }
    }

    // Check if request was successful
    if (!response.ok || !result.success) {
      const errorMessage = result.error || result.message || 'Failed to create project'
      console.error('[createProject] Edge function returned error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        fullResponse: result,
      })

      return {
        success: false,
        error: `${errorMessage} (HTTP ${response.status})`,
        errorDetails: {
          statusCode: response.status,
          statusText: response.statusText,
          requestUrl: functionUrl,
          responseBody: result,
        },
      }
    }

    // Success!
    console.log('[createProject] Project created successfully:', {
      project_id: result.project_id,
      project_ref: result.project_ref,
    })

    // Revalidate projects page
    revalidatePath('/projects')

    return {
      success: true,
      data: {
        project_id: result.project_id,
        project_ref: result.project_ref,
        anon_key: result.anon_key,
      },
    }
  } catch (error) {
    console.error('[createProject] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorDetails: {
        requestUrl: functionUrl,
      },
    }
  }
}

// ============================================================================
// GET PROJECTS
// ============================================================================

export async function getProjects(): Promise<ActionResult<Project[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view projects',
      }
    }

    // Fetch projects (RLS policies will filter based on user role)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: projects as Project[],
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ============================================================================
// GET SINGLE PROJECT
// ============================================================================

export async function getProject(projectId: string): Promise<ActionResult<Project>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view this project',
      }
    }

    // Fetch project (RLS will enforce access control)
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    return {
      success: true,
      data: project as Project,
    }
  } catch (error) {
    console.error('Error fetching project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ============================================================================
// PAUSE PROJECT (Admin only)
// ============================================================================

export async function pauseProject(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to pause projects',
      }
    }

    // Update project status using helper function
    const { error } = await supabase.rpc('update_project_status', {
      p_project_id: projectId,
      p_new_status: 'paused',
      p_actor_id: user.id,
      p_actor_email: user.email!,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Revalidate projects pages
    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error pausing project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ============================================================================
// RESUME PROJECT (Admin only)
// ============================================================================

export async function resumeProject(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to resume projects',
      }
    }

    // Update project status using helper function
    const { error } = await supabase.rpc('update_project_status', {
      p_project_id: projectId,
      p_new_status: 'active',
      p_actor_id: user.id,
      p_actor_email: user.email!,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Revalidate projects pages
    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error resuming project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ============================================================================
// DELETE PROJECT (Admin only, soft delete)
// ============================================================================

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/delete-project'

  try {
    const supabase = await createClient()

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('[deleteProject] Session error:', sessionError)
      return {
        success: false,
        error: 'You must be logged in to delete projects',
      }
    }

    console.log('[deleteProject] Calling edge function:', {
      url: functionUrl,
      project_id: projectId,
    })

    // Call edge function to delete project
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId }),
    })

    console.log('[deleteProject] Edge function response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    // Try to parse response body
    let result: any
    const responseText = await response.text()
    console.log('[deleteProject] Response body:', responseText)

    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[deleteProject] Failed to parse response as JSON')
      return {
        success: false,
        error: `Invalid response from edge function (HTTP ${response.status})`,
      }
    }

    // Check if request was successful
    if (!response.ok || !result.success) {
      const errorMessage = result.error || result.message || 'Failed to delete project'
      console.error('[deleteProject] Edge function returned error:', errorMessage)

      return {
        success: false,
        error: `${errorMessage} (HTTP ${response.status})`,
      }
    }

    // Success!
    console.log('[deleteProject] Project deleted successfully:', projectId)

    // Revalidate projects page
    revalidatePath('/projects')

    return {
      success: true,
    }
  } catch (error) {
    console.error('[deleteProject] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ============================================================================
// GET USER ROLE
// ============================================================================

export async function getUserRole(organizationId: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in',
      }
    }

    // Get user role
    const { data: role, error } = await supabase.rpc('get_user_role', {
      p_user_id: user.id,
      p_organization_id: organizationId,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: role || 'builder',
    }
  } catch (error) {
    console.error('Error getting user role:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
