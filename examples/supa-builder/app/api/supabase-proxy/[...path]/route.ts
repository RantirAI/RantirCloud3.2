import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function forwardToSupabaseAPI(request: Request, method: string, params: { path: string[] }) {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (!process.env.MANAGEMENT_API_TOKEN) {
    console.error('Management API token is not configured.')
    return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 })
  }

  const { path } = params
  const apiPath = path.join('/')

  const url = new URL(request.url)
  url.protocol = 'https'
  url.hostname = 'api.supabase.com'
  url.port = '443'
  url.pathname = apiPath

  const projectRef = path[2]

  // Check user permission using RLS policies
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { message: 'You must be logged in to access projects.' },
      { status: 401 }
    )
  }

  // Verify user has access to this project via RLS
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('project_ref', projectRef)
    .is('deleted_at', null)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { message: 'You do not have permission to access this project.' },
      { status: 403 }
    )
  }

  try {
    const forwardHeaders: HeadersInit = {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      Authorization: `Bearer ${process.env.MANAGEMENT_API_TOKEN}`,
    }

    // Copy relevant headers from the original request
    const contentType = request.headers.get('content-type')
    if (contentType) {
      forwardHeaders['Content-Type'] = contentType
    }

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders,
    }

    // Include body for methods that support it
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text()
        if (body) {
          fetchOptions.body = body
        }
      } catch (error) {
        // Handle cases where body is not readable
        console.warn('Could not read request body:', error)
      }
    }

    const response = await fetch(url, fetchOptions)

    // Get response body
    const responseText = await response.text()
    let responseData

    try {
      responseData = responseText ? JSON.parse(responseText) : null
    } catch {
      responseData = responseText
    }

    // Return the response with the same status
    return NextResponse.json(responseData, { status: response.status })
  } catch (error: any) {
    console.error('Supabase API proxy error:', error)
    const errorMessage = error.message || 'An unexpected error occurred.'
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'GET', resolvedParams)
}

export async function HEAD(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'HEAD', resolvedParams)
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'POST', resolvedParams)
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'PUT', resolvedParams)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'DELETE', resolvedParams)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  return forwardToSupabaseAPI(request, 'PATCH', resolvedParams)
}
