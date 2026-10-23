import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, CreditCard, Lock, ShieldCheck, X, XCircle, Smartphone, QrCode, Wallet } from 'lucide-react';
import { useCreateMercadoPagoCheckoutMutation, useCreatePaymentIntentMutation, useCreateYapeSandboxPaymentMutation, useGetMerchantMethodsQuery, useGetPaymentConfigQuery, useGetShippingConfigQuery, useVerifyPaymentMutation } from '../paymentApiSlice';
import type { ShippingConfig } from '../paymentApiSlice';
import { useAttachVoucherMutation, usePlaceOrderMutation } from '@/features/orders/orderApiSlice';
import type { CartResponse } from '@/features/cart/cartApiSlice';
import type { Address } from '../addressApiSlice';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import ProductImage from '@/features/catalog/components/ProductImage';
import { getApiErrorMessage } from '@/app/apiError';
import { calculateShippingCost, PROVINCE_AGENCIES, resolveShippingProvider } from '../deliveryHelper';
import { isMerchantPaymentConfigured } from '../merchantPayment';
import { createYapeSandboxToken } from '../mercadoPagoYape';

export interface OrderSuccessDetails {
  orderId: string;
  cart: CartResponse;
  address?: Address | null;
  paymentMethod: PaymentMethod;
}

export type PaymentMethod = 'card' | 'mercadopago' | 'yape-sandbox' | 'cod' | 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'scotiabank' | 'pagoefectivo';

interface PaymentFormProps {
  cart: CartResponse;
  addressId: string;
  address?: Address | null;
  onBack: () => void;
  onOrderSuccess: (details: OrderSuccessDetails) => void;
}

