'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ArrowUpCircle, Search, PlusCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Product {
  id: number
  name: string
  description: string
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

interface StockEntry {
  id: number
  product_id: number
  presentacion_id: number
  variant_id: number
  quantity: number
  entry_date: string
  created_at: string
  created_by: string
}

export default function EntriesPage() {
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<Record<string, { full_name: string; email: string }>>({})
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
  const [quantity, setQuantity] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [showNewPresentacion, setShowNewPresentacion] = useState(false)
  const [newPresentacionName, setNewPresentacionName] = useState('')
  
  const [showNewVariant, setShowNewVariant] = useState(false)
  const [newVariantName, setNewVariantName] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar ingresos
      const { data: entriesData, error: entriesError } = await supabase
        .from('stock_entries')
        .select('*')
        .order('entry_date', { ascending: false })

      if (entriesError) throw entriesError
      setEntries(entriesData || [])

      // Cargar productos
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, categories(name), units(name), presentaciones(id, name, variants(id, name, sku))')
        .order('name')
      setProducts(productsData || [])

      // Cargar perfiles de usuarios para obtener nombres
      const userIds = entriesData?.map(e => e.created_by).filter(Boolean) || []
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        
        const userMap: Record<string, { full_name: string; email: string }> = {}
        profilesData?.forEach(p => {
          userMap[p.id] = { full_name: p.full_name, email: p.email }
        })
        setUsers(userMap)
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const today = new Date().toISOString().split('T')[0]
    setEntryDate(today)
  }, [])

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
        setShowNewPresentacion(false)
        setShowNewVariant(false)
      }
      loadPresentaciones()
    } else {
      setPresentaciones([])
      setPresentacionId('')
      setVariantId('')
    }
  }, [productId])

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
        setShowNewVariant(false)
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
    setShowNewPresentacion(false)
    setShowNewVariant(false)
    setNewPresentacionName('')
    setNewVariantName('')
  }

  const handleCreatePresentacion = async () => {
    if (!productId || !newPresentacionName.trim()) {
      alert('Selecciona un producto y escribe un nombre para la presentación')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const { data: newPresentacion, error } = await supabase
        .from('presentaciones')
        .insert({
          product_id: productId,
          name: newPresentacionName.trim(),
          created_by: userData.user.id
        })
        .select()
        .single()

      if (error) throw error

      setPresentaciones([...presentaciones, { ...newPresentacion, variants: [] }])
      setPresentacionId(newPresentacion.id)
      setShowNewPresentacion(false)
      setNewPresentacionName('')
      
      loadData()
    } catch (error) {
      console.error('Error creando presentación:', error)
      alert('Error al crear la presentación')
    }
  }

  const handleCreateVariant = async () => {
    if (!presentacionId || !newVariantName.trim()) {
      alert('Selecciona una presentación y escribe un nombre para la variante')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const { data: newVariant, error } = await supabase
        .from('variants')
        .insert({
          presentacion_id: presentacionId,
          name: newVariantName.trim(),
          created_by: userData.user.id
        })
        .select()
        .single()

      if (error) throw error

      setVariants([...variants, newVariant])
      setVariantId(newVariant.id)
      setShowNewVariant(false)
      setNewVariantName('')
      
      loadData()
    } catch (error) {
      console.error('Error creando variante:', error)
      alert('Error al crear la variante')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const entryData = {
        product_id: productId,
        presentacion_id: presentacionId,
        variant_id: variantId,
        quantity: parseInt(quantity),
        entry_date: entryDate || new Date().toISOString(),
        created_by: userData.user.id
      }

      if (editingId) {
        const { error } = await supabase
          .from('stock_entries')
          .update(entryData)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('stock_entries')
          .insert(entryData)
        if (error) throw error
      }

      resetForm()
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error('Error guardando ingreso:', error)
      alert('Error al guardar el ingreso')
    }
  }

  const resetForm = () => {
    setProductId('')
    setProductSearchTerm('')
    setPresentacionId('')
    setVariantId('')
    setQuantity('')
    setEntryDate(new Date().toISOString().split('T')[0])
    setEditingId(null)
    setShowProductDropdown(false)
    setShowNewPresentacion(false)
    setShowNewVariant(false)
    setNewPresentacionName('')
    setNewVariantName('')
    setPresentaciones([])
    setVariants([])
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ingreso?')) return

    try {
      const { error } = await supabase
        .from('stock_entries')
        .delete()
        .eq('id', id)
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error eliminando ingreso:', error)
      alert('Error al eliminar el ingreso')
    }
  }

  const handleEdit = (entry: StockEntry) => {
    const product = products.find(p => p.id === entry.product_id)
    if (product) {
      setProductSearchTerm(product.name)
    }
    setProductId(entry.product_id)
    setPresentacionId(entry.presentacion_id)
    setVariantId(entry.variant_id)
    setQuantity(entry.quantity.toString())
    setEntryDate(entry.entry_date.split('T')[0])
    setEditingId(entry.id)
    setShowForm(true)
  }

  // Obtener nombre del producto por ID
  const getProductName = (id: number) => {
    const product = products.find(p => p.id === id)
    return product?.name || 'Producto eliminado'
  }

  // Obtener nombre de la presentación por ID
  const getPresentacionName = (id: number) => {
    for (const p of products) {
      const found = p.presentaciones?.find(pr => pr.id === id)
      if (found) return found.name
    }
    return '-'
  }

  // Obtener nombre de la variante por ID
  const getVariantName = (id: number) => {
    for (const p of products) {
      for (const pr of (p.presentaciones || [])) {
        const found = pr.variants?.find(v => v.id === id)
        if (found) return found.name
      }
    }
    return '-'
  }

  // Obtener usuario por ID
  const getUserName = (id: string) => {
    const user = users[id]
    return user || null
  }

  const filteredEntries = entries.filter(e => {
    const searchLower = searchTerm.toLowerCase()
    const productName = getProductName(e.product_id).toLowerCase()
    const presentacionName = getPresentacionName(e.presentacion_id).toLowerCase()
    const variantName = getVariantName(e.variant_id).toLowerCase()
    const user = getUserName(e.created_by)
    const userName = user?.full_name?.toLowerCase() || ''
    return productName.includes(searchLower) ||
           presentacionName.includes(searchLower) ||
           variantName.includes(searchLower) ||
           userName.includes(searchLower)
  })

  const selectedProduct = products.find(p => p.id === productId)
  const selectedPresentacion = presentaciones.find(p => p.id === presentacionId)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Ingresos</h1>
          <p className="text-sm text-gray-500">Registra las entradas de productos al inventario</p>
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
          Nuevo Ingreso
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ingresos por producto, presentación, variante o usuario..."
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
              {editingId ? 'Editar Ingreso' : 'Nuevo Ingreso'}
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
                  Producto *
                </label>
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
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
                      placeholder="Escribe para buscar un producto..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                      required
                    />
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                            onClick={() => handleProductSelect(p)}
                          >
                            <span className="font-medium">{p.name}</span>
                            {p.categories?.name && (
                              <span className="text-gray-400 text-xs ml-1">- {p.categories.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {showProductDropdown && filteredProducts.length === 0 && productSearchTerm.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                        <p className="text-sm text-gray-500">No se encontraron productos</p>
                        <button
                          type="button"
                          onClick={() => router.push('/products')}
                          className="mt-2 text-sm font-medium transition-colors"
                          style={{ color: '#001396' }}
                        >
                          Crear nuevo producto +
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/products')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                    title="Ir a productos para crear uno nuevo"
                    style={{ color: '#001396' }}
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presentación *
                </label>
                
                {productId ? (
                  <>
                    <div className="flex gap-2">
                      <select
                        value={presentacionId}
                        onChange={(e) => {
                          setPresentacionId(Number(e.target.value))
                          setVariantId('')
                          setVariants([])
                          setShowNewVariant(false)
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                        required
                      >
                        <option value="">Seleccionar presentación</option>
                        {presentaciones.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewPresentacion(!showNewPresentacion)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Crear nueva presentación"
                        style={{ color: '#001396' }}
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>

                    {showNewPresentacion && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newPresentacionName}
                          onChange={(e) => setNewPresentacionName(e.target.value)}
                          placeholder="Nombre de la nueva presentación (ej: Botella, Lata)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                        />
                        <button
                          type="button"
                          onClick={handleCreatePresentacion}
                          className="px-4 py-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: '#001396' }}
                        >
                          Crear
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewPresentacion(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Selecciona una presentación existente o crea una nueva con el botón +
                    </p>
                  </>
                ) : (
                  <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    Selecciona un producto primero
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variante *
                </label>
                
                {presentacionId ? (
                  <>
                    <div className="flex gap-2">
                      <select
                        value={variantId}
                        onChange={(e) => setVariantId(Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                        required
                      >
                        <option value="">Seleccionar variante</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewVariant(!showNewVariant)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Crear nueva variante"
                        style={{ color: '#001396' }}
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>

                    {showNewVariant && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newVariantName}
                          onChange={(e) => setNewVariantName(e.target.value)}
                          placeholder="Nombre de la nueva variante (ej: 1 L, 500 mg)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                        />
                        <button
                          type="button"
                          onClick={handleCreateVariant}
                          className="px-4 py-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: '#001396' }}
                        >
                          Crear
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewVariant(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Selecciona una variante existente o crea una nueva con el botón +
                    </p>
                  </>
                ) : (
                  <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    Selecciona una presentación primero
                  </div>
                )}
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
                  {selectedProduct.categories?.name && (
                    <div>
                      <span className="text-gray-500">Categoría:</span>
                      <span className="font-medium ml-1">{selectedProduct.categories.name}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ej: 10, 20, 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
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
            <p className="mt-2 text-gray-500">Cargando ingresos...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowUpCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay ingresos registrados</p>
            <p className="text-sm text-gray-400">Haz clic en "Nuevo Ingreso" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Variante</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado por</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const user = users[entry.created_by]
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600">{entry.id}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">
                        {getProductName(entry.product_id)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {getPresentacionName(entry.presentacion_id)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {getVariantName(entry.variant_id)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{entry.quantity}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(entry.entry_date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {user ? (
                          <div>
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-gray-400 block">{user.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Usuario eliminado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

