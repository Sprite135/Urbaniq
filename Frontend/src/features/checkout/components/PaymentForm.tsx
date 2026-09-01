import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, CreditCard, Lock, ShieldCheck, XCircle, Smartphone, QrCode, Building2, Wallet } from 'lucide-react';
import { useCreatePaymentIntentMutation, useGetMerchantMethodsQuery, useGetPaymentConfigQuery, useVerifyPaymentMutation } from '../paymentApiSlice';
import { useAttachVoucherMutation, usePlaceOrderMutation } from '@/features/orders/orderApiSlice';
import type { CartResponse } from '@/features/cart/cartApiSlice';
import type { Address } from '../addressApiSlice';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import ProductImage from '@/features/catalog/components/ProductImage';
import { getApiErrorMessage } from '@/app/apiError';
import { calculateShippingCost, PROVINCE_AGENCIES, resolveShippingProvider } from '../deliveryHelper';

export interface OrderSuccessDetails {
  cart: CartResponse;
  address?: Address | null;
  paymentMethod: PaymentMethod;
}

export type PaymentMethod = 'card' | 'cod' | 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'scotiabank' | 'pagoefectivo';

interface PaymentFormProps {
  cart: CartResponse;
  addressId: string;
  address?: Address | null;
  onBack: () => void;
  onOrderSuccess: (details: OrderSuccessDetails) => void;
}

