import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, setCredentials } from '../auth/authSlice';
import { useUpdateProfileMutation, useSendEmailVerificationMutation } from '../auth/authApiSlice';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ProfilePage: React.FC = () => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState<string | null>(null);

  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [sendEmailVerification, { isLoading: isSendingEmail }] = useSendEmailVerificationMutation();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAge(user.age?.toString() || '');
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAge = age ? parseInt(age, 10) : undefined;

    try {
      const response = await updateProfile({
        name,
        age: parsedAge,
        email,
      }).unwrap();

      // updateProfile returns { message, data: user }
      const updatedUser = response.data;
      
      // Update local storage / redux with the new user data
      // We must preserve the existing access token
      const currentToken = localStorage.getItem('ecommerce.auth');
      if (currentToken) {
        const parsedState = JSON.parse(currentToken);
        if (parsedState.token) {
          dispatch(setCredentials({ user: updatedUser, accessToken: parsedState.token, refreshToken: parsedState.refreshToken || '' }));
        }
      }

      toast.success('¡Perfil actualizado exitosamente!');
    } catch (err) {
      // Inline fallback if getApiError isn't robust
      const apiError = err as { data?: { message?: string; title?: string } };
      setError(apiError.data?.message || apiError.data?.title || 'No se pudo actualizar el perfil.');
      toast.error('No se pudo actualizar el perfil');
    }
  };

  const handleSendVerification = async () => {
    try {
      await sendEmailVerification({ email }).unwrap();
      toast.success('Enlace de verificación enviado a tu correo.');
    } catch (err) {
      const apiError = err as { data?: { message?: string; title?: string } };
      toast.error(apiError.data?.message || apiError.data?.title || 'No se pudo enviar el correo de verificación.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#9d731e]">Mi perfil</p>
          <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-[#ece7dd]">Datos personales</h1>
        </div>

        <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold uppercase text-stone-400">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-2 h-12 w-full border border-gray-300 px-4 focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold uppercase text-stone-400">Edad</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="1"
                  max="150"
                  className="mt-2 h-12 w-full border border-gray-300 px-4 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-[#26282e]">
              <label className="block text-sm font-semibold uppercase text-stone-400">Correo electrónico</label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 w-full border border-gray-300 px-4 focus:border-black focus:outline-none"
                />
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                {user.isEmailVerified && user.email === email ? (
                  <span className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                     <CheckCircle2 className="mr-1 h-4 w-4" /> Verificado
                   </span>
                 ) : (
                   <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                     <span className="text-sm font-medium text-amber-600">No verificado</span>
                    {user.email === email && (
                       <button
                         type="button"
                         onClick={handleSendVerification}
                         disabled={isSendingEmail}
                         className="flex items-center gap-1 text-sm font-bold uppercase underline text-black transition hover:text-[#9d731e] disabled:opacity-50"
                       >
                         <Mail className="h-4 w-4" />
                          {isSendingEmail ? 'Enviando...' : 'Verificar ahora'}
                       </button>
                    )}
                    {user.email !== email && (
                       <span className="text-xs text-stone-500">Guarda los cambios para verificar el nuevo correo.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex h-12 min-w-[160px] items-center justify-center bg-black px-8 font-bold uppercase text-[#d4a72c] transition hover:bg-stone-900 disabled:opacity-70"
              >
                 {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
