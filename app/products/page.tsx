'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Package, Search, PlusCircle, X } from 'lucide-react'
import { AddCategoryModal } from '@/components/modals/AddCategoryModal'
import { AddSubcategoryModal } from '@/components/modals/AddSubcategoryModal'
import { AddUnitModal } from '@/components/modals/AddUnitModal'

interface Product {
  id: number
  name: string
  description: string
  observations: string
  category_id: number
  subcategory_id: number
  unit_id: number
  categories?: { name: string }
  subcategories?: { name: string }
  units?: { name: string }
}

interface Category {
  id: number
  name: string
}

interface Subcategory {
  id: number
  name: string
  category_id: number
}

interface Unit {
  id: number
  name: string
  abbreviation: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('')
  const [unitId, setUnitId] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name), units(name)')
        .order('id', { ascending: false })

      if (productsError) throw productsError
      setProducts(productsData || [])

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      setCategories(categoriesData || [])

      const { data: unitsData } = await supabase
        .from('units')
        .select('*')
        .order('name')
      setUnits(unitsData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const loadSubcategories = async () => {
      if (categoryId) {
        const { data } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', categoryId)
          .order('name')
        setSubcategories(data || [])
        if (!editingId) {
          setSubcategoryId('')
        }
      } else {
        setSubcategories([])
        setSubcategoryId('')
      }
    }
    loadSubcategories()
  }, [categoryId, editingId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        observations: observations.trim() || null,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        unit_id: unitId,
        created_by: userData.user.id
      }

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData)
        if (error) throw error
      }

      resetForm()
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error('Error guardando producto:', error)
      alert('Error al guardar el producto')
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setObservations('')
    setCategoryId('')
    setSubcategoryId('')
    setUnitId('')
    setEditingId(null)
    setSubcategories([])
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error eliminando producto:', error)
      alert('Error al eliminar el producto')
    }
  }

  const handleEdit = (product: Product) => {
    setName(product.name)
    setDescription(product.description || '')
    setObservations(product.observations || '')
    setCategoryId(product.category_id)
    setSubcategoryId(product.subcategory_id || '')
    setUnitId(product.unit_id)
    setEditingId(product.id)
    setShowForm(true)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Productos</h1>
          <p className="text-sm text-gray-500">Gestiona los productos del inventario</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#001396' }}
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
          />
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Coca-Cola, Acetaminofén"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(Number(e.target.value))
                      setSubcategoryId('')
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Agregar nueva categoría"
                  >
                    <PlusCircle size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría
                </label>
                <div className="flex gap-2">
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                    disabled={!categoryId}
                  >
                    <option value="">Seleccionar</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryModal(true)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Agregar nueva subcategoría"
                  >
                    <PlusCircle size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida *
                </label>
                <div className="flex gap-2">
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowUnitModal(true)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Agregar nueva unidad de medida"
                  >
                    <PlusCircle size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción detallada del producto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Información adicional del producto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#001396' }}
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay productos registrados</p>
            <p className="text-sm text-gray-400">Haz clic en "Nuevo Producto" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategoría</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">{product.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{product.categories?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{product.subcategories?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{product.units?.name || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
          </div>
        )}
      </div>

      {showCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={() => {
            loadData()
            setShowCategoryModal(false)
          }}
        />
      )}

      {showSubcategoryModal && (
        <AddSubcategoryModal
          onClose={() => setShowSubcategoryModal(false)}
          onSuccess={() => {
            loadData()
            setShowCategoryModal(false)
          }}
        />
      )}

      {showUnitModal && (
        <AddUnitModal
          onClose={() => setShowUnitModal(false)}
          onSuccess={() => {
            loadData()
            setShowUnitModal(false)
          }}
        />
      )}
    </div>
  )
}

