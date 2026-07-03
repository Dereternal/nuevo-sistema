'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldAlert, Search, User, Mail, RefreshCw } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  cedula: string
  phone: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    setDebugInfo('Cargando...')
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      setDebugInfo('Status: ' + response.status)
      
      if (!response.ok) {
        throw new Error(data.error || 'Error cargando usuarios')
      }
      
      setUsers(data)
      setDebugInfo('Usuarios cargados: ' + data.length)
    } catch (error: any) {
      console.error('Error cargando usuarios:', error)
      setError(error.message || 'Error al cargar los usuarios')
      setDebugInfo('Error: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const updateRole = async (userId: string, newRole: string) => {
    setUpdating(userId)
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando rol')
      }
      
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
    } catch (error: any) {
      console.error('Error actualizando rol:', error)
      setError(error.message || 'Error al actualizar el rol')
    } finally {
      setUpdating(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cedula.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert size={18} className="text-red-500" />
      case 'supervisor':
        return <ShieldCheck size={18} className="text-yellow-500" />
      default:
        return <Shield size={18} className="text-gray-400" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'supervisor':
        return 'Supervisor'
      default:
        return 'Operador'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700'
      case 'supervisor':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Administrar Usuarios</h1>
          <p className="text-sm text-gray-500">Gestiona los roles y permisos de los usuarios</p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {debugInfo && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-500">
          Debug: {debugInfo}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396]"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#001396] border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <User size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={16} className="text-gray-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.cedula}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.phone}</td>
                    <td className="py-3 px-4">
                      <span className={"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium " + getRoleColor(user.role)}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value)}
                          disabled={updating === user.id}
                          className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001396] disabled:opacity-50"
                        >
                          <option value="operador">Operador</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        {updating === user.id && (
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#001396] border-t-transparent"></div>
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
    </div>
  )
}

