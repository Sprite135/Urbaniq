import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAddProductMutation,
  useGetCategoriesQuery,
  useGetProductByIdQuery,
  useUpdateProductMutation,
} from '../catalog/catalogApiSlice';
import { useCreateCategoryMutation } from './adminApiSlice';
import { toast } from 'react-toastify';
import { ArrowLeft, Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

type VariantDraft = {
  clientId: string;
  size: string;
  color: string;
  quantity: string;
};

type ProductImageDraft = {
  clientId: string;
  previewUrl: string;
  color: string;
  file?: File;
};

const emptyVariant = (): VariantDraft => ({
  clientId: crypto.randomUUID(),
  size: '',
  color: '',
  quantity: '0',
});

const quickSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];
const quickColors = ['Black', 'White', 'Navy', 'Grey', 'Olive', 'Brown', 'Beige'];

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const { data: categories } = useGetCategoriesQuery();
  const { data: productData, isLoading: isLoadingProduct } = useGetProductByIdQuery(id!, { skip: !isEditMode });
  const [addProduct, { isLoading: isAdding }] = useAddProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Guard ref — prevents the edit-mode useEffect from re-running after initial
  // population, which would overwrite in-progress form edits (variant stock, etc.)
  // whenever RTK Query re-emits productData with a new reference.
  const formPopulatedForId = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    price: '',
    discount: '0',
    categoryId: '',
    subCategoryId: '',
    description: '',
    deliverableZones: '',
    material: 'Cotton',
  });
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
  const variantColors = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .map((variant) => variant.color.trim())
            .filter(Boolean)
        )
      ),
    [variants]
  );

  const totalQuantity = useMemo(
    () => variants.reduce((sum, variant) => sum + (Number.parseInt(variant.quantity || '0', 10) || 0), 0),
    [variants]
  );

  useEffect(() => {
    if (isEditMode && productData && formPopulatedForId.current !== id) {
      // Mark this product ID as populated so subsequent RTK Query
      // cache re-emissions don't overwrite the user's in-progress edits.
      formPopulatedForId.current = id!;

      setFormData({
        productName: productData.productName,
        price: productData.price.toString(),
        discount: productData.discount.toString(),
        categoryId: productData.categoryId.toString(),
        subCategoryId: productData.subCategoryId?.toString() || '',
        description: productData.description,
        deliverableZones: productData.deliverableZones.join(', '),
        material: productData.material || 'Cotton',
      });
      setVariants(
        productData.variants.length
          ? productData.variants.map((variant) => ({
              clientId: variant.id || crypto.randomUUID(),
              size: variant.size,
              color: variant.color,
              quantity: variant.quantity.toString(),
            }))
          : [emptyVariant()]
      );
      setProductImages(
        productData.imageEntries?.length
          ? productData.imageEntries.map((imageEntry) => ({
              clientId: crypto.randomUUID(),
              previewUrl: imageEntry.imageUrl,
              color: imageEntry.color || '',
            }))
          : (productData.images?.length ? productData.images : [productData.image]).filter(Boolean).map((imageUrl) => ({
              clientId: crypto.randomUUID(),
              previewUrl: imageUrl,
              color: '',
            }))
      );
    }
  }, [isEditMode, productData, id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => {
      // Reset subCategory if category changes
      if (name === 'categoryId') {
        return { ...current, [name]: value, subCategoryId: '' };
      }
      return { ...current, [name]: value };
    });
  };

  const selectedCategory = useMemo(
    () => categories?.find((c) => c.categoryId.toString() === formData.categoryId),
    [categories, formData.categoryId]
  );

  const handleVariantChange = (index: number, field: keyof VariantDraft, value: string) => {
    setVariants((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  const addVariantRow = () => {
    setVariants((current) => [...current, emptyVariant()]);
  };

  const removeVariantRow = (index: number) => {
    setVariants((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<ProductImageDraft>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve({
                clientId: crypto.randomUUID(),
                previewUrl: reader.result as string,
                color: variantColors.length === 1 ? variantColors[0] : '',
                file,
              });
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      setProductImages((current) => [...current, ...newImages]);
    });

    event.target.value = '';
  };

  const removePreviewAtIndex = (index: number) => {
    setProductImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleImageColorChange = (index: number, color: string) => {
    setProductImages((current) =>
      current.map((productImage, currentIndex) =>
        currentIndex === index
          ? { ...productImage, color }
          : productImage
      )
    );
  };

  const handleAddCategory = async (parentId?: number) => {
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }
    try {
      await createCategory({
        categoryName: newCategoryName.trim(),
        description: '',
        parentCategoryId: parentId,
      }).unwrap();
      toast.success(parentId ? 'Subcategoría agregada' : 'Categoría agregada');
      setNewCategoryName('');
      setShowAddCategory(false);
      setShowAddSubCategory(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo agregar la categoría'));
    }
  };

  const validateAdminFields = () => {
    const zoneValues = formData.deliverableZones.split(',').map((value) => value.trim()).filter(Boolean);
    const validVariants = variants
      .map((variant) => ({
        size: variant.size.trim(),
        color: variant.color.trim(),
        quantity: Number.parseInt(variant.quantity || '0', 10),
      }))
      .filter((variant) => variant.size && variant.color);

    if (!validVariants.length) {
      toast.error('Agrega al menos una variante de versión y color');
      return false;
    }

    if (validVariants.some((variant) => Number.isNaN(variant.quantity) || variant.quantity < 0)) {
      toast.error('El stock de la variante debe ser cero o más');
      return false;
    }

    const uniqueKeys = new Set(validVariants.map((variant) => `${variant.size.toLowerCase()}|${variant.color.toLowerCase()}`));
    if (uniqueKeys.size !== validVariants.length) {
      toast.error('Cada combinación de versión y color debe ser única');
      return false;
    }

    if (zoneValues.some((value) => !/^\d{6}$/.test(value))) {
      toast.error('Los códigos postales deben tener 6 dígitos');
      return false;
    }

    const invalidImageColor = productImages.find(
      (productImage) => productImage.color && !validVariants.some((variant) => variant.color.toLowerCase() === productImage.color.toLowerCase())
    );
    if (invalidImageColor) {
      toast.error(`El color de imagen "${invalidImageColor.color}" no coincide con ningún color de variante actual`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateAdminFields()) {
      return;
    }

    if (!productImages.length) {
      toast.error('Se requiere al menos una imagen del producto');
      return;
    }

    const data = new FormData();
    const validVariants = variants
      .map((variant) => ({
        size: variant.size.trim(),
        color: variant.color.trim(),
        quantity: variant.quantity || '0',
      }))
      .filter((variant) => variant.size && variant.color);

    data.append('productName', formData.productName);
    data.append('price', formData.price);
    data.append('quantity', totalQuantity.toString());
    data.append('discount', formData.discount);
    data.append('categoryId', formData.categoryId);
    if (formData.subCategoryId) {
      data.append('subCategoryId', formData.subCategoryId);
    }
    data.append('description', formData.description);
    data.append('deliverableZones', formData.deliverableZones);
    data.append('material', formData.material);

    validVariants.forEach((variant, index) => {
      data.append(`Variants[${index}].Size`, variant.size.trim());
      data.append(`Variants[${index}].Color`, variant.color.trim());
      data.append(`Variants[${index}].Quantity`, variant.quantity || '0');
    });

    productImages
      .filter((productImage) => !productImage.file)
      .forEach((productImage, index) => {
        data.append(`RetainedImageUrls[${index}]`, productImage.previewUrl);
        data.append(`RetainedImageColors[${index}]`, productImage.color);
      });
    productImages
      .filter((productImage): productImage is ProductImageDraft & { file: File } => Boolean(productImage.file))
      .forEach((productImage, index) => {
        data.append('images', productImage.file);
        data.append(`NewImageColors[${index}]`, productImage.color);
      });

    try {
      if (isEditMode) {
        await updateProduct({ id: id!, formData: data }).unwrap();
        toast.success('Producto actualizado correctamente');
      } else {
        await addProduct(data).unwrap();
        toast.success('Producto agregado correctamente');
      }
      navigate('/admin/products');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  if (isEditMode && isLoadingProduct) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="grid h-11 w-11 place-items-center border border-[#d8cdbb] bg-white text-[#111827] hover:border-[#9d731e]"
          aria-label="Volver a productos"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Publicación de catálogo</p>
          <h2 className="mt-1 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">
            {isEditMode ? 'Editar producto' : 'Agregar producto'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="border border-[#e1d5c2] bg-white p-5">
            <h3 className="border-b border-[#eee6da] pb-4 text-[12px] font-black uppercase tracking-[0.24em] text-[#111827]">
              Información básica
            </h3>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Nombre del producto</span>
                <input
                  required
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="ej. Camisa Oxford a medida"
                />
              </label>
              <div className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Categoría</span>
                  {!showAddCategory && (
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d731e] hover:underline"
                    >
                      + Agregar
                    </button>
                  )}
                </div>
                {showAddCategory ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nuevo nombre de categoría"
                      className="h-11 flex-1 border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCategory()}
                      disabled={isCreatingCategory}
                      className="h-11 bg-[#111827] px-4 text-xs font-black uppercase text-white disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="flex h-11 w-11 items-center justify-center border border-[#d8cdbb] text-[#7c7467]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] bg-white px-3 text-sm outline-none focus:border-[#9d731e]"
                  >
                      <option value="">Selecciona una categoría</option>
                    {categories?.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>
                    ))}
                  </select>
                )}
              </div>
              {selectedCategory && (
                <div className="block">
                  <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Subcategoría</span>
                    {!showAddSubCategory && (
                      <button
                        type="button"
                        onClick={() => setShowAddSubCategory(true)}
                        className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d731e] hover:underline"
                      >
                        + Add New
                      </button>
                    )}
                  </div>
                  {showAddSubCategory ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nueva subcategoría"
                        className="h-11 flex-1 border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCategory(selectedCategory.categoryId)}
                        disabled={isCreatingCategory}
                        className="h-11 bg-[#111827] px-4 text-xs font-black uppercase text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSubCategory(false)}
                        className="flex h-11 w-11 items-center justify-center border border-[#d8cdbb] text-[#7c7467]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      name="subCategoryId"
                      value={formData.subCategoryId}
                      onChange={handleChange}
                      className="mt-2 h-11 w-full border border-[#d8cdbb] bg-white px-3 text-sm outline-none focus:border-[#9d731e]"
                    >
                      <option value="">Selecciona una subcategoría</option>
                      {selectedCategory.subCategories.map((sub) => (
                        <option key={sub.categoryId} value={sub.categoryId}>{sub.categoryName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Stock total</span>
                <div className="mt-2 flex h-11 items-center border border-[#d8cdbb] bg-[#fbfaf7] px-3 text-sm font-semibold text-[#111827]">
                  {totalQuantity}
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[#e1d5c2] bg-white p-5">
            <h3 className="border-b border-[#eee6da] pb-4 text-[12px] font-black uppercase tracking-[0.24em] text-[#111827]">
              Precios y envío
            </h3>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Precio</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="0.00"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Monto de descuento</span>
                <input
                  type="number"
                  min="0"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="0"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Material</span>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                  className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="Ej. Aluminio, Plástico"
                />
              </label>
              <label className="block md:col-span-2 lg:col-span-3">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Códigos de zona de entrega (opcional)</span>
                <textarea
                  name="deliverableZones"
                  value={formData.deliverableZones}
                  onChange={handleChange}
                  rows={4}
                  className="mt-2 w-full resize-none border border-[#d8cdbb] px-3 py-2 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="150101, 150102, 150103"
                />
                <p className="mt-2 text-xs text-[#7c7467]">Opcional. El envío se determina por zona: Lima Metropolitana (24h) y resto del Perú vía Shalom/Marvisur contra entrega.</p>
              </label>
            </div>
          </section>

          <section className="border border-[#e1d5c2] bg-white p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[#eee6da] pb-4">
              <h3 className="text-[12px] font-black uppercase tracking-[0.24em] text-[#111827]">
                Inventario de variantes
              </h3>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex h-10 items-center gap-2 border border-[#111827] px-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#111827]"
              >
                <Plus className="h-4 w-4" />
                Agregar variante
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.clientId} className="grid gap-4 border border-[#eee6da] p-4 md:grid-cols-[1fr_1fr_140px_auto]">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Versión</span>
                    <input
                      required
                      type="text"
                      value={variant.size}
                      onChange={(event) => handleVariantChange(index, 'size', event.target.value)}
                      className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                      placeholder="M"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {quickSizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleVariantChange(index, 'size', variant.size === size ? '' : size)}
                          className={`h-7 min-w-8 border px-2 text-[10px] font-black ${
                            variant.size === size ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#d8cdbb] text-[#514b43]'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Color</span>
                    <input
                      required
                      type="text"
                      value={variant.color}
                      onChange={(event) => handleVariantChange(index, 'color', event.target.value)}
                      className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                      placeholder="Negro"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {quickColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleVariantChange(index, 'color', variant.color === color ? '' : color)}
                          className={`h-7 border px-2 text-[10px] font-black ${
                            variant.color === color ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#d8cdbb] text-[#514b43]'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Stock</span>
                    <input
                      required
                      type="number"
                      min="0"
                      value={variant.quantity}
                      onChange={(event) => handleVariantChange(index, 'quantity', event.target.value)}
                      className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                      placeholder="0"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeVariantRow(index)}
                      className="grid h-11 w-11 place-items-center border border-[#d8cdbb] text-[#7c7467] hover:border-red-500 hover:text-red-500"
                      aria-label={`Eliminar variante ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#7c7467]">Cada fila de versión y color mantiene su propio stock. Los clientes solo pueden comprar filas que aún tengan stock.</p>
          </section>

          <section className="border border-[#e1d5c2] bg-white p-5">
            <h3 className="border-b border-[#eee6da] pb-4 text-[12px] font-black uppercase tracking-[0.24em] text-[#111827]">
              Historia del producto
            </h3>
            <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Descripción</span>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={7}
                  className="mt-2 w-full resize-none border border-[#d8cdbb] px-3 py-2 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="Describe procesador, memoria, almacenamiento, gráficos y conectividad..."
              />
            </label>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-[#e1d5c2] bg-white p-5">
            <h3 className="border-b border-[#eee6da] pb-4 text-[12px] font-black uppercase tracking-[0.24em] text-[#111827]">
              Imágenes del producto
            </h3>
            <div className="mt-5 grid min-h-80 place-items-center border-2 border-dashed border-[#d8cdbb] bg-[#fbfaf7] p-5 text-center">
              {productImages.length ? (
                <div className="w-full">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {productImages.map((productImage, index) => (
                      <div key={productImage.clientId} className="group relative overflow-hidden bg-white shadow-sm">
                         <img src={productImage.previewUrl} alt={`Vista previa ${index + 1}`} className="h-48 w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Eliminar imagen del producto ${index + 1}`}
                          onClick={() => removePreviewAtIndex(index)}
                          className="absolute right-2 top-2 grid h-8 w-8 place-items-center bg-red-600 text-white opacity-95 transition hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <span className="absolute left-2 top-2 bg-[#111827] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                             Principal
                          </span>
                        )}
                        <span className="absolute bottom-2 left-2 bg-white/92 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#111827]">
                           {productImage.file ? 'Nueva' : 'Guardada'}
                        </span>
                        <div className="border-t border-[#eee6da] p-3">
                          <label className="block text-left">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#514b43]">Color de imagen</span>
                            <select
                              value={productImage.color}
                              onChange={(event) => handleImageColorChange(index, event.target.value)}
                              className="mt-2 h-10 w-full border border-[#d8cdbb] bg-white px-3 text-sm outline-none focus:border-[#9d731e]"
                            >
                              <option value="">Todos los colores</option>
                              {variantColors.map((color) => (
                                <option key={color} value={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isEditMode && (
                    <p className="mt-3 text-xs text-[#7c7467]">
                       Asigna cada imagen a un color. En la tienda, al seleccionar un color se usará la galería de ese color, mientras que "Todos los colores" funciona como imagen compartida de respaldo.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <ImageIcon className="mx-auto h-12 w-12 text-[#9d731e]" />
                  <p className="mt-3 text-sm font-semibold text-[#111827]">Sube una galería de producto nítida</p>
                  <p className="mt-1 text-xs text-[#7c7467]">PNG, JPG, WEBP. La primera imagen se convierte en la imagen principal de la tienda.</p>
                </div>
              )}
            </div>
            <label className="mt-4 flex h-11 cursor-pointer items-center justify-center border border-[#111827] text-[11px] font-black uppercase tracking-[0.2em] text-[#111827] hover:bg-[#111827] hover:text-white">
              Elegir imágenes
              <input type="file" className="sr-only" accept="image/*" multiple onChange={handleImageChange} />
            </label>
          </section>

          <section className="border border-[#e1d5c2] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9d731e]">Controles de publicación</p>
            <p className="mt-3 text-sm leading-6 text-[#6f6659]">
              Revisa precios, stock de variantes, códigos postales de entrega e imágenes antes de publicar.
            </p>
            <div className="mt-5 grid gap-3">
              <button
                type="submit"
                disabled={isAdding || isUpdating}
                className="inline-flex h-11 items-center justify-center gap-2 bg-[#111827] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-60"
              >
                {(isAdding || isUpdating) ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {isEditMode ? 'Guardar cambios' : 'Publicar producto'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="h-11 border border-[#d8cdbb] bg-white text-[11px] font-black uppercase tracking-[0.2em] text-[#111827]"
              >
                Cancelar
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default ProductFormPage;
