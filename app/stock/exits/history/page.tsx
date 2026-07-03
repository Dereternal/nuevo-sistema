'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, Printer, Eye, Edit, Trash2, FileText, Shield } from 'lucide-react'

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
  items?: any[]  // <-- Agregar esta línea
}

export default function ExitsHistoryPage() {
  const [exits, setExits] = useState<ExitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
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
    const items = await loadExitDetails(exit.id)
    
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      const currentDate = new Date(exit.exit_date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const currentTime = new Date(exit.exit_date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })

      let html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Nota de Entrega - ${exit.note_number}</title>
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
                    <p><strong>NÂ° Control:</strong> ${exit.control_number}</p>
                    <p><strong>NÂ° Nota:</strong> ${exit.note_number}</p>
                  </div>
                </div>
                <div style="border-top: 2px solid black; border-bottom: 2px solid black; padding: 4px 0; margin: 4px 0;">
                  <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Nota de Entrega</h1>
                </div>
              </div>

              <hr style="margin: 8px 0; border-color: #d1d5db;" />

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 11px;">
                <div><strong>RECEPTOR:</strong> ${exit.receptor_name}</div>
                <div><strong>INSTITUCIÃ“N:</strong> ${exit.institution}</div>
                <div style="grid-column: span 2;"><strong>DESTINO:</strong> ${exit.destination}</div>
              </div>

              <hr style="margin: 8px 0; border-color: #d1d5db;" />

              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="border-bottom: 2px solid black; background-color: #f3f4f6;">
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px; font-weight: bold;">NÂ°</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px; font-weight: bold;">CANT</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px; font-weight: bold;">PRODUCTO</th>
                    <th style="text-align: left; padding: 4px 8px; font-size: 10px; font-weight: bold;">PRESENTACIÃ“N</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: any, index: number) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 4px 8px;">${index + 1}</td>
                      <td style="padding: 4px 8px; font-weight: 600;">${item.quantity}</td>
                      <td style="padding: 4px 8px;">${item.products?.name || 'Producto eliminado'}${item.variants?.name ? ' (' + item.variants.name + ')' : ''}</td>
                      <td style="padding: 4px 8px;">${item.presentaciones?.name || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <hr style="margin: 8px 0; border-color: #d1d5db;" />

              <div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 11px;">
                <div style="text-align: left;">
                  <p><strong>ENTREGÃ“:</strong></p>
                  <p style="margin-top: 16px;">${exit.deliverer_name}</p>
                  <hr style="width: 160px; border-color: #9ca3af; margin-top: 4px;" />
                </div>
                <div style="text-align: right;">
                  <p><strong>RECIBE CONFORME:</strong></p>
                  <p style="margin-top: 16px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280; margin-top: 2px;">(Nombre y Apellido)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(TelÃ©fono)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(CÃ©dula)</p>
                  <p style="margin-top: 8px;">_________________________</p>
                  <p style="font-size: 9px; color: #6b7280;">(Firma)</p>
                </div>
              </div>

              <div style="border-top: 2px solid black; margin-top: 16px; padding-top: 4px; text-align: center; font-size: 8px; color: #6b7280;">
                <p>Documento generado por el Sistema de Inventario Valencia en Contingencia</p>
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            <\/script>
          </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const handleEdit = (exit: ExitRecord) => {
    alert('Funcionalidad de ediciÃ³n en desarrollo')
  }

  const handleDelete = async (exit: ExitRecord) => {
    if (!confirm(`Â¿EstÃ¡s seguro de eliminar la nota de entrega NÂ° ${exit.note_number}?`)) return

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
    return e.note_number.toLowerCase().includes(searchLower) ||
           e.control_number.toLowerCase().includes(searchLower) ||
           e.receptor_name.toLowerCase().includes(searchLower) ||
           e.institution.toLowerCase().includes(searchLower) ||
           e.destination.toLowerCase().includes(searchLower) ||
           e.deliverer_name.toLowerCase().includes(searchLower)
  })

  const dateFiltered = filterDate 
    ? filteredExits.filter(e => e.exit_date.startsWith(filterDate))
    : filteredExits

  const canView = userRole === 'admin' || userRole === 'supervisor'
  const canPrint = userRole === 'admin' || userRole === 'supervisor'
  const canEdit = userRole === 'admin'
  const canDelete = userRole === 'admin'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Historial de Notas de Entrega</h1>
          <p className="text-sm text-gray-500">Consulta, reimprime o anula notas de entrega</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nÃºmero de nota, control, receptor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
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
            <p className="text-gray-500">No tienes permisos para ver el historial de notas de entrega</p>
            <p className="text-sm text-gray-400">Esta funciÃ³n solo estÃ¡ disponible para Administradores y Supervisores</p>
          </div>
        ) : dateFiltered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay notas de entrega registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">NÂ° Nota</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">NÂ° Control</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Receptor</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">InstituciÃ³n</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dateFiltered.map((exit) => (
                  <tr key={exit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{exit.note_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{exit.control_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(exit.exit_date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{exit.receptor_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{exit.institution}</td>
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
                        {canPrint && (
                          <button
                            onClick={() => handleRePrint(exit)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Reimprimir"
                          >
                            <Printer size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(exit)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
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
              <h2 className="text-lg font-semibold">Detalles de la Nota de Entrega</h2>
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
                  <span className="text-gray-500">NÂ° Nota:</span>
                  <span className="font-medium ml-2">{selectedExit.note_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">NÂ° Control:</span>
                  <span className="font-medium ml-2">{selectedExit.control_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-medium ml-2">
                    {new Date(selectedExit.exit_date).toLocaleString('es-ES')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">EntregÃ³:</span>
                  <span className="font-medium ml-2">{selectedExit.deliverer_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Receptor:</span>
                  <span className="font-medium ml-2">{selectedExit.receptor_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">InstituciÃ³n:</span>
                  <span className="font-medium ml-2">{selectedExit.institution}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Destino:</span>
                  <span className="font-medium ml-2">{selectedExit.destination}</span>
                </div>
              </div>

              <hr />

              <h3 className="font-medium text-gray-800">Productos Entregados</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">NÂ°</th>
                    <th className="text-left py-2 px-3">Producto</th>
                    <th className="text-left py-2 px-3">PresentaciÃ³n</th>
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
                {canPrint && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false)
                      handleRePrint(selectedExit)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#001396' }}
                  >
                    <Printer size={18} />
                    Reimprimir
                  </button>
                )}
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
