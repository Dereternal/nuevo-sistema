import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Usar el cliente con la clave de servicio para tener permisos de admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener el usuario actual de la sesión (usando el cliente normal)
    const { createClient: createSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol del usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 })
    }

    // Usar el cliente admin para listar usuarios
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listando usuarios:', authError)
      return NextResponse.json({ error: 'Error obteniendo usuarios de auth: ' + authError.message }, { status: 500 })
    }

    // Obtener perfiles de todos los usuarios
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')

    if (profilesError) {
      console.error('Error obteniendo perfiles:', profilesError)
    }

    // Combinar datos
    const combinedUsers = authData.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Sin nombre',
        cedula: profile?.cedula || 'No registrada',
        phone: profile?.phone || 'No registrado',
        role: profile?.role || 'operador',
        created_at: profile?.created_at || authUser.created_at
      }
    })

    return NextResponse.json(combinedUsers)
  } catch (error) {
    console.error('Error en API:', error)
    return NextResponse.json({ error: 'Error interno del servidor: ' + String(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { createClient: createSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseClient()
    
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: 'Faltan datos: userId y role son requeridos' }, { status: 400 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 })
    }

    // Verificar si el usuario tiene perfil
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId)

      if (updateError) {
        return NextResponse.json({ error: 'Error actualizando perfil: ' + updateError.message }, { status: 500 })
      }
    } else {
      // Obtener datos del usuario de auth usando el cliente admin
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (authError) {
        return NextResponse.json({ error: 'Error obteniendo datos del usuario: ' + authError.message }, { status: 500 })
      }

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: authUser?.user?.email || '',
          full_name: authUser?.user?.user_metadata?.full_name || 'Sin nombre',
          cedula: 'No registrada',
          phone: 'No registrado',
          role: role
        })

      if (insertError) {
        return NextResponse.json({ error: 'Error creando perfil: ' + insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PATCH:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
