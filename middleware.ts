import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path === '/login' || path === '/register'
  const isApiRoute = path.startsWith('/api')
  const isPublicRoute = isAuthPage || isApiRoute

  // Si no hay usuario y la ruta no es pública -> login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si hay usuario y está en login o register -> redirigir según perfil
  if (user) {
    // Verificar si tiene perfil
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // Si no tiene perfil y no está en register -> ir a register
    if (!profile && path !== '/register') {
      return NextResponse.redirect(new URL('/register', request.url))
    }

    // Si tiene perfil y está en login o register -> ir a dashboard
    if (profile && isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|logo.png).*)',
  ],
}
