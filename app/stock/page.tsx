'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ChevronLeft, ChevronRight, Download, Filter, X } from 'lucide-react'

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | ''>('')
  const [searchProduct, setSearchProduct] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [stockMin, setStockMin] = useState('')
  const [stockMax, setStockMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      setCategories(categoriesData || [])

      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name), units(name), presentaciones(*, variants(*))')
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
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      const loadSubcategories = async () => {
        const { data } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', selectedCategory)
          .order('name')
        setSubcategories(data || [])
        setSelectedSubcategory('')
      }
      loadSubcategories()
    } else {
      setSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedCategory])

  const calculateStock = (variantId: number): number => {
    const totalEntries = entries
      .filter((e: any) => e.variant_id === variantId)
      .reduce((sum: number, e: any) => sum + e.quantity, 0)
    return totalEntries
  }

  const getFilteredProducts = () => {
    let filtered = products

    if (selectedCategory) {
      filtered = filtered.filter((p: any) => p.category_id === selectedCategory)
    }

    if (selectedSubcategory) {
      filtered = filtered.filter((p: any) => p.subcategory_id === selectedSubcategory)
    }

    if (searchProduct.trim()) {
      const searchLower = searchProduct.toLowerCase()
      filtered = filtered.filter((p: any) => 
        p.name.toLowerCase().includes(searchLower) ||
        p.categories?.name?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }

  const getStockItems = () => {
    const items: any[] = []

    const filteredProducts = getFilteredProducts()

    for (const product of filteredProducts) {
      const presentaciones = product.presentaciones || []
      for (const presentacion of presentaciones) {
        const variants = presentacion.variants || []
        for (const variant of variants) {
          const stock = calculateStock(variant.id)
          items.push({
            category: product.categories?.name || '-',
            subcategory: product.subcategories?.name || '-',
            product: product.name,
            product_id: product.id,
            presentacion: presentacion.name,
            variant: variant.name,
            variant_id: variant.id,
            stock: stock,
            unit: product.units?.name || ''
          })
        }
      }
    }

    return items
  }

  const allItems = getStockItems()

  const filteredItems = allItems.filter((item: any) => {
    if (stockFilter === 'low') return item.stock > 0 && item.stock < 5
    if (stockFilter === 'high') return item.stock >= 10
    if (stockFilter === 'zero') return item.stock === 0
    
    if (stockMin !== '' || stockMax !== '') {
      const min = stockMin ? parseInt(stockMin) : 0
      const max = stockMax ? parseInt(stockMax) : Infinity
      return item.stock >= min && item.stock <= max
    }
    
    return true
  })

  const sortedItems = [...filteredItems].sort((a: any, b: any) => a.stock - b.stock)
  
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const exportToCSV = () => {
    const headers = ['Categoria', 'Subcategoria', 'Producto', 'Presentacion', 'Variante', 'Stock', 'Unidad']
    const rows = sortedItems.map((item: any) => [
      item.category,
      item.subcategory,
      item.product,
      item.presentacion,
      item.variant,
      item.stock,
      item.unit
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = existencias_.csv
    link.click()
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedSubcategory('')
    setSearchProduct('')
    setStockFilter('')
    setStockMin('')
    setStockMax('')
    setCurrentPage(1)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Existencias</h1>
          <p className="text-sm text-gray-500">Consulta el stock actual de productos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter size={18} />
            Filtros
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            Exportar CSV
          </button>
          <div className="text-sm text-gray-500 flex items-center">
            Total: {sortedItems.length} variantes
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(Number(e.target.value) || '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              >
                <option value="">Todas</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(Number(e.target.value) || '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                disabled={!selectedCategory}
              >
                <option value="">Todas</option>
                {subcategories.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Nombre del producto..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtro de Stock</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              >
                <option value="">Todos</option>
                <option value="zero">Stock 0</option>
                <option value="low">Stock Bajo (&lt; 5)</option>
                <option value="high">Stock Alto (&gt;= 10)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Minimo</label>
              <input
                type="number"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Maximo</label>
              <input
                type="number"
                value={stockMax}
                onChange={(e) => setStockMax(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
                min="0"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X size={18} />
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Total Variantes</p>
          <p className="text-xl font-bold text-gray-800">{sortedItems.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Con Stock</p>
          <p className="text-xl font-bold text-green-600">{sortedItems.filter((i: any) => i.stock > 0).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Sin Stock</p>
          <p className="text-xl font-bold text-red-600">{sortedItems.filter((i: any) => i.stock === 0).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Stock Bajo (&lt;5)</p>
          <p className="text-xl font-bold text-yellow-600">{sortedItems.filter((i: any) => i.stock > 0 && i.stock < 5).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando existencias...</p>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No se encontraron productos con existencias</p>
            <p className="text-sm text-gray-400 mt-1">Ajusta los filtros para ver mas resultados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategoria</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Presentacion</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Variante</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600">{item.category}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.subcategory}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.product}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.presentacion}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.variant}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.unit}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        <span className={item.stock === 0 ? 'text-red-600 font-bold' : item.stock < 5 ? 'text-yellow-600 font-semibold' : 'text-gray-800'}>
                          {item.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedItems.length)} de {sortedItems.length} variantes
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

