import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Banknote, CreditCard, Package, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import type { CartResponse } from '@/features/cart/cartApiSlice';
import type { Address } from '../addressApiSlice';
import ProductImage from '@/features/catalog/components/ProductImage';

const REDIRECT_SECONDS = 6;

type PaymentMethod = 'card' | 'cod' | 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'scotiabank' | 'pagoefectivo';

interface OrderSuccessScreenProps {
  orderId: string;
  cart: CartResponse;
  address?: Address | null;
  paymentMethod: PaymentMethod;
}

const OrderSuccessScreen: React.FC<OrderSuccessScreenProps> = ({ orderId, cart, address, paymentMethod }) => {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const isCard = paymentMethod === 'card';
  const isCod = paymentMethod === 'cod';
  const methodLabel = isCard
    ? 'Tarjeta de Crédito / Débito'
    : isCod
      ? 'Pago Contra Entrega'
      : paymentMethod === 'yape'
        ? 'Yape'
        : paymentMethod === 'plin'
          ? 'Plin'
          : 'Transferencia Bancaria';

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate(`/orders/${orderId}`, { replace: true });
    }, REDIRECT_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate, orderId]);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#2a2d36] bg-[#121418] text-white shadow-2xl shadow-black/60"
    >
      {/* Header con Glow & Animación */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#1a1d24] via-[#14161b] to-[#121418] px-6 py-10 text-center sm:px-10 sm:py-12 border-b border-[#22252d]">
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-0 right-0 h-32 w-32 bg-[#d7b46a]/10 blur-2xl" />

        {/* Icono de Check Animado */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10 shadow-lg shadow-emerald-500/20"
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={2.2} />
        </motion.div>

        {/* Título Principal */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl"
        >
          {isCard ? '¡Pago Exitoso!' : '¡Pedido Realizado con Éxito!'}
        </motion.h2>

        {/* Subtítulo descriptivo */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-300"
        >
          {isCard
            ? 'Tu transacción ha sido procesada de forma segura y tu pedido ya está en preparación.'
            : isCod
              ? 'Tu pedido está confirmado. Pagarás en efectivo o con QR cuando llegue tu paquete.'
              : 'Tu pedido ha sido registrado. Puedes adjuntar tu comprobante de pago en el seguimiento.'}
        </motion.p>

        {/* Badge de Método y Monto */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="mx-auto mt-6 inline-flex items-center gap-2.5 rounded-full border border-[#333842] bg-[#1a1e27] px-4 py-2 text-xs font-semibold tracking-wide text-gray-200 shadow-inner"
        >
          {isCod ? (
            <Banknote className="h-4 w-4 text-[#d7b46a]" />
          ) : isCard ? (
            <CreditCard className="h-4 w-4 text-[#d7b46a]" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-[#d7b46a]" />
          )}
          <span className="uppercase text-gray-300">{methodLabel}</span>
          <span className="text-gray-500">·</span>
          <span className="font-bold text-[#d7b46a] text-sm">
            S/ {cart.finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </motion.div>
      </div>

      {/* Lista de Productos del Pedido */}
      <div className="px-6 py-6 sm:px-8 bg-[#121418]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#d7b46a]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Resumen de compra ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
            </h3>
          </div>
          <span className="text-xs text-gray-400">Orden #{orderId.slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
          {cart.items.map((item, index) => (
            <motion.div
              key={item.cartItemId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.06 }}
              className="flex items-center gap-3.5 rounded-xl border border-[#22252d] bg-[#171a21] p-3 transition-colors hover:border-[#333844]"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#0e0f12] border border-[#282b33] p-1">
                <ProductImage
                  src={item.image || '/product-images/placeholder.svg'}
                  alt={item.productName}
                  fallbackLabel={item.productName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="line-clamp-1 text-sm font-semibold text-white">{item.productName}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {item.size !== 'Standard' && `${item.size} · `}Cant: {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#d7b46a]">
                  S/ {item.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dirección de Envío */}
        {address && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#22252d] bg-[#16181f]/80 p-3 text-xs text-gray-300">
            <MapPin className="h-4 w-4 shrink-0 text-[#d7b46a] mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-white">Entregar a: </span>
              {address.fullName} — {address.district}, {address.province} ({address.department})
              {address.landMark && <span className="text-gray-400"> · Ref: {address.landMark}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Barra de redirección y Botón Principal */}
      <div className="border-t border-[#22252d] bg-[#0e1013] px-6 py-6 sm:px-8 text-center">
        {/* Barra de progreso */}
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1e222b]">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: REDIRECT_SECONDS, ease: 'linear' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#d7b46a] to-emerald-400"
          />
        </div>

        <p className="text-xs text-gray-400">
          Redirigiendo a tus pedidos en <span className="font-bold text-[#d7b46a]">{secondsLeft}s</span>…
        </p>

        {/* Botón Principal con Estilo Urbaniq Luxury */}
        <button
          type="button"
          onClick={() => navigate(`/orders/${orderId}`, { replace: true })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d7b46a] to-[#b38e3e] py-3.5 text-xs font-extrabold uppercase tracking-widest text-[#0e0f12] shadow-lg shadow-[#d7b46a]/15 transition-all hover:brightness-110 hover:shadow-[#d7b46a]/25 active:scale-[0.99]"
        >
          <span>Ver mis pedidos ahora</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default OrderSuccessScreen;
