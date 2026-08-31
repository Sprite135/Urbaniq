import React from 'react';
import { useGetUserCouponHistoryQuery } from './couponApiSlice';
import { Tag, Calendar, DollarSign, X } from 'lucide-react';

const CouponHistory: React.FC = () => {
  const { data: couponHistory, isLoading } = useGetUserCouponHistoryQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#9d731e] border-t-transparent" />
      </div>
    );
  }

  if (!couponHistory || couponHistory.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[#7c7467]">
        No has usado ningún cupón todavía.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Historial de cupones usados</h4>
      {couponHistory.map((usage, index) => (
        <div key={`${usage.couponCode}-${index}`} className="border border-[#d8cdbb] bg-white p-4 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-[#9d731e]" />
                <span className="text-sm font-bold text-[#111827]">{usage.couponCode}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="font-semibold text-green-600">
                  Ahorraste: S/ {usage.discountAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-[#7c7467]">
                <Calendar className="h-3 w-3" />
                <span>Usado: {new Date(usage.usedAt).toLocaleDateString('es-PE')}</span>
              </div>

              <div className="mt-1 text-xs text-[#7c7467]">
                Pedido: #{usage.orderId.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CouponHistory;