import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

const business = {
  name: 'Urbaniq Tecnología Académica S.A.C.',
  taxId: 'RUC 20000000000 (dato ficticio, sin validez fiscal)',
  address: 'Av. de la Innovación 123, Lima, Perú (dirección ficticia)',
  email: 'soporte@urbaniq.example',
};

export default function LegalPage() {
  const { document = 'terms' } = useParams();
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSent(true); };
  const title = document === 'privacy' ? 'Política de privacidad' : document === 'complaints' ? 'Libro de reclamaciones' : 'Términos de uso';
  return <main className="container mx-auto max-w-3xl px-4 py-12 text-[#111827] dark:text-[#ece7dd]">
    <p className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Proyecto universitario de demostración. La empresa, el RUC, la dirección, los pagos y los comprobantes de esta aplicación son ficticios y no tienen validez comercial ni fiscal.</p>
    <h1 className="mt-8 text-3xl font-black">{title}</h1>
    <div className="mt-6 space-y-5 leading-7 text-gray-700 dark:text-gray-300">
      <p><strong>{business.name}</strong><br />{business.taxId}<br />{business.address}<br />Contacto: <a className="underline" href={`mailto:${business.email}`}>{business.email}</a></p>
      {document === 'privacy' && <>
        <p>La demostración almacena los datos que el usuario ingresa para crear su cuenta, carrito, direcciones y pedidos. Se usan para simular el funcionamiento de la tienda y su panel administrativo.</p>
        <p>No ingreses datos personales reales, números de tarjeta, documentos, contraseñas reutilizadas ni comprobantes bancarios reales. Puedes solicitar la eliminación de los datos de demostración escribiendo al correo indicado.</p>
      </>}
      {document === 'terms' && <>
        <p>El catálogo, precios, existencias, envíos y métodos de pago sirven únicamente para evaluar el proyecto. Confirmar un pedido no crea una compraventa real.</p>
        <p>Las boletas y facturas son referencias de demostración sin validez ante SUNAT. Stripe solo debe configurarse en modo de prueba; Yape, Plin y transferencias no deben realizarse con dinero real.</p>
      </>}
      {document === 'complaints' && <>
        <p>Este formulario simula el registro de una reclamación. No se envía a una empresa ni sustituye el Libro de Reclamaciones de un comercio real.</p>
        <form onSubmit={submit} className="space-y-4 border border-gray-300 p-5 dark:border-gray-700">
          <label className="block text-sm font-semibold">Nombre<input required maxLength={100} className="mt-1 w-full border border-gray-300 bg-transparent p-2 dark:border-gray-700" /></label>
          <label className="block text-sm font-semibold">Correo<input required type="email" maxLength={200} className="mt-1 w-full border border-gray-300 bg-transparent p-2 dark:border-gray-700" /></label>
          <label className="block text-sm font-semibold">Detalle<textarea required minLength={10} maxLength={1000} rows={5} className="mt-1 w-full border border-gray-300 bg-transparent p-2 dark:border-gray-700" /></label>
          <button className="bg-[#111827] px-5 py-3 text-sm font-bold text-white dark:bg-[#d7b46a] dark:text-[#111827]">Registrar simulación</button>
          {sent && <p role="status" className="text-green-700 dark:text-green-400">Reclamación de demostración registrada solo en esta pantalla.</p>}
        </form>
      </>}
    </div>
    <Link to="/help" className="mt-8 inline-block underline">Volver al centro de ayuda</Link>
  </main>;
}
