import { useState, useMemo } from 'react';
import { useGetCategoriesQuery, type Category } from '../catalog/catalogApiSlice';
import { useCreateCategoryMutation, useDeleteCategoryMutation } from './adminApiSlice';
import { toast } from 'react-toastify';
import { Plus, Tags, X, Trash2, CornerDownRight } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

const flattenCategories = (categories: Category[] = [], depth = 0): Array<Category & { depth: number }> =>
  categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.subCategories || [], depth + 1),
  ]);

const CategoryManagementPage = () => {
  const { data: categories, isLoading } = useGetCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

  const flattenedCategories = useMemo(() => flattenCategories(categories || []), [categories]);

  // Generate preview slug
  const previewSlug = useMemo(() => {
    let slug = newCategoryName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (parentCategoryId) {
       const parent = flattenedCategories.find(c => c.categoryId === parentCategoryId);
       if (parent) {
         slug = `${parent.slug}/${slug}`;
       }
    }
    return slug;
  }, [newCategoryName, parentCategoryId, flattenedCategories]);


  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createCategory({ 
        categoryName: newCategoryName.trim(), 
        description: newCategoryDesc.trim(),
        parentCategoryId: parentCategoryId
      }).unwrap();
      toast.success('Categoría creada correctamente');
      closeModal();
    } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'No se pudo crear la categoría'));
    }
  };

  const confirmDelete = async () => {
     if (!categoryToDelete) return;
     try {
       const res = await deleteCategory(categoryToDelete.id).unwrap();
       toast.success(res.message);
       setCategoryToDelete(null);
     } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'No se pudo eliminar la categoría'));
       setCategoryToDelete(null);
     }
  };

  const openModal = (parentId: number | null = null) => {
      setParentCategoryId(parentId);
      setIsModalOpen(true);
  }

  const closeModal = () => {
      setIsModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      setParentCategoryId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Comercialización</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">Categorías</h2>
          <p className="mt-2 text-sm text-[#6f6659]">Organiza la navegación de la tienda, los árboles de colecciones y la búsqueda de categorías.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#111827] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1f2740]"
        >
          <Plus className="h-4 w-4" />
           Agregar categoría raíz
        </button>
      </div>

      <section className="border border-[#e1d5c2] bg-white">
        {isLoading ? (
          <div className="grid place-items-center p-10">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-[#eee6da] bg-[#f3ecdf] text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">
                  <tr>
                    <th className="px-5 py-4">Categoría</th>
                    <th className="px-5 py-4">Slug</th>
                    <th className="px-5 py-4">Nivel</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee6da]">
                  {flattenedCategories.length ? (
                    flattenedCategories.map((category) => (
                      <tr key={category.categoryId} className="transition-colors hover:bg-[#fbfaf7]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4" style={{ paddingLeft: `${category.depth * 24}px` }}>
                            {category.depth > 0 && <CornerDownRight className="h-4 w-4 text-[#d8cdbb]" />}
                            <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#f3ecdf] text-[#9d731e]">
                              <Tags className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#111827]">{category.categoryName}</p>
                              {category.description && <p className="mt-1 max-w-md truncate text-xs text-[#7c7467]">{category.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-[#514b43]">{category.slug}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#514b43]">
                          {category.depth === 0 ? 'Raíz' : `Subnivel ${category.depth}`}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                             {category.depth === 0 && (
                               <button
                                 onClick={() => openModal(category.categoryId)}
                                 className="text-xs font-bold text-[#9d731e] hover:underline"
                               >
                                 + Subcategoría
                               </button>
                             )}
                             <button 
                               onClick={() => setCategoryToDelete({ id: category.categoryId, name: category.categoryName })}
                                title="Eliminar categoría"
                               className="grid h-8 w-8 place-items-center border border-red-200 text-red-600 hover:bg-red-50"
                             >
                                <Trash2 className="h-4 w-4" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron categorías.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y divide-[#eee6da]">
              {flattenedCategories.length ? (
                flattenedCategories.map((category) => (
                  <div key={category.categoryId} className="p-4 space-y-3" style={{ paddingLeft: `${Math.max(16, category.depth * 16 + 16)}px` }}>
                    <div className="flex items-center gap-3">
                      {category.depth > 0 && <CornerDownRight className="h-4 w-4 text-[#d8cdbb] shrink-0" />}
                      <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#f3ecdf] text-[#9d731e]">
                        <Tags className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#111827] truncate">{category.categoryName}</p>
                        <p className="font-mono text-[10px] text-[#7c7467] truncate">{category.slug}</p>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-xs text-[#7c7467] line-clamp-2" style={{ paddingLeft: category.depth > 0 ? '2.5rem' : '3.5rem' }}>
                        {category.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="text-xs font-semibold text-[#514b43]">
                        {category.depth === 0 ? 'Root' : `Sub level ${category.depth}`}
                      </span>
                      <div className="flex items-center gap-3">
                        {category.depth === 0 && (
                          <button
                            onClick={() => openModal(category.categoryId)}
                            className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9d731e] hover:underline"
                          >
                            + Subcategoría
                          </button>
                        )}
                        <button 
                          onClick={() => setCategoryToDelete({ id: category.categoryId, name: category.categoryName })}
                          title="Eliminar categoría"
                          className="grid h-8 w-8 place-items-center border border-red-200 text-red-600 hover:bg-red-50"
                        >
                           <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron categorías.</div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/60 p-4">
          <div className="w-full max-w-lg border border-[#e1d5c2] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee6da] px-5 py-4">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9d731e]">Nueva categoría</p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-[0.08em] text-[#111827]">
                  {parentCategoryId ? 'Crear subcategoría' : 'Crear categoría raíz'}
                </h3>
              </div>
              <button type="button" onClick={() => closeModal()} className="grid h-9 w-9 place-items-center border border-[#d8cdbb]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-5 p-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">
                  {parentCategoryId ? 'Nombre de subcategoría' : 'Nombre de categoría'}
                </span>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  placeholder={parentCategoryId ? "ej. Polos estampados" : "ej. Blusas"}
                />
              </label>
              
              {newCategoryName && (
                <div className="bg-[#f3ecdf] p-3 text-xs text-[#514b43]">
                   <strong>Vista previa del slug de URL: </strong> <span className="font-mono">{previewSlug}</span>
                </div>
              )}

              <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Descripción</span>
                <textarea
                  value={newCategoryDesc}
                  onChange={(event) => setNewCategoryDesc(event.target.value)}
                  className="mt-2 h-24 w-full resize-none border border-[#d8cdbb] px-3 py-2 text-sm outline-none focus:border-[#9d731e]"
                  placeholder="Nota breve de comercialización..."
                />
              </label>
              <div className="flex justify-end gap-3 border-t border-[#eee6da] pt-5">
                <button type="button" onClick={() => closeModal()} className="h-10 border border-[#d8cdbb] px-5 text-xs font-bold uppercase tracking-[0.16em]">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newCategoryName.trim()}
                  className="h-10 bg-[#111827] px-5 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                >
                  {isCreating ? 'Guardando...' : 'Guardar categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/60 p-4">
          <div className="w-full max-w-sm border border-[#e1d5c2] bg-white shadow-2xl p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
               <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-[0.08em] text-[#111827]">Eliminar categoría</h3>
            <p className="mt-2 text-sm text-[#514b43]">
              ¿Deseas eliminar la categoría <strong>"{categoryToDelete.name}"</strong>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="h-10 border border-[#d8cdbb] px-5 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="h-10 bg-red-600 px-5 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-50 hover:bg-red-700"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementPage;
