import React, { useState, useEffect } from 'react';
import { useAddAddressMutation, useUpdateAddressMutation } from '../addressApiSlice';
import type { Address, CreateAddressRequest } from '../addressApiSlice';
import { PERU_DEPARTMENTS, resolveZone } from '../deliveryHelper';
import { toast } from 'react-toastify';

interface AddressFormProps {
  initialData?: Address | null;
  onSuccess: (address: Address) => void;
  onCancel: () => void;
}

interface FormState {
  fullName: string;
  phoneNumber: string;
  department: string;
  province: string;
  district: string;
  houseName: string;
  landMark: string;
}

const emptyForm: FormState = {
  fullName: '',
  phoneNumber: '',
  department: 'Lima',
  province: 'Lima',
  district: '',
  houseName: '',
  landMark: '',
};

const AddressForm: React.FC<AddressFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [addAddress, { isLoading: isAdding }] = useAddAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateAddressMutation();
  const isLoading = isAdding || isUpdating;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        fullName: initialData.fullName ?? '',
        phoneNumber: initialData.phoneNumber ?? '',
        department: initialData.department ?? 'Lima',
        province: initialData.province ?? '',
        district: initialData.district ?? '',
        houseName: initialData.houseName ?? '',
        landMark: initialData.landMark ?? '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const normalizedValue =
      name === 'phoneNumber' ? value.replace(/\D/g, '').slice(0, 9) : value;
    setForm({ ...form, [name]: normalizedValue });
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!/^[A-Za-z][A-Za-z\s.'-]{1,99}$/.test(form.fullName.trim())) {
      nextErrors.fullName = 'Ingresa un nombre completo válido.';
    }
    if (!/^\d{9}$/.test(form.phoneNumber)) {
      nextErrors.phoneNumber = 'El número de teléfono debe tener 9 dígitos.';
    }
    if (!form.department) {
      nextErrors.department = 'Selecciona un departamento.';
    }
    if (!form.province.trim()) {
      nextErrors.province = 'Ingresa la provincia.';
    }
    if (!form.district.trim()) {
      nextErrors.district = 'Ingresa el distrito.';
    }
    if (!form.houseName.trim() || form.houseName.length > 200) {
      nextErrors.houseName = 'La dirección (calle/av. y número) es obligatoria.';
    }
    if (!form.landMark.trim() || form.landMark.length > 200) {
      nextErrors.landMark = 'El punto de referencia es obligatorio.';
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      value: form,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm();
    if (!validation.isValid) {
      toast.error('Corrige los campos de dirección resaltados.');
      return;
    }

    const payload: CreateAddressRequest = {
      fullName: validation.value.fullName.trim(),
      phoneNumber: validation.value.phoneNumber,
      department: validation.value.department,
      province: validation.value.province.trim(),
      district: validation.value.district.trim(),
      houseName: validation.value.houseName.trim(),
      place: validation.value.district.trim(),
      reference: validation.value.province.trim(),
      landMark: validation.value.landMark.trim(),
      deliveryZone: resolveZone(validation.value.department, validation.value.province),
    };

    try {
      if (initialData) {
        const response = await updateAddress({
          addressId: initialData.addressId,
          body: payload,
        }).unwrap();
        toast.success('Dirección actualizada exitosamente');
        onSuccess(response.data);
      } else {
        const response = await addAddress(payload).unwrap();
        toast.success('Dirección agregada exitosamente');
        onSuccess(response.data);
      }
    } catch {
      toast.error(`No se pudo ${initialData ? 'actualizar' : 'agregar'} la dirección`);
    }
  };

  const inputClass = (field: keyof FormState) =>
    `w-full px-3 py-2.5 border text-sm focus:outline-none transition-colors ${
      errors[field] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#111827]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-[#ece7dd] mb-4">
        {initialData ? 'Editar dirección' : 'Agregar nueva dirección'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Nombre completo</label>
          <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Juan Pérez" className={inputClass('fullName')} />
          {errors.fullName && <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Teléfono</label>
          <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="987654321" className={inputClass('phoneNumber')} />
          {errors.phoneNumber && <p className="mt-1 text-xs font-medium text-red-600">{errors.phoneNumber}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Departamento</label>
          <select name="department" value={form.department} onChange={handleChange} className={inputClass('department')}>
            {PERU_DEPARTMENTS.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
          {errors.department && <p className="mt-1 text-xs font-medium text-red-600">{errors.department}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Provincia</label>
          <input type="text" name="province" value={form.province} onChange={handleChange} placeholder="Lima" className={inputClass('province')} />
          {errors.province && <p className="mt-1 text-xs font-medium text-red-600">{errors.province}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Distrito</label>
          <input type="text" name="district" value={form.district} onChange={handleChange} placeholder="Miraflores" className={inputClass('district')} />
          {errors.district && <p className="mt-1 text-xs font-medium text-red-600">{errors.district}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Dirección (calle/av. y número)</label>
          <input type="text" name="houseName" value={form.houseName} onChange={handleChange} placeholder="Av. Larco 123, Dpto 4B" className={inputClass('houseName')} />
          {errors.houseName && <p className="mt-1 text-xs font-medium text-red-600">{errors.houseName}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-600 dark:text-[#9ca3af] uppercase tracking-wider mb-1.5">Punto de referencia</label>
          <input type="text" name="landMark" value={form.landMark} onChange={handleChange} placeholder="Cerca del parque Kennedy" className={inputClass('landMark')} />
          {errors.landMark && <p className="mt-1 text-xs font-medium text-red-600">{errors.landMark}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#111827] text-white px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-[#1f2740] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : initialData ? 'Actualizar dirección' : 'Guardar dirección'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 border border-gray-300 font-bold uppercase tracking-widest text-xs text-gray-600 dark:text-[#9ca3af] hover:border-gray-400 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
