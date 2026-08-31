import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  useForgotPasswordMutation, 
  useVerifyOtpMutation, 
  useResetPasswordMutation 
} from './authApiSlice';
import { toast } from 'react-toastify';

type Step = 'EMAIL' | 'OTP' | 'PASSWORD';

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [forgotPassword, { isLoading: isSendingOtp }] = useForgotPasswordMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
  
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
      toast.success('Código de verificación enviado a tu correo electrónico');
      setStep('OTP');
    } catch (err) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Error al enviar el código de verificación');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp({ email, code }).unwrap();
      setStep('PASSWORD');
    } catch (err) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Código inválido o expirado');
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('Las contraseñas no coinciden');
    }
    try {
      await resetPassword({ email, code, newPassword }).unwrap();
      toast.success('¡Contraseña restablecida exitosamente! Por favor, inicia sesión.');
      navigate('/login');
    } catch (err) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Error al restablecer la contraseña');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0e0f12] py-12 px-4 sm:px-6 lg:px-8">
      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-[#ece7dd] tracking-tight">
          Urbaniq<span className="text-primary">.</span>
        </h1>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-[#16181d] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-[#26282e]">
        
        {/* STEP 1: EMAIL ENTRY (Amazon Style) */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ece7dd]">Asistencia de contraseña</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#9ca3af]">
                Ingresa la dirección de correo asociada a tu cuenta de Urbaniq.
              </p>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-gray-900 dark:text-[#ece7dd]"
                placeholder="name@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {isSendingOtp ? 'Enviando...' : 'Continuar'}
            </button>

            <div className="text-center text-sm">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: OTP ENTRY (Amazon Style) */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ece7dd]">Ingresa el código de verificación</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#9ca3af]">
                Por tu seguridad, hemos enviado un código de 6 dígitos a <span className="font-medium text-gray-900 dark:text-[#ece7dd]">{email}</span>.
              </p>
            </div>
            
            <div className="space-y-1">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 text-center">
                  Código de 6 dígitos
                </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="block w-full text-center text-3xl tracking-[0.5em] font-mono px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-primary focus:border-primary text-gray-900 dark:text-[#ece7dd]"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {isVerifyingOtp ? 'Verificando...' : 'Enviar código'}
            </button>

            <div className="flex flex-col items-center space-y-4 text-sm">
              <button 
                type="button"
                onClick={handleRequestOtp}
                className="text-primary font-medium hover:underline"
              >
                Reenviar código
              </button>
              <button 
                type="button"
                onClick={() => setStep('EMAIL')}
                className="text-gray-500 dark:text-[#9a9388] hover:text-gray-700"
              >
                Cambiar correo electrónico
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 'PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ece7dd]">Crear nueva contraseña</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-[#9ca3af]">
                Te pediremos esta contraseña cada vez que inicies sesión.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-gray-900 dark:text-[#ece7dd]"
                  placeholder="Al menos 8 caracteres"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-gray-900 dark:text-[#ece7dd]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResetting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {isResetting ? 'Guardando...' : 'Guardar y iniciar sesión'}
            </button>
          </form>
        )}

      </div>

      {/* Amazon Style Footer Links */}
      <div className="mt-8 flex space-x-6 text-xs text-gray-500 dark:text-[#9a9388]">
        <a href="#" className="hover:text-primary hover:underline">Condiciones de uso</a>
        <a href="#" className="hover:text-primary hover:underline">Aviso de privacidad</a>
        <a href="#" className="hover:text-primary hover:underline">Ayuda</a>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        © 2026 Urbaniq. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
