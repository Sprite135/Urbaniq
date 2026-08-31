import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetOrderByIdQuery, useMarkOrderPaidMutation } from '../orders/orderApiSlice';
import { useChangeOrderStatusMutation } from './adminApiSlice';
import { toast } from 'react-toastify';
import { CheckCircle, Clock, Package, Truck, XCircle, ArrowLeft, MapPin, User, Phone, Calendar } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

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

const getAvailableStatuses = (currentStatus: string) => {
  const normalized = currentStatus.toLowerCase();
  if (normalized === 'pending') return ['Pending', 'Processing', 'Shipped'];
  if (normalized === 'processing') return ['Processing', 'Shipped'];
  if (normalized === 'shipped') return ['Shipped', 'Delivered'];
  return [currentStatus]; // Delivered and Cancelled are terminal
};

const AdminOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId!);
  const [changeStatus, { isLoading: isUpdating }] = useChangeOrderStatusMutation();
  const [markPaid, { isLoading: isMarkingPaid }] = useMarkOrderPaidMutation();

  const handleMarkPaid = async () => {
    try {
      await markPaid(order.orderId).unwrap();
      toast.success('Pedido marcado como pagado');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo marcar como pagado'));
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-black text-gray-900">Pedido no encontrado</h2>
        <p className="mt-2 text-sm text-gray-500">El pedido que buscas no existe.</p>
        <Link to="/admin/orders" className="mt-6 flex items-center gap-2 text-sm font-bold text-[#9d731e] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a pedidos
        </Link>
      </div>
    );
  }

  const normalizedStatus = order.orderStatus.toLowerCase();
  const StatusIcon = statusIcons[normalizedStatus] || Clock;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await changeStatus({ orderId: order.orderId, status: newStatus }).unwrap();
      toast.success('Order status updated');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update order status'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/orders" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8cdbb] bg-white text-[#7c7467] transition-colors hover:bg-[#fbfaf7] hover:text-[#111827]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Detalles del pedido</p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-[#111827]">
            {order.transactionId || order.orderId.slice(0, 8)}
          </h2>
        </div>
      </div>

      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-3">
        {/* Left Column: Items & Cancellation Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#f3ecdf] px-5 py-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Artículos pedidos ({order.orderItems.length})</h3>
            </div>
            <div className="divide-y divide-[#eee6da]">
              {order.orderItems.map((item) => (
                <div key={item.orderItemId} className="flex gap-4 p-5">
                  <img src={item.imageUrl} alt={item.productName} className="h-24 w-20 bg-gray-50 object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#111827] truncate">{item.productName}</h4>
                    <p className="mt-1 text-xs text-[#7c7467]">
                        Color: {item.color} • Cant: {item.quantity}
                    </p>
                    <p className="mt-2 text-sm font-black text-[#111827]">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#111827]">{formatCurrency(item.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#eee6da] bg-[#fbfaf7] p-5 text-right">
               <p className="text-xs font-bold uppercase tracking-widest text-[#7c7467]">Monto total</p>
              <p className="mt-1 text-2xl font-black text-[#111827]">{formatCurrency(order.totalPrice)}</p>
            </div>
          </section>

          {/* Cancellation Info */}
          {normalizedStatus === 'cancelled' && order.cancellationReason && (
             <section className="border border-red-200 bg-red-50 p-5">
                 <h3 className="text-sm font-black uppercase tracking-widest text-red-800">Detalles de cancelación</h3>
                 <p className="mt-2 text-sm text-red-700"><span className="font-bold">Motivo:</span> {order.cancellationReason}</p>
                 <p className="mt-1 text-xs text-red-600">Cancelado el: {order.cancelledAtUtc ? new Date(order.cancelledAtUtc).toLocaleString() : 'N/A'}</p>
             </section>
          )}
        </div>

        {/* Right Column: Customer & Status Section */}
        <div className="space-y-6">
          {/* Status Update */}
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
               <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Actualizar estado</h3>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-700'}`}>
                  <StatusIcon className="h-4 w-4" />
                  {order.orderStatus}
                </span>
              </div>
               <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#7c7467]">Cambiar a</label>
              <select
                disabled={isUpdating || normalizedStatus === 'delivered' || normalizedStatus === 'cancelled'}
                value={order.orderStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-11 border border-[#d8cdbb] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#9d731e] disabled:opacity-50 disabled:bg-gray-50"
              >
                {getAvailableStatuses(order.orderStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {(normalizedStatus === 'delivered' || normalizedStatus === 'cancelled') && (
                 <p className="mt-2 text-xs text-red-600 font-medium">Las actualizaciones de estado están deshabilitadas para estados terminales.</p>
              )}
            </div>
          </section>

          {/* Payment confirmation (offline methods: Yape / Plin / transfer) */}
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
               <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Pago</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Estado</span>
                <span className={`text-xs font-black uppercase tracking-[0.14em] ${order.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.isPaid ? 'Pagado' : 'Pendiente de pago'}
                </span>
              </div>
              {order.paymentApprovalCode && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Código de aprobación</span>
                  <p className="mt-1 text-lg font-black tracking-[0.3em] text-[#111827]">{order.paymentApprovalCode}</p>
                  <p className="mt-1 text-xs text-[#7c7467]">Valídalo en tu app Yape/Plin (Validar operación).</p>
                </div>
              )}
              {order.paymentReceiptUrl && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Voucher</span>
                  <a
                    href={order.paymentReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm font-semibold text-[#9d731e] underline hover:text-[#7c5d12]"
                  >
                    Ver comprobante adjunto
                  </a>
                </div>
              )}
              {!order.isPaid && (
                <button
                  type="button"
                  onClick={handleMarkPaid}
                  disabled={isMarkingPaid}
                  className="w-full bg-[#9d731e] py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#7c5d12] disabled:opacity-50"
                >
                  {isMarkingPaid ? 'Marcando…' : 'Marcar como pagado'}
                </button>
              )}
            </div>
          </section>

          {/* Customer Details */}
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
               <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Detalles del cliente</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-[#9d731e]" />
                <div>
                  <p className="text-sm font-bold text-[#111827]">{order.address?.fullName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-[#9d731e]" />
                <div>
                  <p className="text-sm text-[#111827]">{order.address?.phoneNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#9d731e]" />
                <div>
                  <p className="text-sm text-[#111827]">{order.address?.houseName}</p>
                  <p className="text-sm text-[#111827]">{order.address?.district}, {order.address?.province} — {order.address?.department}</p>
                  {order.address?.landMark && (
                     <p className="text-xs italic text-[#7c7467]">Punto de referencia: {order.address.landMark}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Order Info */}
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
               <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Información del pedido</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-[#9d731e]" />
                <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Fecha del pedido</p>
                  <p className="text-sm text-[#111827]">{new Date(order.orderDate).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 text-[#9d731e]" />
                <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Método de pago</p>
                  <p className="text-sm text-[#111827] uppercase">{order.paymentMethod}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
