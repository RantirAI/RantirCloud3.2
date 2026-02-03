'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  userEmail?: string
  userRole?: string
}

export default function Header({ userEmail, userRole }: HeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!userEmail) return null

  return (
    <header className="sticky top-0 z-50 border-b border-[#2C2C2C] bg-[#0E0E0E]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0E0E0E]/80">
      <div className="container mx-auto px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-semibold text-white">SupaBuilder</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-[#A0A0A0]">
              <User className="w-4 h-4" />
              <span>{userEmail}</span>
              {userRole && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    userRole === 'admin'
                      ? 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {userRole}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2C2C2C] rounded-md transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
