'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, CreditCard, Save } from 'lucide-react'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [existingProfile, setExistingProfile] = useState<any>(null)
  
  const [fullName, setFullName] = useState('')
  const [cedula, setCedula] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setEmail(user.email || '')
      
      // Verificar si ya tiene perfil
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setExistingProfile(profile)
        setFullName(profile.full_name)
        setCedula(profile.cedula)
        setPhone(profile.phone)
      }
    }
    checkUser()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!user) throw new Error('Usuario no autenticado')

      const profileData = {
        id: user.id,
        email: email,
        full_name: fullName.trim(),
        cedula: cedula.trim(),
        phone: phone.trim()
      }

      if (existingProfile) {
        // Actualizar perfil existente
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: fullName.trim(),
            cedula: cedula.trim(),
            phone: phone.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError
      } else {
        // Crear nuevo perfil
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileData)

        if (insertError) throw insertError
      }

      router.push('/')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#001396] rounded-full mx-auto flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">
            {existingProfile ? 'Actualizar Perfil' : 'Completa tu Registro'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {existingProfile 
              ? 'Actualiza tus datos personales' 
              : 'Ingresa tus datos para completar el registro'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Correo obtenido de tu cuenta de Google
            </p>
          </div>

          {/* Nombre y Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre y Apellido *
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
          </div>

          {/* Cédula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cédula *
            </label>
            <div className="relative">
              <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: V-12345678"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 0412-1234567"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#001396' }}
          >
            <Save size={18} />
            {loading ? 'Guardando...' : existingProfile ? 'Actualizar Perfil' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  )
}
