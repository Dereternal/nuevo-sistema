'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Layers } from 'lucide-react'

interface Category {
  id: number
  name: string
}

interface Subcategory {
  id: number
  name: string
  category_id: number
  created_at: string
}

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*, categories(name)')
        .order('category_id', { ascending: true })
        .order('name', { ascending: true })

      if (subcategoriesError) throw subcategoriesError
      setSubcategories(subcategoriesData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      if (editingId) {
        const { error } = await supabase
          .from('subcategories')
          .update({ name, category_id: categoryId })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('subcategories')
          .insert({ 
            name, 
            category_id: categoryId,
            created_by: userData.user.id 
          })
        if (error) throw error
      }

      setName('')
      setCategoryId('')
      setEditingId(null)
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error guardando subcategoría:', error)
      alert('Error al guardar la subcategoría')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta subcategoría?')) return

    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error eliminando subcategoría:', error)
      alert('Error al eliminar la subcategoría')
    }
  }

  const handleEdit = (subcategory: Subcategory) => {
    setName(subcategory.name)
    setCategoryId(subcategory.category_id)
    setEditingId(subcategory.id)
    setShowModal(true)
  }

  // Agrupar subcategorías por categoría
  const groupedSubcategories = categories.map(cat => ({
    ...cat,
    subcategories: subcategories.filter(sub => sub.category_id === cat.id)
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Subcategorías</h1>
          <p className="text-sm text-gray-500">Gestiona las subcategorías del inventario</p>
        </div>
        <button
          onClick={() => {
            setName('')
            setCategoryId('')
            setEditingId(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={18} />
          Nueva Subcategoría
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando subcategorías...</p>
          </div>
        ) : subcategories.length === 0 ? (
          <div className="p-8 text-center">
            <Layers size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay subcategorías registradas</p>
            <p className="text-sm text-gray-400">Haz clic en "Nueva Subcategoría" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategoría</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groupedSubcategories.map((cat) => (
                  cat.subcategories.map((sub, index) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {index === 0 ? (
                        <td className="py-3 px-4 text-sm font-semibold text-gray-800" rowSpan={cat.subcategories.length}>
                          {cat.name}
                        </td>
                      ) : null}
                      <td className="py-3 px-4 text-sm text-gray-600">{sub.name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sub)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Subcategoría
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Analgésicos, Antibióticos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

