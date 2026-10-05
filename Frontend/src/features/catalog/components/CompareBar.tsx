import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { clearCompare } from '../compareSlice';

export default function CompareBar() {
  const count = useSelector((state: RootState) => state.compare.ids.length);
  const dispatch = useDispatch();
  if (!count) return null;
  return <aside aria-label="Productos para comparar" className="sticky bottom-0 z-30 flex flex-wrap items-center justify-center gap-4 border-t border-[#d7b46a] bg-white px-4 py-3 shadow-lg dark:bg-[#16181d] dark:text-[#ece7dd]">
    <span aria-live="polite">{count} de 3 productos seleccionados</span>
    <Link to="/compare" className="rounded-lg bg-[#d7b46a] px-4 py-2 font-bold text-[#111827]">Ver comparación</Link>
    <button type="button" onClick={() => dispatch(clearCompare())} className="text-sm underline">Vaciar</button>
  </aside>;
}
