import React, { useMemo, useState } from 'react';
import { Heart, ShoppingBag, Truck, RotateCcw, ShieldCheck, Share2 } from 'lucide-react';
import type { Product } from '../catalogApiSlice';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/features/cart/cartSlice';
import { toast } from 'react-toastify';
import { useAddToWishlistMutation } from '@/features/wishlist/wishlistApiSlice';
import { getApiErrorMessage, getApiErrorStatus } from '@/app/apiError';

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const dispatch = useDispatch();
  const [addToWishlist] = useAddToWishlistMutation();

  const discountPercent = Math.round((product.discount / product.price) * 100);
  const effectivePrice = product.price - product.discount;
  const colors = useMemo(() => Array.from(new Set(product.variants.map((variant) => variant.color))), [product.variants]);
  const sizes = useMemo(
    () => Array.from(new Set(product.variants.filter((variant) => !selectedColor || variant.color === selectedColor).map((variant) => variant.size))),
    [product.variants, selectedColor]
  );
  const selectedVariant = product.variants.find((variant) => variant.color === selectedColor && variant.size === selectedSize);

  const handleAddToCart = () => {
    if (!selectedColor) {
      toast.error('¡Selecciona un color primero!', { position: 'top-center' });
      return;
    }

    if (!selectedSize || !selectedVariant) {
      toast.error('¡Selecciona una versión válida primero!', { position: 'top-center' });
      return;
    }

    dispatch(addToCart({
      product,
      productVariantId: selectedVariant.id,
      selectedSize,
      selectedColor,
    }));
    toast.success('¡Producto agregado al carrito!');
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-[#9d731e]">
            Urbaniq Premium
          </h2>
          <button className="rounded-full p-2 transition-colors hover:bg-gray-50 dark:bg-[#0e0f12]">
            <Share2 className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <h1 className="text-2xl font-medium leading-tight text-gray-800">
          {product.productName}
        </h1>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-gray-900 dark:text-[#ece7dd]">
            S/ {effectivePrice.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {product.discount > 0 && (
            <>
                 <span className="text-xl text-gray-400 line-through">
                 S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </span>
          <span className="text-lg font-bold text-yellow-600">
                 {discountPercent}% DESCUENTO
               </span>
            </>
          )}
        </div>
         <p className="text-xs font-bold uppercase tracking-widest text-[#9d731e]">
           incluye todos los impuestos
         </p>
      </div>

      <div className="space-y-4 pt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
          Selecciona el color
        </h3>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => {
                setSelectedColor((current) => (current === color ? null : color));
                setSelectedSize(null);
              }}
              className={`border-2 px-4 py-3 text-sm font-black transition-all ${
                selectedColor === color
                  ? 'border-[#111827] bg-[#f3ecdf] text-[#9d731e]'
                  : 'border-gray-200 text-gray-600 dark:text-[#9ca3af] hover:border-gray-400'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          {sizes.length > 1 && (
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
              Selecciona la versión
            </h3>
          )}
          <button className="text-xs font-bold uppercase text-[#9d731e] hover:underline">
            Ver especificaciones
          </button>
        </div>
        {sizes.length > 1 && (
          <div className="flex flex-wrap gap-3">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize((current) => (current === size ? null : size))}
                className={`flex h-14 w-14 items-center justify-center border-2 text-sm font-black transition-all ${
                  selectedSize === size
                    ? 'border-[#111827] bg-[#f3ecdf] text-[#9d731e]'
                    : 'border-gray-200 text-gray-600 dark:text-[#9ca3af] hover:border-gray-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-6">
        <button
          onClick={handleAddToCart}
          className="flex flex-1 items-center justify-center gap-3 bg-[#111827] py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#1f2740]"
        >
           <ShoppingBag className="h-5 w-5" />
           Agregar al carrito
        </button>
        <button
          onClick={async () => {
            try {
              await addToWishlist(product.id).unwrap();
               toast.success('Producto agregado a la lista de deseos');
             } catch (err: unknown) {
               if (getApiErrorStatus(err) === 401) {
                 toast.error('Inicia sesión para agregar a la lista de deseos');
               } else {
                 toast.error(getApiErrorMessage(err, 'No se pudo agregar a la lista de deseos'));
               }
             }
           }}
           className="flex flex-1 items-center justify-center gap-3 border-2 border-gray-200 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all hover:border-gray-900"
         >
           <Heart className="h-5 w-5" />
           Lista de deseos
        </button>
      </div>

      <div className="space-y-4 border-t border-gray-100 dark:border-[#26282e] pt-8">
           <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-[#ece7dd]">
            <Truck className="h-5 w-5" />
            Detalles de entrega
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#9a9388]">
            Envíos a Lima Metropolitana en 24h y al resto del Perú vía Shalom / Marvisur contra entrega.
          </p>
       </div>

      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-[#26282e] pt-8">
        <div className="flex flex-col items-center space-y-1 text-center">
          <RotateCcw className="h-6 w-6 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#9a9388]">Devolución 30 días</span>
        </div>
        <div className="flex flex-col items-center space-y-1 text-center">
          <ShieldCheck className="h-6 w-6 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#9a9388]">Pago seguro</span>
        </div>
        <div className="flex flex-col items-center space-y-1 text-center">
          <Truck className="h-6 w-6 text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#9a9388]">Envío gratis</span>
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;
