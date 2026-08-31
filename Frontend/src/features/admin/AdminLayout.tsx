import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../auth/authSlice';
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  Users,
  X,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Panel', href: '/admin', icon: LayoutDashboard, description: 'Ingresos y operaciones' },
  { name: 'Productos', href: '/admin/products', icon: Package, description: 'Catálogo y stock' },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart, description: 'Flujo de envío' },
  { name: 'Categorías', href: '/admin/categories', icon: Tags, description: 'Árbol de comercialización' },
  { name: 'Cupones', href: '/admin/coupons', icon: Ticket, description: 'Códigos promocionales' },
  { name: 'Analytics', href: '/admin/coupons/analytics', icon: TrendingUp, description: 'Estadísticas de cupones' },
  { name: 'Usuarios', href: '/admin/users', icon: Users, description: 'Controles de clientes' },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const currentRoute =
    navigation.find((item) => location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))) ||
    navigation[0];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin-login');
  };

  return (
    <div className="min-h-dvh bg-[#f5f1e9] text-[#111827]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#111827]/55 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar navegación de administración"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#263044] bg-[#111827] text-[#f8f5ee] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-24 items-center justify-between border-b border-[#263044] px-6">
          <Link to="/admin" className="shrink-0 leading-none">
            <div className="bg-white rounded-md p-1">
              <img src="/logo.jpeg" alt="Urbaniq" className="h-12 w-auto object-contain" />
            </div>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden"            aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 border px-4 py-3 transition-colors ${
                  isActive
                    ? 'border-[#d7b46a] bg-[#d7b46a] text-[#111827]'
                    : 'border-transparent text-[#c8c1b6] hover:border-[#384257] hover:bg-[#1a2437] hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black uppercase tracking-[0.16em]">{item.name}</span>
                  <span className={`mt-0.5 block text-xs ${isActive ? 'text-[#3d2b12]' : 'text-[#8f98aa]'}`}>{item.description}</span>
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'translate-x-0' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#263044] p-4">
          <div className="mb-4 border border-[#263044] bg-[#172033] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7b46a]">Sesión iniciada</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{user?.name || 'Usuario administrador'}</p>
            <p className="mt-1 truncate text-xs text-[#9ba4b5]">{user?.email || 'Consola de operaciones'}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center justify-center gap-2 border border-[#384257] text-[11px] font-black uppercase tracking-[0.2em] text-[#f8f5ee] transition-colors hover:border-red-400 hover:bg-red-500"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#e1d5c2] bg-[#fbfaf7]/95 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center border border-[#d8cdbb] bg-white lg:hidden"
                aria-label="Abrir navegación de administración"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#9d731e]">Consola de administración</p>
                <h1 className="mt-1 truncate text-2xl font-black uppercase tracking-[0.08em] text-[#111827]">{currentRoute.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative grid h-10 w-10 place-items-center border border-[#d8cdbb] bg-white text-[#111827]" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d7b46a]" />
              </button>
              <div className="hidden items-center gap-3 border border-[#d8cdbb] bg-white px-3 py-2 sm:flex">
                <div className="grid h-8 w-8 place-items-center bg-[#111827] text-xs font-black uppercase text-[#d7b46a]">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#111827]">{user?.name || 'Administrador'}</p>
                  <p className="text-[11px] font-medium text-[#7c7467]">Encargado de tienda</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
