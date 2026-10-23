import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { clearCompare } from '../compareSlice';

export default function CompareBar() {
  const count = useSelector((state: RootState) => state.compare.ids.length);
  const dispatch = useDispatch();
  if (!count) return null;
  return <aside aria-label="Productos para comparar" className="sticky bottom-0 z-30 flex flex-nowrap items-center justify-between gap-2 border-t border-[#d7b46a] bg-white px-3 py-2 shadow-lg dark:bg-[#16181d] dark:text-[#ece7dd] sm:justify-center sm:gap-4 sm:px-4 sm:py-3">
    <span aria-live="polite" className="whitespace-nowrap text-xs sm:text-base">
      <span className="sm:hidden">{count}/3 seleccionados</span>
      <span className="hidden sm:inline">{count} de 3 productos seleccionados</span>
    </span>
    <Link to="/compare" className="whitespace-nowrap rounded-lg bg-[#d7b46a] px-3 py-2 text-xs font-bold text-[#111827] sm:px-4 sm:text-base">Ver comparación</Link>
    <button type="button" onClick={() => dispatch(clearCompare())} className="whitespace-nowrap text-xs underline sm:text-sm">Vaciar</button>
  </aside>;
}
