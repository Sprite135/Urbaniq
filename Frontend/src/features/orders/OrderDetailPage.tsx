import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, CreditCard, CheckCircle, Circle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCancelOrderMutation, useGetOrderByIdQuery } from './orderApiSlice';
import ProductImage from '@/features/catalog/components/ProductImage';

const trackingSteps = ['Pendiente', 'Procesando', 'Enviado', 'Entregado'];

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId || '');
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [reason, setReason] = useState('');

  const activeStepIndex = useMemo(() => {
    if (!order) return 0;
    return Math.max(0, trackingSteps.findIndex((step) => step.toLowerCase() === order.orderStatus.toLowerCase()));
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#111827] border-t-transparent" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h2 className="mb-2 text-xl font-black text-gray-900 dark:text-[#ece7dd]">Pedido no encontrado</h2>
        <Link to="/orders" className="mt-4 text-sm font-bold text-[#9d731e] hover:underline">Volver a pedidos</Link>
      </div>
    );
  }

  const canCancel = ['pending', 'processing'].includes(order.orderStatus.toLowerCase());

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Agrega un motivo primero');
      return;
    }
    await cancelOrder({ orderId: order.orderId, reason }).unwrap();
    toast.success('Pedido cancelado');
    setReason('');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'text-green-600 dark:text-green-400 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'shipped': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processing': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'refunded': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-600 dark:text-[#9ca3af] bg-gray-50 dark:bg-[#0e0f12] border-gray-200';
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/orders" className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:bg-[#16181d]">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-[#9ca3af]" />
          </Link>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">Detalles del pedido</h1>
            <p className="mt-0.5 text-xs text-gray-400">ID: {order.orderId}</p>
          </div>
        </div>

        <div className={`mb-6 border p-4 ${getStatusColor(order.orderStatus)}`}>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5" />
            <div>
              <p className="text-sm font-black uppercase tracking-wider">{order.orderStatus}</p>
              <p className="mt-0.5 text-xs opacity-80">
                 Ordered on {new Date(order.orderDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {(order.cancellationReason || order.cancelledAtUtc || order.refundedAtUtc) && (
          <div className="mb-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
            <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Actualización del servicio</h3>
            <div className="space-y-3 text-sm text-gray-700">
              {order.cancellationReason && (
                <p>
                   <span className="font-black text-gray-900 dark:text-[#ece7dd]">Motivo de cancelación:</span> {order.cancellationReason}
                </p>
              )}
              {order.cancelledAtUtc && (
                <p>
                   <span className="font-black text-gray-900 dark:text-[#ece7dd]">Cancelado el:</span>{' '}
                  {new Date(order.cancelledAtUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {order.refundedAtUtc && (
                <p>
                   <span className="font-black text-gray-900 dark:text-[#ece7dd]">Reembolsado el:</span>{' '}
                  {new Date(order.refundedAtUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        )}

        {!['cancelled', 'refunded'].includes(order.orderStatus.toLowerCase()) && (
          <div className="mb-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
            <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Seguimiento del pedido</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              {trackingSteps.map((step, index) => {
                const isDone = index <= activeStepIndex;
                return (
                  <div key={step} className="flex items-center gap-2">
                    {isDone ? <CheckCircle className="h-5 w-5 text-[#9d731e]" /> : <Circle className="h-5 w-5 text-gray-300" />}
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDone ? 'text-gray-900 dark:text-[#ece7dd]' : 'text-gray-400'}`}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
            <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
            Artículos ({order.orderItems.length})
          </h3>
          <div className="divide-y divide-gray-100">
            {order.orderItems.map((item) => (
              <div key={item.orderItemId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <ProductImage
                  src={item.imageUrl || '/product-images/placeholder.svg'}
                  alt={item.productName}
                  fallbackLabel={item.productName}
                  className="h-20 w-16 shrink-0 bg-gray-50 dark:bg-[#0e0f12] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-[#ece7dd]">{item.productName}</p>
                   <p className="mt-1 text-xs text-gray-500 dark:text-[#9a9388]">
                     Color: {item.color} | Cant: {item.quantity}
                  </p>
                  <span className="mt-1.5 block text-sm font-black">S/ {item.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {canCancel && (
          <div className="mb-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
            <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Ayuda del pedido</h3>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="w-full resize-none border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#111827]"
              placeholder="Motivo de cancelación"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                 Cancelar pedido
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Pago</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-[#9ca3af]">Método</span>
              <span className="font-medium uppercase text-gray-900 dark:text-[#ece7dd]">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-[#9ca3af]">ID de transacción</span>
              <span className="text-xs font-medium text-gray-900 dark:text-[#ece7dd]">{order.transactionId}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 dark:border-[#26282e] pt-2 font-black text-gray-900 dark:text-[#ece7dd]">
              <span>Total pagado</span>
              <span>S/ {order.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Dirección de entrega</h3>
          <div className="text-sm text-gray-700">
            <p className="font-bold">{order.address.fullName}</p>
            <p>{order.address.houseName}</p>
            <p>{order.address.district}, {order.address.province} — {order.address.department}</p>
            <p>{order.address.landMark}</p>
            <p>Teléfono: {order.address.phoneNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
