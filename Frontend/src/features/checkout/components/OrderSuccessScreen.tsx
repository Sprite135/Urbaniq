import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Banknote, CreditCard, Package } from 'lucide-react';
import type { CartResponse } from '@/features/cart/cartApiSlice';
import type { Address } from '../addressApiSlice';
import ProductImage from '@/features/catalog/components/ProductImage';

const REDIRECT_SECONDS = 5;

type PaymentMethod = 'card' | 'cod' | 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'scotiabank' | 'pagoefectivo';

interface OrderSuccessScreenProps {
  cart: CartResponse;
  address?: Address | null;
  paymentMethod: PaymentMethod;
}

const OrderSuccessScreen: React.FC<OrderSuccessScreenProps> = ({ cart, address, paymentMethod }) => {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const isCard = paymentMethod === 'card';
  const isCod = paymentMethod === 'cod';
  const methodLabel = isCard
    ? 'Tarjeta'
    : isCod
      ? 'Contra entrega'
      : paymentMethod === 'yape'
        ? 'Yape'
        : paymentMethod === 'plin'
          ? 'Plin'
          : 'Transferencia';

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/orders', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d]"
    >
      <div className="bg-gradient-to-b from-teal-50 to-white px-6 py-10 text-center sm:px-10 sm:py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
          className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center"
        >
          <motion.span
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: [1, 1.35, 1.2], opacity: [0.5, 0, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
            className="absolute inset-0 rounded-full bg-teal-200"
          />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#111827] shadow-lg shadow-teal-600/30">
            <CheckCircle className="h-11 w-11 text-white" strokeWidth={2.5} />
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd] sm:text-3xl"
        >
          {isCard ? '¡Pago exitoso!' : '¡Pedido realizado!'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-[#9ca3af]"
        >
          {isCard
            ? 'Tu pago se procesó y tu pedido está confirmado.'
            : isCod
              ? 'Tu pedido está confirmado. Paga cuando llegue tu paquete.'
              : 'Tu pedido está registrado. Confirmaremos tu pago al validar tu código de aprobación.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#16181d] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 shadow-sm ring-1 ring-gray-100"
        >
          {isCod ? <Banknote className="h-4 w-4 text-[#9d731e]" /> : <CreditCard className="h-4 w-4 text-[#9d731e]" />}
          {isCard ? 'Pagado con tarjeta' : isCod ? 'Pago contra entrega' : `Pago por ${methodLabel} · Pendiente`}
          <span className="text-gray-300">·</span>
          <span className="text-gray-900 dark:text-[#ece7dd]">S/ {cart.finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-gray-100 dark:border-[#26282e] px-6 py-6 sm:px-8"
      >
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-[#9d731e]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
            Tu pedido ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
          </h3>
        </div>

        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {cart.items.map((item, index) => (
            <motion.div
              key={item.cartItemId}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + index * 0.08 }}
              className="flex gap-3 rounded-sm border border-gray-50 bg-gray-50/80 p-3"
            >
              <ProductImage
                src={item.image || '/product-images/placeholder.svg'}
                alt={item.productName}
                fallbackLabel={item.productName}
                className="h-16 w-14 shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-[#ece7dd]">{item.productName}</p>
                 <p className="mt-1 text-xs text-gray-500 dark:text-[#9a9388]">
                  {item.size} · {item.color} · Cant {item.quantity}
                </p>
                <p className="mt-1 text-sm font-black text-gray-900 dark:text-[#ece7dd]">S/ {item.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {address && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 text-left text-xs text-gray-500 dark:text-[#9a9388]"
          >
            <span className="font-bold text-gray-700">Entregando a:</span> {address.fullName},{' '}
            {address.district}, {address.province} — {address.department}
          </motion.p>
        )}
      </motion.div>

      <div className="border-t border-gray-100 dark:border-[#26282e] bg-gray-50 dark:bg-[#0e0f12] px-6 py-5 sm:px-8">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: REDIRECT_SECONDS, ease: 'linear' }}
            className="h-full rounded-full bg-[#111827]"
          />
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-[#9a9388]">
          Te llevamos a <span className="font-bold text-gray-700">Mis pedidos</span> en{' '}
          <span className="font-black text-[#9d731e]">{secondsLeft}</span> segundo{secondsLeft === 1 ? '' : 's'}…
        </p>
        <button
          type="button"
          onClick={() => navigate('/orders', { replace: true })}
          className="mt-4 w-full bg-[#111827] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740]"
        >
          Ver mis pedidos ahora
        </button>
      </div>
    </motion.div>
  );
};

export default OrderSuccessScreen;
