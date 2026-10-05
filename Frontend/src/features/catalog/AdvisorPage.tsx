import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetHomeProductCardsQuery } from './catalogApiSlice';
import ProductCard from './components/ProductCard';
import { recommendProducts, type AdvisorFamily, type AdvisorUse } from './productAdvisor';

export default function AdvisorPage() {
  const [budget, setBudget] = useState('1500');
  const [use, setUse] = useState<AdvisorUse>('study');
  const [family, setFamily] = useState<AdvisorFamily>('laptop');
  const [choice, setChoice] = useState<{ budget: number; use: AdvisorUse; family: AdvisorFamily }>();
  const { data, isFetching, isError, refetch } = useGetHomeProductCardsQuery(200, { refetchOnMountOrArgChange: true });
  const results = choice ? recommendProducts(data ?? [], choice.budget, choice.family, choice.use) : [];
  const inputClass = 'mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-[#111827] dark:border-gray-600 dark:bg-[#16181d] dark:text-[#ece7dd]';
  return <section className="mx-auto max-w-7xl px-4 py-10 dark:text-[#ece7dd]">
    <span className="text-sm font-semibold text-[#9d731e]">Tu próxima compra, con más claridad</span>
    <h1 className="mt-2 text-3xl font-bold">Encuentra opciones para tu presupuesto</h1>
    <p className="mt-3 max-w-3xl text-gray-600 dark:text-gray-300">Elige qué buscas y cuánto quieres gastar por artículo. Te mostramos hasta tres opciones en stock, de menor a mayor precio con descuento.</p>
    <form onSubmit={e => { e.preventDefault(); const amount = Number(budget); if (Number.isFinite(amount) && amount > 0) setChoice({ budget: amount, use, family }); }} className="my-8 grid gap-5 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-[#16181d] md:grid-cols-4 md:items-end">
      <label className="font-semibold">¿Qué buscas?<select value={family} onChange={e => setFamily(e.target.value as AdvisorFamily)} className={inputClass}>
        <option value="laptop">Laptop</option><option value="monitor">Monitor</option><option value="accessory">Teclado, mouse o audio</option>
      </select></label>
      <label className="font-semibold">Uso principal<select value={use} onChange={e => setUse(e.target.value as AdvisorUse)} className={inputClass}>
        <option value="study">Estudio</option><option value="work">Trabajo</option><option value="gaming">Gaming</option>
      </select></label>
      <label className="font-semibold">Máximo por artículo (S/)<input required type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} className={inputClass} /></label>
      <button type="submit" disabled={isFetching || isError} className="rounded-lg bg-[#d7b46a] p-3 font-bold text-[#111827] disabled:opacity-50">Ver opciones</button>
    </form>
    {isFetching ? <p role="status">Consultando el catálogo…</p> : isError ? <p role="alert">No pudimos consultar el catálogo. <button type="button" onClick={() => refetch()} className="underline">Reintentar</button></p> : choice && <div aria-live="polite">
      <h2 className="mb-3 text-xl font-bold">{results.length ? 'Opciones que cumplen tus filtros' : 'No encontramos coincidencias en esta selección'}</h2>
      {results.length ? <><p className="mb-5 text-sm text-gray-600 dark:text-gray-300">En stock y dentro de S/ {choice.budget.toFixed(2)}. {choice.use === 'gaming' ? 'Para gaming solo incluimos artículos cuyo nombre indica Gaming, Gamer, RTX o Radeon; revisa los requisitos de tus juegos.' : 'Para estudio y trabajo filtramos por tipo y presupuesto; consulta RAM, almacenamiento y requisitos de tus programas en la ficha.'}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{results.map(p => <ProductCard key={p.id} product={p} />)}</div></> : <p>Prueba otro tipo o presupuesto, o <Link to="/catalog" className="underline">explora el catálogo completo</Link>.</p>}
    </div>}
    <p className="mt-8 text-sm text-gray-600 dark:text-gray-300">Orientación basada en nombres y categorías de una selección de hasta 200 artículos del catálogo. El presupuesto no incluye envío. Confirma especificaciones y compatibilidad antes de comprar.</p>
  </section>;
}
