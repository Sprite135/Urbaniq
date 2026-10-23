import { useMemo, useState } from 'react';
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import { useCreatePaymentIntentMutation, useGetPaymentConfigQuery, useVerifyPaymentMutation } from '@/features/checkout/paymentApiSlice';
import { getApiErrorMessage } from '@/app/apiError';

function CardForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [createIntent] = useCreatePaymentIntentMutation();
  const [verify] = useVerifyPaymentMutation();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    const card = elements?.getElement(CardNumberElement);
    if (!stripe || !card) return;
    setBusy(true);
    try {
      const intent = await createIntent({ orderId }).unwrap();
      if (!intent.data?.clientSecret) throw new Error('La pasarela no devolvió una sesión de pago.');
      const confirmation = await stripe.confirmCardPayment(intent.data.clientSecret, { payment_method: { card } });
      if (confirmation.error || !confirmation.paymentIntent) throw new Error(confirmation.error?.message || 'No se pudo confirmar la tarjeta.');
      await verify({ orderId, paymentIntentId: confirmation.paymentIntent.id }).unwrap();
      toast.success('Pago confirmado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, error instanceof Error ? error.message : 'No se pudo completar el pago.'));
    } finally { setBusy(false); }
  };

  const options = { style: { base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#dc2626' } } };
  return <div className="mt-5 space-y-4 border-t border-gray-200 pt-5 dark:border-gray-700">
    <h4 className="font-bold">Continuar pago con tarjeta</h4>
    <label className="block text-sm font-semibold">Número de tarjeta<div className="mt-1 border border-gray-300 bg-white p-3"><CardNumberElement options={options} /></div></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-sm font-semibold">Vencimiento<div className="mt-1 border border-gray-300 bg-white p-3"><CardExpiryElement options={options} /></div></label>
      <label className="block text-sm font-semibold">CVC<div className="mt-1 border border-gray-300 bg-white p-3"><CardCvcElement options={options} /></div></label>
    </div>
    <p className="text-xs text-gray-500">Usa exclusivamente tarjetas de prueba de Stripe en esta demostración universitaria.</p>
    <button type="button" onClick={pay} disabled={busy || !stripe} className="bg-[#111827] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-[#d7b46a] dark:text-[#111827]">{busy ? 'Procesando…' : 'Pagar pedido'}</button>
  </div>;
}

export default function ResumeCardPayment({ orderId }: { orderId: string }) {
  const { data, isLoading } = useGetPaymentConfigQuery();
  const key = data?.publishableKey?.startsWith('pk_') ? data.publishableKey : '';
  const stripe = useMemo(() => key ? loadStripe(key) : null, [key]);
  if (isLoading) return <p className="mt-4 text-sm">Cargando pago seguro…</p>;
  if (!stripe) return <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">El pago con tarjeta de prueba no está configurado. Puedes cancelar el pedido o usar otro pedido con un método de demostración.</p>;
  return <Elements stripe={stripe}><CardForm orderId={orderId} /></Elements>;
}
