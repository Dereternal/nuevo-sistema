'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  FileText, 
  Download, 
  Search,
  RefreshCw,
  Shield
} from 'lucide-react'

interface ReportData {
  id: number
  product_name: string
  variant_name: string
  presentacion_name: string
  category_name: string
  subcategory_name: string
  total_entries: number
  total_exits: number
  current_stock: number
  unit_name: string
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [reportType, setReportType] = useState('stock')
  const [userRole, setUserRole] = useState<string>('')
  const [hasPermission, setHasPermission] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkPermission = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        const role = profile?.role || ''
        setUserRole(role)
        // Solo Admin y Supervisor pueden ver reportes
        if (role === 'admin' || role === 'supervisor') {
          setHasPermission(true)
          loadCategories()
          loadReport()
        }
      }
    }
    checkPermission()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
    setCategories(data || [])
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name), units(name), presentaciones(*, variants(*))')
        .order('name')

      if (productsError) throw productsError

      const { data: entries, error: entriesError } = await supabase
        .from('stock_entries')
        .select('variant_id, quantity, created_at, product_id')

      if (entriesError) throw entriesError

      const { data: exits, error: exitsError } = await supabase
        .from('stock_exits')
        .select('id, total_items, created_at')

      if (exitsError) throw exitsError

      const reportData: ReportData[] = []

      for (const product of products || []) {
        const presentaciones = product.presentaciones || []
        for (const presentacion of presentaciones) {
          const variants = presentacion.variants || []
          for (const variant of variants) {
            const variantEntries = entries?.filter(e => e.variant_id === variant.id) || []
            const totalEntries = variantEntries.reduce((sum, e) => sum + e.quantity, 0)
            const totalExits = exits?.reduce((sum, e) => sum + e.total_items, 0) || 0
            const currentStock = totalEntries - totalExits

            reportData.push({
              id: variant.id,
              product_name: product.name,
              variant_name: variant.name,
              presentacion_name: presentacion.name,
              category_name: product.categories?.name || 'Sin categoría',
              subcategory_name: product.subcategories?.name || 'Sin subcategoría',
              total_entries: totalEntries,
              total_exits: totalExits,
              current_stock: Math.max(0, currentStock),
              unit_name: product.units?.name || 'Unidad'
            })
          }
        }
      }

      setReportData(reportData)
    } catch (error) {
      console.error('Error cargando reporte:', error)
      alert('Error al cargar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = reportData.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory ? item.category_name === filterCategory : true
    
    return matchesSearch && matchesCategory
  })

  const sortedData = [...filteredData].sort((a, b) => a.current_stock - b.current_stock)

  const displayedData = sortedData.filter(item => {
    if (reportType === 'stock') return true
    if (reportType === 'entries') return item.total_entries > 0
    if (reportType === 'exits') return item.total_exits > 0
    return true
  })

  const exportToCSV = () => {
    const headers = ['Producto', 'Variante', 'Presentación', 'Categoría', 'Subcategoría', 'Ingresos', 'Egresos', 'Stock', 'Unidad']
    const rows = displayedData.map(item => [
      item.product_name,
      item.variant_name,
      item.presentacion_name,
      item.category_name,
      item.subcategory_name,
      item.total_entries,
      item.total_exits,
      item.current_stock,
      item.unit_name
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = eporte__.csv
    link.click()
  }

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'text-red-600 font-bold'
    if (stock < 5) return 'text-yellow-600 font-semibold'
    return 'text-green-600'
  }

  const getCategoryCount = () => {
    const counts: Record<string, number> = {}
    displayedData.forEach(item => {
      counts[item.category_name] = (counts[item.category_name] || 0) + 1
    })
    return Object.keys(counts).length
  }

  const getTotalStock = () => {
    return displayedData.reduce((sum, item) => sum + item.current_stock, 0)
  }

  // Si no tiene permiso, mostrar mensaje
  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield size={64} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Acceso Restringido</h2>
        <p className="text-gray-500 mt-2">Los reportes solo están disponibles para Administradores y Supervisores.</p>
        <p className="text-sm text-gray-400 mt-1">Tu rol actual: {userRole || 'Sin rol'}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-500">Análisis de inventario y movimientos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Reporte
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="stock">Stock Actual</option>
              <option value="entries">Ingresos</option>
              <option value="exits">Egresos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Producto, variante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="">Todas</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterCategory('')
                setReportType('stock')
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Productos</p>
          <p className="text-2xl font-bold text-gray-800">{displayedData.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Categorías</p>
          <p className="text-2xl font-bold text-gray-800">{getCategoryCount()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Stock Total</p>
          <p className="text-2xl font-bold text-gray-800">{getTotalStock()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Stock Bajo (&lt;5)</p>
          <p className="text-2xl font-bold text-red-600">
            {displayedData.filter(item => item.current_stock < 5 && item.current_stock > 0).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando reporte...</p>
          </div>
        ) : displayedData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay datos para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Variante</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  {reportType !== 'stock' && (
                    <>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Egresos</th>
                    </>
                  )}
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.product_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.variant_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.presentacion_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.category_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.unit_name}</td>
                    {reportType !== 'stock' && (
                      <>
                        <td className="py-3 px-4 text-sm text-blue-600">{item.total_entries}</td>
                        <td className="py-3 px-4 text-sm text-red-600">{item.total_exits}</td>
                      </>
                    )}
                    <td className="py-3 px-4 text-sm">
                      <span className={getStockColor(item.current_stock)}>
                        {item.current_stock}
                      </span>
                    </td>
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

