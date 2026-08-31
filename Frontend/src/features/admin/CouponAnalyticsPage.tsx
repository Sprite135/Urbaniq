import { useGetCouponPerformanceQuery } from './adminApiSlice';
import { TrendingUp, Users, DollarSign, Tag, Activity, Calendar } from 'lucide-react';

const CouponAnalyticsPage = () => {
  const { data: performance, isLoading } = useGetCouponPerformanceQuery();

  if (isLoading) {
    return (
      <div className="grid place-items-center p-10">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
      </div>
    );
  }

  if (!performance) {
    return <div className="p-10 text-center text-sm text-[#7c7467]">No hay datos disponibles.</div>;
  }

  const statsCards = [
    {
      title: 'Descuento Total',
      value: `S/ ${performance.totalDiscountGivenAllTime.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Cupones Activos',
      value: performance.totalCouponsActive.toString(),
      icon: Tag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Cupones Usados',
      value: performance.totalCouponsUsed.toString(),
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Usuarios Únicos',
      value: performance.topPerformingCoupons.reduce((sum, c) => sum + c.uniqueUsers, 0).toString(),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Analytics</p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">Análisis de Cupones</h2>
        <p className="mt-2 text-sm text-[#6f6659]">Métricas de rendimiento y tendencias de uso de cupones promocionales.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div key={stat.title} className="border border-[#e1d5c2] bg-white p-6">
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-lg ${stat.bgColor} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#7c7467]">{stat.title}</p>
                <p className="text-2xl font-black text-[#111827]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Day */}
        <div className="border border-[#e1d5c2] bg-white p-6">
          <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#514b43]">Uso por Día (Últimos 7 días)</h3>
          <div className="space-y-3">
            {performance.usageByDay.map((day, index) => {
              const maxUses = Math.max(...performance.usageByDay.map(d => d.usesCount), 1);
              const percentage = (day.usesCount / maxUses) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-12 text-xs font-semibold text-[#514b43]">{day.period}</span>
                  <div className="flex-1 h-8 bg-[#f3ecdf] rounded-sm overflow-hidden">
                    <div 
                      className="h-full bg-[#9d731e] transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-[#111827]">{day.usesCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage by Week */}
        <div className="border border-[#e1d5c2] bg-white p-6">
          <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#514b43]">Uso por Semana (Últimas 4 semanas)</h3>
          <div className="space-y-3">
            {performance.usageByWeek.map((week, index) => {
              const maxUses = Math.max(...performance.usageByWeek.map(w => w.usesCount), 1);
              const percentage = (week.usesCount / maxUses) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold text-[#514b43]">{week.period}</span>
                  <div className="flex-1 h-8 bg-[#f3ecdf] rounded-sm overflow-hidden">
                    <div 
                      className="h-full bg-[#9d731e] transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-[#111827]">{week.usesCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage by Month */}
        <div className="border border-[#e1d5c2] bg-white p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#514b43]">Uso por Mes (Últimos 6 meses)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {performance.usageByMonth.map((month, index) => {
              const maxUses = Math.max(...performance.usageByMonth.map(m => m.usesCount), 1);
              const percentage = (month.usesCount / maxUses) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-[#514b43]">{month.period}</span>
                  </div>
                  <div className="h-24 bg-[#f3ecdf] rounded-sm overflow-hidden relative">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-[#9d731e] transition-all duration-300"
                      style={{ height: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-[#111827]">{month.usesCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Performing Coupons */}
      <div className="border border-[#e1d5c2] bg-white">
        <div className="border-b border-[#eee6da] bg-[#f3ecdf] px-5 py-4">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#514b43]">Cupones Mejor Performados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#eee6da] text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">
              <tr>
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Usos Totales</th>
                <th className="px-5 py-4">Usuarios Únicos</th>
                <th className="px-5 py-4">Descuento Total</th>
                <th className="px-5 py-4">Ingresos Generados</th>
                <th className="px-5 py-4">Tasa de Conversión</th>
                <th className="px-5 py-4">Último Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee6da]">
              {performance.topPerformingCoupons.length ? (
                performance.topPerformingCoupons.map((coupon) => (
                  <tr key={coupon.couponId} className="transition-colors hover:bg-[#fbfaf7]">
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-[#111827]">{coupon.code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#7c7467]" />
                        <span className="text-sm font-semibold text-[#514b43]">{coupon.totalUses}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#7c7467]" />
                        <span className="text-sm font-semibold text-[#514b43]">{coupon.uniqueUsers}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-green-600">
                        S/ {coupon.totalDiscountGiven.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-[#111827]">
                        S/ {coupon.totalRevenueGenerated.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-[#514b43]">{coupon.conversionRate.toFixed(1)}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs text-[#514b43]">
                        <Calendar className="h-3 w-3" />
                        <span>{coupon.lastUsedAt ? new Date(coupon.lastUsedAt).toLocaleDateString('es-PE') : 'Nunca'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#7c7467]">
                    No hay datos de cupones disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CouponAnalyticsPage;