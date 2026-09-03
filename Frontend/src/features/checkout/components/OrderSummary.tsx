import React, { useState } from 'react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import type { CartResponse } from '@/features/cart/cartApiSlice';
import type { Address } from '../addressApiSlice';
import { useRemoveFromCartMutation, useIncreaseQuantityMutation, useDecreaseQuantityMutation } from '@/features/cart/cartApiSlice';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/app/apiError';
import ProductImage from '@/features/catalog/components/ProductImage';

interface OrderSummaryProps {
  cart: CartResponse;
  address: Address;
  onBack: () => void;
  onContinue: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ cart, address, onBack, onContinue }) => {
  const [removeFromCart] = useRemoveFromCartMutation();
  const [increaseQuantity, { isLoading: isIncreasing }] = useIncreaseQuantityMutation();
  const [decreaseQuantity, { isLoading: isDecreasing }] = useDecreaseQuantityMutation();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const totalMRP = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = cart.items.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const couponDiscount = cart.couponDiscount || 0;

  const handleDeleteItem = async (cartItemId: string) => {
    const confirmed = window.confirm('¿Eliminar este artículo de tu carrito?');
    if (!confirmed) return;

    setDeletingItemId(cartItemId);
    try {
      await removeFromCart(cartItemId).unwrap();
      toast.success('Artículo eliminado del resumen del pedido');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el artículo'));
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Dirección de entrega</h3>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-wider text-[#9d731e] hover:underline">
            Cambiar
          </button>
        </div>
        <div className="text-sm text-gray-700">
          <p className="font-bold">{address.fullName}</p>
          <p>{address.houseName}</p>
          <p>{address.district}, {address.province} — {address.department}</p>
          <p>{address.landMark}</p>
          <p>Teléfono: {address.phoneNumber}</p>
        </div>
      </div>

      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
          Artículos del pedido ({cart.items.reduce((sum, item) => sum + item.quantity, 0)})
        </h3>
        <div className="divide-y divide-gray-100">
          {cart.items.map((item) => (
            <div key={item.cartItemId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <ProductImage
                src={item.image || '/product-images/placeholder.svg'}
                alt={item.productName}
                fallbackLabel={item.productName}
                className="h-20 w-16 shrink-0 bg-gray-50 dark:bg-[#0e0f12] object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-[#ece7dd]">{item.productName}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-xs text-gray-500 dark:text-[#9a9388]">
                          Color: {item.color}
                      </p>
                      <div className="flex h-7 items-center border border-gray-300">
                        <button
                          type="button"
                          disabled={item.quantity <= 1 || isDecreasing}
                          onClick={() => decreaseQuantity({ cartItemId: item.cartItemId })}
                          className="flex h-full w-7 items-center justify-center text-gray-600 dark:text-[#9ca3af] hover:bg-gray-50 dark:bg-[#0e0f12] disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="flex h-full min-w-[28px] items-center justify-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isIncreasing}
                          onClick={() => increaseQuantity({ cartItemId: item.cartItemId })}
                          className="flex h-full w-7 items-center justify-center text-gray-600 dark:text-[#9ca3af] hover:bg-gray-50 dark:bg-[#0e0f12] disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.cartItemId)}
                    disabled={deletingItemId === item.cartItemId}
                    className="inline-flex items-center gap-1 rounded-sm border border-red-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Delete item"
                    aria-label={`Delete ${item.productName}`}
                  >
                    {deletingItemId === item.cartItemId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Eliminar
                  </button>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-sm font-black">S/ {item.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {item.discount > 0 && (
                    <span className="text-xs text-gray-400 line-through">S/ {(item.price * item.quantity).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Detalles del precio</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-[#9ca3af]">Subtotal</span>
            <span>S/ {totalMRP.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>Descuento</span>
            <span>-S/ {totalDiscount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-[#9d731e] dark:text-[#d4a85e]">
              <span>Cupón de descuento</span>
              <span>-S/ {couponDiscount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-[#9ca3af]">Costo de envío</span>
            <span className="font-medium text-green-600 dark:text-green-400">GRATIS</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 dark:border-[#26282e] pt-3 text-base font-black text-gray-900 dark:text-[#ece7dd]">
            <span>Monto total</span>
            <span>S/ {cart.finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 border border-gray-300 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-[#9ca3af] transition-colors hover:border-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-[#111827] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740]"
        >
          Continuar al pago
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;
