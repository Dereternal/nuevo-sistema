'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Package, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

interface ComboItemData {
  id: number
  combo_id: number
  variant_id: number
  quantity_per_combo: number
  unit_id: number
}

interface VariantInfo {
  id: number
  name: string
  presentacion_id: number
  presentacion_name: string
  product_id: number
  product_name: string
}

interface ComboDetail {
  id: number
  name: string
  description: string
  category_id: number
  categories?: { name: string }
}

interface StockCheck {
  variant_id: number
  display_name: string
  required_per_combo: number
  total_required: number
  current_stock: number
  sufficient: boolean
  deficit: number
}

export default function ProduceComboPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [combo, setCombo] = useState<ComboDetail | null>(null)
  const [comboItems, setComboItems] = useState<ComboItemData[]>([])
  const [variantInfo, setVariantInfo] = useState<Map<number, VariantInfo>>(new Map())
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [stockChecks, setStockChecks] = useState<StockCheck[]>([])
  const [canProduce, setCanProduce] = useState(false)
  const [producing, setProducing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: comboData } = await supabase
          .from('combos')
          .select('*, categories(name)')
          .eq('id', params.id)
          .single()

        if (!comboData) {
          router.push('/combos')
          return
        }
        setCombo(comboData)

        const { data: itemsData } = await supabase
          .from('combo_items')
          .select('*')
          .eq('combo_id', params.id)

        const items = itemsData || []
        setComboItems(items)

        // Cargar info de variantes
        const variantIds = items.map(i => i.variant_id)
        const infoMap = new Map<number, VariantInfo>()

        if (variantIds.length > 0) {
          const { data: variantsData } = await supabase
            .from('variants')
            .select('id, name, presentacion_id')
            .in('id', variantIds)

          const presentacionIds = [...new Set(variantsData?.map(v => v.presentacion_id) || [])]

          const { data: presentacionesData } = await supabase
            .from('presentaciones')
            .select('id, name, product_id')
            .in('id', presentacionIds)

          const productIds = [...new Set(presentacionesData?.map(p => p.product_id) || [])]

          const { data: productsData } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds)

          const productMap = new Map(productsData?.map(p => [p.id, p.name]) || [])
          const presentacionMap = new Map(presentacionesData?.map(p => [p.id, { name: p.name, product_id: p.product_id }]) || [])

          for (const v of variantsData || []) {
            const pres = presentacionMap.get(v.presentacion_id)
            const prodName = pres ? productMap.get(pres.product_id) : null
            infoMap.set(v.id, {
              id: v.id,
              name: v.name,
              presentacion_id: v.presentacion_id,
              presentacion_name: pres?.name || '',
              product_id: pres?.product_id || 0,
              product_name: prodName || 'Producto'
            })
          }
        }

        setVariantInfo(infoMap)

        // Cargar entries para calcular stock
        const { data: entriesData } = await supabase
          .from('stock_entries')
          .select('variant_id, quantity')
        setEntries(entriesData || [])

      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [params.id, router, supabase])

  const calculateStock = (variantId: number): number => {
    return entries
      .filter((e: any) => e.variant_id === variantId)
      .reduce((sum: number, e: any) => sum + e.quantity, 0)
  }

  useEffect(() => {
    if (!combo || comboItems.length === 0) return

    const checks: StockCheck[] = comboItems.map((item) => {
      const info = variantInfo.get(item.variant_id)
      const productName = info?.product_name || 'Producto'
      const variantName = info?.name ? ` (${info.name})` : ''
      const presentacionName = info?.presentacion_name ? ` - ${info.presentacion_name}` : ''
      const displayName = `${productName}${presentacionName}${variantName}`

      const currentStock = calculateStock(item.variant_id)
      const totalRequired = item.quantity_per_combo * quantity
      const deficit = totalRequired - currentStock

      return {
        variant_id: item.variant_id,
        display_name: displayName,
        required_per_combo: item.quantity_per_combo,
        total_required: totalRequired,
        current_stock: currentStock,
        sufficient: currentStock >= totalRequired,
        deficit: deficit > 0 ? deficit : 0
      }
    })

    setStockChecks(checks)
    setCanProduce(checks.every(c => c.sufficient))
    setResult(null)
  }, [combo, comboItems, variantInfo, quantity, entries])

  const generateComboNumber = async (): Promise<string> => {
    const now = new Date()
    const prefix = 'CBN'
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')

    const { data } = await supabase
      .from('stock_exits')
      .select('control_number')
      .like('control_number', `${prefix}-${dateStr}%`)
      .order('control_number', { ascending: false })
      .limit(1)

    let sequence = 1
    if (data && data.length > 0) {
      const lastSeq = parseInt(data[0].control_number.split('-')[2] || '0')
      sequence = lastSeq + 1
    }

    return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`
  }

  const handleProduce = async () => {
    if (!combo || !canProduce) return

    setProducing(true)
    setResult(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')

      const comboNumber = await generateComboNumber()

      // 1. Crear egreso (type = 'conversion') por los productos debitados
      const { data: exitData, error: exitError } = await supabase
        .from('stock_exits')
        .insert({
          type: 'conversion',
          note_number: comboNumber,
          control_number: comboNumber,
          exit_date: new Date().toISOString().split('T')[0],
          receptor_name: 'Almacén',
          institution: 'Centro de Acopio',
          destination: `Conversión a Combos: ${combo.name}`,
          deliverer_name: userData.user.email,
          total_items: comboItems.length,
          created_by: userData.user.id
        })
        .select()
        .single()

      if (exitError) throw exitError

      // 2. Registrar cada producto debitado en stock_exit_items
      for (const check of stockChecks) {
        const { error: itemError } = await supabase
          .from('stock_exit_items')
          .insert({
            stock_exit_id: exitData.id,
            variant_id: check.variant_id,
            quantity: check.total_required
          })
        if (itemError) throw itemError
      }

      // 3. Registrar la producción del combo
      const { error: prodError } = await supabase
        .from('combo_productions')
        .insert({
          combo_id: combo.id,
          quantity_produced: quantity,
          stock_exit_id: exitData.id,
          created_by: userData.user.id
        })
      if (prodError) throw prodError

      // 4. Actualizar/crear el stock del combo
      const { data: existingStock } = await supabase
        .from('combo_stock')
        .select('id, quantity')
        .eq('combo_id', combo.id)
        .single()

      if (existingStock) {
        await supabase
          .from('combo_stock')
          .update({ quantity: existingStock.quantity + quantity, updated_at: new Date().toISOString() })
          .eq('id', existingStock.id)
      } else {
        await supabase
          .from('combo_stock')
          .insert({
            combo_id: combo.id,
            quantity: quantity
          })
      }

      setResult({
        success: true,
        message: `Se generaron ${quantity} combo(s) de "${combo.name}" correctamente.`
      })

    } catch (error: any) {
      console.error('Error produciendo combo:', error)
      setResult({
        success: false,
        message: 'Error al generar el combo: ' + (error.message || 'Error desconocido')
      })
    } finally {
      setProducing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
        <p className="ml-2 text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!combo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Combo no encontrado</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Generar Combos</h1>
        <p className="text-sm text-gray-500">Indica cuántos combos deseas generar</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50">
            <Package size={24} className="text-[#001396]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{combo.name}</h2>
            <p className="text-sm text-gray-500">{combo.categories?.name || 'Sin categoría'}</p>
          </div>
        </div>

        {combo.description && (
          <p className="text-sm text-gray-500 mb-4">{combo.description}</p>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad de combos a generar *
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396] text-center text-lg font-bold"
            min="1"
          />
        </div>

        <hr className="mb-4" />

        <h3 className="font-semibold text-gray-700 mb-3">Verificación de Inventario</h3>
        <p className="text-sm text-gray-500 mb-4">
          Para generar {quantity} combo(s) se requieren las siguientes cantidades de cada producto:
        </p>

        <div className="space-y-2 mb-6">
          {stockChecks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Cargando verificación...</p>
          ) : (
            stockChecks.map((check, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  check.sufficient ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {check.sufficient ? (
                    <CheckCircle size={18} className="text-green-600" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{check.display_name}</p>
                    <p className="text-xs text-gray-500">
                      Requerido: {check.total_required} | Stock actual: {check.current_stock}
                      {!check.sufficient && (
                        <span className="text-red-600 font-semibold">
                          {' '}| Déficit: {check.deficit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${check.sufficient ? 'text-green-600' : 'text-red-600'}`}>
                  {check.sufficient ? 'Suficiente' : 'Insuficiente'}
                </span>
              </div>
            ))
          )}
        </div>

        {!canProduce && quantity > 0 && stockChecks.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-red-600" />
              <p className="font-semibold text-red-700">Stock insuficiente</p>
            </div>
            <p className="text-sm text-red-600">
              No hay suficiente inventario de algunos productos para generar {quantity} combo(s).
              Ajusta la cantidad o realiza ingresos para cubrir el déficit.
            </p>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-lg mb-4 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle size={18} className="text-green-600" />
              ) : (
                <AlertTriangle size={18} className="text-red-600" />
              )}
              <p className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/combos')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleProduce}
            disabled={!canProduce || producing || quantity < 1}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#10b981' }}
          >
            {producing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Generar {quantity} Combo(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}