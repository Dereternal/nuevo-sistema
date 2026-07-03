import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isCallback = request.nextUrl.pathname.startsWith('/auth/callback')
  const isPublicRoute = isAuthPage || isApiRoute || isCallback

  // Si NO hay usuario y la ruta no es pública, redirigir a login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si HAY usuario
  if (user) {
    // Verificar si tiene perfil en user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    const needsProfile = !profile

    // Si está en login, redirigir según tenga perfil o no
    if (request.nextUrl.pathname === '/login') {
      if (needsProfile) {
        return NextResponse.redirect(new URL('/register', request.url))
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Si está en register pero ya tiene perfil, redirigir al dashboard
    if (request.nextUrl.pathname === '/register' && !needsProfile) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Si no tiene perfil y no está en register ni callback, redirigir a register
    if (needsProfile && !isAuthPage && !isCallback) {
      return NextResponse.redirect(new URL('/register', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|public).*)',
  ],
}