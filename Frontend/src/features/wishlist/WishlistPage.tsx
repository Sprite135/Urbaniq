import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { useGetWishlistQuery, useRemoveWishlistItemMutation } from './wishlistApiSlice';
import ProductImage from '@/features/catalog/components/ProductImage';

const WishlistPage: React.FC = () => {
  const { data, isLoading } = useGetWishlistQuery();
  const [removeItem] = useRemoveWishlistItemMutation();
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#111827] border-t-transparent" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Heart className="mb-6 h-20 w-20 text-gray-200 dark:text-[#9a9388]" />
        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">La lista de deseos está vacía</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-[#9a9388]">Guarda los productos que quieras ver más tarde.</p>
        <Link to="/catalog" className="mt-8 bg-[#111827] px-10 py-3.5 text-xs font-bold uppercase tracking-widest text-white">
          Ver colección
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0e0f12]">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-[#ece7dd]">Lista de deseos</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.wishListId} className="border border-gray-100 dark:border-[#26282e] bg-white dark:bg-[#16181d] p-4">
              <Link to={`/product/${item.slug}`} className="block overflow-hidden">
                <ProductImage src={item.image || '/product-images/placeholder.svg'} alt={item.productName} fallbackLabel={item.productName} className="aspect-[3/4] w-full object-cover transition-transform duration-500 hover:scale-105" />
              </Link>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <Link to={`/product/${item.slug}`}>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-[#ece7dd] transition-colors hover:text-[#9d731e]">{item.productName}</h2>
                  </Link>
                  <p className="mt-1 text-sm font-black text-gray-900 dark:text-[#ece7dd]">S/ {item.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <button onClick={() => removeItem(item.wishListId)} className="grid h-9 w-9 place-items-center border border-gray-200 text-gray-500 dark:text-[#9a9388] hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
