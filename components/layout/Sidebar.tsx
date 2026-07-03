'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  ArrowUpCircle, 
  ArrowDownCircle,
  BarChart3,
  ChevronDown,
  Ruler,
  FolderTree,
  Layers,
  ClipboardList,
  PlusCircle,
  Users,
  ShieldAlert,
  History,
  Edit3,
  FileText,
  Menu,
  X,
  User,
  LogOut
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { 
    icon: Package, 
    label: 'Productos', 
    href: '#',
    submenu: [
      { icon: PlusCircle, label: 'Crear Productos', href: '/products' },
      { icon: ClipboardList, label: 'Existencias', href: '/stock' },
    ]
  },
  { 
    icon: Settings, 
    label: 'Parametros', 
    href: '#',
    submenu: [
      { icon: Ruler, label: 'Unidades de Medida', href: '/units' },
      { icon: FolderTree, label: 'Categorias', href: '/categories' },
      { icon: Layers, label: 'Subcategorias', href: '/subcategories' },
    ]
  },
  { icon: ArrowUpCircle, label: 'Ingresos', href: '/stock/entries' },
  { icon: FileText, label: 'Reportes', href: '/reports' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role || '')
        setUserName(profile?.full_name || 'Usuario')
      }
    }
    getRole()
  }, [])

  const toggleMenu = (label: string) => {
    if (openMenus.includes(label)) {
      setOpenMenus(openMenus.filter(item => item !== label))
    } else {
      setOpenMenus([...openMenus, label])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const exitsMenu = (userRole === 'admin' || userRole === 'supervisor') ? {
    icon: ArrowDownCircle, 
    label: 'Egresos', 
    href: '#',
    submenu: [
      { icon: PlusCircle, label: 'Nuevo Egreso', href: '/stock/exits' },
      { icon: FileText, label: 'Historial', href: '/stock/exits/history' },
    ]
  } : null

  const adminItems = userRole === 'admin' ? [
    { icon: ShieldAlert, label: 'Admin', href: '#', submenu: [
      { icon: Users, label: 'Usuarios', href: '/admin/users' },
      { icon: History, label: 'Auditoría', href: '/admin/audit' },
      { icon: Edit3, label: 'Ajustes de Inventario', href: '/inventory/adjustments' },
    ]}
  ] : []

  const menuBase = [...menuItems]
  if (exitsMenu) {
    menuBase.push(exitsMenu)
  }
  const allMenuItems = [...menuBase, ...adminItems]

  const isSubmenuActive = (submenuItems: { href: string }[]) => {
    return submenuItems.some(sub => pathname === sub.href)
  }

  const isAdminRoute = (href: string) => {
    return href.startsWith('/admin') || href.startsWith('/inventory')
  }

  const toggleSidebar = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin': return 'Administrador'
      case 'supervisor': return 'Supervisor'
      default: return 'Operador'
    }
  }

  const getRoleColor = () => {
    switch (userRole) {
      case 'admin': return 'text-red-500'
      case 'supervisor': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-[#001396] text-white rounded-full shadow-lg hover:bg-[#0010a0] transition-colors"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 bg-white border-r border-gray-200 flex-col min-h-screen sticky top-0">
        {/* Perfil de usuario */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#001396] flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
              <div className="flex items-center gap-2">
                <span className={"text-xs font-medium " + getRoleColor()}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allMenuItems.map((item) => {
            const isActive = pathname === item.href
            
            if (item.submenu) {
              const isOpen = openMenus.includes(item.label) || isSubmenuActive(item.submenu)
              const isAdminMenu = item.label === 'Admin'
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors text-sm text-gray-600 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={isAdminMenu ? 'text-[#ff2813]' : 'text-gray-500'} />
                      <span className={isAdminMenu ? 'font-medium text-[#ff2813]' : 'font-medium'}>{item.label}</span>
                    </div>
                    <ChevronDown size={16} className={"text-gray-400 transition-transform " + (isOpen ? 'rotate-180' : '')} />
                  </button>
                  
                  {isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((sub) => {
                        const isSubActive = pathname === sub.href
                        const isAdminSub = isAdminRoute(sub.href)
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={"flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm " + (isSubActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100')}
                            style={isSubActive ? { backgroundColor: isAdminSub ? '#ff2813' : '#001396' } : {}}
                          >
                            <sub.icon size={18} className={isSubActive ? 'text-white' : 'text-gray-500'} />
                            <span>{sub.label}</span>
                            {isAdminSub && (
                              <span className="ml-auto text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Admin</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isAdminRouteItem = isAdminRoute(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm " + (isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100')}
                style={isActive ? { backgroundColor: isAdminRouteItem ? '#ff2813' : '#001396' } : {}}
              >
                <item.icon size={20} className={isActive ? 'text-white' : (isAdminRouteItem ? 'text-[#ff2813]' : 'text-gray-500')} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer del Sidebar con Cerrar Sesión */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={20} className="text-gray-500" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
          <div className="mt-2 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <BarChart3 size={14} />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Móvil */}
      <div className={isMobileOpen ? 'lg:hidden fixed left-0 top-16 z-50 w-64 h-[calc(100vh-4rem)] bg-white shadow-lg transform transition-transform duration-300 ease-in-out translate-x-0' : 'lg:hidden fixed left-0 top-16 z-50 w-64 h-[calc(100vh-4rem)] bg-white shadow-lg transform transition-transform duration-300 ease-in-out -translate-x-full'}>
        {/* Perfil de usuario móvil */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#001396] flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
              <div className="flex items-center gap-2">
                <span className={"text-xs font-medium " + getRoleColor()}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allMenuItems.map((item) => {
            const isActive = pathname === item.href
            
            if (item.submenu) {
              const isOpen = openMenus.includes(item.label) || isSubmenuActive(item.submenu)
              const isAdminMenu = item.label === 'Admin'
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors text-sm text-gray-600 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={isAdminMenu ? 'text-[#ff2813]' : 'text-gray-500'} />
                      <span className={isAdminMenu ? 'font-medium text-[#ff2813]' : 'font-medium'}>{item.label}</span>
                    </div>
                    <ChevronDown size={16} className={"text-gray-400 transition-transform " + (isOpen ? 'rotate-180' : '')} />
                  </button>
                  
                  {isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((sub) => {
                        const isSubActive = pathname === sub.href
                        const isAdminSub = isAdminRoute(sub.href)
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={"flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm " + (isSubActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100')}
                            style={isSubActive ? { backgroundColor: isAdminSub ? '#ff2813' : '#001396' } : {}}
                          >
                            <sub.icon size={18} className={isSubActive ? 'text-white' : 'text-gray-500'} />
                            <span>{sub.label}</span>
                            {isAdminSub && (
                              <span className="ml-auto text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Admin</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isAdminRouteItem = isAdminRoute(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={"flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm " + (isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100')}
                style={isActive ? { backgroundColor: isAdminRouteItem ? '#ff2813' : '#001396' } : {}}
              >
                <item.icon size={20} className={isActive ? 'text-white' : (isAdminRouteItem ? 'text-[#ff2813]' : 'text-gray-500')} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer del Sidebar móvil con Cerrar Sesión */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={20} className="text-gray-500" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
          <div className="mt-2 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <BarChart3 size={14} />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
