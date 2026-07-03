'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface AddSubcategoryModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddSubcategoryModal({ onClose, onSuccess }: AddSubcategoryModalProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      setCategories(data || [])
    }
    loadCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const { error } = await supabase
        .from('subcategories')
        .insert({ name: name.trim(), category_id: categoryId, created_by: userData.user.id })

      if (error) throw error
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar la subcategoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Nueva Subcategoría</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 mb-3"
            required
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la subcategoría"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 mb-4"
            required
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
