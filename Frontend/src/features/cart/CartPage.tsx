import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetCartQuery,
  useRemoveFromCartMutation,
  useIncreaseQuantityMutation,
  useDecreaseQuantityMutation,
} from './cartApiSlice';
import { removeFromCart, selectCartCount, selectCartItems, selectCartTotal, updateQuantity } from './cartSlice';
import type { RootState } from '@/app/store';
import { getApiErrorMessage } from '@/app/apiError';
import ProductImage from '@/features/catalog/components/ProductImage';
import { useValidateCouponMutation } from '@/features/orders/orderApiSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import AvailableCoupons from '@/features/coupons/AvailableCoupons';
import CouponHistory from '@/features/coupons/CouponHistory';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector(selectCurrentUser);

  const { data: serverCart, isLoading } = useGetCartQuery(undefined, { skip: !token });
  const localItems = useSelector(selectCartItems);
  const localTotal = useSelector(selectCartTotal);
  const localCount = useSelector(selectCartCount);

  const [removeServerItem] = useRemoveFromCartMutation();
  const [increaseQty] = useIncreaseQuantityMutation();
  const [decreaseQty] = useDecreaseQuantityMutation();
  const [validateCoupon] = useValidateCouponMutation();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const cartItems = isServerCart ? activeServerCart.items : localItems;
      const categoryIds = cartItems.map(item => item.productId).slice(0, 20); // approximate
      const productIds = cartItems.map(item => item.productId);
      const cartTotal = isServerCart ? activeServerCart.finalAmount : localTotal;
      
      const result = await validateCoupon({
        code: couponCode.trim().toUpperCase(),
        cartTotal,
        productIds,
        categoryIds: [],
        userId: currentUser?.userId
      }).unwrap();
      
      if (result.isValid) {
        setAppliedCoupon({ code: result.code, discount: result.discountAmount });
        setCouponError(null);
        toast.success('Cupón aplicado correctamente');
      } else {
        setCouponError(result.errorMessage || 'Cupón inválido');
        setAppliedCoupon(null);
      }
    } catch (error: unknown) {
      setCouponError('Error al validar el cupón');
      setAppliedCoupon(null);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const isServerCart = Boolean(token && serverCart);
  const activeServerCart = serverCart!;
  const items = isServerCart
    ? activeServerCart.items.map((item) => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        slug: item.slug ?? item.productId,
        name: item.productName,
        image: item.image,
        size: item.size,
        color: item.color,
        price: item.price,
        discount: item.discount,
        quantity: item.quantity,
      }))
    : localItems.map((item) => ({
        cartItemId: item.cartItemKey,
        productId: item.id,
        slug: item.slug,
        name: item.productName,
        image: item.image,
        size: item.selectedSize,
        color: item.selectedColor,
        price: item.price,
        discount: item.discount,
        quantity: item.cartQuantity,
      }));

  const totalAmount = isServerCart ? activeServerCart.finalAmount : localTotal;
  const totalItems = isServerCart
    ? activeServerCart.items.reduce((sum, item) => sum + item.quantity, 0)
    : localCount;

  const handleRemove = async (cartItemId: string) => {
    if (isServerCart) {
      try {
        await removeServerItem(cartItemId).unwrap();
        toast.success('Artículo eliminado');
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'No se pudo eliminar el artículo'));
      }
      return;
    }

    dispatch(removeFromCart(cartItemId));
  };

  const handleIncrease = async (cartItemId: string) => {
    if (isServerCart) {
      try {
        await increaseQty({ cartItemId }).unwrap();
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'No se puede aumentar la cantidad'));
      }
      return;
    }

    const item = localItems.find((entry) => entry.cartItemKey === cartItemId);
    if (item) {
      dispatch(updateQuantity({ cartItemKey: cartItemId, quantity: item.cartQuantity + 1 }));
    }
  };

  const handleDecrease = async (cartItemId: string) => {
    if (isServerCart) {
      try {
        await decreaseQty({ cartItemId }).unwrap();
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'No se puede reducir la cantidad'));
      }
      return;
    }

    const item = localItems.find((entry) => entry.cartItemKey === cartItemId);
    if (item) {
      dispatch(updateQuantity({ cartItemKey: cartItemId, quantity: item.cartQuantity - 1 }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#111827] border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="mb-6 h-20 w-20 text-gray-200 dark:text-[#9a9388]" />
        <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">Tu carrito está vacío</h2>
        <p className="mb-8 max-w-sm text-sm text-gray-500 dark:text-[#9a9388]">
          Parece que aún no has agregado nada a tu carrito. Empieza a comprar para llenarlo.
        </p>
        <Link
          to="/catalog"
          className="bg-[#111827] px-10 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740]"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">
            Carrito de compras <span className="text-lg font-medium normal-case text-gray-400">({totalItems} artículos)</span>
          </h1>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-4">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex gap-4 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-4 sm:gap-6 sm:p-6">
                <Link to={`/product/${item.slug}`} className="shrink-0">
                  <ProductImage
                    src={item.image || '/product-images/placeholder.svg'}
                    alt={item.name}
                    fallbackLabel={item.name}
                    className="h-32 w-24 bg-gray-50 dark:bg-[#0e0f12] object-cover sm:h-36 sm:w-28"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.slug}`}>
                    <h3 className="truncate text-sm font-bold text-gray-900 dark:text-[#ece7dd] transition-colors hover:text-[#9d731e]">
                      {item.name}
                    </h3>
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-[#9a9388]">
                    <span>Color: <strong className="text-gray-700">{item.color}</strong></span>
                    {item.size && item.size !== 'Unico' && (
                      <span>Versión: <strong className="text-gray-700">{item.size}</strong></span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-base font-black text-gray-900 dark:text-[#ece7dd]">
                      S/ {(item.price - item.discount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {item.discount > 0 && (
                      <>
                        <span className="text-xs text-gray-400 line-through">S/ {item.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-xs font-bold text-orange-500">
                          ({Math.round((item.discount / item.price) * 100)}% OFF)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-[#9a9388]">Cant:</span>
                    <div className="flex items-center border border-gray-200">
                      <button
                        onClick={() => handleDecrease(item.cartItemId)}
                        disabled={item.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-gray-50 dark:bg-[#0e0f12] disabled:opacity-30"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200 text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncrease(item.cartItemId)}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-gray-50 dark:bg-[#0e0f12]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(item.cartItemId)}
                  className="self-start p-2 text-gray-400 transition-colors hover:text-red-500"
                  title="Eliminar artículo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="shrink-0 lg:w-96">
            <div className="sticky top-24 border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-6">
              <h3 className="mb-6 border-b border-gray-100 dark:border-[#26282e] pb-4 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
                Detalles del precio ({totalItems} artículos)
              </h3>

              {/* Available Coupons Section */}
              {token && (
                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-[#26282e]">
                  <AvailableCoupons />
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-[#9ca3af]">Subtotal</span>
                  <span className="font-medium">S/ {items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span className="font-medium">-S/ {items.reduce((sum, item) => sum + item.discount * item.quantity, 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-[#9ca3af]">Costo de envío</span>
                  <span className="font-medium text-green-600 dark:text-green-400">GRATIS</span>
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1a1c21] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-[#111827]" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">Cupón de descuento</span>
                  </div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-300">{appliedCoupon.code}</span>
                        <span className="text-sm text-green-600 dark:text-green-400">
                          -S/ {appliedCoupon.discount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs text-gray-500 hover:text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Ingresa tu código"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-[#33363d] rounded-lg bg-white dark:bg-[#0e0f12] text-[#111827] dark:text-[#ece7dd] text-sm"
                        maxLength={20}
                      />
                      <button
                        onClick={handleValidateCoupon}
                        disabled={couponValidating || !couponCode.trim()}
                        className="px-4 py-2 bg-[#111827] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#1f2740] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {couponValidating ? 'Validando...' : 'Aplicar'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{couponError}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="mt-6 flex w-full items-center justify-center gap-2 bg-[#111827] py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1f2740]"
              >
                Pagar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
