import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, CreditCard, Check, Edit2, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetCartQuery } from '@/features/cart/cartApiSlice';
import { useGetAddressesQuery, useDeleteAddressMutation } from './addressApiSlice';
import type { Address } from './addressApiSlice';
import AddressForm from './components/AddressForm';
import { estimateText } from './deliveryHelper';
import OrderSummary from './components/OrderSummary';
import PaymentForm from './components/PaymentForm';
import OrderSuccessScreen from './components/OrderSuccessScreen';
import type { OrderSuccessDetails } from './components/PaymentForm';
import { useLazyValidateDeliveryQuery } from '@/features/orders/orderApiSlice';
import type { RootState } from '@/app/store';

type Step = 'address' | 'summary' | 'payment';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'address', label: 'Dirección', icon: MapPin },
  { key: 'summary', label: 'Resumen del pedido', icon: Package },
  { key: 'payment', label: 'Pago', icon: CreditCard },
];

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessDetails | null>(null);

  const { data: addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useGetAddressesQuery(undefined);
  const [deleteAddress] = useDeleteAddressMutation();
  const { data: cart, isLoading: cartLoading } = useGetCartQuery(undefined);
  const [validateDelivery, { isFetching: isValidatingDelivery }] = useLazyValidateDeliveryQuery();

  useEffect(() => {
    if (!showAddressForm && !selectedAddress && addresses && addresses.length > 0) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, showAddressForm]);

  // Sin token (checkout invitado) no redirigimos — el backend maneja carritos anónimos

  const currentStepIndex = STEPS.findIndex((step) => step.key === currentStep);

  if (cartLoading || addressesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#111827] border-t-transparent" />
      </div>
    );
  }

  if (!orderSuccess && (!cart || cart.items.length === 0)) {
    navigate('/cart');
    return null;
  }

  if (orderSuccess) {
    return (
      <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <OrderSuccessScreen
            cart={orderSuccess.cart}
            address={orderSuccess.address}
            paymentMethod={orderSuccess.paymentMethod}
          />
        </div>
      </div>
    );
  }

  const validateAddressForDelivery = async (address: Address) => {
    setDeliveryError(null);

    try {
      const response = await validateDelivery(address.addressId).unwrap();
      if (!response.canDeliver) {
        const message = 'Entrega no disponible para este código postal';
        setDeliveryError(message);
        toast.error(message);
        return false;
      }

      return true;
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string } };
      const message = apiError?.data?.message || 'Entrega no disponible para este código postal';
      setDeliveryError(message);
      toast.error(message);
      return false;
    }
  };

  const handleContinueFromAddress = async () => {
    if (!selectedAddress) {
      return;
    }

    if (await validateAddressForDelivery(selectedAddress)) {
      setCurrentStep('summary');
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-10 flex items-center justify-center">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    index <= currentStepIndex ? 'bg-[#111827] text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-xs font-bold uppercase tracking-wider sm:block ${
                    index <= currentStepIndex ? 'text-[#9d731e]' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 w-16 sm:w-24 ${index < currentStepIndex ? 'bg-[#111827]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {currentStep === 'address' && (
          <div className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6 sm:p-8">
            <h2 className="mb-6 text-lg font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">Selecciona la dirección de entrega</h2>

            {addresses && addresses.length > 0 && !showAddressForm && (
              <div className="mb-6 space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.addressId}
                    className={`flex items-start justify-between border p-4 transition-colors ${
                      selectedAddress?.addressId === address.addressId
                        ? 'border-[#111827] bg-[#f3ecdf]/60 dark:bg-[#9d731e]/20 dark:border-[#9d731e]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-[#33363d] dark:hover:border-[#9d731e]'
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-4 flex-1">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?.addressId === address.addressId}
                        onChange={() => {
                          setSelectedAddress(address);
                          setDeliveryError(null);
                        }}
                        className="mt-1 accent-[#9d731e]"
                      />
                      <div className="text-sm">
                        <p className="font-bold text-gray-900 dark:text-[#ece7dd]">{address.fullName}</p>
                        <p className="mt-1 text-gray-600 dark:text-[#9ca3af]">
                          {address.houseName}
                        </p>
                        <p className="text-gray-600 dark:text-[#9ca3af]">{address.district}, {address.province} — {address.department}</p>
                        <p className="text-gray-600 dark:text-[#9ca3af]">{address.landMark}</p>
                        <p className="mt-1 text-xs font-medium text-[#9d731e]">
                          {estimateText(address.deliveryZone)}
                        </p>
                        <p className="text-gray-600 dark:text-[#9ca3af]">Teléfono: {address.phoneNumber}</p>
                      </div>
                    </label>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(address);
                          setShowAddressForm(true);
                          setDeliveryError(null);
                        }}
                        className="text-gray-500 dark:text-[#9a9388] hover:text-[#9d731e] p-1 transition-colors"
                         title="Editar dirección"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
                             try {
                               await deleteAddress(address.addressId).unwrap();
                               toast.success('Dirección eliminada exitosamente');
                               if (selectedAddress?.addressId === address.addressId) {
                                 setSelectedAddress(null);
                                 setDeliveryError(null);
                               }
                               await refetchAddresses();
                             } catch {
                               toast.error('No se pudo eliminar la dirección');
                             }
                          }
                        }}
                        className="text-gray-500 dark:text-[#9a9388] hover:text-red-600 p-1 transition-colors"
                         title="Eliminar dirección"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddressForm ? (
              <AddressForm
                initialData={editingAddress}
                onSuccess={async (address) => {
                  setSelectedAddress(address);
                  setShowAddressForm(false);
                  setEditingAddress(null);
                  await refetchAddresses();
                  if (await validateAddressForDelivery(address)) {
                    setCurrentStep('summary');
                  }
                }}
                onCancel={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                  setDeliveryError(null);
                }}
              />
            ) : (
              <button
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressForm(true);
                }}
                className="w-full border-2 border-dashed border-gray-300 py-3 text-sm font-bold uppercase tracking-wider text-[#9d731e] transition-colors hover:border-[#111827]"
              >
                + Agregar nueva dirección
              </button>
            )}

            {deliveryError && !showAddressForm && (
              <p className="mt-4 text-sm font-medium text-red-600">{deliveryError}</p>
            )}

            {selectedAddress && !showAddressForm && (
              <button
                onClick={handleContinueFromAddress}
                disabled={isValidatingDelivery}
                className="mt-6 w-full bg-[#111827] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740] disabled:opacity-60"
              >
                {isValidatingDelivery ? 'Verificando entrega...' : 'Continuar al resumen del pedido'}
              </button>
            )}
          </div>
        )}

        {currentStep === 'summary' && selectedAddress && cart && (
          <OrderSummary
            cart={cart}
            address={selectedAddress}
            onBack={() => setCurrentStep('address')}
            onContinue={() => setCurrentStep('payment')}
          />
        )}

        {currentStep === 'payment' && selectedAddress && cart && (
          <PaymentForm
            cart={cart}
            addressId={selectedAddress.addressId}
            address={selectedAddress}
            onBack={() => setCurrentStep('summary')}
            onOrderSuccess={setOrderSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
