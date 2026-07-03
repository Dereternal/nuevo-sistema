'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link?: string
  created_at: string
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    
    // Recargar cada 60 segundos
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      if (error) throw error
      
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error
      
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />
      default:
        return <Info size={16} className="text-blue-500" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      setShowDropdown(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            <button
              onClick={markAllAsRead}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Marcar todas como leídas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay notificaciones</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={"p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors " + (!notification.read ? 'bg-blue-50' : '')}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    {notification.link && (
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => router.push('/notifications')}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors py-1"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
