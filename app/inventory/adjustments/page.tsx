'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, RefreshCw, Package, X, Save } from 'lucide-react'

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
  product_id: number
  variants?: Variant[]
}

interface Variant {
  id: number
  name: string
  sku: string
  presentacion_id: number
}

interface Adjustment {
  id: number
  product_id: number
  variant_id: number
  previous_stock: number
  new_stock: number
  adjustment_type: string
  reason: string
  created_at: string
  created_by: string
}

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  
  const [productId, setProductId] = useState<number | ''>('')
  const [presentacionId, setPresentacionId] = useState<number | ''>('')
  const [variantId, setVariantId] = useState<number | ''>('')
  const [adjustmentType, setAdjustmentType] = useState('')
  const [reason, setReason] = useState('')
  const [newStock, setNewStock] = useState('')
  const [currentStock, setCurrentStock] = useState(0)
  
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar ajustes
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from('inventory_adjustments')
        .select('*')
        .order('created_at', { ascending: false })

      if (adjustmentsError) {
        if (adjustmentsError.message.includes('relation') && adjustmentsError.message.includes('does not exist')) {
          setAdjustments([])
          setLoading(false)
          return
        }
        throw adjustmentsError
      }
      setAdjustments(adjustmentsData || [])

      // Cargar productos con sus presentaciones y variantes
      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name), units(name), presentaciones(*, variants(*))')
        .order('name')
      setProducts(productsData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cargar presentaciones cuando se selecciona un producto
  useEffect(() => {
    if (productId) {
      const loadPresentaciones = async () => {
        const { data } = await supabase
          .from('presentaciones')
          .select('*, variants(*)')
          .eq('product_id', productId)
          .order('name')
        setPresentaciones(data || [])
        setPresentacionId('')
        setVariantId('')
      }
      loadPresentaciones()
    } else {
      setPresentaciones([])
      setPresentacionId('')
      setVariantId('')
    }
  }, [productId])

  // Cargar variantes cuando se selecciona una presentación
  useEffect(() => {
    if (presentacionId) {
      const loadVariants = async () => {
        const { data } = await supabase
          .from('variants')
          .select('*')
          .eq('presentacion_id', presentacionId)
          .order('name')
        setVariants(data || [])
        setVariantId('')
      }
      loadVariants()
    } else {
      setVariants([])
      setVariantId('')
    }
  }, [presentacionId])

  const filteredProducts = products.filter(p => {
    const searchLower = productSearchTerm.toLowerCase()
    return p.name.toLowerCase().includes(searchLower) ||
           p.categories?.name?.toLowerCase().includes(searchLower)
  })

  const handleProductSelect = (product: Product) => {
    setProductId(product.id)
    setProductSearchTerm(product.name)
    setShowProductDropdown(false)
    setPresentacionId('')
    setVariantId('')
    setCurrentStock(0)
    setNewStock('')
  }

  const handlePresentacionSelect = (presentacionId: number) => {
    setPresentacionId(presentacionId)
    setVariantId('')
    setCurrentStock(0)
    setNewStock('')
  }

  const handleVariantSelect = async (variantId: number) => {
    setVariantId(variantId)
    // Calcular stock actual
    const { data: entriesData } = await supabase
      .from('stock_entries')
      .select('quantity')
      .eq('variant_id', variantId)
    
    const total = entriesData?.reduce((sum, e) => sum + e.quantity, 0) || 0
    setCurrentStock(total)
    setNewStock(total.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const newStockValue = parseInt(newStock)
      if (isNaN(newStockValue) || newStockValue < 0) {
        alert('Ingresa un valor válido para el stock')
        return
      }

      const adjustmentData = {
        product_id: productId,
        variant_id: variantId,
        previous_stock: currentStock,
        new_stock: newStockValue,
        adjustment_type: adjustmentType || (newStockValue > currentStock ? 'increase' : 'decrease'),
        reason: reason.trim() || 'Ajuste manual',
        created_by: userData.user.id
      }

      const { error } = await supabase
        .from('inventory_adjustments')
        .insert(adjustmentData)

      if (error) throw error

      resetForm()
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error('Error guardando ajuste:', error)
      alert('Error al guardar el ajuste')
    }
  }

  const resetForm = () => {
    setProductId('')
    setProductSearchTerm('')
    setPresentacionId('')
    setVariantId('')
    setAdjustmentType('')
    setReason('')
    setNewStock('')
    setCurrentStock(0)
    setPresentaciones([])
    setVariants([])
  }

  const filteredAdjustments = adjustments.filter(a => {
    const searchLower = searchTerm.toLowerCase()
    // Buscar el nombre del producto
    const product = products.find(p => p.id === a.product_id)
    const productName = product?.name?.toLowerCase() || ''
    return productName.includes(searchLower) ||
           a.reason.toLowerCase().includes(searchLower)
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'increase': return 'Incremento'
      case 'decrease': return 'Decremento'
      case 'correction': return 'Corrección'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'increase': return 'bg-green-100 text-green-700'
      case 'decrease': return 'bg-red-100 text-red-700'
      case 'correction': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId)
    return product?.name || 'Producto eliminado'
  }

  const getVariantName = (variantId: number) => {
    for (const p of products) {
      for (const pr of (p.presentaciones || [])) {
        const found = pr.variants?.find(v => v.id === variantId)
        if (found) return found.name
      }
    }
    return '-'
  }

  const selectedProduct = products.find(p => p.id === productId)
  const selectedPresentacion = presentaciones.find(p => p.id === presentacionId)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Ajustes de Inventario</h1>
          <p className="text-sm text-gray-500">Corrige o ajusta el stock de productos (Solo Administradores)</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#001396' }}
        >
          <Plus size={18} />
          Nuevo Ajuste
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ajustes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
          />
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Nuevo Ajuste de Inventario</h2>
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
                  Producto *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value)
                      setShowProductDropdown(true)
                      setProductId('')
                      setPresentacionId('')
                      setVariantId('')
                      setPresentaciones([])
                      setVariants([])
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                    placeholder="Buscar producto..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                    required
                  />
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                          onClick={() => handleProductSelect(p)}
                        >
                          {p.name} {p.categories?.name ? '- ' + p.categories.name : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presentación *
                </label>
                <select
                  value={presentacionId}
                  onChange={(e) => handlePresentacionSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  disabled={!productId}
                  required
                >
                  <option value="">Seleccionar presentación</option>
                  {presentaciones.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variante *
                </label>
                <select
                  value={variantId}
                  onChange={(e) => handleVariantSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  disabled={!presentacionId}
                  required
                >
                  <option value="">Seleccionar variante</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {selectedProduct && selectedPresentacion && (
                <div className="col-span-2 bg-gray-50 p-3 rounded-lg flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Producto:</span>
                    <span className="font-medium ml-1">{selectedProduct.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Presentación:</span>
                    <span className="font-medium ml-1">{selectedPresentacion.name}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  value={currentStock}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Stock *
                </label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Nueva cantidad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ajuste
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                >
                  <option value="">Autodetectado</option>
                  <option value="increase">Incremento</option>
                  <option value="decrease">Decremento</option>
                  <option value="correction">Corrección</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del Ajuste *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Merma, Sobrante, Corrección de inventario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  required
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
                <Save size={18} className="inline mr-2" />
                Guardar Ajuste
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando ajustes...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay ajustes de inventario registrados</p>
            <p className="text-sm text-gray-400">Haz clic en "Nuevo Ajuste" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Variante</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Anterior</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Nuevo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(adj.created_at).toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                      {getProductName(adj.product_id)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getVariantName(adj.variant_id)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{adj.previous_stock}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-800">{adj.new_stock}</td>
                    <td className="py-3 px-4">
                      <span className={"px-2 py-1 rounded-full text-xs font-medium " + getTypeColor(adj.adjustment_type)}>
                        {getTypeLabel(adj.adjustment_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{adj.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

