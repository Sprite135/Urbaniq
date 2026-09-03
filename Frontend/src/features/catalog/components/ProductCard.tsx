import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import WishlistHeartButton from '@/features/wishlist/WishlistHeartButton';
import { toast } from 'react-toastify';
import { catalogApiSlice } from '../catalogApiSlice';
import ProductImage from './ProductImage';

export interface ProductCardProduct {
  id: string;
  productName: string;
  slug: string;
  quantity: number;
  price: number;
  discount: number;
  image: string;
  color?: string | null;
  averageRating?: number | null;
  totalReviews?: number;
}

interface ProductCardProps {
  product: ProductCardProduct;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value);

const buildCloudinaryCardImage = (imageUrl: string, width: number) => {
  if (!imageUrl.includes('/image/upload/')) {
    return imageUrl;
  }

  const transformation = `f_auto,q_auto:eco,c_fill,g_auto,w_${width},h_${Math.round(width * 4 / 3)}`;
  return imageUrl.replace('/image/upload/', `/image/upload/${transformation}/`);
};

const isCloudinaryUrl = (imageUrl: string) => imageUrl.includes('/image/upload/');

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const prefetchProduct = catalogApiSlice.usePrefetch('getProductBySlug');
  const discountPercent = product.price > 0 ? Math.round((product.discount / product.price) * 100) : 0;
  const effectivePrice = product.price - product.discount;
  const isCloudinary = isCloudinaryUrl(product.image);
  const cardImage = isCloudinary ? buildCloudinaryCardImage(product.image, 420) : product.image;

  const prefetchProductDetail = () => {
    prefetchProduct(product.slug, { ifOlderThan: 60 });
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toast.info('Elige versión, color y código postal de entrega en la página del producto antes de agregarlo al carrito.', {
      position: 'bottom-right',
      autoClose: 2200,
    });
    navigate(`/product/${product.slug}`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-2xl border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-[#d7b46a]/60 hover:shadow-2xl hover:shadow-[#d7b46a]/15 dark:hover:shadow-[#d7b46a]/20 focus-within:ring-2 focus-within:ring-[#9d731e]/50"
    >
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate(`/product/${product.slug}`)}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/product/${product.slug}`); }}
        onFocus={prefetchProductDetail}
        onMouseEnter={prefetchProductDetail}
        onTouchStart={prefetchProductDetail}
        className="block cursor-pointer"
      >
          <div className="relative aspect-[3/4] overflow-hidden bg-[#f3f4f6] dark:bg-[#1a1c21]">
          <ProductImage
            src={cardImage}
            srcSet={isCloudinary
              ? `${buildCloudinaryCardImage(product.image, 320)} 320w, ${cardImage} 420w, ${buildCloudinaryCardImage(product.image, 640)} 640w`
              : undefined}
            sizes="(min-width: 640px) 300px, 260px"
            alt={product.productName}
            fallbackLabel={product.productName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111827]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-[#0b0d11]/50" />

<div className="absolute left-3 top-3 flex flex-col gap-2">
            {discountPercent > 0 && (
              <span className="bg-[#d7b46a] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#111827] dark:text-[#ece7dd]">
                {discountPercent}% de descuento
              </span>
            )}
            {product.quantity <= 5 && (
              <span className="bg-[#111827] dark:bg-[#0b0d11] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                Edición limitada
              </span>
            )}
            {product.averageRating && product.averageRating >= 4 && product.totalReviews && product.totalReviews > 0 && (
              <span className="bg-[#9d731e] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white flex items-center gap-1">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Top Rated
              </span>
            )}
          </div>

          <WishlistHeartButton
            productId={product.id}
            size="sm"
            stopLinkNavigation
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/92 text-[#111827] shadow-sm hover:text-[#9d731e] dark:bg-[#26282e] dark:text-[#ece7dd] dark:border dark:border-[#33363d]"
          />

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#111827]/95 p-3 transition-transform duration-300 group-hover:translate-y-0 max-lg:translate-y-0">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-11 w-full items-center justify-center gap-2 border border-[#d7b46a] text-[11px] font-black uppercase tracking-[0.2em] text-[#f8f5ee] transition-colors hover:bg-[#d7b46a] hover:text-[#111827] dark:text-[#ece7dd]"
            >
              <ShoppingBag className="h-4 w-4" />
                Agregar al carrito
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9d731e]">Urbaniq</p>
            {product.color && <span className="text-[11px] font-semibold text-[#6b7280] dark:text-[#8a8478]">{product.color}</span>}
          </div>
          <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#111827] dark:text-[#ece7dd] transition-colors group-hover:text-[#9d731e]">
            {product.productName}
          </h3>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-base font-black text-[#111827] dark:text-[#ece7dd]">{formatPrice(effectivePrice)}</span>
            {product.discount > 0 && (
              <span className="text-sm font-medium text-[#9a9388] line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          {product.averageRating && product.totalReviews && product.totalReviews > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-[#d7b46a]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-.364 1.118l-2.8 2.034c-.784.57-1.838-.197-1.54-1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118z" /></svg>
              <span className="text-sm font-semibold text-[#111827] dark:text-[#ece7dd]">{product.averageRating.toFixed(1)}</span>
              <span className="text-xs text-gray-500 dark:text-[#9a9388]">({product.totalReviews})</span>
            </div>
          )}
          <p className="mt-1 text-[11px] font-medium text-[#6b7280] dark:text-[#8a8478]">Precio incluye IGV</p>
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;
