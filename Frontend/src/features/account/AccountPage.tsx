import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, LogOut, Package, Ticket, User, Users, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '@/features/auth/authSlice';
import CouponHistory from '@/features/coupons/CouponHistory';

const AccountPage: React.FC = () => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showCouponHistory, setShowCouponHistory] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const referralCode = user?.name ? `URB-${user.name.replace(/\s+/g, '').slice(0, 6).toUpperCase()}10` : 'URB-FRIEND10';

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#9d731e]">Mi cuenta</p>
          <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-[#ece7dd]">{user?.name || 'Cliente'}</h1>
          {user?.phoneNumber && <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9388]">{user.phoneNumber}</p>}
          {user?.isEmailVerified && user?.email && (
            <p className="mt-1 flex items-center text-sm font-medium text-emerald-600">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
               {user.email} (Verificado)
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/profile" className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5 hover:border-teal-200">
            <User className="mb-4 h-5 w-5 text-[#9d731e]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Mi perfil</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Los detalles del perfil están vinculados a tu cuenta de inicio de sesión.</p>
          </Link>
          <Link to="/orders" className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5 hover:border-teal-200">
            <Package className="mb-4 h-5 w-5 text-[#9d731e]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Pedidos</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Rastrea, cancela, devuelve y consulta los detalles de tus pedidos.</p>
          </Link>
          <Link to="/wishlist" className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5 hover:border-teal-200">
            <Heart className="mb-4 h-5 w-5 text-[#9d731e]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Lista de deseos</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Productos guardados para comprar más tarde.</p>
          </Link>
          <div 
            onClick={() => setShowCouponHistory(true)}
            className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5 cursor-pointer hover:border-teal-200"
          >
            <Ticket className="mb-4 h-5 w-5 text-[#9d731e]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Cupones</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Ver historial de cupones usados.</p>
          </div>
          <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5">
            <Users className="mb-4 h-5 w-5 text-[#9d731e]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Referidos</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Comparte el código <strong>{referralCode}</strong>. Tu amigo obtiene 10% de descuento; tú recibes un cupón tras su primer pedido entregado.</p>
          </div>
          <button onClick={handleLogout} className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-5 text-left hover:border-red-200">
            <LogOut className="mb-4 h-5 w-5 text-red-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Cerrar sesión</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-[#9a9388]">Cierra sesión en este dispositivo.</p>
          </button>
        </div>

      </div>

      {/* Coupon History Modal */}
      {showCouponHistory && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/60 p-4">
          <div className="w-full max-w-lg border border-[#e1d5c2] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee6da] px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9d731e]">Historial</p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-[0.08em] text-[#111827]">Mis cupones usados</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCouponHistory(false)} 
                className="grid h-9 w-9 place-items-center border border-[#d8cdbb]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <CouponHistory />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
