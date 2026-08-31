import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useGetProductBySlugQuery, useGetProductsByCategoryQuery } from './catalogApiSlice';
import { MapPin, ShieldCheck, ShoppingBag, Truck, Star, MessageSquare } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/features/cart/cartSlice';
import { useAddToCartMutation } from '@/features/cart/cartApiSlice';
import WishlistHeartButton from '@/features/wishlist/WishlistHeartButton';
import { toast } from 'react-toastify';
import ProductCard from './components/ProductCard';
import { getApiErrorMessage } from '@/app/apiError';
import ProductImage from './components/ProductImage';
import { estimateText } from '../checkout/deliveryHelper';
import { useGetReviewsQuery, useCreateReviewMutation } from './catalogApiSlice';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value);

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state: { auth: { token: string | null } }) => state.auth.token);
  const { data: product, isLoading, isError } = useGetProductBySlugQuery(slug || '');
  const { data: reviewsData, isLoading: reviewsLoading } = useGetReviewsQuery({ productId: product?.id || '', pageNumber: 1, pageSize: 10 }, { skip: !product?.id });
  const [createReview] = useCreateReviewMutation();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [hasAddedToBag, setHasAddedToBag] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ size?: string; color?: string }>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [addToCartServer, { isLoading: isAddingToBag }] = useAddToCartMutation();
  const sizeSectionRef = useRef<HTMLDivElement | null>(null);
  const colorSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: relatedProducts } = useGetProductsByCategoryQuery(
    { categoryId: product?.categoryId || 0, pageSize: 10 },
    { skip: !product?.categoryId }
  );


  const colorOptions = useMemo(
    () => Array.from(new Set((product?.variants ?? []).map((variant) => variant.color))),
    [product?.variants]
  );
  const sizeOptions = useMemo(
    () => {
      const sizes = Array.from(
        new Set(
          (product?.variants ?? [])
            .filter((variant) => !selectedColor || variant.color === selectedColor)
            .map((variant) => variant.size)
        )
      );
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];
      return sizes.sort((a, b) => {
        const indexA = sizeOrder.indexOf(a.toUpperCase());
        const indexB = sizeOrder.indexOf(b.toUpperCase());
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
    },
    [product?.variants, selectedColor]
  );
  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.color === selectedColor && variant.size === selectedSize),
    [product?.variants, selectedColor, selectedSize]
  );
  const hasStock = (product?.quantity ?? 0) > 0;
  const selectedVariantInStock = selectedVariant ? selectedVariant.quantity > 0 : true;

  useEffect(() => {
    setHasAddedToBag(false);
    setSelectedColor('');
    setSelectedSize('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product?.id]);

  useEffect(() => {
    if (colorOptions.length === 1 && !selectedColor) {
      setSelectedColor(colorOptions[0]);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (selectedColor && sizeOptions.length === 1 && !selectedSize) {
      setSelectedSize(sizeOptions[0]);
    }
  }, [sizeOptions, selectedSize, selectedColor]);

  const galleryImages = useMemo(() => {
    const colorSpecificImages = selectedColor ? product?.imagesByColor?.[selectedColor] ?? [] : [];
    if (colorSpecificImages.length > 0) {
      return colorSpecificImages;
    }

    const sharedImages = product?.images?.length ? product.images : [];
    if (sharedImages.length > 0) {
      return sharedImages;
    }

    if (selectedColor) {
      const firstOtherColorImages = Object.values(product?.imagesByColor ?? {}).find((images) => images.length > 0);
      if (firstOtherColorImages?.length) {
        return firstOtherColorImages;
      }
    }

    return product?.image ? [product.image] : [];
  }, [product?.image, product?.images, product?.imagesByColor, selectedColor]);

  useEffect(() => {
    if (!galleryImages.length) {
      setSelectedImage('');
      return;
    }

    if (!selectedImage || !galleryImages.includes(selectedImage)) {
      setSelectedImage(galleryImages[0]);
    }
  }, [galleryImages, selectedImage]);

  const validateSelections = () => {
    const nextErrors: { size?: string; color?: string } = {};

    if (!selectedColor) {
      nextErrors.color = 'Selecciona un color para continuar';
    }

    if (!selectedSize) {
      nextErrors.size = 'Selecciona una versión para continuar';
    } else if (!selectedVariant) {
      nextErrors.size = 'Esta versión no está disponible para el color seleccionado';
    } else if (selectedVariant.quantity <= 0) {
      nextErrors.size = 'Esta versión está agotada';
    }

    setFieldErrors(nextErrors);

    if (nextErrors.color) {
      colorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    if (nextErrors.size) {
      sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    return true;
  };

  const handleAddToBag = async () => {
    if (!product || !validateSelections()) {
      return;
    }
    if (!selectedVariant) return;

    if (token) {
      try {
        await addToCartServer({
          productId: product.id,
          productVariantId: selectedVariant.id,
          quantity,
        }).unwrap();
        setHasAddedToBag(true);
        toast.success('Agregado al carrito');
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'No se pudo agregar este producto a tu carrito'));
      }
      return;
    }

    dispatch(addToCart({
      product,
      productVariantId: selectedVariant.id,
      selectedSize,
      selectedColor,
      quantity,
    }));
    setHasAddedToBag(true);
    toast.success('Agregado al carrito');
  };

  const handleBuyNow = () => {
    if (!hasAddedToBag) {
      void handleAddToBag();
      return;
    }

    if (!token) {
      navigate(`${location.pathname}?auth=login&redirectTo=%2Fcheckout`);
      return;
    }

    navigate('/checkout');
  };

  const submitReview = async () => {
    if (!product) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      toast.error('Por favor completa el título y el comentario');
      return;
    }

    setReviewSubmitting(true);
    try {
      await createReview({ productId: product.id, rating: reviewRating, title: reviewTitle, comment: reviewComment }).unwrap();
      toast.success('¡Gracias por tu reseña!');
      setShowReviewForm(false);
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
    } catch (error: unknown) {
      toast.error('No se pudo enviar la reseña. Intenta de nuevo.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Producto no encontrado</h2>
          <p className="mt-3 text-sm text-[#6b7280] dark:text-[#9a9388]">El producto que buscas ya no está disponible.</p>
        </div>
      </div>
    );
  }

  const discountPercent = product.discount > 0 ? Math.round((product.discount / product.price) * 100) : 0;
  const finalPrice = product.price - product.discount;
  const selectedGalleryImage = galleryImages.find((image) => image === selectedImage) ?? galleryImages[0];

  return (
    <div className="bg-white dark:bg-[#0e0f12]">
      <div className="container mx-auto py-8">
        <nav className="mb-7 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8174]">
          <Link to="/" className="hover:text-[#9d731e]">Inicio</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[#9d731e]">Colección</Link>
          <span>/</span>
          <span className="text-[#111827] dark:text-[#ece7dd]">{product.productName}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 md:grid-cols-[88px_1fr]">
            <div className="hidden gap-3 md:grid md:auto-rows-min">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`aspect-[3/4] overflow-hidden border bg-white dark:bg-[#16181d] ${
                    selectedGalleryImage === image ? 'border-[#111827]' : 'border-[#e5e7eb] dark:border-[#26282e]'
                  }`}
                >
                  <ProductImage src={image} alt="" fallbackLabel={product.productName} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="relative aspect-[3/4] overflow-hidden bg-[#f3f4f6] dark:bg-[#1a1c21]">
              <ProductImage
                src={selectedGalleryImage}
                alt={product.productName}
                fallbackLabel={product.productName}
                className="h-full w-full object-cover"
              />
              {discountPercent > 0 && (
                <span className="absolute left-4 top-4 bg-[#d7b46a] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#111827] dark:text-[#ece7dd]">
                   {discountPercent}% de descuento
                </span>
              )}
            </div>
          </div>

          <section className="bg-white dark:bg-[#16181d] p-6 shadow-sm sm:p-8 lg:sticky lg:top-36 lg:self-start">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#9d731e]">Urbaniq</p>
            <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[0.06em] text-[#111827] dark:text-[#ece7dd] sm:text-3xl">
              {product.productName}
            </h1>
            {product.categoryName && <p className="mt-2 text-sm font-medium text-[#6b7280] dark:text-[#8a8478]">{product.categoryName}</p>}

            <div className="mt-6 border-y border-[#e5e7eb] dark:border-[#26282e] py-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-black text-[#111827] dark:text-[#ece7dd]">{formatPrice(finalPrice)}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-base font-medium text-[#9a9388] line-through">{formatPrice(product.price)}</span>
                    <span className="text-sm font-black uppercase tracking-[0.12em] text-[#9d731e]">{discountPercent}% de descuento</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-[#6b7280] dark:text-[#9a9388]">Precio incluye IGV</p>
            </div>

            <div ref={colorSectionRef} className="mt-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Selecciona el color</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      const nextColor = selectedColor === color ? '' : color;
                      setSelectedColor(nextColor);
                      setSelectedSize('');
                      setFieldErrors((current) => ({ ...current, color: undefined, size: undefined }));
                    }}
                    className={`min-h-11 border px-4 text-sm font-semibold transition-colors ${
                      selectedColor === color
                        ? 'border-[#111827] bg-[#111827] dark:bg-[#0b0d11] text-white'
                        : 'border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] hover:border-[#9d731e]'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              {fieldErrors.color && <p className="mt-2 text-sm font-medium text-red-600">{fieldErrors.color}</p>}
            </div>

            {sizeOptions.length > 1 && (
            <div ref={sizeSectionRef} className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Selecciona la versión</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const variant = product.variants.find((entry) => entry.color === selectedColor && entry.size === size);
                  const isDisabled = !selectedColor || !variant || variant.quantity <= 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setSelectedSize((current) => (current === size ? '' : size));
                        setFieldErrors((current) => ({ ...current, size: undefined }));
                      }}
                      className={`h-12 min-w-12 border px-3 text-sm font-black transition-colors ${
                        selectedSize === size
                          ? 'border-[#111827] bg-[#111827] dark:bg-[#0b0d11] text-white'
                          : 'border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] hover:border-[#9d731e]'
                      } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {!selectedColor && <p className="mt-2 text-xs text-[#6b7280] dark:text-[#8a8478]">Selecciona un color primero para ver las versiones disponibles.</p>}
              {selectedVariant && (
                <p className="mt-2 text-xs text-[#6b7280] dark:text-[#8a8478]">
                  {selectedVariant.quantity > 0
                    ? `${selectedVariant.quantity} pieza(s) restante(s) para esta versión y color`
                    : 'Esta versión está actualmente agotada'}
                </p>
              )}
              {fieldErrors.size && <p className="mt-2 text-sm font-medium text-red-600">{fieldErrors.size}</p>}
            </div>
            )}

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <div className="flex h-[52px] w-32 items-center justify-between border border-[#d1d5db] dark:border-[#33363d]">
                <button
                  type="button"
                  disabled={quantity <= 1 || isAddingToBag}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="grid h-full w-10 place-items-center text-[#111827] dark:text-[#ece7dd] transition-colors hover:bg-white dark:bg-[#0e0f12] disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-sm font-bold text-[#111827] dark:text-[#ece7dd]">{quantity}</span>
                <button
                  type="button"
                  disabled={Boolean(selectedVariant) && quantity >= selectedVariant!.quantity || isAddingToBag}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="grid h-full w-10 place-items-center text-[#111827] dark:text-[#ece7dd] transition-colors hover:bg-white dark:bg-[#0e0f12] disabled:opacity-50"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={hasAddedToBag ? handleBuyNow : handleAddToBag}
                disabled={isAddingToBag || !hasStock || (Boolean(selectedVariant) && !selectedVariantInStock)}
                className="inline-flex h-[52px] items-center justify-center gap-2 bg-[#111827] dark:bg-[#0b0d11] px-8 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1f2740] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag className="h-4 w-4" />
                {!hasStock
                  ? 'Agotado'
                  : selectedVariant && !selectedVariantInStock
                    ? 'Variante agotada'
                    : hasAddedToBag
                      ? 'Comprar ahora'
                      : isAddingToBag
                        ? 'Agregando...'
                        : 'Agregar al carrito'}
              </button>
              {product && (
                <WishlistHeartButton
                  productId={product.id}
                  size="md"
                  className="grid h-[52px] w-[52px] place-items-center border border-[#d1d5db] dark:border-[#33363d] text-[#111827] dark:text-[#ece7dd] hover:border-[#9d731e]"
                />
              )}
            </div>

            <div className="mt-8 border-t border-[#e5e7eb] dark:border-[#26282e] pt-6">
              <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">
                <MapPin className="h-4 w-4" />
                Opciones de entrega
              </h2>
              <div className="mt-4 grid gap-3 text-sm text-[#374151] dark:text-[#9ca3af]">
                <span className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#9d731e]" />
                  <span>
                    <strong className="text-[#111827] dark:text-[#ece7dd]">Lima Metropolitana:</strong>{' '}
                    {estimateText('LimaMetropolitana', product.requiresConfiguration)}
                  </span>
                </span>
                <span className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#9d731e]" />
                  <span>
                    <strong className="text-[#111827] dark:text-[#ece7dd]">Todo el Perú:</strong>{' '}
                    {estimateText('Provincias', product.requiresConfiguration)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[#9d731e]" />
                  Producto auténtico y pago seguro
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-[#e5e7eb] dark:border-[#26282e] pt-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Detalles del producto</h2>
              <p className="mt-4 text-sm leading-7 text-[#374151] dark:text-[#9ca3af]">{product.description}</p>
              <dl className="mt-5 grid gap-px overflow-hidden bg-[#e8e0d0] text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 bg-white dark:bg-[#0e0f12] p-4">
                  <dt className="text-[#6b7280] dark:text-[#8a8478]">SKU</dt>
                  <dd className="font-semibold text-[#111827] dark:text-[#ece7dd]">{product.sku}</dd>
                </div>
                <div className="flex justify-between gap-4 bg-white dark:bg-[#0e0f12] p-4">
                    <dt className="text-[#6b7280] dark:text-[#8a8478]">Colores</dt>
                  <dd className="font-semibold text-[#111827] dark:text-[#ece7dd]">{colorOptions.join(', ')}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        {relatedProducts && relatedProducts.items.length > 1 && (
          <section className="mt-16 border-t border-[#e5e7eb] dark:border-[#26282e] pt-12">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#9d731e]">Completa el look</p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Estilos similares</h2>
              </div>
              <Link to="/catalog" className="text-[11px] font-black uppercase tracking-[0.22em] text-[#111827] dark:text-[#ece7dd] luxury-link">
                Ver todo
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {relatedProducts.items
                .filter((item) => item.id !== product.id)
                .slice(0, 4)
                .map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
            </div>
          </section>
        )}
        {product && (
          <section className="mt-16 border-t border-[#e5e7eb] dark:border-[#26282e] pt-12">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#9d731e]">Opiniones</p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-[#111827] dark:text-[#ece7dd]">Reseñas ({product.totalReviews || 0})</h2>
              </div>
              {token && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 bg-[#111827] px-4 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1f2740]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Escribir reseña
                </button>
              )}
            </div>

            {showReviewForm && token && (
              <div className="mb-8 p-6 border border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d] rounded-lg">
                <h3 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#ece7dd]">Escribe tu reseña</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#9ca3af] mb-2">Tu calificación</label>
                  <div className="flex items-center gap-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`p-1 transition-colors ${reviewRating >= star ? 'text-[#d7b46a]' : 'text-gray-300 dark:text-gray-600'}`}
                        aria-label={`${star} estrellas`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#9ca3af] mb-1">Título</label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="¿Qué opinas del producto?"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#33363d] rounded-lg bg-white dark:bg-[#0e0f12] text-[#111827] dark:text-[#ece7dd] focus:ring-2 focus:ring-[#9d731e] focus:border-transparent"
                    maxLength={100}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#9ca3af] mb-1">Comentario</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Escribe tu opinión detallada..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#33363d] rounded-lg bg-white dark:bg-[#0e0f12] text-[#111827] dark:text-[#ece7dd] focus:ring-2 focus:ring-[#9d731e] focus:border-transparent resize-none"
                    maxLength={1000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewTitle(''); setReviewComment(''); setReviewRating(5); }}
                    className="px-4 py-2 border border-gray-300 dark:border-[#33363d] text-sm font-medium text-[#374151] dark:text-[#9ca3af] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0e0f12]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={reviewSubmitting}
                    className="px-4 py-2 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1f2740] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reviewSubmitting ? 'Enviando...' : 'Enviar reseña'}
                  </button>
                </div>
              </div>
            )}

            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#111827] border-t-transparent" />
              </div>
            ) : reviewsData?.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-[#9ca3af]">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-lg font-medium">No hay reseñas aún</p>
                <p className="mt-1 text-sm">Sé el primero en compartir tu opinión</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviewsData?.items.map((review) => (
                  <article key={review.reviewId} className="border-b border-[#e5e7eb] dark:border-[#26282e] pb-6 last:border-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${star <= review.rating ? 'text-[#d7b46a] fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-[#9ca3af]">({new Date(review.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })})</span>
                      </div>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          Compra verificada
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 font-semibold text-[#111827] dark:text-[#ece7dd]">{review.title}</h4>
                    <p className="mt-1 text-gray-600 dark:text-[#9ca3af]">{review.comment}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-[#9ca3af]">Por {review.userName}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      <section className="border-t border-[#e5e7eb] dark:border-[#26282e] bg-white dark:bg-[#16181d]">
        <div className="container mx-auto grid gap-6 py-10 text-sm text-[#374151] dark:text-[#9ca3af] md:grid-cols-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Entrega</p>
            <p className="mt-3 leading-6">El código postal se verifica antes de agregar al carrito y se revisa durante el pago.</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Sin devoluciones/reemplazos</p>
            <p className="mt-3 leading-6">La política de nuestra plataforma no ofrece opciones de devolución o reemplazo una vez entregado.</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#111827] dark:text-[#ece7dd]">Soporte</p>
            <p className="mt-3 leading-6">La ayuda con pedidos y pagos está disponible en el centro de ayuda de tu cuenta.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
