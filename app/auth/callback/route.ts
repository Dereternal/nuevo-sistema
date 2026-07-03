import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=session', requestUrl.origin))
    }

    // Verificar si el usuario ya tiene perfil
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      // Si no tiene perfil, redirigir a registro
      if (!profile) {
        return NextResponse.redirect(new URL('/register', requestUrl.origin))
      }
    }

    return NextResponse.redirect(new URL('/', requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
