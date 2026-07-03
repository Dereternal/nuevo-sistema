import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('🔹 Callback iniciado')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Verificar la sesión después del intercambio
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔹 Sesión obtenida:', session ? '✅ Sí' : '❌ No')
      console.log('🔹 Error de sesión:', sessionError)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('🔹 Usuario autenticado:', user.email)
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          return NextResponse.redirect(new URL('/register', origin))
        }
        
        console.log('🔹 Redirigiendo a dashboard')
        return NextResponse.redirect(new URL('/', origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', origin))
}
