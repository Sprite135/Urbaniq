import React from 'react';
import { useGetAvailableCouponsQuery } from './couponApiSlice';
import { useSelector } from 'react-redux';
import { selectCartTotal } from '../cart/cartSlice';
import { Tag, Clock, DollarSign, Percent, X } from 'lucide-react';
import type { RootState } from '@/app/store';

const AvailableCoupons: React.FC = () => {
  const cartTotal = useSelector((state: RootState) => selectCartTotal(state));
  const { data: availableCoupons, isLoading } = useGetAvailableCouponsQuery({ cartTotal }, { skip: cartTotal === 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#9d731e] border-t-transparent" />
      </div>
    );
  }

  if (!availableCoupons || availableCoupons.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[#7c7467]">
        No hay cupones disponibles para tu carrito actual.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Cupones disponibles para ti</h4>
      {availableCoupons.map((coupon) => (
        <div key={coupon.couponId} className="border border-[#d8cdbb] bg-[#f3ecdf] p-4 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-[#9d731e]" />
                <span className="text-sm font-bold text-[#111827]">{coupon.code}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {coupon.discountType === 1 ? (
                  <>
                    <Percent className="h-3 w-3 text-[#7c7467]" />
                    <span className="font-semibold text-[#111827]">{coupon.value}% de descuento</span>
                  </>
                ) : coupon.discountType === 2 ? (
                  <>
                    <DollarSign className="h-3 w-3 text-[#7c7467]" />
                    <span className="font-semibold text-[#111827]">S/ {coupon.value} de descuento</span>
                  </>
                ) : (
                  <span className="font-semibold text-[#111827]">Descuento especial</span>
                )}
              </div>

              {coupon.minOrderAmount && (
                <p className="mt-1 text-xs text-[#7c7467]">
                  Mínimo: S/ {coupon.minOrderAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
              )}

              <div className="flex items-center gap-1 mt-2 text-xs text-[#7c7467]">
                <Clock className="h-3 w-3" />
                <span>Válido hasta: {new Date(coupon.endDate).toLocaleDateString('es-PE')}</span>
              </div>
            </div>

            <button
              onClick={() => {
                // Copy coupon code to clipboard
                navigator.clipboard.writeText(coupon.code);
                // Could also trigger a toast notification
              }}
              className="shrink-0 p-2 bg-white border border-[#d8cdbb] rounded-md hover:bg-[#ece7dd] transition-colors"
              title="Copiar código"
            >
              <Tag className="h-4 w-4 text-[#9d731e]" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AvailableCoupons;