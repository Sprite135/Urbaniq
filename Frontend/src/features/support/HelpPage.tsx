import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function HelpPage() {
  const { hash } = useLocation();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 text-[#111827] dark:text-[#ece7dd]">
      <h1 className="text-3xl font-black">Centro de ayuda</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">Todo lo que necesitas para comprar y seguir tu pedido.</p>
      <nav aria-label="Temas de ayuda" className="mt-6 flex flex-wrap gap-2">
        {[['payments', 'Pagos'], ['shipping', 'Envíos'], ['faq', 'Preguntas'], ['support', 'Contactar']].map(([id, label]) =>
          <a key={id} href={`#${id}`} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold hover:border-[#9d731e] dark:border-gray-700">{label}</a>)}
      </nav>
      <div className="mt-8 space-y-10 leading-7">
        <section id="shipping" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Envíos y entregas</h2>
          <p className="mt-3">La dirección determina la zona de entrega. Para provincias, selecciona una agencia durante el checkout. Consulta con atención al cliente la cobertura y el plazo para tu dirección antes de pagar.</p>
          <p>El resumen muestra por separado los productos, el envío y el total que cobra la tienda. No se garantiza entrega en 24 horas.</p>
        </section>
        <section id="payments" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Métodos de pago</h2>
          <p className="mt-3">En el checkout encontrarás los métodos disponibles: contra entrega, Yape, Plin y transferencias. El pago con tarjeta aparece habilitado cuando el comercio tiene configurada su pasarela.</p>
          <p>Para pagos por transferencia, revisa los datos del comercio y conserva tu comprobante. Puedes adjuntar el comprobante o registrar el código desde el detalle de tu pedido.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Selecciona Yape o Plin cuando aparezcan habilitados y comprueba el nombre del destinatario.</li>
            <li>Transfiere el importe indicado y crea tu pedido.</li>
            <li>Abre el seguimiento y envía el comprobante. El pago permanecerá pendiente mientras revisamos el abono.</li>
          </ol>
          <p className="mt-3 font-semibold">Nunca ingreses aquí tu PIN ni los códigos que autorizan una compra.</p>
        </section>
        <section id="faq" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Preguntas frecuentes</h2>
          <h3 className="mt-4 font-bold">¿Necesito una cuenta para comprar?</h3>
          <p>Puedes explorar el catálogo y agregar productos al carrito como invitado. Para confirmar tu pedido, inicia sesión o crea una cuenta.</p>
          <h3 className="mt-4 font-bold">¿Dónde veo el estado de mi pedido?</h3>
          <p>Consulta <Link to="/orders" className="underline">Mis pedidos</Link> y abre el detalle: verás el estado del pago y los pasos de preparación, envío y entrega. Se actualiza cada 30 segundos mientras la página está enfocada.</p>
          <h3 className="mt-4 font-bold">¿Cómo recupero mi contraseña?</h3>
          <p>Abre <Link to="/forgot-password" className="underline">Recuperar contraseña</Link> y sigue las instrucciones del correo. El código de verificación vence en 15 minutos.</p>
        </section>
        <section id="support" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Ayuda con pedidos</h2>
          <p className="mt-3">Ten a mano el número de pedido y el comprobante de pago para consultar con el comercio.</p>
          {supportEmail && <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>}
          <p><Link to="/orders" className="underline">Consultar mis pedidos</Link></p>
        </section>
      </div>
    </div>
  );
}
