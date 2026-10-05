import { useDispatch, useSelector } from 'react-redux';
import { Columns3 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { RootState } from '@/app/store';
import { toggleCompare } from '../compareSlice';

export default function CompareButton({ id, name }: { id: string; name: string }) {
  const ids = useSelector((state: RootState) => state.compare.ids);
  const dispatch = useDispatch();
  const selected = ids.includes(id);
  return <button type="button" aria-pressed={selected} aria-label={`${selected ? 'Quitar de comparación' : 'Comparar'} ${name}`}
    onClick={() => { if (!selected && ids.length >= 3) toast.info('Puedes comparar hasta tres productos. Quita uno para añadir otro.'); else dispatch(toggleCompare(id)); }}
    className={`flex w-full items-center justify-center gap-2 border-t px-4 py-3 text-sm font-semibold ${selected ? 'bg-[#d7b46a] text-[#111827]' : 'border-gray-200 text-[#9d731e] hover:bg-[#d7b46a]/10 dark:border-[#26282e]'}`}>
    <Columns3 size={16} />{selected ? 'En comparación' : 'Comparar'}
  </button>;
}
