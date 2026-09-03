import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLoginMutation } from './authApiSlice';
import { setCredentials } from './authSlice';

const getApiError = (error: unknown, fallback: string) => {
  const apiError = error as {
    data?: { message?: string; title?: string; errors?: Record<string, string[]> };
  };
  if (apiError.data?.errors) {
    const messages = Object.values(apiError.data.errors).flat();
    if (messages.length > 0) return messages[0];
  }
  return apiError.data?.message || apiError.data?.title || fallback;
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/account';

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      const response = await login({ email, password }).unwrap();
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        })
      );
      toast.success('Sesión iniciada correctamente');
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'No se pudo iniciar sesión.'));
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0e0f12] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <Link to="/" className="text-4xl font-extrabold text-gray-900 dark:text-[#ece7dd] tracking-tight">
          Urbaniq<span className="text-primary">.</span>
        </Link>
        <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Tu tienda de tecnología en Perú</p>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-[#16181d] p-10 rounded-2xl shadow-xl border border-gray-200 dark:border-[#26282e]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#ece7dd]">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#9ca3af]">Ingresa tus datos para continuar con tu compra.</p>
        </div>

        {redirectTo !== '/account' && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Inicia sesión para continuar.</span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 dark:text-[#ece7dd] shadow-sm focus:border-primary focus:ring-primary"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-3 pl-10 pr-12 text-gray-900 dark:text-[#ece7dd] shadow-sm focus:border-primary focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#9ca3af]"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-[#9ca3af]">
          ¿No tienes una cuenta?{' '}
          <Link
            to={`/register${redirectTo !== '/account' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-medium text-primary hover:underline"
          >
            Crear una cuenta
          </Link>
        </p>
      </div>

      <p className="mt-8 text-xs text-gray-400">© 2026 Urbaniq. Todos los derechos reservados.</p>
    </div>
  );
};

export default LoginPage;
