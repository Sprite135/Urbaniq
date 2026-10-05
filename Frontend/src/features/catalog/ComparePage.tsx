import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { useGetProductByIdQuery, type Product } from './catalogApiSlice';
import { removeCompare } from './compareSlice';
import ProductImage from './components/ProductImage';

const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);

export default function ComparePage() {
  const ids = useSelector((state: RootState) => state.compare.ids);
  const dispatch = useDispatch();
  const queries = [
    useGetProductByIdQuery(ids[0] ?? '', { skip: !ids[0], refetchOnMountOrArgChange: true }),
    useGetProductByIdQuery(ids[1] ?? '', { skip: !ids[1], refetchOnMountOrArgChange: true }),
    useGetProductByIdQuery(ids[2] ?? '', { skip: !ids[2], refetchOnMountOrArgChange: true }),
  ];
  const rows: { label: string; value: (p: Product) => string }[] = [
    { label: 'Precio con descuento', value: p => money(Math.max(0, p.price - p.discount)) },
    { label: 'Ahorro', value: p => money(p.discount) },
    { label: 'Disponibilidad', value: p => p.quantity > 0 ? 'En stock' : 'Agotado' },
    { label: 'Categoría', value: p => p.subCategoryName || p.categoryName || 'No indicada' },
    { label: 'Versiones', value: p => p.availableSizes?.join(', ') || p.size || 'No indicadas' },
    { label: 'Colores', value: p => p.availableColors?.join(', ') || p.color || 'No indicados' },
    { label: 'Material', value: p => p.material || 'No indicado' },
    { label: 'Opiniones', value: p => p.totalReviews && p.averageRating != null ? `${p.averageRating.toFixed(1)}/5 (${p.totalReviews})` : 'Sin opiniones' },
  ];
  return <section className="mx-auto max-w-7xl px-4 py-10 dark:text-[#ece7dd]">
    <h1 className="text-3xl font-bold">Compara antes de elegir</h1>
    <p className="mt-3 text-gray-600 dark:text-gray-300">Selecciona hasta tres artículos desde el catálogo. Los precios incluyen IGV; el envío se calcula al comprar.</p>
    <Link to="/catalog" className="my-5 inline-block font-semibold text-[#9d731e] underline">Añadir productos del catálogo</Link>
    {ids.length === 0 ? <p className="rounded-xl border p-8">Aún no elegiste productos. Pulsa «Comparar» en sus tarjetas.</p> : <>
      {ids.length === 1 && <p className="mb-4">Añade otro producto para comparar sus características.</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[580px] text-left text-sm">
          <caption className="sr-only">Comparación de productos seleccionados</caption>
          <thead><tr><th scope="col" className="w-40 p-4">Característica</th>{ids.map((id, i) => {
            const q = queries[i]; const p = q.currentData;
            return <th scope="col" key={id} className="min-w-48 max-w-80 p-4 align-top">
              {q.isFetching ? <p role="status">Actualizando ficha…</p> : q.isError || !p ? <p role="alert">No se pudo cargar este producto. <button onClick={() => q.refetch()} className="underline">Reintentar</button></p> : <>
                <ProductImage src={p.image} alt={p.productName} fallbackLabel={p.productName} className="mb-3 h-36 w-full bg-white object-contain" />
                <Link className="underline" to={`/product/${p.slug}`}>{p.productName}</Link>
              </>}
              <button className="mt-3 block text-sm font-normal text-[#9d731e] underline" onClick={() => dispatch(removeCompare(id))}>Quitar</button>
            </th>;
          })}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.label} className="border-t border-gray-200 even:bg-gray-50 dark:border-gray-700 dark:even:bg-[#16181d]">
            <th scope="row" className="p-4">{row.label}</th>{ids.map((id, i) => <td key={id} className="p-4">{queries[i].currentData && !queries[i].isError && !queries[i].isFetching ? row.value(queries[i].currentData!) : '—'}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Consulta cada ficha para las especificaciones técnicas y la compatibilidad. «No indicado» significa que ese dato no está disponible.</p>
    </>}
  </section>;
}
