import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { selectCurrentUser, selectIsAuthenticated } from './authSlice';
import { useSendEmailVerificationMutation } from './authApiSlice';

const VerifyEmailPromptModal: React.FC = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sendEmailVerification, { isLoading: isSendingEmail }] = useSendEmailVerificationMutation();

  useEffect(() => {
    const userId = user?.userId;
    const isCheckout = location.pathname.startsWith('/checkout');

    // If the email is verified (e.g. from background auto-tracking), close the modal immediately
    if (!isAuthenticated || !userId || user?.isEmailVerified || isCheckout) {
      setIsOpen(false);
      return;
    }

    // Only show if logged in, email not verified, and we haven't dismissed it this session
    const dismissalKey = `verify_prompt_dismissed_${userId}`;
    const dismissed = sessionStorage.getItem(dismissalKey);
    if (!dismissed) {
      const timer = window.setTimeout(() => {
        // The user may dismiss another scheduled instance before this callback runs.
        if (!sessionStorage.getItem(dismissalKey)) {
          setIsOpen(true);
        }
      }, 3000); // 3 seconds delay
      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated, location.pathname, user?.isEmailVerified, user?.userId]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleClose = () => {
    if (user) {
      sessionStorage.setItem(`verify_prompt_dismissed_${user.userId}`, 'true');
    }
    setIsOpen(false);
  };

  const handleSendEmailLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa una dirección de correo válida.');
      return;
    }

    try {
      await sendEmailVerification({ email }).unwrap();
      setMessage('Enlace de verificación enviado. Abre el enlace desde tu correo para verificarlo.');
      // Optional: close after a delay
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (sendError) {
      // Inline simple fallback since getApiError might not be in utils yet
      const apiError = sendError as { data?: { message?: string; title?: string } };
      setError(apiError.data?.message || apiError.data?.title || 'No se pudo enviar el enlace de verificación.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-[2px]">
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <div
          className="relative w-full max-w-[560px] overflow-hidden rounded-[18px] border border-stone-200 bg-white px-8 pb-8 pt-12 text-stone-900 shadow-2xl shadow-black/35 dark:border-[#30323a] dark:bg-[#16181d] dark:text-[#ece7dd] sm:px-12"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-email-title"
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-stone-700 transition hover:bg-stone-100 dark:text-[#d8d2c8] dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          <form onSubmit={handleSendEmailLink} className="mx-auto max-w-[560px]">
            <h1 id="verify-email-title" className="font-heading text-2xl font-semibold text-stone-950 dark:text-[#f4efe6]">Verifica tu dirección de correo</h1>
            <div className="mt-4 border-t border-stone-200 pt-4 dark:border-[#30323a]">
              <p className="text-[15px] leading-6 text-stone-600 dark:text-[#b8b0a5]">
                Verifica tu correo para una experiencia de compra sin interrupciones. Ingresa tu correo y haz clic en verificar.
              </p>
              <div className="mt-5 flex h-[56px] items-center border border-stone-400 bg-white px-4 focus-within:border-[#9d731e] focus-within:ring-2 focus-within:ring-[#9d731e]/20 dark:border-[#4a4d56] dark:bg-[#0e0f12]">
                <Mail className="mr-3 h-5 w-5 text-stone-500 dark:text-[#9a9388]" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-stone-900 outline-none placeholder:text-stone-400 dark:text-[#ece7dd] dark:placeholder:text-[#777168]"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSendingEmail}
                className="h-[52px] bg-[#111827] font-bold uppercase text-[#e2c77f] transition hover:bg-[#263044] disabled:bg-stone-300 disabled:text-white dark:bg-[#d7b46a] dark:text-[#111827] dark:hover:bg-[#e2c77f] dark:disabled:bg-[#4a4d56] dark:disabled:text-[#9a9388]"
              >
                {isSendingEmail ? 'Enviando...' : 'Verificar'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-[52px] border border-stone-300 bg-white font-bold uppercase text-stone-700 transition hover:bg-stone-50 dark:border-[#4a4d56] dark:bg-[#16181d] dark:text-[#d8d2c8] dark:hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPromptModal;
