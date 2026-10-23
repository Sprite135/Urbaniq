import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <main className="grid min-h-[65vh] place-items-center px-4 text-center text-[#111827] dark:text-[#ece7dd]">
    <div>
      <p className="text-sm font-black uppercase tracking-[0.25em] text-[#9d731e]">Error 404</p>
      <h1 className="mt-3 text-4xl font-black">Esta página no existe</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">La dirección pudo cambiar o el enlace está incompleto.</p>
      <Link to="/" className="mt-7 inline-flex bg-[#111827] px-6 py-3 text-sm font-bold text-white dark:bg-[#d7b46a] dark:text-[#111827]">Volver al inicio</Link>
    </div>
  </main>;
}
