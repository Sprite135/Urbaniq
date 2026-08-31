import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { useLoginMutation } from '../auth/authApiSlice';
import { setCredentials } from '../auth/authSlice';

const getApiError = (error: unknown, fallback: string) => {
  const apiError = error as { 
    data?: { 
      message?: string; 
      title?: string; 
      errors?: Record<string, string[]> 
    } 
  };

  // Extract FluentValidation specific errors first
  if (apiError.data?.errors) {
    const errorMessages = Object.values(apiError.data.errors).flat();
    if (errorMessages.length > 0) {
      return errorMessages[0];
    }
  }

  return apiError.data?.message || apiError.data?.title || fallback;
};

const AdminLoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await login({ email, password }).unwrap();

      if (response.user.role !== 'Admin') {
        setError('Este inicio de sesión es solo para usuarios administradores.');
        return;
      }

      dispatch(setCredentials(response));
      navigate('/admin', { replace: true });
    } catch (loginError) {
      setError(getApiError(loginError, 'Credenciales de administrador inválidas.'));
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[#111827] px-4 text-[#f8f5ee]">
      <form onSubmit={handleSubmit} className="w-full max-w-md border border-[#303a4d] bg-[#172033] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <div className="mb-5 grid h-12 w-12 place-items-center bg-[#d7b46a] text-[#111827]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d7b46a]">Urbaniq</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em]">Consola de administración</h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9ba4b5]">Correo de administrador</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 h-12 w-full border border-[#384257] bg-[#111827] px-4 text-sm text-white outline-none focus:border-[#d7b46a]"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9ba4b5]">Contraseña</span>
            <div className="relative mt-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="h-12 w-full border border-[#384257] bg-[#111827] px-4 pr-12 text-sm text-white outline-none focus:border-[#d7b46a]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9ba4b5] hover:text-[#d7b46a] focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>
        </div>

        {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 bg-[#d7b46a] text-xs font-black uppercase tracking-[0.22em] text-[#111827] disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
};

export default AdminLoginPage;
