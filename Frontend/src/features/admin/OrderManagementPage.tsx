import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChangeOrderStatusMutation, useGetAllOrdersQuery } from './adminApiSlice';
import { toast } from 'react-toastify';
import { CheckCircle, Clock, Package, Search, Truck, XCircle } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

const getAvailableStatuses = (currentStatus: string) => {
  const normalized = currentStatus.toLowerCase();
  if (normalized === 'pending') return ['Pending', 'Processing', 'Shipped'];
  if (normalized === 'processing') return ['Processing', 'Shipped'];
  if (normalized === 'shipped') return ['Shipped', 'Delivered'];
  return [currentStatus]; // Delivered and Cancelled are terminal
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const OrderManagementPage = () => {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || undefined;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetAllOrdersQuery({ 
    pageNumber: page, 
    pageSize: 10,
    status: statusParam 
  });
  const [changeStatus, { isLoading: isUpdating }] = useChangeOrderStatusMutation();

  const filteredItems =
    data?.items?.filter((order) => {
      const searchLower = search.toLowerCase();
      const transactionIdMatch = (order.transactionId || '').toLowerCase().includes(searchLower);
      const orderIdMatch = order.orderId.toLowerCase().includes(searchLower);
      const customerNameMatch = (order.address?.fullName || '').toLowerCase().includes(searchLower);
      const emailMatch = (order.userEmail || '').toLowerCase().includes(searchLower);

      return transactionIdMatch || orderIdMatch || customerNameMatch || emailMatch;
    }) || [];

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await changeStatus({ orderId, status: newStatus }).unwrap();
      toast.success('Estado del pedido actualizado');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el estado del pedido'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Gestión de pedidos</p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">
          {statusParam ? `${statusParam} pedidos` : 'Pedidos'}
        </h2>
        <p className="mt-2 text-sm text-[#6f6659]">Rastrea referencias de pago, detalles de entrega del cliente y cambios de estado de envío.</p>
      </div>

      <section className="border border-[#e1d5c2] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#eee6da] bg-[#fbfaf7] p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
            <input
              type="search"
              placeholder="Buscar ID de pedido, ID de transacción, nombre de cliente o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full border border-[#d8cdbb] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#9d731e]"
            />
          </label>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c7467]">
            {data?.totalCount || 0} pedidos
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center p-10">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#eee6da] bg-[#f3ecdf] text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43] dark:border-[#33363d] dark:bg-[#16181d] dark:text-[#9a9388]">
                  <tr>
                    <th className="px-5 py-4">Pedido</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Actualizar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee6da]">
                  {filteredItems.length ? (
                    filteredItems.map((order) => {
                      const normalizedStatus = order.orderStatus.toLowerCase();
                      const StatusIcon = statusIcons[normalizedStatus] || Clock;
                      return (
                        <tr key={order.orderId} className="transition-colors hover:bg-[#fbfaf7]">
                          <td className="px-5 py-4">
                            <Link to={`/admin/orders/${order.orderId}`} className="block hover:opacity-80">
                              <p className="font-mono text-xs font-bold text-[#111827] hover:underline hover:text-[#9d731e]">{order.transactionId || order.orderId.slice(0, 8)}</p>
                              <p className="mt-1 text-xs text-[#7c7467]">{new Date(order.orderDate).toLocaleString()}</p>
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                                <p className="text-sm font-bold text-[#111827]">{order.address?.fullName || 'Cliente'}</p>
                                <p className="mt-1 text-xs text-[#7c7467]">{order.userEmail || 'Correo no disponible'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-[#111827]">{formatCurrency(order.totalPrice)}</p>
                             <p className="mt-1 text-xs text-[#7c7467]">{order.orderItems?.length || 0} artículos</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-700'}`}>
                              <StatusIcon className="h-4 w-4" />
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <select
                              disabled={isUpdating || normalizedStatus === 'delivered' || normalizedStatus === 'cancelled'}
                              value={order.orderStatus}
                              onChange={(event) => handleStatusChange(order.orderId, event.target.value)}
                              className="h-10 border border-[#d8cdbb] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#9d731e] disabled:opacity-50 disabled:bg-gray-50"
                            >
                              {getAvailableStatuses(order.orderStatus).map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron pedidos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y divide-[#eee6da]">
              {filteredItems.length ? (
                filteredItems.map((order) => {
                  const normalizedStatus = order.orderStatus.toLowerCase();
                  const StatusIcon = statusIcons[normalizedStatus] || Clock;
                  return (
                    <div key={order.orderId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/admin/orders/${order.orderId}`} className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-bold text-[#111827] hover:text-[#9d731e]">{order.transactionId || order.orderId.slice(0, 8)}</p>
                          <p className="mt-1 text-xs text-[#7c7467]">{new Date(order.orderDate).toLocaleString()}</p>
                        </Link>
                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-700'}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#111827] truncate">{order.address?.fullName || 'Customer'}</p>
                          <p className="text-xs text-[#7c7467] truncate">{order.userEmail || 'Email unavailable'}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[#111827]">{formatCurrency(order.totalPrice)}</p>
                      </div>
                      <select
                        disabled={isUpdating || normalizedStatus === 'delivered' || normalizedStatus === 'cancelled'}
                        value={order.orderStatus}
                        onChange={(event) => handleStatusChange(order.orderId, event.target.value)}
                        className="w-full h-10 border border-[#d8cdbb] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#9d731e] disabled:opacity-50 disabled:bg-gray-50"
                      >
                        {getAvailableStatuses(order.orderStatus).map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron pedidos.</div>
              )}
            </div>
          </>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eee6da] bg-[#fbfaf7] px-5 py-4">
            <p className="text-sm text-[#6f6659]">
               Página <span className="font-bold text-[#111827]">{data.pageNumber}</span> de{' '}
               <span className="font-bold text-[#111827]">{data.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="h-9 border border-[#d8cdbb] bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-40"
              >
                 Anterior
              </button>
              <button
                disabled={page === data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="h-9 border border-[#d8cdbb] bg-white px-4 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-40"
              >
                 Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default OrderManagementPage;
