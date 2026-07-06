'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, X, Plus, Trash2, Package, Search } from 'lucide-react'

interface Product {
  id: number
  name: string
  categories?: { name: string }
  units?: { name: string }
  presentaciones?: Presentacion[]
}

interface Presentacion {
  id: number
  name: string
  variants?: Variant[]
}

interface Variant {
  id: number
  name: string
  sku: string
}

interface ComboItem {
  id: string
  variant_id: number
  display_name: string
  unit_name: string
  quantity_per_combo: number
}

interface ProductOption {
  variant_id: number
  display_name: string
  stock: number
  unit: string
}

export default function NewComboPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [items, setItems] = useState<ComboItem[]>([])
  const [saving, setSaving] = useState(false)
  
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      setCategories(categoriesData || [])

      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name), units(name), presentaciones(*, variants(*))')
        .order('name')
      setProducts(productsData || [])

      const { data: entriesData } = await supabase
        .from('stock_entries')
        .select('*')
      setEntries(entriesData || [])
    }
    loadData()
  }, [supabase])

  const calculateStock = (variantId: number): number => {
    return entries
      .filter((e: any) => e.variant_id === variantId)
      .reduce((sum: number, e: any) => sum + e.quantity, 0)
  }

  const getProductOptions = (): ProductOption[] => {
    const selectedIds = items.map(i => i.variant_id)
    const options: ProductOption[] = []
    for (const product of products) {
      const presentaciones = product.presentaciones || []
      for (const presentacion of presentaciones) {
        const variants = presentacion.variants || []
        for (const variant of variants) {
          if (selectedIds.includes(variant.id)) continue
          const stock = calculateStock(variant.id)
          options.push({
            variant_id: variant.id,
            display_name: `${product.name}${presentacion.name ? ' - ' + presentacion.name : ''}${variant.name ? ' (' + variant.name + ')' : ''}`,
            stock,
            unit: product.units?.name || ''
          })
        }
      }
    }
    return options
  }

  const allOptions = getProductOptions()
  const filteredOptions = allOptions.filter(opt =>
    opt.display_name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addItem = (option: ProductOption) => {
    setItems([...items, {
      id: Date.now().toString(),
      variant_id: option.variant_id,
      display_name: option.display_name,
      unit_name: option.unit,
      quantity_per_combo: 1
    }])
    setShowProductDropdown(false)
    setProductSearch('')
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateQuantity = (index: number, qty: number) => {
    const newItems = [...items]
    newItems[index].quantity_per_combo = qty
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { alert('El nombre del combo es obligatorio'); return }
    if (!categoryId) { alert('Selecciona una categoría'); return }
    if (items.length === 0) { alert('Agrega al menos un producto al combo'); return }

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')

      const { data: combo, error: comboError } = await supabase
        .from('combos')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          created_by: userData.user.id
        })
        .select()
        .single()

      if (comboError) throw comboError

      for (const item of items) {
        const { error: itemError } = await supabase
          .from('combo_items')
          .insert({
            combo_id: combo.id,
            variant_id: item.variant_id,
            quantity_per_combo: item.quantity_per_combo
          })
        if (itemError) throw itemError
      }

      router.push('/combos')
    } catch (error: any) {
      console.error('Error guardando combo:', error)
      alert('Error al guardar el combo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Nueva Receta de Combo</h1>
        <p className="text-sm text-gray-500">Define los productos y cantidades que componen el combo</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Información del Combo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Combo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Comida Familiar, Kit de Higiene, Botiquín Básico"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente el contenido del combo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              >
                <option value="">Seleccionar</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos del Combo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Agrega los productos que forman parte de este combo y la cantidad de cada uno por combo
          </p>

          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={productSearch}
              onFocus={() => setShowProductDropdown(true)}
              onChange={(e) => {
                setProductSearch(e.target.value)
                setShowProductDropdown(true)
              }}
              placeholder="Buscar y agregar producto al combo..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            />
            {showProductDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                      onClick={() => addItem(opt)}
                    >
                      <span className="text-sm">{opt.display_name}</span>
                      <span className="text-xs text-gray-400">Stock: {opt.stock} {opt.unit}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    {productSearch ? 'No se encontraron productos' : 'Escribe para buscar productos'}
                  </div>
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={40} className="mx-auto mb-2" />
              <p className="text-sm">Agrega productos al combo usando el buscador de arriba</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.display_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Cant. por combo:</label>
                    <input
                      type="number"
                      value={item.quantity_per_combo}
                      onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#001396]"
                      min="0.01"
                      step="0.01"
                    />
                    <span className="text-xs text-gray-400 w-8">{item.unit_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/combos')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#001396' }}
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Receta'}
          </button>
        </div>
      </form>
    </div>
  )
}