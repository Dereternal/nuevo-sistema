import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Solo proteger rutas específicas
  const protectedPaths = ['/', '/products', '/stock', '/reports', '/admin', '/inventory']
  const path = request.nextUrl.pathname
  
  // Si es login o register, permitir siempre
  if (path === '/login' || path === '/register') {
    return NextResponse.next()
  }
  
  // Si es una ruta protegida, verificar autenticación
  if (protectedPaths.some(p => path === p || path.startsWith(p + '/'))) {
    // Verificar la cookie de sesión de Supabase
    const supabaseCookie = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')
    
    if (!supabaseCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
}
