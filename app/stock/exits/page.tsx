'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Printer, X } from 'lucide-react'

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

interface StockEntry {
  id: number
  product_id: number
  presentacion_id: number
  variant_id: number
  quantity: number
}

interface ExitItem {
  id: string
  product_id: number
  presentacion_id: number
  variant_id: number
  display_name: string
  presentacion_name: string
  quantity: number
  max_stock: number
}

interface ProductOption {
  product_id: number
  presentacion_id: number
  variant_id: number
  display_name: string
  presentacion_name: string
  stock: number
}

interface UserProfile {
  full_name: string
  email: string
  cedula: string
  phone: string
}

export default function ExitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  
  const [exitDate, setExitDate] = useState('')
  const [receptorName, setReceptorName] = useState('')
  const [institution, setInstitution] = useState('')
  const [destination, setDestination] = useState('')
  const [delivererName, setDelivererName] = useState('')
  
  const [items, setItems] = useState<ExitItem[]>([
    { id: '1', product_id: 0, presentacion_id: 0, variant_id: 0, display_name: '', presentacion_name: '', quantity: 0, max_stock: 0 }
  ])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar perfil del usuario
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, email, cedula, phone')
          .eq('id', userData.user.id)
          .single()
        
        if (profile) {
          setUserProfile(profile)
          setDelivererName(profile.full_name)
        }
      }

      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name), units(name), presentaciones(*, variants(*))')
        .order('name')
      setProducts(productsData || [])

      const { data: entriesData } = await supabase
        .from('stock_entries')
        .select('*')
      setEntries(entriesData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const today = new Date().toISOString().split('T')[0]
    setExitDate(today)
  }, [])

  const calculateStock = (variantId: number): number => {
    const totalEntries = entries
      .filter(e => e.variant_id === variantId)
      .reduce((sum, e) => sum + e.quantity, 0)
    return totalEntries
  }

  const getSelectedVariantIds = (): number[] => {
    return items
      .filter(item => item.variant_id > 0)
      .map(item => item.variant_id)
  }

  const getProductOptions = (): ProductOption[] => {
    const selectedIds = getSelectedVariantIds()
    const options: ProductOption[] = []
    for (const product of products) {
      const presentaciones = product.presentaciones || []
      for (const presentacion of presentaciones) {
        const variants = presentacion.variants || []
        for (const variant of variants) {
          if (selectedIds.includes(variant.id)) continue
          const stock = calculateStock(variant.id)
          const displayName = product.name + 
            (presentacion.name ? ' - ' + presentacion.name : '') +
            (variant.name ? ' (' + variant.name + ')' : '')
          options.push({
            product_id: product.id,
            presentacion_id: presentacion.id,
            variant_id: variant.id,
            display_name: displayName,
            presentacion_name: presentacion.name,
            stock: stock
          })
        }
      }
    }
    return options
  }

  const allOptions = getProductOptions()

  const filteredOptions = allOptions.filter(opt => {
    const searchLower = productSearch.toLowerCase()
    return opt.display_name.toLowerCase().includes(searchLower)
  })

  const addItem = () => {
    const newId = (items.length + 1).toString()
    setItems([...items, { 
      id: newId, 
      product_id: 0, 
      presentacion_id: 0,
      variant_id: 0, 
      display_name: '', 
      presentacion_name: '',
      quantity: 0,
      max_stock: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const selectOption = (option: ProductOption, index: number) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      product_id: option.product_id,
      presentacion_id: option.presentacion_id,
      variant_id: option.variant_id,
      display_name: option.display_name,
      presentacion_name: option.presentacion_name,
      max_stock: option.stock,
      quantity: 0
    }
    setItems(newItems)
    setShowProductDropdown(false)
    setSelectedItemIndex(null)
    setProductSearch('')
  }

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...items]
    const maxStock = newItems[index].max_stock
    newItems[index].quantity = Math.min(quantity, maxStock)
    setItems(newItems)
  }

  const generateControlNumber = async (): Promise<string> => {
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    const { data } = await supabase
      .from('stock_exits')
      .select('control_number')
      .like('control_number', year + month + day + '%')
      .order('control_number', { ascending: false })
      .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].control_number.slice(-4))
      sequence = lastNumber + 1
    }

    return year + month + day + String(sequence).padStart(4, '0')
  }

  const generateNoteNumber = async (): Promise<string> => {
    const { data } = await supabase
      .from('stock_exits')
      .select('note_number')
      .order('note_number', { ascending: false })
      .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].note_number)
      sequence = lastNumber + 1
    }

    return String(sequence).padStart(6, '0')
  }

  const handleGeneratePreview = async () => {
    if (!receptorName || !institution || !destination) {
      alert('Por favor completa todos los campos del encabezado')
      return
    }
    if (!delivererName) {
      alert('No se pudo obtener el nombre del usuario. Por favor, verifica tu perfil.')
      return
    }
    const validItems = items.filter(item => item.product_id > 0 && item.quantity > 0)
    if (validItems.length === 0) {
      alert('Agrega al menos un producto para generar la nota')
      return
    }

    const controlNumber = await generateControlNumber()
    const noteNumber = await generateNoteNumber()

    setPrintData({
      noteNumber,
      controlNumber,
      exitDate,
      receptorName,
      institution,
      destination,
      delivererName,
      items: validItems,
      currentDate: new Date(exitDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      currentTime: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    setShowPrintView(true)
  }

  const handlePrint = async () => {
    try {
      setSaving(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no autenticado')

      const controlNumber = await generateControlNumber()
      const noteNumber = await generateNoteNumber()
      const validItems = items.filter(item => item.product_id > 0 && item.quantity > 0)

      const { data: exitData, error: exitError } = await supabase
        .from('stock_exits')
        .insert({
          note_number: noteNumber,
          control_number: controlNumber,
          exit_date: exitDate,
          receptor_name: receptorName,
          institution: institution,
          destination: destination,
          deliverer_name: delivererName,
          total_items: validItems.length,
          created_by: userData.user.id
        })
        .select()
        .single()

      if (exitError) throw exitError

      for (const item of validItems) {
        const { error: itemError } = await supabase
          .from('stock_exit_items')
          .insert({
            stock_exit_id: exitData.id,
            product_id: item.product_id,
            presentacion_id: item.presentacion_id,
            variant_id: item.variant_id,
            quantity: item.quantity
          })
        if (itemError) throw itemError
      }

      window.print()
      setShowPrintView(false)
      
    } catch (error) {
      console.error('Error guardando egreso:', error)
      alert('Error al guardar el egreso')
    } finally {
      setSaving(false)
    }
  }

  const PrintView = () => {
    if (!printData) return null
    const { noteNumber, controlNumber, currentDate, currentTime, receptorName, institution, destination, delivererName, items } = printData

    const itemsPerPage = 20
    const totalPages = Math.ceil(items.length / itemsPerPage)

    const renderPage = (pageItems: ExitItem[], pageNumber: number) => (
      <div key={pageNumber} className="print-page" style={{ pageBreakAfter: pageNumber < totalPages ? 'always' : 'auto' }}>
        <div className="border-2 border-black p-4" style={{ minHeight: '700px' }}>
          <div className="text-center">
            <div className="flex justify-between items-start mb-2">
              <div className="text-left text-xs">
                <p><strong>Fecha:</strong> {currentDate} - {currentTime}</p>
                <p><strong>N° Control:</strong> {controlNumber}</p>
                <p><strong>N° Nota:</strong> {noteNumber}</p>
              </div>
            </div>
            
            <div className="border-t-2 border-b-2 border-black py-1 my-1">
              <h1 className="text-xl font-bold uppercase tracking-wider">Nota de Entrega</h1>
            </div>
          </div>

          <hr className="my-2 border-gray-300" />

          <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
            <div>
              <p><strong>RECEPTOR:</strong> {receptorName}</p>
            </div>
            <div>
              <p><strong>INSTITUCIÓN:</strong> {institution}</p>
            </div>
            <div className="col-span-2">
              <p><strong>DESTINO:</strong> {destination}</p>
            </div>
          </div>

          <hr className="my-2 border-gray-300" />

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="text-left py-1 px-2 text-xs font-bold">N°</th>
                <th className="text-left py-1 px-2 text-xs font-bold">CANT</th>
                <th className="text-left py-1 px-2 text-xs font-bold">PRODUCTO</th>
                <th className="text-left py-1 px-2 text-xs font-bold">PRESENTACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item: ExitItem, index: number) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-1 px-2 text-xs">{index + 1 + (pageNumber - 1) * itemsPerPage}</td>
                  <td className="py-1 px-2 text-xs font-semibold">{item.quantity}</td>
                  <td className="py-1 px-2 text-xs">{item.display_name}</td>
                  <td className="py-1 px-2 text-xs">{item.presentacion_name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="my-2 border-gray-300" />

          <div className="flex justify-between mt-4 text-xs">
            <div className="text-left">
              <p><strong>ENTREGÓ:</strong></p>
              <p className="mt-4">{delivererName}</p>
              <hr className="w-40 border-gray-400 mt-1" />
            </div>
            <div className="text-right">
              <p><strong>RECIBE CONFORME:</strong></p>
              <p className="mt-4">Nombre y Apellido: _________________________</p>
              <p className="mt-2">Teléfono: _________________________</p>
              <p className="mt-2">Cédula: _________________________</p>
              <p className="mt-2">Firma: _________________________</p>
            </div>
          </div>

          <div className="border-t-2 border-black mt-4 pt-1 text-center text-[10px] text-gray-500">
            <p>Documento generado por el Sistema de Inventario Valencia en Contingencia</p>
            {totalPages > 1 && (
              <p className="mt-1">Página {pageNumber} de {totalPages}</p>
            )}
          </div>
        </div>
      </div>
    )

    const pages = []
    for (let i = 0; i < items.length; i += itemsPerPage) {
      const pageItems = items.slice(i, i + itemsPerPage)
      const pageNumber = Math.floor(i / itemsPerPage) + 1
      pages.push(renderPage(pageItems, pageNumber))
    }

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-semibold">Vista Previa - Nota de Entrega</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: '#001396' }}
                >
                  <Printer size={18} />
                  {saving ? 'Guardando...' : 'Imprimir y Guardar'}
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-4" id="print-content">
              {pages}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: '@media print { body * { visibility: hidden; } #print-content, #print-content * { visibility: visible; } #print-content { position: fixed; left: 0; top: 0; width: 100%; height: 100%; padding: 40px; background: white; z-index: 9999; } .fixed { display: none !important; } }'
        }} />
      </>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Egresos</h1>
          <p className="text-sm text-gray-500">Genera notas de entrega de productos</p>
        </div>
        <button
          onClick={handleGeneratePreview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#001396' }}
        >
          <Printer size={18} />
          Generar Nota de Entrega
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Entrega *
              </label>
              <input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entregó *
              </label>
              <input
                type="text"
                value={delivererName}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Nombre tomado de tu perfil de usuario</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receptor (Nombre y Apellido) *
              </label>
              <input
                type="text"
                value={receptorName}
                onChange={(e) => setReceptorName(e.target.value)}
                placeholder="Nombre del receptor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institución *
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Institución o unidad"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destino *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destino de los productos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                required
              />
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos a Entregar</h3>

          {items.map((item, index) => (
            <div key={item.id} className="flex gap-3 items-start mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 pt-2 text-sm font-medium text-gray-500">
                N° {index + 1}
              </div>
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={item.product_id > 0 ? item.display_name : ''}
                    onFocus={() => {
                      setSelectedItemIndex(index)
                      setShowProductDropdown(true)
                    }}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setSelectedItemIndex(index)
                      setShowProductDropdown(true)
                    }}
                    placeholder="Buscar producto..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  />
                  {showProductDropdown && selectedItemIndex === index && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors text-sm flex justify-between"
                          onClick={() => selectOption(opt, index)}
                        >
                          <span>{opt.display_name}</span>
                          <span className="text-gray-400 text-xs">Stock: {opt.stock}</span>
                        </div>
                      ))}
                      {filteredOptions.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          No hay productos disponibles
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                  placeholder="Cant"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                  min="0"
                  max={item.max_stock}
                />
                {item.max_stock > 0 && (
                  <span className="text-xs text-gray-400">Stock: {item.max_stock}</span>
                )}
              </div>
              <div className="w-32 pt-2 text-sm font-medium text-gray-700">
                {item.presentacion_name}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                disabled={items.length <= 1}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors mt-2"
          >
            <Plus size={18} />
            Agregar Producto
          </button>
        </form>
      </div>

      {showPrintView && <PrintView />}
    </div>
  )
}
