import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetProductByIdQuery } from '../catalog/catalogApiSlice';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import ProductImage from '@/features/catalog/components/ProductImage';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const AdminProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading, isError } = useGetProductByIdQuery(productId!);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-black text-gray-900">Producto no encontrado</h2>
        <p className="mt-2 text-sm text-gray-500">El producto que buscas no existe.</p>
        <Link to="/admin/dashboard" className="mt-6 flex items-center gap-2 text-sm font-bold text-[#9d731e] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8cdbb] bg-white text-[#7c7467] transition-colors hover:bg-[#fbfaf7] hover:text-[#111827]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Detalles del producto</p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-[#111827]">
            {product.productName}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Image & Description */}
        <div className="space-y-6 lg:col-span-2">
          <section className="border border-[#e1d5c2] bg-white p-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="aspect-[4/5] bg-[#f3ecdf]">
                <ProductImage src={product.image} alt={product.productName} fallbackLabel={product.productName} className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-[#111827]">{product.productName}</h3>
                <p className="mt-2 text-sm text-[#7c7467] whitespace-pre-wrap leading-relaxed">{product.description}</p>
                
                <div className="mt-6 space-y-4 border-t border-[#eee6da] pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">SKU</span>
                    <span className="font-mono text-sm text-[#111827]">{product.sku}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Precio</span>
                    <span className="text-xl font-black text-[#111827]">{formatCurrency(product.price)}</span>
                  </div>
                  {product.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Descuento</span>
                      <span className="text-sm font-bold text-green-600">-{formatCurrency(product.discount)}</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Inventory */}
        <div className="space-y-6">
          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Estado de inventario</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {product.quantity <= 10 ? (
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                     <AlertTriangle className="h-6 w-6" />
                   </div>
                ) : (
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                     <CheckCircle className="h-6 w-6" />
                   </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7c7467]">Stock actual</p>
                  <p className="text-3xl font-black text-[#111827]">{product.quantity}</p>
                </div>
              </div>
              
              {product.quantity <= 10 && (
                <div className="mt-4 border-l-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-bold">Alerta de stock bajo</p>
                  <p>Este artículo se está agotando. Considera reabastecerlo pronto.</p>
                </div>
              )}
            </div>
          </section>

          <section className="border border-[#e1d5c2] bg-white">
            <div className="border-b border-[#eee6da] bg-[#fbfaf7] p-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">Variantes</h3>
            </div>
            <div className="p-5">
               <div className="space-y-4">
                  <div>
                     <p className="text-xs font-bold uppercase tracking-wider text-[#7c7467] mb-2">Colores disponibles</p>
                    <div className="flex flex-wrap gap-2">
                       {product.availableColors.map(c => (
                         <span key={c} className="px-2 py-1 bg-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-widest">{c}</span>
                       ))}
                    </div>
                  </div>
                  <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#7c7467] mb-2">Versiones disponibles</p>
                    <div className="flex flex-wrap gap-2">
                       {product.availableSizes.map(s => (
                         <span key={s} className="px-2 py-1 border border-gray-200 text-xs font-bold text-gray-800 uppercase">{s}</span>
                       ))}
                    </div>
                  </div>
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminProductDetailPage;
