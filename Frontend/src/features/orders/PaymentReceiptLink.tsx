import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { getPaymentReceiptUrl } from './paymentReceiptUrl';

export default function PaymentReceiptLink({ path }: { path?: string }) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const url = getPaymentReceiptUrl(path);
  if (!url) return null;
  return <div className="mt-3">
    <button type="button" disabled={busy} className="text-sm font-bold text-[#9d731e] underline disabled:opacity-50" onClick={async () => {
      setBusy(true); setError('');
      try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
        if (!response.ok) throw new Error();
        const blobUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = blobUrl; link.download = path!.split('/').pop()!;
        link.click(); setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch { setError('No se pudo descargar. Actualiza la sesión y vuelve a intentarlo.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Descargando…' : 'Descargar comprobante'}</button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
