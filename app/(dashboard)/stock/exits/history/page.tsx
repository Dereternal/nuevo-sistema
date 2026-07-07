'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, Printer, Eye, Edit, Trash2, FileText, Shield, ArrowRightLeft, Truck } from 'lucide-react'

interface ExitRecord {
  id: number
  note_number: string
  control_number: string
  exit_date: string
  receptor_name: string
  institution: string
  destination: string
  deliverer_name: string
  total_items: number
  created_at: string
  created_by: string
  items?: any[]
  type?: string
}

export default function ExitsHistoryPage() {
  const [exits, setExits] = useState<ExitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedExit, setSelectedExit] = useState<ExitRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role || '')
      }
    }
    getRole()
  }, [])

  const loadExits = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stock_exits')
        .select('*')
        .order('exit_date', { ascending: false })
        .limit(100)

      if (error) throw error
      setExits(data || [])
    } catch (error) {
      console.error('Error cargando egresos:', error)
      alert('Error al cargar el historial de egresos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExits()
  }, [])

  const loadExitDetails = async (exitId: number) => {
    try {
      const { data, error } = await supabase
        .from('stock_exit_items')
        .select(`
          *,
          products(id, name),
          variants(id, name),
          presentaciones(id, name)
        `)
        .eq('stock_exit_id', exitId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error cargando detalles:', error)
      return []
    }
  }

  const handleViewDetails = async (exit: ExitRecord) => {
    const items = await loadExitDetails(exit.id)
    setSelectedExit({ ...exit, items })
    setShowDetailModal(true)
  }

  const handleRePrint = async (exit: ExitRecord) => {
    if (exit.type === 'conversion') {
      // Para conversiones, mostrar resumen en vez de nota de entrega
      const items = await loadExitDetails(exit.id)
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        const currentDate = new Date(exit.exit_date).toLocaleDateString('es-ES', {
          year: 'numeric', month: 'long', day: 'numeric'
        })

        let html = `
          <!DOCTYPE html>
          <html>
            <head><title>Conversión a Combos - ${exit.control_number}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              @media print { body { margin: 0; padding: 20px; } }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
            </style>
            </head>
            <body>
              <div style="border: 2px solid black; padding: 16px; min-height: 700px; font-size: 11px;">
                <div style="text-align: center;">
                  <div style="border-top: 2px solid black; border-bottom: 2px solid black; padding: 4px 0; margin: 4px 0;">
                    <h1 style="font-size: 16px; font-weight: bold;">Reporte de Conversión a Combos</h1>
                  </div>
                </div>
                <p><strong>N° Control:</strong> ${exit.control_number}</p>
                <p><strong>Fecha:</strong> ${currentDate}</p>
                <p><strong>Destino:</strong> ${exit.destination}</p>
                <hr style="margin: 8px 0;" />
                <h3>Productos Convertidos</h3>
                <table>
                  <thead><tr><th>N°</th><th>Producto</th><th>Presentación</th><th>Cantidad</th></tr></thead>
                  <tbody>
                    ${items.map((item: any, index: number) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${item.products?.name || 'Producto'}${item.variants?.name ? ' (' + item.variants.name + ')' : ''}</td>
                        <td>${item.presentaciones?.name || '-'}</td>
                        <td>${item.quantity}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div style="border-top: 2px solid black; margin-top: 16px; padding-top: 4px; text-align: center; font-size: 8px; color: #6b7280;">
                  <p>Documento generado por el Sistema de Inventario Valencia en Contingencia</p>
                </div>
              </div>
              <script>window.onload = function() { window.print(); }<\\/script>
            </body>
          </html>
        `
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
      }
      return
    }

    // Nota de entrega normal
    const items = await loadExitDetails(exit.id)
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      const currentDate = new Date(exit.exit_date).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
      const currentTime = new Date(exit.exit_date).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
      })

      let html = `
        <!DOCTYPE html>
        <html>
          <head><title>Nota de Entrega - ${exit.note_number}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print { body { margin: 0; padding: 20px; } }
          </style>
          </head>
          <body>
            <div style="border: 2px solid black; padding: 16px; min-height: 700px; font-size: 11px;">
              <div style="text-align: center;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                  <div style="text-align: left; font-size: 10px;">
                    <p><strong>Fecha:</strong> ${currentDate} - ${currentTime}</p>
                    <p><strong>N° Control:</strong> ${exit.control_number}</p>
                    <p><strong>N° Nota:</strong> ${exit.note_number}</p>
                  </div>
                </div>
                <div style="border-top: 2px solid black; border-bottom: 2px solid black; padding: 4px 0; margin: 4px 0;">
                  <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Nota de Entrega</h1>
                </div>
              </div>
              <hr style="margin: 8px 0;" />
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 11px;">
                <div><strong>RECEPTOR:</strong> ${exit.receptor_name}</div>
                <div><strong>INSTITUCIÓN:</strong> ${exit.institution}</div>
                <div style="grid-column: span 2;"><strong>DESTINO:</strong> ${exit.destination}</div>
              </div>
              <hr style="margin: 8px 0;" />
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="border-bottom: 2px solid black; background-color: #f3f4f6;">
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px;">N°</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px;">CANT</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px;">PRODUCTO</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px;">PRESENTACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: any, index: number) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 4px 8px;">${index + 1}</td>
                      <td style="padding: 4px 8px; font-weight: 600;">${item.quantity}</td>
                      <td style="padding: 4px 8px;">${item.products?.name || 'Producto'}${item.variants?.name ? ' (' + item.variants.name + ')' : ''}</td>
                      <td style="padding: 4px 8px;">${item.presentaciones?.name || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <hr style="margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 11px;">
                <div style="text-align: left;">
                  <p><strong>ENTREGÓ:</strong></p>
                  <p style="margin-top: 16px;">${exit.deliverer_name}</p>
                  <hr style="width: 160px; border-color: #9ca3af; margin-top: 4px;" />
                </div>
                <div style="text-align: right;">
                  <p><strong>RECIBE CONFORME:</strong></p>
                  <p style="margin-top: 16px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(Nombre y Apellido)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(Teléfono)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(Cédula)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(Firma)</p>
                </div>
              </div>
              <div style="border-top: 2px solid black; margin-top: 16px; padding-top: 4px; text-align: center; font-size: 8px; color: #6b7280;">
                <p>Documento generado por el Sistema de Inventario Valencia en Contingencia</p>
              </div>
            </div>
            <script>window.onload = function() { window.print(); }<\\/script>
          </body>
        </html>
      `
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const handleDelete = async (exit: ExitRecord) => {
    if (!confirm(`¿Estás seguro de eliminar la nota de entrega N° ${exit.note_number}?`)) return

    try {
      const { error } = await supabase
        .from('stock_exits')
        .delete()
        .eq('id', exit.id)

      if (error) throw error
      loadExits()
    } catch (error) {
      console.error('Error eliminando egreso:', error)
      alert('Error al eliminar la nota de entrega')
    }
  }

  const filteredExits = exits.filter(e => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = e.note_number.toLowerCase().includes(searchLower) ||
           e.control_number.toLowerCase().includes(searchLower) ||
           e.receptor_name.toLowerCase().includes(searchLower) ||
           e.institution.toLowerCase().includes(searchLower) ||
           e.destination.toLowerCase().includes(searchLower) ||
           e.deliverer_name.toLowerCase().includes(searchLower)

    const matchesType = filterType === 'all' || e.type === filterType
    return matchesSearch && matchesType
  })

  const dateFiltered = filterDate 
    ? filteredExits.filter(e => e.exit_date.startsWith(filterDate))
    : filteredExits

  const canView = userRole === 'admin' || userRole === 'supervisor'
  const canDelete = userRole === 'admin'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Historial de Egresos</h1>
          <p className="text-sm text-gray-500">Consulta notas de entrega y conversiones a combos</p>
        </div>
        <button
          onClick={loadExits}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, receptor, destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            >
              <option value="all">Todos</option>
              <option value="delivery">Notas de Entrega</option>
              <option value="conversion">Conversiones a Combos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando historial...</p>
          </div>
        ) : !canView ? (
          <div className="p-8 text-center">
            <Shield size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tienes permisos para ver el historial de egresos</p>
            <p className="text-sm text-gray-400">Esta función solo está disponible para Administradores y Supervisores</p>
          </div>
        ) : dateFiltered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay egresos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">N° Control</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Receptor / Destino</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dateFiltered.map((exit) => (
                  <tr key={exit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{exit.control_number}</td>
                    <td className="py-3 px-4">
                      {exit.type === 'conversion' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <ArrowRightLeft size={12} />
                          Conversión
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Truck size={12} />
                          Nota de Entrega
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(exit.exit_date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {exit.type === 'conversion' ? (
                        <span className="text-purple-700">{exit.destination}</span>
                      ) : (
                        <span>{exit.receptor_name} - {exit.institution}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{exit.total_items}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(exit)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleRePrint(exit)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title={exit.type === 'conversion' ? 'Ver reporte de conversión' : 'Reimprimir'}
                        >
                          <Printer size={16} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(exit)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetailModal && selectedExit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {selectedExit.type === 'conversion' ? 'Detalles de Conversión' : 'Detalles de Nota de Entrega'}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">N° Control:</span>
                  <span className="font-medium ml-2">{selectedExit.control_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <span className={`font-medium ml-2 ${selectedExit.type === 'conversion' ? 'text-purple-700' : ''}`}>
                    {selectedExit.type === 'conversion' ? 'Conversión a Combos' : 'Nota de Entrega'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-medium ml-2">
                    {new Date(selectedExit.exit_date).toLocaleString('es-ES')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Entregó:</span>
                  <span className="font-medium ml-2">{selectedExit.deliverer_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Destino:</span>
                  <span className="font-medium ml-2">{selectedExit.destination}</span>
                </div>
                {selectedExit.type !== 'conversion' && (
                  <>
                    <div className="col-span-2">
                      <span className="text-gray-500">Receptor:</span>
                      <span className="font-medium ml-2">{selectedExit.receptor_name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Institución:</span>
                      <span className="font-medium ml-2">{selectedExit.institution}</span>
                    </div>
                  </>
                )}
              </div>

              <hr />

              <h3 className="font-medium text-gray-800">
                {selectedExit.type === 'conversion' ? 'Productos Convertidos' : 'Productos Entregados'}
              </h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">N°</th>
                    <th className="text-left py-2 px-3">Producto</th>
                    <th className="text-left py-2 px-3">Presentación</th>
                    <th className="text-left py-2 px-3">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedExit.items || []).map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3">{index + 1}</td>
                      <td className="py-2 px-3">
                        {item.products?.name || 'Producto eliminado'}
                        {item.variants?.name ? ` (${item.variants.name})` : ''}
                      </td>
                      <td className="py-2 px-3">{item.presentaciones?.name || '-'}</td>
                      <td className="py-2 px-3">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => handleRePrint(selectedExit)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#001396' }}
                >
                  <Printer size={18} />
                  {selectedExit.type === 'conversion' ? 'Ver Reporte' : 'Reimprimir'}
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}