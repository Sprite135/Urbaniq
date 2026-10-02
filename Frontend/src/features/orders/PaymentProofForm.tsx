import { useRef, useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { useUploadVoucherMutation } from '@/features/checkout/paymentApiSlice';
import { useAttachVoucherMutation } from './orderApiSlice';
import { getApiErrorMessage } from '@/app/apiError';

export default function PaymentProofForm({ orderId }: { orderId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [upload, { isLoading: uploading }] = useUploadVoucherMutation();
  const [attach, { isLoading: attaching }] = useAttachVoucherMutation();
  const busy = uploading || attaching;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!file && !reference.trim()) {
      setError('Adjunta tu comprobante o ingresa una referencia de pago.');
      return;
    }
    if (reference.trim() && !/^\d{4,12}$/.test(reference.trim())) {
      setError('La referencia debe contener entre 4 y 12 dígitos. Si tiene otro formato, adjunta el comprobante.');
      return;
    }
    if (file && (!/\.(png|jpe?g|webp|pdf)$/i.test(file.name) || file.size > 5 * 1024 * 1024 || !file.size)) {
      setError('Elige una imagen PNG, JPG, WEBP o PDF de hasta 5 MB.');
      return;
    }
    try {
      let url = uploadedUrl;
      if (file && !url) {
        const body = new FormData();
        body.append('file', file);
        url = (await upload(body).unwrap()).url;
        setUploadedUrl(url);
      }
      await attach({ orderId, url, approvalCode: reference.trim() || undefined }).unwrap();
      setSaved(true);
      setFile(null);
      setUploadedUrl(undefined);
      setReference('');
      if (input.current) input.current.value = '';
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'No se pudo guardar el comprobante. Inténtalo de nuevo.'));
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-gray-200 pt-5 dark:border-[#373a40]">
      <h4 className="flex items-center gap-2 font-bold"><Upload className="h-4 w-4" /> Enviar comprobante</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300">Confirmaremos tu pago al comprobar el abono en nuestra cuenta. Una captura o referencia por sí sola no confirma el cobro.</p>
      <div>
        <label htmlFor="payment-proof" className="mb-2 block text-sm font-semibold">Imagen o PDF del pago</label>
        <input id="payment-proof" ref={input} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" disabled={busy}
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); setUploadedUrl(undefined); setSaved(false); setError(''); }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#f3ecdf] file:px-4 file:py-2 file:font-semibold file:text-gray-900" />
        <p className="mt-2 text-xs text-gray-500">Hasta 5 MB. Oculta datos que no sean necesarios para identificar el pago.</p>
      </div>
      <div>
        <label htmlFor="payment-reference" className="mb-2 block text-sm font-semibold">Referencia del pago (opcional)</label>
        <input id="payment-reference" value={reference} disabled={busy} inputMode="numeric" maxLength={12}
          onChange={(event) => { setReference(event.target.value); setSaved(false); }}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-[#373a40]" />
        <p className="mt-2 text-xs text-gray-500">Usa el dato del comprobante; nunca ingreses tu PIN ni un código para autorizar compras.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><CheckCircle className="h-4 w-4" /> Comprobante enviado. Tu pago sigue pendiente de revisión.</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-[#111827] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-[#d7b46a] dark:text-[#111827]">
        {busy ? 'Guardando…' : 'Enviar para revisión'}
      </button>
    </form>
  );
}
