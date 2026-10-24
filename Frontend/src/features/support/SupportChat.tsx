import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, MessageCircle, Sparkles, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { useGetShippingConfigQuery } from '@/features/checkout/paymentApiSlice';
import { getChatAnswer, type ChatAnswer } from './chatAnswers';
import { whatsappSupportUrl } from './whatsapp';

type Message = ChatAnswer & { id: number; from: 'assistant' | 'user' };
const topics = ['Elegir un producto', 'Envíos y entregas', 'Métodos de pago', 'Seguir mi pedido'];
const welcome: Message = { id: 0, from: 'assistant', text: '¡Hola! Soy el asistente de Urbaniq. Te ayudo a dar el siguiente paso con tu compra. ¿Qué necesitas hoy?' };

export default function SupportChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const nextId = useRef(1);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const hasComparison = useSelector((state: RootState) => state.compare.ids.length > 0);
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].some(path => location.pathname.startsWith(path));
  const { data: shipping } = useGetShippingConfigQuery(undefined, { skip: !open });

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, open]);

  const close = () => { setOpen(false); launcher.current?.focus(); };
  const send = (value: string) => {
    const question = value.trim().slice(0, 300);
    if (!question) return;
    const userId = nextId.current++;
    const replyId = nextId.current++;
    setMessages(current => [...current, { id: userId, from: 'user', text: question } as Message, { id: replyId, from: 'assistant', ...getChatAnswer(question, shipping) } as Message].slice(-40));
    setDraft('');
    input.current?.focus();
  };

  return (
    <div className={`fixed right-3 z-30 sm:right-6 ${isAuthRoute ? 'hidden sm:block' : ''} ${hasComparison ? 'bottom-24' : 'bottom-4 sm:bottom-6'}`}>
      {open && (
        <section
          id="urbaniq-support-chat"
          role="dialog"
          aria-label="Asistente de Urbaniq"
          onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
          className={`absolute bottom-16 right-0 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-[#d7b46a]/40 bg-[#faf8f3] text-[#17191e] shadow-[0_20px_70px_rgba(0,0,0,0.25)] ${hasComparison ? 'max-h-[calc(100dvh-12rem)]' : 'max-h-[calc(100dvh-8rem)]'}`}
        >
          <header className="flex shrink-0 items-center gap-3 bg-[#17191e] px-5 py-4 text-white">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#d7b46a]/40 bg-[#d7b46a]/10 text-[#e2c77f]"><Sparkles size={22} aria-hidden="true" /></span>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d7b46a]">Urbaniq</p>
              <h2 className="text-base font-bold">Tu asistente de compra</h2>
              <p className="text-xs text-gray-300">Respuestas automáticas · Ayuda rápida</p>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar chat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d7b46a]"><X size={19} /></button>
          </header>

          <div ref={conversation} role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5" style={{ maxHeight: 300 }}>
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${message.from === 'user' ? 'rounded-br-sm bg-[#17191e] text-white' : 'rounded-bl-sm border border-[#e8e3d8] bg-white text-[#374151]'}`}>
                  <span className="sr-only">{message.from === 'user' ? 'Tú: ' : 'Urbaniq: '}</span>
                  <p className="break-words">{message.text}</p>
                  {message.link && <Link to={message.link.to} onClick={close} className="mt-2 inline-block font-bold text-[#805b16] underline underline-offset-4">{message.link.label} →</Link>}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 px-4 pb-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#787163]">¿Por dónde empezamos?</p>
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => <button key={topic} type="button" onClick={() => send(topic)} className="rounded-full border border-[#ded5c3] bg-white px-3 py-2 text-[11px] font-semibold text-[#665026] transition-colors hover:border-[#9d731e] hover:bg-[#f2e9d5] focus-visible:outline-2 focus-visible:outline-[#9d731e]">{topic}</button>)}
            </div>
          </div>

          <footer className="shrink-0 border-t border-[#e8e3d8] bg-white px-4 pb-4 pt-3">
            <form onSubmit={event => { event.preventDefault(); send(draft); }} className="flex items-center gap-2 rounded-2xl border border-[#ded5c3] bg-[#faf8f3] p-1.5 focus-within:border-[#9d731e]">
              <label htmlFor="urbaniq-chat-message" className="sr-only">Tu pregunta para Urbaniq</label>
              <input ref={input} id="urbaniq-chat-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={300} autoComplete="off" placeholder="Escribe tu pregunta…" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-[#17191e] outline-none placeholder:text-[#777] sm:text-sm" />
              <button type="submit" disabled={!draft.trim()} aria-label="Enviar pregunta" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#17191e] text-[#e2c77f] hover:bg-[#35302a] disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#9d731e]"><ArrowUp size={19} /></button>
            </form>
            <p className="mt-2 text-[10px] leading-4 text-[#787163]">Ayuda general. No compartas claves ni datos de pago.</p>
            <a href={whatsappSupportUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d6e7dc] bg-[#f1f8f3] text-xs font-bold text-[#166534] hover:bg-[#e3f1e7]"><MessageCircle size={16} aria-hidden="true" /> Hablar con atención al cliente por WhatsApp ↗</a>
          </footer>
        </section>
      )}

      <div className="flex items-center justify-end gap-2">
        <a href={whatsappSupportUrl} target="_blank" rel="noopener noreferrer" aria-label="Atención al cliente por WhatsApp (abre en otra pestaña)" title="Atención por WhatsApp" className="hidden h-12 w-12 place-items-center rounded-full bg-[#166534] text-white shadow-lg transition-colors hover:bg-[#14532d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#166534] sm:grid"><MessageCircle size={22} aria-hidden="true" /></a>
        <button ref={launcher} type="button" onClick={() => open ? close() : setOpen(true)} aria-label={open ? 'Cerrar asistente de Urbaniq' : 'Abrir asistente de Urbaniq'} aria-expanded={open} aria-controls="urbaniq-support-chat" className="inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-[#d7b46a]/60 bg-[#17191e] p-0 text-sm font-bold text-[#e2c77f] shadow-lg transition-colors hover:bg-[#30291d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9d731e] sm:w-auto sm:px-5 sm:py-3">
          {open ? <X size={19} aria-hidden="true" /> : <Sparkles size={19} aria-hidden="true" />}<span className="hidden sm:inline">¿Te ayudo?</span>
        </button>
      </div>
    </div>
  );
}
