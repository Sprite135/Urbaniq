import { apiSlice } from '@/app/apiSlice';
import { toast } from 'react-toastify';

type Audit = { id: string; atUtc: string; actor: string; entity: string; entityId: string; changesJson: string };
type Email = { id: string; recipient: string; subject: string; createdAtUtc: string; sentAtUtc?: string; attempts: number; nextAttemptAtUtc: string; lastError?: string };

const operationsApi = apiSlice.injectEndpoints({ endpoints: (builder) => ({
  getAudit: builder.query<Audit[], void>({ query: () => '/admin/operations/audit?limit=100', providesTags: ['Operations'] }),
  getOutbox: builder.query<Email[], void>({ query: () => '/admin/operations/email-outbox?limit=100', providesTags: ['Operations'] }),
  retryEmail: builder.mutation<void, string>({ query: (id) => ({ url: `/admin/operations/email-outbox/${id}/retry`, method: 'POST' }), invalidatesTags: ['Operations'] }),
}) });
const { useGetAuditQuery, useGetOutboxQuery, useRetryEmailMutation } = operationsApi;

export default function OperationsPage() {
  const { data: audits = [], isLoading: loadingAudit } = useGetAuditQuery();
  const { data: emails = [], isLoading: loadingEmails } = useGetOutboxQuery();
  const [retry, { isLoading: retrying }] = useRetryEmailMutation();
  return <div className="space-y-8">
    <section className="border border-[#e1d5c2] bg-white p-6">
      <h2 className="text-xl font-black uppercase tracking-wide">Cola de correos</h2>
      <p className="mt-2 text-sm text-gray-600">Muestra los últimos 100 mensajes persistentes y permite reintentar los que agotaron sus intentos.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Fecha</th><th className="p-2">Destinatario</th><th className="p-2">Asunto</th><th className="p-2">Estado</th><th className="p-2">Acción</th></tr></thead><tbody>
        {loadingEmails && <tr><td className="p-3" colSpan={5}>Cargando…</td></tr>}
        {emails.map((email) => <tr key={email.id} className="border-b"><td className="p-2">{new Date(email.createdAtUtc).toLocaleString('es-PE')}</td><td className="p-2">{email.recipient}</td><td className="p-2">{email.subject}</td><td className="p-2">{email.sentAtUtc ? 'Enviado' : email.lastError ? `Error (${email.attempts})` : 'Pendiente'}</td><td className="p-2">{!email.sentAtUtc && <button disabled={retrying} onClick={async () => { try { await retry(email.id).unwrap(); toast.success('Reintento programado'); } catch { toast.error('No se pudo programar el reintento'); } }} className="border border-[#9d731e] px-3 py-1 font-bold text-[#9d731e] disabled:opacity-50">Reintentar</button>}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="border border-[#e1d5c2] bg-white p-6">
      <h2 className="text-xl font-black uppercase tracking-wide">Bitácora administrativa</h2>
      <p className="mt-2 text-sm text-gray-600">Cambios recientes de pedidos, inventario y usuarios con actor y valores modificados.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Fecha</th><th className="p-2">Actor</th><th className="p-2">Entidad</th><th className="p-2">Cambios</th></tr></thead><tbody>
        {loadingAudit && <tr><td className="p-3" colSpan={4}>Cargando…</td></tr>}
        {audits.map((audit) => <tr key={audit.id} className="border-b align-top"><td className="p-2">{new Date(audit.atUtc).toLocaleString('es-PE')}</td><td className="p-2">{audit.actor}</td><td className="p-2">{audit.entity}<br/><span className="text-xs text-gray-500">{audit.entityId}</span></td><td className="max-w-lg break-all p-2 font-mono text-xs">{audit.changesJson}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}
