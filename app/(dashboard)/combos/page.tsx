'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Search, Edit, Trash2, Layers, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Combo {
  id: number
  name: string
  description: string
  category_id: number
  categories?: { name: string }
  is_active: boolean
  created_by: string
  created_at: string
  item_count?: number
  stock?: number
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadCombos = async () => {
    setLoading(true)
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      setCategories(categoriesData || [])

      const { data: combosData } = await supabase
        .from('combos')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })

      if (combosData) {
        const combosWithInfo = await Promise.all(
          combosData.map(async (combo) => {
            const { count: itemCount } = await supabase
              .from('combo_items')
              .select('*', { count: 'exact', head: true })
              .eq('combo_id', combo.id)

            const { data: stockData } = await supabase
              .from('combo_stock')
              .select('quantity')
              .eq('combo_id', combo.id)
              .single()

            return {
              ...combo,
              item_count: itemCount || 0,
              stock: stockData?.quantity || 0
            }
          })
        )
        setCombos(combosWithInfo)
      }
    } catch (error) {
      console.error('Error cargando combos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCombos()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('combos')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      setDeleteConfirm(null)
      loadCombos()
    } catch (error) {
      console.error('Error eliminando combo:', error)
      alert('Error al eliminar el combo')
    }
  }

  const filteredCombos = combos.filter(c => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = c.name.toLowerCase().includes(searchLower) ||
      c.categories?.name?.toLowerCase().includes(searchLower)
    const matchesCategory = filterCategory ? c.category_id === filterCategory : true
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Combos / Recetas</h1>
          <p className="text-sm text-gray-500">Gestiona las recetas de combos del inventario</p>
        </div>
        <button
          onClick={() => router.push('/combos/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#001396' }}
        >
          <Plus size={18} />
          Nueva Receta
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(Number(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="">Todas</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadCombos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Cargando combos...</p>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Layers size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay recetas de combos</p>
          <p className="text-sm text-gray-400 mt-1">Crea una nueva receta para comenzar</p>
          <button
            onClick={() => router.push('/combos/new')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#001396' }}
          >
            <Plus size={18} />
            Nueva Receta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCombos.map((combo) => (
            <div
              key={combo.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Package size={20} className="text-[#001396]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{combo.name}</h3>
                    <span className="text-xs text-gray-400">
                      {combo.categories?.name || 'Sin categoría'}
                    </span>
                  </div>
                </div>
                {combo.is_active ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
              </div>

              {combo.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{combo.description}</p>
              )}

              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <span>{combo.item_count} productos</span>
                <span>Stock: {combo.stock}</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => router.push(`/combos/${combo.id}/produce`)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-white text-sm transition-colors"
                  style={{ backgroundColor: '#10b981' }}
                  disabled={!combo.is_active}
                >
                  Generar
                </button>
                <button
                  onClick={() => router.push(`/combos/${combo.id}`)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
                {deleteConfirm === combo.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(combo.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Confirmar"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                      title="Cancelar"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(combo.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Desactivar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}