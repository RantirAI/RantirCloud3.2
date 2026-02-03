'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import SupabaseManagerDialog from '@/components/supabase-manager'
import { Database } from 'lucide-react'

interface DatabaseAccessModalProps {
  projectRef: string
  anonKey: string
  projectName: string
}

export default function DatabaseAccessModal({
  projectRef,
  anonKey,
  projectName,
}: DatabaseAccessModalProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 transition-colors"
        size="lg"
      >
        <Database className="mr-2 h-5 w-5" />
        Access Database
      </Button>

      <SupabaseManagerDialog
        projectRef={projectRef}
        open={open}
        onOpenChange={setOpen}
        isMobile={isMobile}
      />
    </>
  )
}
