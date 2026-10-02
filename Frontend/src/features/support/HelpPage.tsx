import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGetShippingConfigQuery } from '@/features/checkout/paymentApiSlice';

export default function HelpPage() {
  const { hash } = useLocation();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  const { data: shipping, isLoading: shippingLoading, isError: shippingError } = useGetShippingConfigQuery();
  const formatFee = (fee: number) => fee.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 text-[#111827] dark:text-[#ece7dd]">
      <h1 className="text-3xl font-black">Centro de ayuda</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">Todo lo que necesitas para comprar y seguir tu pedido.</p>
      <nav aria-label="Temas de ayuda" className="mt-6 flex flex-wrap gap-2">
        {[['payments', 'Pagos'], ['shipping', 'Envíos'], ['returns', 'Cancelaciones y devoluciones'], ['faq', 'Preguntas'], ['support', 'Contactar']].map(([id, label]) =>
          <a key={id} href={`#${id}`} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold hover:border-[#9d731e] dark:border-gray-700">{label}</a>)}
      </nav>
      <div className="mt-8 space-y-10 leading-7">
        <section id="shipping" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Envíos y entregas</h2>
          {shippingLoading && <p className="mt-3" role="status">Consultando tarifas de envío…</p>}
          {shippingError && <p className="mt-3" role="alert">No pudimos consultar las tarifas. Confirma el costo con atención al cliente antes de pagar.</p>}
          {shipping && <div className="mt-3 rounded border border-gray-300 p-4 dark:border-gray-700">
            <p>Lima Metropolitana y Callao: S/ {formatFee(shipping.limaMetropolitanaFee)}.</p>
            <p>Provincias: S/ {formatFee(shipping.provinceFee)}.</p>
            {shipping.freeShippingThreshold > 0 && <p>Envío sin costo desde S/ {formatFee(shipping.freeShippingThreshold)} en productos.</p>}
            <p>El envío se incluye en el total del pedido. No tienes que pagarlo nuevamente como parte de esta compra.</p>
          </div>}
          <p className="mt-3">La dirección determina la zona de entrega. Para provincias, selecciona una agencia durante el checkout. Consulta con atención al cliente la cobertura y el plazo para tu dirección antes de pagar.</p>
          <p>El resumen muestra por separado los productos, el envío y el total que cobra la tienda. No se garantiza entrega en 24 horas.</p>
        </section>
        <section id="payments" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Métodos de pago</h2>
          <p className="mt-3">En el checkout encontrarás los métodos disponibles: contra entrega, Yape, Plin y transferencias. El pago con tarjeta aparece habilitado cuando el comercio tiene configurada su pasarela.</p>
          <p>Para pagos por transferencia, revisa los datos del comercio y conserva tu comprobante. Puedes adjuntar el comprobante o registrar el código desde el detalle de tu pedido.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Selecciona Yape o Plin cuando aparezcan habilitados y comprueba el nombre del destinatario.</li>
            <li>Confirma primero el pedido y abre su detalle. Allí verás el importe y el número de cobro para realizar la transferencia.</li>
            <li>Después de pagar, envía el comprobante desde el seguimiento. Si ya pagaste, no vuelvas a transferir. El pago permanecerá pendiente mientras revisamos el abono.</li>
          </ol>
          <p className="mt-3 font-semibold">Nunca ingreses aquí tu PIN ni los códigos que autorizan una compra.</p>
        </section>
        <section id="returns" className="scroll-mt-36">
          <h2 className="text-xl font-bold">Cancelaciones y devoluciones</h2>
          <p className="mt-3">Salir del checkout antes de confirmar no crea un pedido. Si el pedido ya se creó, lo encontrarás en Mis pedidos aunque cierres la página.</p>
          <p>Mientras el pedido esté pendiente o en preparación, puedes cancelarlo desde su detalle indicando el motivo. La cancelación repone el stock una sola vez.</p>
          <p>Si ya pagaste, cancelar no devuelve automáticamente el dinero. Contacta con atención al cliente indicando el número de pedido para coordinar el reembolso.</p>
          <p>Para un pedido entregado con pago confirmado, abre su detalle y pulsa Enviar solicitud de devolución. El comercio revisará el motivo y coordinará contigo los siguientes pasos. No envíes el producto sin acordar antes la dirección y el procedimiento.</p>
          <p>Si el pedido está en tránsito, el pago aún no aparece confirmado o no puedes usar el formulario, contacta con atención al cliente. La solicitud no confirma recepción del producto ni devolución de dinero.</p>
          {supportEmail && <a href={`mailto:${supportEmail}`} className="underline">Consultar cancelación, devolución o garantía</a>}
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
