import { useState } from 'react';
import { useRequestReturnMutation } from './orderApiSlice';

export default function ReturnRequestForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [requestReturn, { isLoading }] = useRequestReturnMutation();
  return <form className="mb-4 border border-gray-200 bg-white p-6 dark:border-[#26282e] dark:bg-[#16181d]" onSubmit={async event => {
    event.preventDefault();
    if (!reason.trim()) { setError('Describe el motivo de la devolución.'); return; }
    setError('');
    try { await requestReturn({ orderId, reason: reason.trim() }).unwrap(); }
    catch { setError('No pudimos registrar la solicitud. Revisa el estado del pedido o contacta con atención al cliente.'); }
  }}>
    <h3 className="font-bold dark:text-[#ece7dd]">Solicitar devolución</h3>
    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">La solicitud será revisada por el comercio. No devuelve automáticamente el dinero ni confirma que el producto haya sido recibido.</p>
    <label htmlFor="return-reason" className="mt-4 block text-sm font-semibold dark:text-[#ece7dd]">Motivo de la devolución</label>
    <textarea id="return-reason" required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} rows={3} className="mt-2 w-full border border-gray-300 p-3 dark:border-gray-700 dark:bg-[#0e0f12] dark:text-[#ece7dd]" />
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <button disabled={isLoading} className="mt-3 bg-[#9d731e] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{isLoading ? 'Enviando…' : 'Enviar solicitud de devolución'}</button>
  </form>;
}
