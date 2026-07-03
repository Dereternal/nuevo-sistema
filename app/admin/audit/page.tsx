'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, Eye, History, User, Calendar } from 'lucide-react'

interface AuditLog {
  id: number
  table_name: string
  record_id: number
  action: string
  old_data: any
  new_data: any
  created_by: string
  created_at: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterTable, setFilterTable] = useState('')
  const supabase = createClient()

  const loadLogs = async () => {
    setLoading(true)
    try {
      // Cargar logs sin join
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])

      // Obtener nombres de usuarios por separado
      const userIds = data?.map(log => log.created_by).filter(Boolean) || []
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds)
        
        const userMap: Record<string, string> = {}
        profiles?.forEach(p => {
          userMap[p.id] = p.full_name
        })
        setUsers(userMap)
      }

    } catch (error) {
      console.error('Error cargando auditoría:', error)
      alert('Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-700'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700'
      case 'DELETE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'Creación'
      case 'UPDATE':
        return 'Actualización'
      case 'DELETE':
        return 'Eliminación'
      default:
        return action
    }
  }

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      'products': 'Productos',
      'stock_entries': 'Ingresos',
      'stock_exits': 'Egresos',
      'categories': 'Categorías',
      'subcategories': 'Subcategorías',
      'units': 'Unidades de Medida',
      'variants': 'Variantes',
      'presentaciones': 'Presentaciones',
      'test': 'Prueba'
    }
    return labels[table] || table
  }

  const getUserName = (userId: string) => {
    return users[userId] || 'Usuario eliminado'
  }

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      getTableLabel(log.table_name).toLowerCase().includes(searchLower) ||
      getUserName(log.created_by).toLowerCase().includes(searchLower)
    
    const matchesAction = filterAction ? log.action === filterAction : true
    const matchesTable = filterTable ? log.table_name === filterTable : true
    
    return matchesSearch && matchesAction && matchesTable
  })

  const uniqueTables = [...new Set(logs.map(l => l.table_name))]
  const uniqueActions = ['INSERT', 'UPDATE', 'DELETE']

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Historial de Auditoría</h1>
          <p className="text-sm text-gray-500">Registro de todas las acciones realizadas en el sistema</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por tabla o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tabla
            </label>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="">Todas</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{getTableLabel(table)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acción
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="">Todas</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando historial...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <History size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay registros de auditoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tabla</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Registro</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getTableLabel(log.table_name)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      ID: {log.record_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={"px-2 py-1 rounded-full text-xs font-medium " + getActionColor(log.action)}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getUserName(log.created_by)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          console.log('Datos viejos:', log.old_data)
                          console.log('Datos nuevos:', log.new_data)
                          alert('Revisa la consola para ver los detalles')
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>
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

