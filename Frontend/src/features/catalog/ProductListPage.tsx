import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery, type Category } from './catalogApiSlice';
import ProductCard from './components/ProductCard';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const flattenCategories = (categories: Category[] = []): Category[] =>
  categories.flatMap((category) => [category, ...flattenCategories(category.subCategories || [])]);

const priceRanges = [
  { label: 'Hasta S/ 999', minPrice: undefined, maxPrice: 999 },
  { label: 'S/ 1.000 - S/ 2.499', minPrice: 1000, maxPrice: 2499 },
  { label: 'S/ 2.500 - S/ 4.999', minPrice: 2500, maxPrice: 4999 },
  { label: 'S/ 5.000 o más', minPrice: 5000, maxPrice: undefined },
];



const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageNumber, setPageNumber] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
  const search = searchParams.get('search') || undefined;
  const size = searchParams.get('size') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const categorySlug = searchParams.get('categorySlug') || undefined;
  const isSale = searchParams.get('isSale') === 'true' ? true : undefined;
  const newArrivals = searchParams.get('newArrivals') === 'true';

  const { data: categories } = useGetCategoriesQuery();
  const allCategories = useMemo(() => flattenCategories(categories || []), [categories]);
  const activeCategory = categorySlug
    ? allCategories.find((c) => c.slug?.toLowerCase() === categorySlug.toLowerCase())
    : allCategories.find((c) => c.categoryId === categoryId);

  // Compute dynamic page title based on navigation context
  const pageTitle = useMemo(() => {
    if (isSale) return 'Ofertas';
    if (newArrivals) return 'Novedades';
    if (activeCategory) return activeCategory.categoryName;
    if (categorySlug) return categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
    if (search) return 'Resultados de búsqueda';
    return 'Todos los productos';
  }, [isSale, newArrivals, activeCategory, categorySlug, search]);

  const displayedCategories = useMemo(() => {
    return allCategories;
  }, [allCategories]);

  // Compute page subtitle
  const pageSubtitle = useMemo(() => {
    if (isSale) return 'Descuentos exclusivos en tecnología premium. Consigue tus favoritos antes de que se agoten.';
    if (newArrivals) return 'Las últimas incorporaciones a nuestro catálogo de tecnología, seleccionadas para el usuario moderno.';
    if (categorySlug === 'formals') return 'Equipos y componentes de alto rendimiento para trabajo y gaming.';
    if (categorySlug === 'occasionwear') return 'Tecnología para cada ocasión: trabajo, gaming y creatividad.';
    return 'Explora nuestro catálogo de tecnología y encuentra lo que necesitas con filtros refinados para una búsqueda rápida.';
  }, [isSale, newArrivals, categorySlug]);

  const { data: productData, isLoading, isError } = useGetProductsQuery({
    pageNumber,
    pageSize: 12,
    categoryId,
    search,
    minPrice,
    maxPrice,
    size,
    categorySlug,
    isSale,
  });

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setPageNumber(1);
    setSearchParams(next);
  };

  const applyPriceRange = (range: (typeof priceRanges)[number]) => {
    const next = new URLSearchParams(searchParams);
    if (range.minPrice === minPrice && range.maxPrice === maxPrice) {
      next.delete('minPrice');
      next.delete('maxPrice');
    } else {
      if (range.minPrice) {
        next.set('minPrice', String(range.minPrice));
      } else {
        next.delete('minPrice');
      }

      if (range.maxPrice) {
        next.set('maxPrice', String(range.maxPrice));
      } else {
        next.delete('maxPrice');
      }
    }
    setPageNumber(1);
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    setPageNumber(1);
    setSearchParams(next);
  };

  const filterPanel = (
    <div className="space-y-9">
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#111827] dark:text-[#ece7dd]">Categorías</h3>
          {(categoryId || minPrice || maxPrice || size) && (
            <button type="button" onClick={clearFilters} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9d731e]">
              Limpiar
            </button>
          )}
        </div>
        <div className="grid gap-3">
              {displayedCategories.map((category) => (
                <label key={category.categoryId} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
                  <input
                    type="checkbox"
                    checked={categoryId === category.categoryId}
                    onChange={() => updateParam('categoryId', categoryId === category.categoryId ? undefined : String(category.categoryId))}
                    className="h-4 w-4 border-[#d1d5db] dark:border-[#33363d] text-[#9d731e] focus:ring-[#9d731e]"
                  />
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.categoryName} className="h-6 w-6 rounded object-cover ring-1 ring-[#e5e7eb] dark:ring-[#26282e]" />
                  ) : null}
                  {category.categoryName}
                </label>
              ))}
        </div>
      </div>

      <div>
        <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#111827] dark:text-[#ece7dd]">Precio</h3>
        <div className="grid gap-3">
          {priceRanges.map((range) => (
            <label key={range.label} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[#374151] dark:text-[#9ca3af]">
              <input
                type="checkbox"
                checked={range.minPrice === minPrice && range.maxPrice === maxPrice}
                onChange={() => applyPriceRange(range)}
                className="h-4 w-4 border-[#d1d5db] dark:border-[#33363d] text-[#9d731e] focus:ring-[#9d731e]"
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>


    </div>
  );

  if (isError) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Colección no disponible</h2>
          <p className="mt-3 text-sm text-[#6b7280] dark:text-[#9a9388]">No pudimos cargar los productos. Por favor, inténtalo de nuevo más tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0e0f12]">
      <section className="border-b border-[#e5e7eb] dark:border-[#26282e] bg-[#f9fafb] dark:bg-[#0b0d11] text-[#111827] dark:text-[#ece7dd]">
        <div className="container mx-auto py-12">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#9d731e]">
               {search ? `Búsqueda: ${search}` : 'Catálogo de tecnología'}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.08em] sm:text-5xl">
              {pageTitle}
            </h1>
            <span className="mt-4 block h-[3px] w-16 bg-[#d7b46a]" />
            <p className="mt-4 text-sm leading-6 text-[#9ca3af] dark:text-[#9ca3af]">
              {pageSubtitle}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto py-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-[#e5e7eb] dark:border-[#26282e] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="inline-flex h-10 items-center gap-2 border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] px-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#111827] dark:text-[#ece7dd] lg:hidden"
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            <div className="hidden items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#6b7280] dark:text-[#9a9388] lg:flex">
              <SlidersHorizontal className="h-4 w-4" />
              Refinar
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b7280] dark:text-[#8a8478]">
               {productData ? `${productData.totalCount} productos` : 'Cargando productos'}
            </span>
          </div>


        </div>

        <div className="grid gap-9 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:block">{filterPanel}</aside>

          <div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="aspect-[3/4] bg-[#f3f4f6] dark:bg-[#1a1c21]" />
                    <div className="mt-4 h-3 w-3/4 bg-[#f3f4f6] dark:bg-[#1a1c21]" />
                    <div className="mt-3 h-3 w-1/2 bg-[#f3f4f6] dark:bg-[#1a1c21]" />
                  </div>
                ))}
              </div>
            ) : productData?.items.length ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
                {productData.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] p-10 text-center">
                <h2 className="text-xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">No se encontraron productos</h2>
                <p className="mt-3 text-sm text-[#6b7280] dark:text-[#9a9388]">Ajusta tus filtros para explorar más del catálogo.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 h-11 bg-[#111827] dark:bg-[#0b0d11] px-7 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {productData && productData.totalPages > 1 && (
              <div className="mt-14 flex justify-center gap-2">
                {Array.from({ length: productData.totalPages }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPageNumber(index + 1)}
                    className={`h-10 w-10 border text-[11px] font-black ${
                      pageNumber === index + 1
                        ? 'border-[#111827] bg-[#111827] dark:bg-[#0b0d11] text-white'
                        : 'border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#374151] dark:text-[#9ca3af] hover:border-[#111827]'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/45 lg:hidden"
            onClick={() => setIsFilterOpen(false)}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="h-full w-[86%] max-w-sm overflow-y-auto bg-white dark:bg-[#0e0f12] p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-[13px] font-black uppercase tracking-[0.28em] text-[#111827] dark:text-[#ece7dd]">Filtros</h2>
                <button type="button" onClick={() => setIsFilterOpen(false)} aria-label="Cerrar filtros">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {filterPanel}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductListPage;
