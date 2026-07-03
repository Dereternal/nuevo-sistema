'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, FolderTree, AlertTriangle, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

interface DashboardStats {
  totalProducts: number
  totalCategories: number
  totalEntries: number
  totalExits: number
  lowStock: number
  recentActivities: any[]
  monthlyMovements: any[]
  categoryDistribution: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalEntries: 0,
    totalExits: 0,
    lowStock: 0,
    recentActivities: [],
    monthlyMovements: [],
    categoryDistribution: []
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setLastUpdate(new Date().toLocaleString('es-ES'))
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const { count: products } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: categories } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      const { count: entries } = await supabase
        .from('stock_entries')
        .select('*', { count: 'exact', head: true })

      const { count: exits } = await supabase
        .from('stock_exits')
        .select('*', { count: 'exact', head: true })

      const { data: variantsData } = await supabase
        .from('variants')
        .select('id')
      
      let lowStockCount = 0
      if (variantsData) {
        for (const v of variantsData) {
          const { data: entriesData } = await supabase
            .from('stock_entries')
            .select('quantity')
            .eq('variant_id', v.id)
          
          const total = entriesData?.reduce((sum, e) => sum + e.quantity, 0) || 0
          if (total < 5) {
            lowStockCount++
          }
        }
      }

      const { data: recentEntries } = await supabase
        .from('stock_entries')
        .select('id, quantity, created_at, product_id, variant_id')
        .order('created_at', { ascending: false })
        .limit(5)

      const productIds = recentEntries?.map(e => e.product_id).filter(Boolean) || []
      const variantIds = recentEntries?.map(e => e.variant_id).filter(Boolean) || []
      
      let productNames: Record<number, string> = {}
      let variantNames: Record<number, string> = {}
      
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds)
        productsData?.forEach(p => { productNames[p.id] = p.name })
      }
      
      if (variantIds.length > 0) {
        const { data: variantsData2 } = await supabase
          .from('variants')
          .select('id, name')
          .in('id', variantIds)
        variantsData2?.forEach(v => { variantNames[v.id] = v.name })
      }

      const recentActivities = (recentEntries || []).map(e => ({
        type: 'ingreso',
        description: 'Ingreso de ' + e.quantity + ' unidades de ' + (productNames[e.product_id] || 'producto') + 
          (variantNames[e.variant_id] ? ' (' + variantNames[e.variant_id] + ')' : ''),
        date: e.created_at
      }))

      const { data: productsWithCategories } = await supabase
        .from('products')
        .select('category_id')
        .not('category_id', 'is', null)

      let categoryMap: Record<string, number> = {}
      
      if (productsWithCategories && productsWithCategories.length > 0) {
        const categoryIds = productsWithCategories.map(p => p.category_id).filter(Boolean)
        if (categoryIds.length > 0) {
          const { data: categoriesData } = await supabase
            .from('categories')
            .select('id, name')
            .in('id', categoryIds)
          
          const categoryNameMap: Record<number, string> = {}
          categoriesData?.forEach(c => { categoryNameMap[c.id] = c.name })
          
          productsWithCategories.forEach(p => {
            const name = categoryNameMap[p.category_id] || 'Sin categoría'
            categoryMap[name] = (categoryMap[name] || 0) + 1
          })
        }
      }

      const categoryDistribution = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value
      }))

      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          month: d.toLocaleString('es-ES', { month: 'short' }),
          year: d.getFullYear(),
          entries: 0,
          exits: 0
        })
      }

      for (const m of months) {
        const idx = months.indexOf(m)
        const start = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
        const end = new Date(now.getFullYear(), now.getMonth() - (5 - idx) + 1, 1)
        
        const { count: entriesCount } = await supabase
          .from('stock_entries')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString())
        
        const { count: exitsCount } = await supabase
          .from('stock_exits')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString())
        
        m.entries = entriesCount || 0
        m.exits = exitsCount || 0
      }

      setStats({
        totalProducts: products || 0,
        totalCategories: categories || 0,
        totalEntries: entries || 0,
        totalExits: exits || 0,
        lowStock: lowStockCount,
        recentActivities,
        monthlyMovements: months,
        categoryDistribution
      })

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#001396', '#ff2813', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

  const cards = [
    { title: 'Total Productos', value: stats.totalProducts, icon: Package, color: '#001396', bg: 'bg-blue-50' },
    { title: 'Categorías', value: stats.totalCategories, icon: FolderTree, color: '#10b981', bg: 'bg-green-50' },
    { title: 'Stock Bajo', value: stats.lowStock, icon: AlertTriangle, color: '#ff2813', bg: 'bg-red-50' },
    { title: 'Ingresos Totales', value: stats.totalEntries, icon: ArrowUpCircle, color: '#8b5cf6', bg: 'bg-purple-50' },
    { title: 'Egresos Totales', value: stats.totalExits, icon: ArrowDownCircle, color: '#f59e0b', bg: 'bg-yellow-50' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          {payload.map((p: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex gap-4 justify-center mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-xs text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Última actualización: {lastUpdate}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
          <p className="ml-2 text-gray-500">Cargando estadísticas...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {cards.map((card) => (
              <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
                  </div>
                  <div className={'p-3 rounded-xl ' + card.bg} style={{ color: card.color }}>
                    <card.icon size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Movimientos Mensuales</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.monthlyMovements} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#001396" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#001396" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff2813" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ff2813" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="entries" stroke="#001396" fill="url(#colorEntries)" name="Ingresos" strokeWidth={2} />
                  <Area type="monotone" dataKey="exits" stroke="#ff2813" fill="url(#colorExits)" name="Egresos" strokeWidth={2} />
                  <Legend content={<CustomLegend />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Productos por Categoría</h3>
              {stats.categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.categoryDistribution.map((entry, index) => (
                        <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                  No hay datos de categorías
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Actividades Recientes</h3>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            {stats.recentActivities.length > 0 ? (
              <div className="space-y-1">
                {stats.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">{activity.description}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.date).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-6 text-sm">
                No hay actividades recientes
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
