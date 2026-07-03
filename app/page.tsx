'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { LayoutDashboard, Package, ArrowUpCircle, ArrowDownCircle, AlertTriangle, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalEntries: 0,
    lowStock: 0,
    outOfStock: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Verificar que el usuario tiene perfil
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          router.replace('/register')
          return
        }

        // Cargar estadísticas
        const { count: totalProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })

        const { count: totalEntries } = await supabase
          .from('stock_entries')
          .select('*', { count: 'exact', head: true })

        // Productos sin stock (búsqueda básica de variantes sin entradas)
        const { data: variants } = await supabase
          .from('variants')
          .select('id')

        let outOfStock = 0
        let lowStock = 0

        if (variants) {
          for (const variant of variants) {
            const { data: entryData } = await supabase
              .from('stock_entries')
              .select('quantity')
              .eq('variant_id', variant.id)

            const total = (entryData || []).reduce((sum: number, e: any) => sum + (e.quantity || 0), 0)
            if (total === 0) outOfStock++
            else if (total < 5) lowStock++
          }
        }

        setStats({
          totalProducts: totalProducts || 0,
          totalEntries: totalEntries || 0,
          lowStock,
          outOfStock,
        })
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#001396] border-t-transparent mb-4"></div>
          <p className="text-gray-500">Cargando panel...</p>
        </div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50'
    },
    {
      title: 'Ingresos Registrados',
      value: stats.totalEntries,
      icon: ArrowUpCircle,
      color: 'bg-green-500',
      bgLight: 'bg-green-50'
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      bgLight: 'bg-yellow-50'
    },
    {
      title: 'Sin Stock',
      value: stats.outOfStock,
      icon: TrendingUp,
      color: 'bg-red-500',
      bgLight: 'bg-red-50'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <LayoutDashboard size={28} className="text-[#001396]" />
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            </div>
            <p className="text-gray-500 ml-11">
              Resumen general del inventario del Centro de Acopio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.bgLight}`}>
                    <card.icon size={24} className={card.color.replace('bg-', 'text-')} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{card.value}</p>
                <p className="text-sm text-gray-500">{card.title}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Bienvenido al Sistema de Inventario</h2>
            <p className="text-gray-500">
              Valencia en Contingencia - Centro de Acopio. Utiliza el menú lateral para navegar 
              entre las diferentes secciones del sistema.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}