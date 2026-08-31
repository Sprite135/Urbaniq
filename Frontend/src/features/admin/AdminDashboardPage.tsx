import { useState } from 'react';
import { useGetDashboardStatsQuery, useGetLowStockProductsQuery, useGetAllOrdersQuery } from './adminApiSlice';
import { Activity, ArrowUpRight, CheckCircle2, Package, ReceiptText, TrendingUp, Users, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const AdminDashboardPage = () => {
  const [page, setPage] = useState(1);
  const { data: statsData, isLoading: isStatsLoading, error: statsError } = useGetDashboardStatsQuery();
  const { data: lowStockProducts, isLoading: isProductsLoading, error: productsError } = useGetLowStockProductsQuery();
  const { data: ordersData, isLoading: isOrdersLoading, error: ordersError } = useGetAllOrdersQuery({ pageNumber: page, pageSize: 5 });

  const isError = statsError || productsError || ordersError;

  if (isError) {
    return (
      <div className="border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        <p>No se pudieron cargar las estadísticas del panel.</p>
        {statsError && <p>Error de estadísticas: {JSON.stringify(statsError)}</p>}
        {productsError && <p>Error de productos: {JSON.stringify(productsError)}</p>}
        {ordersError && <p>Error de pedidos: {JSON.stringify(ordersError)}</p>}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Ingresos totales',
      value: statsData ? formatCurrency(statsData.totalRevenue) : formatCurrency(0),
      detail: 'Ingresos de artículos de pedidos confirmados',
      icon: TrendingUp,
      tone: 'gold',
    },
    {
      label: 'Artículos entregados',
      value: (statsData?.totalItemsDelivered ?? 0).toLocaleString('en-IN'),
      detail: 'Unidades entregadas con éxito',
      icon: Package,
      tone: 'emerald',
      href: '/admin/orders?status=Delivered'
    },
    {
      label: 'Artículos cancelados',
      value: (statsData?.totalItemsCancelled ?? 0).toLocaleString('en-IN'),
      detail: 'Unidades de pedidos cancelados',
      icon: Package,
      tone: 'red',
      href: '/admin/orders?status=Cancelled'
    },
    {
      label: 'Pedidos en proceso',
      value: (statsData?.totalProcessingOrders ?? 0).toLocaleString('en-IN'),
      detail: 'Requieren revisión de envío',
      icon: ReceiptText,
      tone: 'amber',
      href: '/admin/orders?status=Processing'
    },
    {
      label: 'Pedidos enviados',
      value: (statsData?.totalShippedOrders ?? 0).toLocaleString('en-IN'),
      detail: 'En camino a los clientes',
      icon: Truck,
      tone: 'indigo',
      href: '/admin/orders?status=Shipped'
    },
    {
      label: 'Clientes',
      value: (statsData?.totalCustomers ?? 0).toLocaleString('en-IN'),
      detail: 'Cuentas de clientes registradas',
      icon: Users,
      tone: 'green',
      href: '/admin/users'
    },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden bg-[#111827] text-[#f8f5ee]">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d7b46a]">Resumen ejecutivo</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] sm:text-4xl">Centro de control de la tienda</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d8d2c8]">
              Supervisa ingresos, presión de envío, exposición de inventario y actividad de clientes desde una vista operativa.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#263044] bg-[#172033] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7b46a]">Estado del sistema</p>
              <div className="mt-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <span className="text-2xl font-black uppercase">En línea</span>
              </div>
            </div>
            <div className="border border-[#263044] bg-[#172033] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7b46a]">Estilos con stock bajo</p>
              <div className="mt-4 flex items-center gap-3">
                <Activity className="h-6 w-6 text-amber-300" />
                <span className="text-2xl font-black">{statsData?.lowStockCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((item) => {
          const CardContent = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8a8174]">{item.label}</p>
                  <p className="mt-3 text-3xl font-black text-[#111827]">{isStatsLoading ? '...' : item.value}</p>
                </div>
                <div className={`grid h-11 w-11 place-items-center ${
                  item.tone === 'gold' ? 'bg-[#f3ecdf] text-[#9d731e]' :
                  item.tone === 'green' ? 'bg-emerald-50 text-emerald-700' :
                  item.tone === 'amber' ? 'bg-amber-50 text-amber-700' :
                  item.tone === 'indigo' ? 'bg-indigo-50 text-indigo-700' :
                  item.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                  item.tone === 'red' ? 'bg-red-50 text-red-700' :
                  'bg-[#111827] text-[#d7b46a]'
                }`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm text-[#6f6659]">{item.detail}</p>
            </>
          );

          return item.href ? (
            <Link key={item.label} to={item.href} className="border border-[#e1d5c2] bg-white p-5 shadow-sm hover:border-[#9d731e] hover:shadow-md transition-all block">
              {CardContent}
            </Link>
          ) : (
            <div key={item.label} className="border border-[#e1d5c2] bg-white p-5 shadow-sm">
              {CardContent}
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-[#e1d5c2] bg-white">
          <div className="flex items-center justify-between border-b border-[#eee6da] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9d731e]">Fulfilment</p>
              <h3 className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-[#111827]">Pedidos recientes</h3>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[#9d731e]" />
          </div>
          <div className="divide-y divide-[#eee6da]">
            {isOrdersLoading ? (
              <div className="px-5 py-8 text-sm text-[#7c7467]">Cargando pedidos...</div>
            ) : ordersData?.items.length ? (
              ordersData.items.map((order) => (
                <Link to={`/admin/orders/${order.orderId}`} key={order.orderId} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#111827]">{order.transactionId || order.orderId.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-[#7c7467]">{new Date(order.orderDate).toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-black text-[#111827]">{formatCurrency(order.totalPrice)}</span>
                  <span className="w-fit bg-[#f3ecdf] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9d731e]">
                    {order.orderStatus}
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-[#7c7467]">Aún no hay pedidos.</div>
            )}
          </div>
          {ordersData && ordersData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eee6da] bg-[#fbfaf7] px-5 py-3">
              <p className="text-xs text-[#6f6659]">
               Página <span className="font-bold text-[#111827]">{ordersData.pageNumber}</span> de{' '}
               <span className="font-bold text-[#111827]">{ordersData.totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="h-7 border border-[#d8cdbb] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Ant
                </button>
                <button
                  disabled={page === ordersData.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="h-7 border border-[#d8cdbb] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-[#e1d5c2] bg-white">
          <div className="border-b border-[#eee6da] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9d731e]">Inventory</p>
            <h3 className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-[#111827]">Lista de seguimiento de stock</h3>
          </div>
          <div className="divide-y divide-[#eee6da]">
            {isProductsLoading ? (
              <div className="px-5 py-8 text-sm text-[#7c7467]">Cargando lista de stock...</div>
            ) : lowStockProducts?.length ? (
              lowStockProducts.map((product) => (
                <Link to={`/admin/products/${product.id}`} key={product.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <img src={product.image} alt="" className="h-14 w-12 object-cover bg-[#efe7da]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#111827]">{product.productName}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#7c7467]">{product.sku}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                    product.quantity <= 5 ? 'bg-red-50 text-red-700' : product.quantity <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {product.quantity} left
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-[#7c7467]">No se encontraron productos.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
