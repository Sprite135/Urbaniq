import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Tag, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useGetHomeProductCardsQuery,
  useGetTopSellingProductsQuery,
  useGetCategoriesQuery,
  type HomeProductCard,
} from './catalogApiSlice';
import ProductCard from './components/ProductCard';
import ProductImage from './components/ProductImage';

type HeroSlide = {
  title: string;
  eyebrow: string;
  copy: string;
  image: string;
  href: string;
  cta: string;
};



type HomeDisplayProduct = HomeProductCard;

const buildCatalogHref = (categoryId?: number) => (categoryId ? `/catalog?categoryId=${categoryId}` : '/catalog');

const getProductImage = (product?: { image?: string }) => product?.image;
const HOME_PRODUCT_CARD_COUNT = 200;
const NEW_ARRIVAL_COUNT = 10;

const scrollRail = (railId: string, direction: 'left' | 'right') => {
  const rail = document.getElementById(railId);
  if (!rail) return;
  const step = rail.clientWidth - 24;
  rail.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
};

const Home: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const { data: homeProductCards, isLoading: isHomeCardsLoading } = useGetHomeProductCardsQuery(HOME_PRODUCT_CARD_COUNT);
  const { data: topSellingProductsData, isLoading: isTopSellingLoading } = useGetTopSellingProductsQuery(10);

  const products = useMemo(() => homeProductCards || [], [homeProductCards]);
  const newArrivalProducts = useMemo(() => products.slice(0, NEW_ARRIVAL_COUNT), [products]);
  const saleProducts = useMemo(() => products.filter((product) => product.discount > 0), [products]);
  const topSellingProducts = useMemo(() => (topSellingProductsData || []) as HomeProductCard[], [topSellingProductsData]);

  const { data: categoriesData } = useGetCategoriesQuery();
  const categoryImageById = useMemo(() => {
    const map: Record<number, string | undefined> = {};
    const walk = (list?: typeof categoriesData) => {
      (list || []).forEach((c) => {
        map[c.categoryId] = c.imageUrl;
        walk(c.subCategories);
      });
    };
    walk(categoriesData);
    return map;
  }, [categoriesData]);


  const heroSlides = useMemo<HeroSlide[]>(() => {
    const slideProducts = products
      .filter((product, index, source) => getProductImage(product) && source.findIndex((item) => item.id === product.id) === index)
      .slice(0, 5);

    if (!slideProducts.length) {
      return [
        {
          title: 'Laptops profesionales',
          eyebrow: 'Catálogo de tecnología',
          copy: 'Equipos impecables y esenciales según tus categorías de productos, listos para la oficina y el hogar.',
          image: '/uploads/products/laptop-lenovo-loq-15irx9-core-i7-16gb-512gb-rtx-3050.jpg',
          href: '/catalog',
          cta: 'Comprar laptops',
        },
        {
          title: 'Componentes elegantes',
          eyebrow: 'Edición de trabajo',
          copy: 'Componentes de alto rendimiento y combinaciones inteligentes seleccionados para una tecnología pulida de diario.',
          image: '/uploads/products/tarjeta-de-video-nvidia-rtx-4060-8gb.jpg',
          href: '/catalog',
          cta: 'Explorar componentes',
        },
        {
          title: 'Edición de gaming',
          eyebrow: 'Listo para gaming',
          copy: 'Equipos de alto rendimiento para gaming, trabajo y creatividad con estilo impecable.',
          image: '/uploads/products/monitor-asus-rog-27-oled-2k-540hz.jpg',
          href: '/catalog',
          cta: 'Ver gaming',
        },
      ];
    }

    return slideProducts.map((product, index) => ({
      title: product.categoryName || product.productName,
      eyebrow: index === 0 ? 'Novedades' : product.subCategoryName || 'Destacado',
      copy: `Productos premium de ${product.categoryName || 'tecnología'} seleccionados del catálogo de Urbaniq para un equipo pensado para el día a día.`,
      image: getProductImage(product)!,
      href: `/product/${product.slug}`,
      cta: index === 0 ? 'Comprar ahora' : 'Ver producto',
    }));
  }, [products]);

  useEffect(() => {
    if (activeSlide >= heroSlides.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);



  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, HomeDisplayProduct[]>();

    products.forEach((product) => {
      const categoryName = product.categoryName || 'Featured Products';
      const currentProducts = grouped.get(categoryName) || [];
      grouped.set(categoryName, [...currentProducts, product]);
    });

    return Array.from(grouped.entries())
      .map(([categoryName, items]) => ({
        categoryName,
        items,
        categoryId: items[0]?.categoryId,
      }))
      .filter((section) => section.items.length > 0);
  }, [products]);

  const currentSlide = heroSlides[activeSlide] || heroSlides[0];
  const isProductLoading = isHomeCardsLoading;

  return (
    <div className="bg-gradient-to-b from-white to-[#fdf3f5] dark:from-[#0e0f12] dark:to-[#150f12]">
      <section className="relative overflow-hidden bg-[#f9fafb] dark:bg-[#0b0d11]">
        <div className="relative min-h-[560px] md:min-h-[680px]">
          {currentSlide && (
            <>
              {/* Blurred background layer to maintain the ambient colors without stretching artifacts */}
              <ProductImage
                src={currentSlide.image}
                alt=""
                fallbackLabel={currentSlide.title}
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-40 blur-3xl transition-opacity duration-500"
              />
              {/* Crisp foreground image: cover on mobile, contained on the right for desktop */}
              <ProductImage
                src={currentSlide.image}
                alt={currentSlide.title}
                fallbackLabel={currentSlide.title}
                className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 md:left-1/3 md:w-2/3 md:object-contain md:object-right lg:left-1/2 lg:w-1/2 lg:pr-12"
              />
            </>
          )}
          {/* Tech decorative glows - slate/navy/amber */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[#cbd5e1] opacity-40 blur-3xl dark:bg-[#1f2740] dark:opacity-30" />
            <div className="absolute right-8 bottom-0 h-80 w-80 rounded-full bg-[#d7b46a]/30 opacity-50 blur-3xl dark:bg-[#9d731e] dark:opacity-20" />
            <div className="absolute right-1/3 top-1/4 h-60 w-60 rounded-full bg-[#94a3b8]/30 opacity-40 blur-3xl dark:bg-[#334155] dark:opacity-20" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/20 md:to-transparent dark:from-[#0e0f12]/95 dark:via-[#0e0f12]/80 dark:to-[#0e0f12]/30 md:dark:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white/95 to-transparent dark:from-[#0e0f12]/95" />

          <div className="container relative mx-auto flex min-h-[560px] items-center py-16 md:min-h-[680px]">
            <div className="mx-auto max-w-2xl px-4 text-center md:mx-0 md:px-0 md:text-left text-[#111827] dark:text-[#ece7dd]">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.36em] text-[#9d731e]">{currentSlide?.eyebrow}</p>
              <h1 className="mt-4 sm:mt-5 text-4xl sm:text-5xl md:text-7xl font-black uppercase leading-[1.1] md:leading-[0.94] tracking-[0.04em]">
                {currentSlide?.title}
              </h1>
              <p className="mx-auto mt-4 sm:mt-5 max-w-xl text-sm sm:text-base md:text-lg font-medium leading-6 sm:leading-7 text-[#6b7280] dark:text-[#9ca3af] md:mx-0">
                {currentSlide?.copy}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 md:justify-start">
                <Link
                  to={currentSlide?.href || '/catalog'}
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-3 bg-[#d7b46a] px-8 text-[11px] font-black uppercase tracking-[0.18em] text-[#111827] dark:text-[#ece7dd] transition-all duration-200 hover:bg-[#e2c77f] hover:shadow-md"
                >
                  {currentSlide?.cta || 'Comprar ahora'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/catalog"
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center border border-[#d1d5db] px-8 text-[11px] font-black uppercase tracking-[0.22em] text-[#111827] dark:text-[#ece7dd] transition-colors hover:bg-[#111827] hover:text-white"
                >
                  Ver todos los productos
                </Link>
              </div>
            </div>
          </div>

          {heroSlides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Banner anterior"
                onClick={() => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length)}
                className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/84 text-[#111827] dark:text-[#ece7dd] shadow-lg transition hover:bg-white dark:bg-[#16181d]"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Banner siguiente"
                onClick={() => setActiveSlide((current) => (current + 1) % heroSlides.length)}
                className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/84 text-[#111827] dark:text-[#ece7dd] shadow-lg transition hover:bg-white dark:bg-[#16181d]"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`${slide.title}-${index}`}
                    type="button"
                    aria-label={`Mostrar banner ${index + 1}`}
                    onClick={() => setActiveSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${activeSlide === index ? 'w-12 bg-[#d7b46a]' : 'w-8 bg-white/72'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>



      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#fdf3f5] dark:from-[#0e0f12] dark:to-[#150f12] py-14 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f7c5d0] opacity-40 blur-3xl dark:bg-[#7a3b6b] dark:opacity-20" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#f6e2c4] opacity-40 blur-3xl dark:bg-[#9d731e] dark:opacity-15" />
        <div className="container relative mx-auto">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.32em] text-[#9d731e]">
                <Sparkles className="h-4 w-4" />
                Novedades
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Recién llegado</h2>
              <span className="mt-3 block h-[3px] w-14 bg-gradient-to-r from-[#d7b46a] via-[#f7c5d0] to-[#ecc9ec]" />
            </div>
            <Link to="/catalog" className="text-[11px] font-black uppercase tracking-[0.24em] text-[#111827] dark:text-[#ece7dd] luxury-link">
              Comprar todas las novedades
            </Link>
          </div>

          <ProductRail
            railId="new-arrivals"
            products={newArrivalProducts}
            isLoading={isProductLoading}
            emptyText="New arrivals will appear here after products are added."
          />
        </div>
      </section>

      {saleProducts.length > 0 && (
        <section className="border-y border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] py-14 sm:py-16">
          <div className="container mx-auto">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.32em] text-[#b42318]">
                   <Tag className="h-4 w-4" />
                   Ofertas
                 </p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Ofertas limitadas</h2>
                  <span className="mt-3 block h-[3px] w-14 bg-gradient-to-r from-[#d7b46a] via-[#f7c5d0] to-[#ecc9ec]" />
               </div>
               <Link to="/catalog?isSale=true" className="text-[11px] font-black uppercase tracking-[0.24em] text-[#111827] dark:text-[#ece7dd] luxury-link">
                 Ver productos en oferta
               </Link>
            </div>

            <ProductRail railId="sale-products" products={saleProducts} isLoading={isProductLoading} emptyText="Los productos en oferta aparecerán aquí cuando haya descuentos activos." />
          </div>
        </section>
      )}

      {topSellingProducts.length > 0 && (
        <section className="border-y border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] py-14 sm:py-16">
          <div className="container mx-auto">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.32em] text-[#b42318]">
                   <Flame className="h-4 w-4" />
                   Tendencia
                 </p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Productos más vendidos</h2>
                  <span className="mt-3 block h-[3px] w-14 bg-gradient-to-r from-[#d7b46a] via-[#f7c5d0] to-[#ecc9ec]" />
               </div>
               <Link to="/catalog" className="text-[11px] font-black uppercase tracking-[0.24em] text-[#111827] dark:text-[#ece7dd] luxury-link">
                 Ver colección
               </Link>
            </div>

            <ProductRail railId="top-selling-products" products={topSellingProducts} isLoading={isTopSellingLoading} emptyText="Los productos en tendencia aparecerán aquí." />
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#fdf3f5] dark:from-[#0e0f12] dark:to-[#150f12] py-14 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute right-1/3 -top-24 h-72 w-72 rounded-full bg-[#ecc9ec] opacity-40 blur-3xl dark:bg-[#7a3b6b] dark:opacity-20" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-10 h-80 w-80 rounded-full bg-[#f7c5d0] opacity-40 blur-3xl dark:bg-[#b14a63] dark:opacity-15" />
        <div className="container relative mx-auto space-y-16">
          {productsByCategory.map((section) => (
            <div key={section.categoryName}>
              <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#e5e7eb] dark:border-[#26282e] pb-5 md:flex-row md:items-end">
                <div className="flex items-center gap-4">
                  {categoryImageById[section.categoryId] ? (
                    <img
                      src={categoryImageById[section.categoryId]}
                      alt={section.categoryName}
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-[#e5e7eb] dark:ring-[#26282e]"
                    />
                  ) : null}
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#9d731e]">Comprar por categoría</p>
                    <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">{section.categoryName}</h2>
                    <span className="mt-3 block h-[3px] w-14 bg-gradient-to-r from-[#d7b46a] via-[#f7c5d0] to-[#ecc9ec]" />
                  </div>
                </div>
                <Link
                  to={buildCatalogHref(section.categoryId)}
                  className="text-[11px] font-black uppercase tracking-[0.24em] text-[#111827] dark:text-[#ece7dd] luxury-link"
                >
                  Ver todo
                </Link>
              </div>

              <ProductRail
                railId={`category-${section.categoryName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                products={section.items}
                isLoading={isProductLoading}
                emptyText={`Aún no se encontraron productos de ${section.categoryName}.`}
              />
            </div>
          ))}

          {!productsByCategory.length && !isProductLoading && (
            <div className="border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] p-8 text-center">
              <p className="text-sm font-semibold text-[#6b7280] dark:text-[#9a9388]">Los productos agregados desde el catálogo de administración aparecerán automáticamente en esta página.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ProductRail: React.FC<{ railId: string; products: HomeDisplayProduct[]; isLoading: boolean; emptyText: string }> = ({
  railId,
  products,
  isLoading,
  emptyText,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#1a1c21] dark:to-[#26282e] animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-[#26282e] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-[#26282e] rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 dark:bg-[#26282e] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] px-6 py-8">
        <p className="text-sm font-semibold text-[#6b7280] dark:text-[#9a9388]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="relative -mx-2 sm:-mx-4">
      <button
        type="button"
        aria-label="Ver productos anteriores"
        onClick={() => scrollRail(railId, 'left')}
        className="absolute -left-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] shadow-lg transition hover:border-[#9d731e] hover:text-[#9d731e] sm:grid"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        id={railId}
        className="flex snap-x items-start gap-6 overflow-x-auto scroll-smooth px-2 py-4 sm:px-4 [scrollbar-width:none]"
      >
        {products.map((product) => (
          <div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Ver más productos"
        onClick={() => scrollRail(railId, 'right')}
        className="absolute -right-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] shadow-lg transition hover:border-[#9d731e] hover:text-[#9d731e] sm:grid"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Home;
