/**
 * Projects List Page
 *
 * Server component that displays all projects for the authenticated user.
 * Shows different views based on user role (admin vs builder).
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects } from '@/app/actions/projects'
import ProjectTable from '@/components/ProjectTable'
import Header from '@/components/Header'

export default async function ProjectsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch projects (respects RLS)
  const result = await getProjects()

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="font-medium">Error loading projects</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    )
  }

  const projects = result.data || []

  // Check if user is admin (simple check - look at first project's org)
  // In production, you might want to fetch this separately
  let isAdmin = false
  if (projects.length > 0) {
    const { data: role } = await supabase.rpc('get_user_role', {
      p_user_id: user.id,
      p_organization_id: projects[0].organization_id,
    })
    isAdmin = role === 'admin'
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <Header userEmail={user.email} userRole={isAdmin ? 'admin' : 'builder'} />
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-medium text-white mb-2">Projects</h1>
            <p className="text-[#A0A0A0] text-base">
              Manage your Supabase projects
            </p>
          </div>
          <Link
            href="/projects/new"
            className="px-5 py-2.5 bg-[#3ECF8E] text-[#0E0E0E] rounded-md hover:bg-[#3ECF8E]/90 font-medium transition-colors text-sm"
          >
            Create Project
          </Link>
        </div>

        {/* Projects Table */}
        <ProjectTable projects={projects} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
