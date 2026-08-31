import { useState } from 'react';
import { useGetAllCouponsQuery, useCreateCouponMutation, useUpdateCouponMutation, useDeleteCouponMutation } from './adminApiSlice';
import { useGetCategoriesQuery } from '../catalog/catalogApiSlice';
import { toast } from 'react-toastify';
import { Plus, X, Trash2, Tag, Calendar, Percent, DollarSign, Users, Activity } from 'lucide-react';
import { getApiErrorMessage } from '@/app/apiError';

const CouponManagementPage = () => {
  const { data: couponsData, isLoading, refetch } = useGetAllCouponsQuery({ pageNumber: 1, pageSize: 50 });
  const { data: categories } = useGetCategoriesQuery();
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponToDelete, setCouponToDelete] = useState<{ id: number; code: string } | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 1, // 1 = Percentage, 2 = FixedAmount
    value: 0,
    minOrderAmount: 0,
    maxUses: 0,
    maxUsesPerUser: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    applicableCategoryIds: [] as number[],
    applicableProductIds: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 1,
      value: 0,
      minOrderAmount: 0,
      maxUses: 0,
      maxUsesPerUser: 0,
      startDate: '',
      endDate: '',
      isActive: true,
      applicableCategoryIds: [],
      applicableProductIds: [],
    });
    setEditingCoupon(null);
  };

  const openModal = (coupon?: any) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount || 0,
        maxUses: coupon.maxUses || 0,
        maxUsesPerUser: coupon.maxUsesPerUser || 0,
        startDate: coupon.startDate?.split('T')[0] || '',
        endDate: coupon.endDate?.split('T')[0] || '',
        isActive: coupon.isActive,
        applicableCategoryIds: coupon.applicableCategoryIds || [],
        applicableProductIds: coupon.applicableProductIds || [],
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.code.trim() || formData.value <= 0) return;

    try {
      const couponData = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        minOrderAmount: formData.minOrderAmount > 0 ? formData.minOrderAmount : undefined,
        maxUses: formData.maxUses > 0 ? formData.maxUses : undefined,
        maxUsesPerUser: formData.maxUsesPerUser > 0 ? formData.maxUsesPerUser : undefined,
        applicableCategoryIds: formData.applicableCategoryIds.length > 0 ? formData.applicableCategoryIds : undefined,
        applicableProductIds: formData.applicableProductIds.length > 0 ? formData.applicableProductIds : undefined,
      };

      if (editingCoupon) {
        await updateCoupon({ couponId: editingCoupon.couponId, data: couponData }).unwrap();
        toast.success('Cupón actualizado correctamente');
      } else {
        await createCoupon(couponData).unwrap();
        toast.success('Cupón creado correctamente');
      }
      closeModal();
      refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el cupón'));
    }
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    try {
      await deleteCoupon(couponToDelete.id).unwrap();
      toast.success('Cupón eliminado correctamente');
      setCouponToDelete(null);
      refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el cupón'));
      setCouponToDelete(null);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      applicableCategoryIds: prev.applicableCategoryIds.includes(categoryId)
        ? prev.applicableCategoryIds.filter(id => id !== categoryId)
        : [...prev.applicableCategoryIds, categoryId]
    }));
  };

  const coupons = couponsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9d731e]">Marketing</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#111827]">Cupones</h2>
          <p className="mt-2 text-sm text-[#6f6659]">Gestiona códigos promocionales, descuentos y campañas de marketing.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#111827] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1f2740]"
        >
          <Plus className="h-4 w-4" />
          Crear cupón
        </button>
      </div>

      <section className="border border-[#e1d5c2] bg-white">
        {isLoading ? (
          <div className="grid place-items-center p-10">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-[#eee6da] bg-[#f3ecdf] text-[11px] font-black uppercase tracking-[0.22em] text-[#514b43]">
                  <tr>
                    <th className="px-5 py-4">Código</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Valor</th>
                    <th className="px-5 py-4">Usos</th>
                    <th className="px-5 py-4">Vigencia</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee6da]">
                  {coupons.length ? (
                    coupons.map((coupon) => (
                      <tr key={coupon.couponId} className="transition-colors hover:bg-[#fbfaf7]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#f3ecdf] text-[#9d731e]">
                              <Tag className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#111827]">{coupon.code}</p>
                              <p className="text-xs text-[#7c7467]">ID: {coupon.couponId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            {coupon.discountType === 1 ? (
                              <>
                                <Percent className="h-3 w-3" />
                                Porcentaje
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-3 w-3" />
                                Monto fijo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-[#111827]">
                            {coupon.discountType === 1 ? `${coupon.value}%` : `S/ ${coupon.value}`}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-[#7c7467]" />
                            <span className="text-sm font-semibold text-[#514b43]">
                              {coupon.usesCount}
                              {coupon.maxUses && ` / ${coupon.maxUses}`}
                            </span>
                          </div>
                          {coupon.maxUsesPerUser && (
                            <span className="text-xs text-[#7c7467] block">
                              <Users className="h-3 w-3 inline mr-1" />
                              {coupon.maxUsesPerUser} por usuario
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-xs text-[#514b43]">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(coupon.startDate).toLocaleDateString('es-PE')}</span>
                            <span>→</span>
                            <span>{new Date(coupon.endDate).toLocaleDateString('es-PE')}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                            coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {coupon.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openModal(coupon)}
                              className="text-xs font-bold text-[#9d731e] hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setCouponToDelete({ id: coupon.couponId, code: coupon.code })}
                              title="Eliminar cupón"
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
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#7c7467]">
                        No se encontraron cupones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y divide-[#eee6da]">
              {coupons.length ? (
                coupons.map((coupon) => (
                  <div key={coupon.couponId} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#f3ecdf] text-[#9d731e]">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#111827] truncate">{coupon.code}</p>
                        <p className="text-xs text-[#7c7467]">{coupon.discountType === 1 ? `${coupon.value}%` : `S/ ${coupon.value}`}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                        coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {coupon.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-[#514b43]">
                        <span>{coupon.usesCount} usos</span>
                        {coupon.maxUses && <span> / {coupon.maxUses}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openModal(coupon)}
                          className="text-[11px] font-black uppercase tracking-[0.14em] text-[#9d731e] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setCouponToDelete({ id: coupon.couponId, code: coupon.code })}
                          title="Eliminar cupón"
                          className="grid h-8 w-8 place-items-center border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#7c7467]">No se encontraron cupones.</div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/60 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl border border-[#e1d5c2] bg-white shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#eee6da] px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9d731e]">
                  {editingCoupon ? 'Editar cupón' : 'Nuevo cupón'}
                </p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-[0.08em] text-[#111827]">
                  {editingCoupon ? 'Modificar cupón existente' : 'Crear nuevo cupón'}
                </h3>
              </div>
              <button type="button" onClick={closeModal} className="grid h-9 w-9 place-items-center border border-[#d8cdbb]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Código</span>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                    placeholder="ej. VERANO20"
                    maxLength={50}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Tipo de descuento</span>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: parseInt(e.target.value) })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  >
                    <option value={1}>Porcentaje (%)</option>
                    <option value={2}>Monto fijo (S/)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Valor del descuento</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                    placeholder={formData.discountType === 1 ? "ej. 20" : "ej. 50"}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Monto mínimo de compra</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                    placeholder="ej. 100 (opcional)"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Máximo de usos (global)</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                    placeholder="0 = sin límite"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Máximo de usos por usuario</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: parseInt(e.target.value) || 0 })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                    placeholder="0 = sin límite"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Fecha de inicio</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43]">Fecha de fin</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-2 h-11 w-full border border-[#d8cdbb] px-3 text-sm outline-none focus:border-[#9d731e]"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-5 w-5 accent-[#9d731e]"
                />
                <span className="text-sm font-bold text-[#514b43]">Cupón activo</span>
              </label>

              {categories && categories.length > 0 && (
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#514b43] block mb-3">
                    Categorías aplicables (opcional)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.categoryId}
                        type="button"
                        onClick={() => toggleCategory(category.categoryId)}
                        className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
                          formData.applicableCategoryIds.includes(category.categoryId)
                            ? 'bg-[#9d731e] text-white border-[#9d731e]'
                            : 'bg-white text-[#514b43] border-[#d8cdbb] hover:border-[#9d731e]'
                        }`}
                      >
                        {category.categoryName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-[#eee6da] pt-5">
                <button type="button" onClick={closeModal} className="h-10 border border-[#d8cdbb] px-5 text-xs font-bold uppercase tracking-[0.16em]">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating || !formData.code.trim() || formData.value <= 0}
                  className="h-10 bg-[#111827] px-5 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                >
                  {isCreating || isUpdating ? 'Guardando...' : editingCoupon ? 'Actualizar cupón' : 'Crear cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/60 p-4">
          <div className="w-full max-w-sm border border-[#e1d5c2] bg-white shadow-2xl p-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-[0.08em] text-[#111827]">Eliminar cupón</h3>
            <p className="mt-2 text-sm text-[#514b43]">
              ¿Deseas eliminar el cupón <strong>"{couponToDelete.code}"</strong>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
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

export default CouponManagementPage;