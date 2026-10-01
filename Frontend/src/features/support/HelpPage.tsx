import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function HelpPage() {
  const { hash } = useLocation();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="container mx-auto max-w-3xl py-12 text-[#111827] dark:text-[#ece7dd]">
      <h1 className="text-3xl font-black">Centro de ayuda</h1>
      <div className="mt-8 space-y-10 leading-7">
        <section id="shipping" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Envíos y entregas</h2>
          <p className="mt-3">La dirección determina la zona de entrega. En Lima Metropolitana, los pedidos se entregan con flota propia. Para provincias, selecciona una agencia disponible durante el checkout y paga el envío en destino.</p>
          <p>Revisa el resumen del pedido para consultar el costo de envío antes de confirmar.</p>
        </section>
        <section id="payments" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Métodos de pago</h2>
          <p className="mt-3">En el checkout encontrarás los métodos disponibles: contra entrega, Yape, Plin y transferencias. El pago con tarjeta aparece habilitado cuando el comercio tiene configurada su pasarela.</p>
          <p>Para pagos por transferencia, revisa los datos del comercio y conserva tu comprobante. Puedes adjuntar el comprobante o registrar el código desde el detalle de tu pedido.</p>
        </section>
        <section id="faq" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Preguntas frecuentes</h2>
          <h3 className="mt-4 font-bold">¿Necesito una cuenta para comprar?</h3>
          <p>Puedes explorar el catálogo y agregar productos al carrito como invitado. Para confirmar tu pedido, inicia sesión o crea una cuenta.</p>
          <h3 className="mt-4 font-bold">¿Dónde veo el estado de mi pedido?</h3>
          <p>Consulta <Link to="/orders" className="underline">Mis pedidos</Link> para ver su estado y los detalles de la compra.</p>
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
