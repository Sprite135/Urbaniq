import { useGetMerchantMethodsQuery } from '@/features/checkout/paymentApiSlice';
import { isMerchantPaymentConfigured } from '@/features/checkout/merchantPayment';

export default function OfflinePaymentInstructions({ method, total }: { method: string; total: number }) {
  const { data, isLoading, isError } = useGetMerchantMethodsQuery();
  const merchant = method.toLowerCase() === 'yape' ? data?.yape : data?.plin;
  if (isLoading) return <p role="status" className="mb-4 text-sm dark:text-[#ece7dd]">Consultando datos de cobro…</p>;
  if (isError || !isMerchantPaymentConfigured(merchant)) return <p role="alert" className="mb-4 border border-amber-300 p-4 text-sm dark:text-[#ece7dd]">No pudimos confirmar los datos de cobro. Contacta con el comercio antes de transferir.</p>;
  return <section className="mb-4 border border-gray-200 bg-white p-6 dark:border-[#26282e] dark:bg-[#16181d] dark:text-[#ece7dd]">
    <h3 className="font-bold">Tu pedido está creado. Paga con {method.toLowerCase() === 'yape' ? 'Yape' : 'Plin'}</h3>
    <p className="mt-2">Importe del pedido: <strong>S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
    <p className="mt-2">Número: <strong>{merchant?.phone}</strong> · Titular: <strong>{merchant?.ownerName}</strong></p>
    <p className="mt-2 text-sm">Verifica el titular en tu app antes de transferir. Si ya pagaste este pedido, envía el comprobante; no pagues de nuevo. La confirmación es manual.</p>
  </section>;
}