const CheckoutForm: React.FC<PaymentFormProps & { stripeEnabled?: boolean; mercadoPagoEnabled?: boolean; mercadoPagoPublicKey?: string; yapeSandboxEnabled?: boolean; shippingConfig: ShippingConfig }> = ({
  cart,
  addressId,
  address,
  onBack,
  onOrderSuccess,
  stripeEnabled = true,
  mercadoPagoEnabled = false,
  mercadoPagoPublicKey = '',
  yapeSandboxEnabled = false,
  shippingConfig,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(yapeSandboxEnabled ? 'yape-sandbox' : mercadoPagoEnabled ? 'mercadopago' : stripeEnabled ? 'card' : 'cod');
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

  const [checkoutKey] = useState(() => crypto.randomUUID());
  const [reservedOrderId, setReservedOrderId] = useState<string>();
  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [createMercadoPagoCheckout] = useCreateMercadoPagoCheckoutMutation();
  const [createYapeSandboxPayment] = useCreateYapeSandboxPaymentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [placeOrder] = usePlaceOrderMutation();
  const [attachVoucher] = useAttachVoucherMutation();
  const { data: merchantMethods } = useGetMerchantMethodsQuery();

  const isOfflineTransfer = !['card', 'mercadopago', 'yape-sandbox', 'cod'].includes(paymentMethod);
  const activeMerchant = paymentMethod === 'yape' ? merchantMethods?.yape
    : paymentMethod === 'plin' ? merchantMethods?.plin
    : undefined;

  const [approvalCode, setApprovalCode] = useState('');
  const [qrBroken, setQrBroken] = useState(false);
  const [yapeTestPhone, setYapeTestPhone] = useState('111111111');
  const [yapeTestOtp, setYapeTestOtp] = useState('123456');
  const [showYapeModal, setShowYapeModal] = useState(false);
  const [yapeApprovalRequested, setYapeApprovalRequested] = useState(false);

  useEffect(() => {
    setQrBroken(false);
    setApprovalCode('');
    setShowYapeModal(false);
    setYapeApprovalRequested(false);
  }, [paymentMethod]);

  useEffect(() => {
    if (!showYapeModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        setShowYapeModal(false);
        setYapeApprovalRequested(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showYapeModal, isProcessing]);

  const finalAmount = cart.finalAmount;

  const openYapeSandbox = () => {
    setFailureMessage(null);
    setYapeApprovalRequested(false);
    setShowYapeModal(true);
  };

  const closeYapeSandbox = () => {
    setShowYapeModal(false);
    setYapeApprovalRequested(false);
  };

  const requestYapeSandboxApproval = () => {
    if (!/^\d{9}$/.test(yapeTestPhone)) {
      toast.error('Ingresa el celular de prueba de 9 dígitos.');
      return;
    }
    setYapeApprovalRequested(true);
  };

  const isProvince = address?.deliveryZone !== 'LimaMetropolitana';
  const shippingCost = calculateShippingCost(address?.deliveryZone, finalAmount, shippingConfig);
  const orderTotal = finalAmount + shippingCost;
  const shippingProvider = resolveShippingProvider(address?.deliveryZone, agency);

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
    const isMercadoPagoPayment = paymentMethod === 'mercadopago';
    const isYapeSandboxPayment = paymentMethod === 'yape-sandbox';

    if (isYapeSandboxPayment && (!yapeSandboxEnabled || !mercadoPagoPublicKey)) {
      toast.error('Yape sandbox no está disponible en este entorno.');
      return;
    }

    if (['yape', 'plin'].includes(paymentMethod) && !isMerchantPaymentConfigured(activeMerchant)) {
      toast.error('Este método aún no está habilitado. Elige otro método disponible.');
      return;
    }

    if (isCardPayment && !stripeEnabled) {
      toast.error('El pago con tarjeta no está disponible. Elige otro método de pago.');
      return;
    }

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
      if (isYapeSandboxPayment) {
        if (!/^\d{9}$/.test(yapeTestPhone) || !/^\d{6}$/.test(yapeTestOtp))
          throw new Error('Ingresa el celular de 9 dígitos y el código de aprobación de prueba de 6 dígitos.');
        const token = await createYapeSandboxToken(mercadoPagoPublicKey, yapeTestPhone, yapeTestOtp);
        const placed = await placeOrder({
          addressId,
          transactionId: checkoutKey,
          paymentMethod: 'mercadopago',
          invoiceType,
          ruc: invoiceType === 'Factura' ? ruc.trim() : undefined,
          razonSocial: invoiceType === 'Factura' ? razonSocial.trim() : undefined,
          fiscalAddress: fiscalAddress.trim() || undefined,
          shippingProvider,
          couponCode: cart.couponCode,
        }).unwrap();
        setReservedOrderId(placed.orderId);
        const result = await createYapeSandboxPayment({ orderId: placed.orderId, token, phoneNumber: yapeTestPhone }).unwrap();
        if (!result.isSuccessful) throw new Error(`Mercado Pago devolvió el estado: ${result.status}.`);
        onOrderSuccess({
          orderId: placed.orderId,
          cart: { ...cart, items: cart.items.map((item) => ({ ...item })) },
          address,
          paymentMethod: 'yape-sandbox',
        });
      } else if (isMercadoPagoPayment) {
        const placed = await placeOrder({
          addressId,
          transactionId: checkoutKey,
          paymentMethod: 'mercadopago',
          invoiceType,
          ruc: invoiceType === 'Factura' ? ruc.trim() : undefined,
          razonSocial: invoiceType === 'Factura' ? razonSocial.trim() : undefined,
          fiscalAddress: fiscalAddress.trim() || undefined,
          shippingProvider,
          couponCode: cart.couponCode,
        }).unwrap();
        setReservedOrderId(placed.orderId);
        const checkout = await createMercadoPagoCheckout({ orderId: placed.orderId }).unwrap();
        if (!checkout.checkoutUrl) throw new Error('Mercado Pago no devolvió una URL de pago.');
        window.location.assign(checkout.checkoutUrl);
        return;
      } else if (isCardPayment && stripeEnabled) {
        const cardElement = elements!.getElement(CardNumberElement);
        if (!cardElement) throw new Error('Card element not found');

                const placed = await placeOrder({
          addressId,
          transactionId: checkoutKey,
          paymentMethod: 'card',
          invoiceType,
          ruc: invoiceType === 'Factura' ? ruc.trim() : undefined,
          razonSocial: invoiceType === 'Factura' ? razonSocial.trim() : undefined,
          fiscalAddress: fiscalAddress.trim() || undefined,
          shippingProvider,
          couponCode: cart.couponCode,
        }).unwrap();

        setReservedOrderId(placed.orderId);
        const intentResult = await createPaymentIntent({ orderId: placed.orderId }).unwrap();
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
          setFailureMessage(reservedOrderId ? `${message} Tu pedido quedó guardado. Continúa el pago desde Mis pedidos.` : message);
          toast.error(message);
          setIsProcessing(false);
          return;
        }

        const verification = await verifyPayment({ orderId: placed.orderId, paymentIntentId: paymentIntent.id }).unwrap();
        if (!verification.data?.isSuccessful) {
          throw new Error('La verificación del pago falló. Por favor, contacta soporte si se descontó dinero.');
        }

        onOrderSuccess({
          orderId: placed.orderId,
          cart: { ...cart, items: cart.items.map((item) => ({ ...item })) },
          address,
          paymentMethod: 'card',
        });
      } else {
        const transactionId = checkoutKey;

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
          orderId: placed.orderId,
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
          className="border border-gray-200 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6 text-center shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.05, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gray-200 dark:bg-[#26282e]"
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

      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Elige el método de pago</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Solo métodos disponibles</span>
        </div>
        <div className="space-y-3">
          {yapeSandboxEnabled && (
          <div
            onClick={() => setPaymentMethod('yape-sandbox')}
            className={`border transition-colors ${
              paymentMethod === 'yape-sandbox' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
          >
            <label className="flex cursor-pointer items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'yape-sandbox'}
                onChange={() => setPaymentMethod('yape-sandbox')}
                className="accent-[#9d731e]"
              />
              <Smartphone className="h-5 w-5 text-[#742284]" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Yape de prueba</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Sin dinero real</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#9a9388]">
                  Sandbox oficial de Mercado Pago para una demostración ficticia
                </p>
              </div>
            </label>
          </div>
          )}
          {mercadoPagoEnabled && (
          <div
            onClick={() => setPaymentMethod('mercadopago')}
            className={`border transition-colors ${
              paymentMethod === 'mercadopago' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
          >
            <label className="flex cursor-pointer items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'mercadopago'}
                onChange={() => setPaymentMethod('mercadopago')}
                className="accent-[#9d731e]"
              />
              <Wallet className="h-5 w-5 text-[#009ee3]" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Mercado Pago</p>
                <p className="text-xs text-gray-500 dark:text-[#9a9388]">
                  Tarjetas y Yape con confirmación automática
                </p>
              </div>
            </label>
          </div>
          )}
          {stripeEnabled && (
          <div
            onClick={() => {
              setPaymentMethod('card');
              setCardErrors({ number: null, expiry: null, cvc: null });
            }}
            className={`border transition-colors ${
              paymentMethod === 'card' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
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

            {paymentMethod === 'card' && (
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
          </div>
          )}

          <div
            onClick={() => {
              setPaymentMethod('cod');
              setCardErrors({ number: null, expiry: null, cvc: null });
            }}
            className={`border transition-colors ${
              paymentMethod === 'cod' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Pago contra entrega</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">Disponible</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#9a9388]">Paga cuando llegue tu pedido</p>
              </div>
            </label>
          </div>

          {isMerchantPaymentConfigured(merchantMethods?.yape) && (
          <div
            onClick={() => setPaymentMethod('yape')}
            className={`border transition-colors ${
              paymentMethod === 'yape' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
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
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-[#26282e]">
                  <QrCode className="h-5 w-5 text-[#9d731e]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-[#ece7dd]">Yape</p>
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Transferencia con verificación del comercio</p>
                </div>
              </div>
            </label>
          </div>
          )}

          {isMerchantPaymentConfigured(merchantMethods?.plin) && (
          <div
            onClick={() => setPaymentMethod('plin')}
            className={`border transition-colors ${
              paymentMethod === 'plin' ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]' : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
            } cursor-pointer`}
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
                  <p className="text-xs text-gray-500 dark:text-[#9a9388]">Transferencia con verificación del comercio</p>
                </div>
              </div>
            </label>
          </div>
          )}

        </div>
      </div>

      {paymentMethod === 'yape-sandbox' && (
        <div className="overflow-hidden rounded-2xl border border-[#742284]/20 bg-gradient-to-br from-[#fbf7fc] via-white to-[#f1fff9] shadow-sm dark:from-[#211326] dark:via-[#16181d] dark:to-[#102019]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="relative mx-auto grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#742284] to-[#a13ab0] text-white shadow-lg shadow-[#742284]/20 sm:mx-0">
              <Smartphone className="h-12 w-12" aria-hidden="true" />
              <span className="absolute bottom-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                Sandbox
              </span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h3 className="text-base font-black text-[#40114a] dark:text-[#f1dff5]">Paga con Yape Sandbox</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                  Sin dinero real
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-[#b8b0a5]">
                Usa las credenciales de prueba de Mercado Pago para simular la aprobación, sin realizar un cobro real.
              </p>
              <button
                type="button"
                onClick={openYapeSandbox}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#742284] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5f1d6c] hover:shadow-md"
              >
                <Smartphone className="h-4 w-4" /> Solicitar aprobación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yape / Plin: QR del comercio + comprobante */}
      {isOfflineTransfer && activeMerchant && (
        <div className="border border-gray-200 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-[#ece7dd]">
            Paga con {paymentMethod === 'yape' ? 'Yape' : 'Plin'}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-[#9a9388]">
            Confirma primero el pedido. Después abre su detalle y transfiere con {paymentMethod === 'yape' ? 'Yape' : 'Plin'} al número {activeMerchant.phone}, verificando el titular {activeMerchant.ownerName}. Importe:{' '}
            <span className="font-bold text-gray-900 dark:text-[#ece7dd]">
              S/ {orderTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            . Tu pedido quedará pendiente hasta que el comercio verifique la recepción del dinero.
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
              {qrBroken ? 'No se pudo mostrar el QR. ' : 'Este método aún no tiene un QR configurado. '}
              Puedes pagar directamente al número indicado. Verifica el titular en tu app antes de confirmar.
            </p>
          )}
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-[#9a9388]">
            <span className="font-bold text-gray-900 dark:text-[#ece7dd]">{activeMerchant.ownerName || 'Urbaniq'}</span>
            {activeMerchant.phone && <> · {activeMerchant.phone}</>}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-[#9a9388]">
              Referencia de la transferencia (opcional)
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
              Ingresa únicamente la referencia real de tu transferencia. Este dato no confirma automáticamente el cobro.
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

      {/* Envío calculado con las tarifas del servidor */}
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-[#ece7dd]">Envío</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#9a9388]">
          {isProvince
            ? 'Provincias: selecciona la agencia y consulta la cobertura y el plazo antes de pagar.'
            : 'Lima Metropolitana y Callao: consulta la cobertura y el plazo para tu dirección antes de pagar.'}
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
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9a9388]">
                Productos: S/ {finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Envío: S/ {shippingCost.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
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
          onClick={paymentMethod === 'yape-sandbox' ? openYapeSandbox : handlePayment}
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
          ) : paymentMethod === 'yape-sandbox' ? (
            'Solicitar aprobación Yape'
          ) : paymentButtonText}
        </button>
      </div>

      {showYapeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isProcessing) closeYapeSandbox();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#140b18]/75 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="yape-demo-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#f9f7fa] shadow-2xl shadow-black/40 dark:bg-[#131419]"
          >
            <header className="relative overflow-hidden bg-gradient-to-br from-[#5d176b] via-[#742284] to-[#a13ab0] px-6 pb-8 pt-6 text-white sm:px-8">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[28px] border-white/10" />
              <div className="absolute -bottom-16 left-12 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]">
                    <ShieldCheck className="h-3.5 w-3.5" /> Mercado Pago Sandbox
                  </div>
                  <h2 id="yape-demo-title" className="text-2xl font-black tracking-tight sm:text-3xl">Aprobar compra con Yape</h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/80">
                    Simulación universitaria conectada al entorno de pruebas. Ningún dato genera un cobro real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeYapeSandbox}
                  disabled={isProcessing}
                  aria-label="Cerrar demostración de Yape"
                  className="rounded-full border border-white/20 bg-white/10 p-2.5 transition hover:bg-white/20 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="grid gap-0 md:grid-cols-[280px_1fr]">
              <aside className="border-b border-gray-200 bg-white p-6 md:border-b-0 md:border-r dark:border-[#292b32] dark:bg-[#181a20]">
                <div className="mx-auto max-w-[220px] rounded-3xl bg-gradient-to-br from-[#5d176b] via-[#742284] to-[#a13ab0] p-5 text-white shadow-lg shadow-[#742284]/20">
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                      <Smartphone className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                      Sandbox
                    </span>
                  </div>
                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-white/65">Pago de prueba</p>
                  <p className="mt-1 text-2xl font-black">Yape</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/75">Procesado en el entorno de pruebas de Mercado Pago.</p>
                </div>
                <div className="mt-5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Monto de demostración</p>
                  <p className="mt-1 text-3xl font-black text-[#40114a] dark:text-[#f1dff5]">
                    S/ {orderTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-[#9a9388]">
                    La simulación usa únicamente el celular y el código de aprobación de prueba.
                  </p>
                </div>
              </aside>

              <section className="p-6 sm:p-8">
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#742284] text-xs font-black text-white">1</span>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-[#ece7dd]">Datos del comprador de prueba</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-[#9a9388]">Mercado Pago usa estos valores para aprobar el escenario sandbox.</p>
                    </div>
                  </div>

                  <label className="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-[#b8b0a5]">
                    Celular asociado de prueba
                    <div className="mt-2 flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#742284] focus-within:ring-2 focus-within:ring-[#742284]/10 dark:border-[#30323a] dark:bg-[#0e0f12]">
                      <span className="flex items-center border-r border-gray-200 px-3 text-sm font-bold text-gray-400 dark:border-[#30323a]">+51</span>
                      <input
                        aria-label="Celular Yape de prueba"
                        value={yapeTestPhone}
                        onChange={(event) => setYapeTestPhone(event.target.value.replace(/\D/g, '').slice(0, 9))}
                        inputMode="numeric"
                        disabled={yapeApprovalRequested}
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-bold text-gray-900 outline-none disabled:text-gray-500 dark:text-white"
                      />
                    </div>
                  </label>

                  {yapeApprovalRequested ? (
                    <>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <div>
                            <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">Aprobación sandbox solicitada</p>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">Simulamos el aviso que recibirías en Yape. Usa el código de aprobación de prueba <strong>123456</strong>.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">2</span>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-[#ece7dd]">Ingresa el código de aprobación</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-[#9a9388]">En una compra real, este código se obtiene desde la aplicación Yape.</p>
                        </div>
                      </div>

                      <label className="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-[#b8b0a5]">
                        Código de aprobación de prueba
                        <input
                          aria-label="Código de aprobación Yape de prueba"
                          value={yapeTestOtp}
                          onChange={(event) => setYapeTestOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-base font-black tracking-[0.35em] text-gray-900 outline-none focus:border-[#742284] focus:ring-2 focus:ring-[#742284]/10 dark:border-[#30323a] dark:bg-[#0e0f12] dark:text-white"
                        />
                      </label>
                    </>
                  ) : (
                    <p className="rounded-2xl bg-[#f6eff8] p-4 text-xs leading-relaxed text-[#5d176b] dark:bg-[#742284]/15 dark:text-[#e4c8e9]">
                      Pulsa “Solicitar aprobación de prueba” para simular el aviso que Temu enviaría a la aplicación Yape.
                    </p>
                  )}

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                    <strong>Entorno académico:</strong> usa únicamente las credenciales sandbox mostradas. No ingreses un celular ni un código personal.
                  </div>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeYapeSandbox}
                    disabled={isProcessing}
                    className="rounded-xl border border-gray-300 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-[#343740] dark:text-[#b8b0a5] dark:hover:bg-[#1c1e24]"
                  >
                    Cambiar método
                  </button>
                  {yapeApprovalRequested ? (
                    <button
                      type="button"
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#742284] to-[#9b3cab] px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#742284]/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <><ShieldCheck className="h-4 w-4 animate-pulse" /> Procesando prueba…</>
                      ) : (
                        <><Lock className="h-4 w-4" /> Aprobar pago de prueba</>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={requestYapeSandboxApproval}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#742284] to-[#9b3cab] px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#742284]/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <Smartphone className="h-4 w-4" /> Solicitar aprobación de prueba
                    </button>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}

      <p className="flex items-center justify-center gap-1 text-center text-xs text-gray-400">
        <Lock className="h-3 w-3" /> Tu información de pago está cifrada y es segura
      </p>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const { data: paymentConfig, isLoading } = useGetPaymentConfigQuery();
  const { data: shippingConfig, isLoading: shippingLoading, refetch: retryShipping } = useGetShippingConfigQuery();
  const publishableKey = paymentConfig?.publishableKey;
  const stripeEnabled = Boolean(publishableKey);
  const mercadoPagoEnabled = Boolean(paymentConfig?.mercadoPagoEnabled);
  const mercadoPagoPublicKey = paymentConfig?.mercadoPagoPublicKey ?? '';
  const yapeSandboxEnabled = Boolean(paymentConfig?.yapeSandboxEnabled && mercadoPagoPublicKey);
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  if (isLoading || shippingLoading) {
    return (
      <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9a9388]">Cargando pago seguro</p>
      </div>
    );
  }

  if (!shippingConfig) {
    return (
      <div className="p-8 text-center" role="alert">
        <p>No se pudieron consultar los costos de envío. Reintenta antes de pagar.</p>
        <button type="button" onClick={() => retryShipping()} className="mt-4 underline">Reintentar</button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} stripeEnabled={stripeEnabled} mercadoPagoEnabled={mercadoPagoEnabled} mercadoPagoPublicKey={mercadoPagoPublicKey} yapeSandboxEnabled={yapeSandboxEnabled} shippingConfig={shippingConfig} />
    </Elements>
  );
};

export default PaymentForm;
