'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Ruler } from 'lucide-react'

interface Unit {
  id: number
  name: string
  abbreviation: string
  created_at: string
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const supabase = createClient()

  const loadUnits = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error('Error cargando unidades:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      if (editingId) {
        const { error } = await supabase
          .from('units')
          .update({ name, abbreviation })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('units')
          .insert({ name, abbreviation, created_by: userData.user.id })
        if (error) throw error
      }

      setName('')
      setAbbreviation('')
      setEditingId(null)
      setShowModal(false)
      loadUnits()
    } catch (error) {
      console.error('Error guardando unidad:', error)
      alert('Error al guardar la unidad de medida')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta unidad de medida?')) return

    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)
      if (error) throw error
      loadUnits()
    } catch (error) {
      console.error('Error eliminando unidad:', error)
      alert('Error al eliminar la unidad de medida')
    }
  }

  const handleEdit = (unit: Unit) => {
    setName(unit.name)
    setAbbreviation(unit.abbreviation)
    setEditingId(unit.id)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Unidades de Medida</h1>
          <p className="text-sm text-gray-500">Gestiona las unidades de medida del inventario</p>
        </div>
        <button
          onClick={() => {
            setName('')
            setAbbreviation('')
            setEditingId(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={18} />
          Nueva Unidad
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-800 border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando unidades...</p>
          </div>
        ) : units.length === 0 ? (
          <div className="p-8 text-center">
            <Ruler size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay unidades de medida registradas</p>
            <p className="text-sm text-gray-400">Haz clic en "Nueva Unidad" para comenzar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="table-header border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Abreviatura</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600">{unit.id}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{unit.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{unit.abbreviation}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(unit)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Kilogramo, Litro, Unidad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abreviatura
                </label>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  placeholder="Ej: KG, LT, UND"
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

