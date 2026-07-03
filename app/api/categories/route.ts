import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener todas las categorías
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva categoría
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, created_by } = body

    // Validar que el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Validar que el nombre no esté vacío
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}