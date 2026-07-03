'use client'

import Image from 'next/image'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Notifications } from '@/components/Notifications'

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.png" 
            alt="Logo Valencia" 
            width={42} 
            height={42}
            className="object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-800 leading-tight">
              Valencia en Contingencia
            </h1>
            <p className="text-[11px] text-gray-500 leading-tight">
              Inventario en tiempo real del Centro de Acopio de la Alcaldía de Valencia
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Notifications />

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut size={16} className="text-gray-500" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
