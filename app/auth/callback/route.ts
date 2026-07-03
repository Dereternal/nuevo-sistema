import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          return NextResponse.redirect(new URL('/', origin))
        } else {
          return NextResponse.redirect(new URL('/register', origin))
        }
      }
    }
  }

  return NextResponse.redirect(new URL('/login', origin))
}