const CheckoutForm: React.FC<PaymentFormProps & { stripeEnabled?: boolean }> = ({
  cart,
  addressId,
  address,
  onBack,
  onOrderSuccess,
  stripeEnabled = true,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(stripeEnabled ? 'card' : 'cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<{ number: string | null; expiry: string | null; cvc: string | null }>({
    number: null,
    expiry: null,
    cvc: null,
  });

  const [invoiceType, setInvoiceType] = useState<'Boleta' | 'Factura'>('Boleta');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [fiscalAddress, setFiscalAddress] = useState('');
  const [agency, setAgency] = useState<string>(PROVINCE_AGENCIES[0]);

  const validateCardFields = (): boolean => {
    if (cardErrors.number || cardErrors.expiry || cardErrors.cvc) {
      toast.error('Corrige los errores en los datos de tu tarjeta.');
      return false;
    }
    return true;
  };

  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [placeOrder] = usePlaceOrderMutation();
  const [attachVoucher] = useAttachVoucherMutation();
  const { data: merchantMethods } = useGetMerchantMethodsQuery();

  const isOfflineTransfer = !['card', 'cod'].includes(paymentMethod);
  const activeMerchant = paymentMethod === 'yape' ? merchantMethods?.yape
    : paymentMethod === 'plin' ? merchantMethods?.plin
    : undefined;

  const [approvalCode, setApprovalCode] = useState('');
  const [qrBroken, setQrBroken] = useState(false);

  useEffect(() => {
    setQrBroken(false);
    setApprovalCode('');
  }, [paymentMethod]);

  const finalAmount = cart.finalAmount;

  const isProvince = address?.DeliveryZone !== 'LimaMetropolitana';
  const shippingCost = calculateShippingCost(address?.DeliveryZone, finalAmount);
  const orderTotal = finalAmount + shippingCost;
  const shippingProvider = resolveShippingProvider(address?.DeliveryZone, agency);

  const paymentButtonText = useMemo(() => {
    if (paymentMethod === 'cod') return 'Realizar pedido (Pago contra entrega)';
    if (isOfflineTransfer) return 'Confirmar pedido';
    return `Pagar S/ ${orderTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [paymentMethod, isOfflineTransfer, orderTotal]);

  const invoiceSelectedClass = 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]';
  const invoiceUnselectedClass = 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]';

  const handlePayment = async () => {
    setFailureMessage(null);

    if (invoiceType === 'Factura' && (!ruc.trim() || !razonSocial.trim())) {
      toast.error('Ingresa RUC y razón social para facturación.');
      return;
    }

    const isCardPayment = paymentMethod === 'card';

    if (isCardPayment && stripeEnabled) {
      if (!stripe || !elements) {
        toast.error("Stripe aún no se ha cargado. Por favor, espera un momento e inténtalo de nuevo.");
        return;
      }
      if (!validateCardFields()) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      if (isCardPayment && stripeEnabled) {
        const cardElement = elements!.getElement(CardNumberElement);
        if (!cardElement) throw new Error('Card element not found');

        const intentResult = await createPaymentIntent({ amount: orderTotal }).unwrap();
        const clientSecret = intentResult.data?.clientSecret;
        if (!clientSecret) {
          toast.error('No se pudo iniciar el pago. Por favor, inténtalo de nuevo.');
          setIsProcessing(false);
          return;
        }

        const { error, paymentIntent } = await stripe!.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

        if (error || !paymentIntent) {
          const message =
            error?.code === 'incomplete_number'
              ? 'El número de tu tarjeta está incompleto. Por favor, ingresa el número completo.'
              : error?.code === 'invalid_number' || error?.code === 'incorrect_number'
                ? 'El número de tarjeta ingresado no es válido. Por favor, verifícalo e inténtalo de nuevo.'
                : error?.message || 'El pago falló.';
          setFailureMessage(message);
          toast.error(message);
          setIsProcessing(false);
          return;
        }

        const verification = await verifyPayment({ paymentIntentId: paymentIntent.id }).unwrap();
        if (!verification.data?.isSuccessful) {
          throw new Error('La verificación del pago falló. Por favor, contacta soporte si se descontó dinero.');
        }

        await placeOrder({
          addressId,
          transactionId: paymentIntent.id,
          paymentMethod: 'card',
          invoiceType,
          ruc: invoiceType === 'Factura' ? ruc.trim() : undefined,
          razonSocial: invoiceType === 'Factura' ? razonSocial.trim() : undefined,
          fiscalAddress: fiscalAddress.trim() || undefined,
          shippingProvider,
          couponCode: cart.couponCode,
        }).unwrap();

        onOrderSuccess({
          cart: { ...cart, items: cart.items.map((item) => ({ ...item })) },
          address,
          paymentMethod: 'card',
        });
      } else {
        const transactionId = isCardPayment
          ? `CARD_DEMO_${Date.now()}`
          : paymentMethod === 'cod'
            ? `COD_${Date.now()}`
            : `${paymentMethod.toUpperCase()}_${Date.now()}`;

        const placed = await placeOrder({
          addressId,
          transactionId,
          paymentMethod,
          invoiceType,
          ruc: invoiceType === 'Factura' ? ruc.trim() : undefined,
          razonSocial: invoiceType === 'Factura' ? razonSocial.trim() : undefined,
          fiscalAddress: fiscalAddress.trim() || undefined,
          shippingProvider,
          couponCode: cart.couponCode,
        }).unwrap();

        if (approvalCode.trim() && placed.orderId) {
          try {
            await attachVoucher({ orderId: placed.orderId, approvalCode: approvalCode.trim() }).unwrap();
          } catch {
            toast.warning('Pedido creado, pero no se pudo registrar el código. Puedes enviarlo luego.');
          }
        }

        onOrderSuccess({
          cart: { ...cart, items: cart.items.map((item) => ({ ...item })) },
          address,
          paymentMethod,
        });
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'El pago falló. Por favor, inténtalo de nuevo.');
      setFailureMessage(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (failureMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-red-100 bg-white dark:bg-[#16181d] p-8 text-center sm:p-12"
      >
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50"
        >
          <XCircle className="h-10 w-10 text-red-500" />
        </motion.div>
        <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">Pago fallido</h2>
        <p className="mx-auto mb-8 max-w-sm text-sm text-gray-500 dark:text-[#9a9388]">{failureMessage}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => setFailureMessage(null)}
            className="bg-[#111827] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740]"
          >
            Reintentar
          </button>
          <button
            onClick={onBack}
            className="border border-gray-300 px-8 py-3 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-[#9ca3af] transition-colors hover:border-gray-400"
          >
            Revisar pedido
          </button>
        </div>
      </motion.div>
    );
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        '::placeholder': {
          color: '#9ca3af',
        },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <div className="space-y-6">
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-teal-100 bg-white dark:bg-[#16181d] p-6 text-center shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.05, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-teal-200"
            />
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-2 rounded-full border-2 border-[#111827] border-t-transparent"
            />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
              {['cod', 'yape', 'plin', 'bcp', 'interbank', 'bbva', 'scotiabank', 'pagoefectivo'].includes(paymentMethod)
              ? 'Realizando tu pedido'
              : 'Procesando pago seguro'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-gray-500 dark:text-[#9a9388]">
            Mantén esta página abierta mientras confirmamos la transacción y creamos tu pedido.
          </p>
        </motion.div>
      )}

      {!stripeEnabled && (
        <div className="border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Modo demostración</p>
          <p className="mt-1 text-xs text-amber-700">
            Stripe no está configurado. El pago con tarjeta se simula sin cargo real; los demás métodos funcionan con normalidad.
          </p>
        </div>
      )}

      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Elige el método de pago</h3>
        <div className="space-y-3">
          <div
            className={`border transition-colors ${
              paymentMethod === 'card' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'card'}
                onChange={() => {
                  setPaymentMethod('card');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="mt-1 accent-[#9d731e]"
              />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-600 dark:text-[#9ca3af]" />
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Tarjeta de crédito / débito</p>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-[#9a9388]">Pago seguro a través de Stripe</p>
              </div>
            </label>

            {paymentMethod === 'card' && stripeEnabled && (
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0 pl-9 sm:pl-10">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#9a9388]">Número de tarjeta</label>
                    <div
                      className={`rounded-sm border bg-white dark:bg-[#16181d] p-3 sm:p-4 transition-colors ${
                        cardErrors.number ? 'border-red-400' : 'border-gray-200'
                      }`}
                    >
                      <CardNumberElement 
                        options={cardElementOptions} 
                        onChange={(e) => setCardErrors(p => ({ ...p, number: e.error?.message || null }))} 
                      />
                    </div>
                    {cardErrors.number && <p className="mt-1.5 text-xs font-medium text-red-600">{cardErrors.number}</p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#9a9388]">Fecha de vencimiento</label>
                      <div
                        className={`rounded-sm border bg-white dark:bg-[#16181d] p-3 sm:p-4 transition-colors ${
                          cardErrors.expiry ? 'border-red-400' : 'border-gray-200'
                        }`}
                      >
                        <CardExpiryElement 
                          options={cardElementOptions} 
                          onChange={(e) => setCardErrors(p => ({ ...p, expiry: e.error?.message || null }))} 
                        />
                      </div>
                      {cardErrors.expiry && <p className="mt-1.5 text-xs font-medium text-red-600">{cardErrors.expiry}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#9a9388]">CVC</label>
                      <div
                        className={`rounded-sm border bg-white dark:bg-[#16181d] p-3 sm:p-4 transition-colors ${
                          cardErrors.cvc ? 'border-red-400' : 'border-gray-200'
                        }`}
                      >
                        <CardCvcElement 
                          options={cardElementOptions} 
                          onChange={(e) => setCardErrors(p => ({ ...p, cvc: e.error?.message || null }))} 
                        />
                      </div>
                      {cardErrors.cvc && <p className="mt-1.5 text-xs font-medium text-red-600">{cardErrors.cvc}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {paymentMethod === 'card' && !stripeEnabled && (
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0 pl-9 sm:pl-10">
                <p className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Modo demostración: Stripe no está configurado, por lo que el pago con tarjeta se simula sin un cargo real.
                </p>
              </div>
            )}
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'cod' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => {
                  setPaymentMethod('cod');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Pago contra entrega</p>
                <p className="text-xs text-gray-500 dark:text-[#9a9388]">Paga cuando llegue tu pedido</p>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'yape' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'yape'}
                onChange={() => {
                  setPaymentMethod('yape');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                  <QrCode className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Yape</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Paga con la app Yape (BCP)</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'plin' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'plin'}
                onChange={() => {
                  setPaymentMethod('plin');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Plin</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Interbank, BBVA, Scotiabank y más</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'bcp' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'bcp'}
                onChange={() => {
                  setPaymentMethod('bcp');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Banca móvil BCP</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Directo desde la app BCP</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'interbank' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'interbank'}
                onChange={() => {
                  setPaymentMethod('interbank');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">App Interbank</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Directo desde la app Interbank</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'bbva' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'bbva'}
                onChange={() => {
                  setPaymentMethod('bbva');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">App BBVA</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Directo desde la app BBVA</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'scotiabank' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'scotiabank'}
                onChange={() => {
                  setPaymentMethod('scotiabank');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <Building2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">App Scotiabank</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Directo desde la app Scotiabank</p>
                </div>
              </div>
            </label>
          </div>

          <div
            className={`border transition-colors ${
              paymentMethod === 'pagoefectivo' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'pagoefectivo'}
                onChange={() => {
                  setPaymentMethod('pagoefectivo');
                  setCardErrors({ number: null, expiry: null, cvc: null });
                }}
                className="accent-[#9d731e]"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">PagoEfectivo</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Paga en efectivo en agentes/bancos</p>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Yape / Plin: QR del comercio + comprobante */}
      {isOfflineTransfer && activeMerchant && (
        <div className="border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-[#16181d] p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-[#ece7dd]">
            Paga con {paymentMethod === 'yape' ? 'Yape' : 'Plin'}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-[#9a9388]">
            Escanea el código QR con tu app {paymentMethod === 'yape' ? 'Yape' : 'Plin'} y paga{' '}
            <span className="font-bold text-gray-900 dark:text-[#ece7dd]">
              S/ {orderTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            . Luego ingresa el <span className="font-bold text-gray-900 dark:text-[#ece7dd]">código de aprobación</span> de 6 dígitos para confirmar tu pedido.
          </p>
          {activeMerchant.qrImageUrl && !qrBroken ? (
            <div className="mt-4 flex justify-center">
              <ProductImage
                src={activeMerchant.qrImageUrl}
                alt={`QR ${paymentMethod === 'yape' ? 'Yape' : 'Plin'}`}
                fallbackLabel={`QR ${paymentMethod === 'yape' ? 'Yape' : 'Plin'}`}
                onError={() => setQrBroken(true)}
                className="h-56 w-56 rounded-md border border-gray-200 bg-white object-contain p-2 dark:border-[#26282e]"
              />
            </div>
          ) : (
            <p className="mt-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Demo: coloca tu QR real de {paymentMethod === 'yape' ? 'Yape' : 'Plin'} en <code>wwwroot/uploads/payments/{paymentMethod}.png</code> para verlo aquí.
              Mientras tanto, escribe cualquier código de 6 dígitos para probar el flujo.
            </p>
          )}
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-[#9a9388]">
            <span className="font-bold text-gray-900 dark:text-[#ece7dd]">{activeMerchant.ownerName || 'Urbaniq'}</span>
            {activeMerchant.phone && <> · {activeMerchant.phone}</>}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">
              Código de aprobación (Yape/Plin)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={approvalCode}
              onChange={(e) => setApprovalCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 123456"
              className="w-full border border-gray-300 px-3 py-2.5 text-sm tracking-[0.3em] dark:bg-[#0e0f12] dark:border-[#26282e] dark:text-[#ece7dd]"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-[#9a9388]">
              Lo encuentras en la pantalla de pago de tu app, tras transferir. El vendedor lo valida en su Yape.
            </p>
          </div>
        </div>
      )}

      {/* Comprobante de pago (base para SUNAT) */}
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-[#ece7dd]">Comprobante de pago</h3>
        <div className="mt-4 flex gap-3">
          <label className={`flex flex-1 cursor-pointer items-center gap-2 border p-3 ${invoiceType === 'Boleta' ? invoiceSelectedClass : invoiceUnselectedClass}`}>
            <input type="radio" name="invoiceType" checked={invoiceType === 'Boleta'} onChange={() => setInvoiceType('Boleta')} className="accent-[#9d731e]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-[#ece7dd]">Boleta</span>
          </label>
          <label className={`flex flex-1 cursor-pointer items-center gap-2 border p-3 ${invoiceType === 'Factura' ? invoiceSelectedClass : invoiceUnselectedClass}`}>
            <input type="radio" name="invoiceType" checked={invoiceType === 'Factura'} onChange={() => setInvoiceType('Factura')} className="accent-[#9d731e]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-[#ece7dd]">Factura</span>
          </label>
        </div>

        {invoiceType === 'Factura' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">RUC</label>
              <input
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                placeholder="20123456789"
                className="w-full border border-gray-300 px-3 py-2 text-sm dark:bg-[#0e0f12] dark:border-[#26282e] dark:text-[#ece7dd]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">Razón social</label>
              <input
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Empresa S.A.C."
                className="w-full border border-gray-300 px-3 py-2 text-sm dark:bg-[#0e0f12] dark:border-[#26282e] dark:text-[#ece7dd]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">Dirección fiscal (opcional)</label>
              <input
                value={fiscalAddress}
                onChange={(e) => setFiscalAddress(e.target.value)}
                placeholder="Av. ..."
                className="w-full border border-gray-300 px-3 py-2 text-sm dark:bg-[#0e0f12] dark:border-[#26282e] dark:text-[#ece7dd]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Envío (modelo peruano: Lima gratis / provincias contra entrega vía agencia) */}
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-[#ece7dd]">Envío</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#9a9388]">
          {isProvince
            ? 'Provincias: contra entrega vía agencia de transporte. Pagas el envío al recoger en destino.'
            : 'Lima Metropolitana: envío gratis con flota propia (entrega al siguiente día).'}
        </p>
        {isProvince && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">Agencia de transporte</label>
            <select
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm dark:bg-[#0e0f12] dark:border-[#26282e] dark:text-[#ece7dd]"
            >
              {PROVINCE_AGENCIES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#9a9388]">Monto a pagar</p>
            {shippingCost > 0 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9388]">
                Productos: S/ {finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Envío: S/ {shippingCost.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            <p className="mt-1 text-2xl font-black text-gray-900 dark:text-[#ece7dd]">S/ {orderTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <Lock className="h-5 w-5 text-gray-300" />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 border border-gray-300 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-[#9ca3af] transition-colors hover:border-gray-400"
        >
           <ArrowLeft className="h-4 w-4" />
           Atrás
        </button>
        <button
          onClick={handlePayment}
          disabled={isProcessing || (stripeEnabled && paymentMethod === 'card' && !stripe)}
          className="flex flex-1 items-center justify-center gap-2 bg-[#111827] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740] disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <CheckCircle className="h-4 w-4 animate-pulse" />
              Processing
            </>
          ) : paymentMethod === 'cod' ? (
            'Realizar pedido (Pago contra entrega)'
          ) : isOfflineTransfer ? (
            'Confirmar pedido'
          ) : paymentButtonText}
        </button>
      </div>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-gray-400">
        <Lock className="h-3 w-3" /> Tu información de pago está cifrada y es segura
      </p>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const { data: paymentConfig, isLoading } = useGetPaymentConfigQuery();
  const stripeEnabled = Boolean(paymentConfig?.publishableKey);
  const stripePromise = useMemo(
    () => (stripeEnabled ? loadStripe(paymentConfig!.publishableKey) : null),
    [stripeEnabled, paymentConfig?.publishableKey]
  );

  if (isLoading) {
    return (
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9a9388]">Cargando pago seguro</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} stripeEnabled={stripeEnabled} />
    </Elements>
  );
};

export default PaymentForm;
