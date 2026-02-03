'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

interface ProjectInfoProps {
  project: {
    project_name: string
    project_ref: string
    organization_id: string
    region: string
    creator_email: string
    created_at: string
    anon_key: string
    purpose?: string
  }
}

export default function ProjectInfo({ project }: ProjectInfoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  const supabaseUrl = `https://${project.project_ref}.supabase.co`

  const copyToClipboard = async (text: string, type: 'url' | 'key') => {
    await navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  return (
    <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#2C2C2C]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#D0D0D0]">Project Information</span>
          <span className="text-xs text-[#808080]">
            {project.region} • Created {new Date(project.created_at).toLocaleDateString()}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#808080]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#808080]" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-[#2C2C2C] px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#808080] uppercase tracking-wide mb-3">
                Basic Information
              </h3>
              <div>
                <dt className="text-xs text-[#808080] mb-1">Organization ID</dt>
                <dd className="text-sm text-[#D0D0D0] font-mono">{project.organization_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#808080] mb-1">Region</dt>
                <dd className="text-sm text-[#D0D0D0]">{project.region}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#808080] mb-1">Created By</dt>
                <dd className="text-sm text-[#D0D0D0]">{project.creator_email}</dd>
              </div>
              {project.purpose && (
                <div>
                  <dt className="text-xs text-[#808080] mb-1">Purpose</dt>
                  <dd className="text-sm text-[#D0D0D0]">{project.purpose}</dd>
                </div>
              )}
            </div>

            {/* Connection Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#808080] uppercase tracking-wide mb-3">
                Connection Info
              </h3>
              <div>
                <dt className="text-xs text-[#808080] mb-2">Supabase URL</dt>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-[#0E0E0E] text-[#A0A0A0] px-3 py-2 rounded border border-[#2C2C2C] font-mono">
                    {supabaseUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(supabaseUrl, 'url')}
                    className="p-2 hover:bg-[#2C2C2C] rounded transition-colors"
                    title="Copy URL"
                  >
                    {copiedUrl ? (
                      <Check className="w-4 h-4 text-[#3ECF8E]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#808080]" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <dt className="text-xs text-[#808080] mb-2">Anon Key</dt>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-[#0E0E0E] text-[#A0A0A0] px-3 py-2 rounded border border-[#2C2C2C] font-mono truncate">
                    {project.anon_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(project.anon_key, 'key')}
                    className="p-2 hover:bg-[#2C2C2C] rounded transition-colors"
                    title="Copy key"
                  >
                    {copiedKey ? (
                      <Check className="w-4 h-4 text-[#3ECF8E]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#808080]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
