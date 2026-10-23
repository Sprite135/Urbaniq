import type { ShippingConfig } from '@/features/checkout/paymentApiSlice';

export type ChatAnswer = { text: string; link?: { label: string; to: string } };

export function getChatAnswer(input: string, shipping?: ShippingConfig): ChatAnswer {
  const text = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(pin|contrasena|clave|codigo de verificacion)\b/.test(text)) {
    return { text: 'No compartas contraseñas, PIN ni códigos de verificación por el chat. Si necesitas recuperar tu acceso, usa el formulario seguro.', link: { label: 'Recuperar mi cuenta', to: '/forgot-password' } };
  }
  if (/\b(persona|asesor humano|agente|whatsapp|wsp|humano)\b/.test(text)) {
    return { text: 'Puedes continuar con atención al cliente usando el botón de WhatsApp de abajo. Tú eliges cuándo enviar el mensaje.' };
  }
  if (/devol|cancel|reembolso|garantia/.test(text)) {
    return { text: 'Abre el detalle de tu pedido para consultar las opciones de cancelación o devolución. Si ya pagaste, la cancelación no reembolsa el dinero automáticamente: coordínalo con atención al cliente.', link: { label: 'Ver cancelaciones y devoluciones', to: '/help#returns' } };
  }
  if (/envio|entrega|delivery|provincia|lima|callao|trujillo|flete/.test(text)) {
    const money = (value: number) => value.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
    const fees = shipping
      ? `Las tarifas configuradas son: Lima Metropolitana y Callao, ${money(shipping.limaMetropolitanaFee)}; provincias, ${money(shipping.provinceFee)}.${shipping.freeShippingThreshold > 0 ? ` Envío sin costo desde ${money(shipping.freeShippingThreshold)} en productos.` : ''}`
      : 'Revisa el costo de envío en el checkout o consulta las tarifas en el centro de ayuda.';
    return { text: `${fees} Confirma la cobertura y el plazo para tu dirección con atención al cliente antes de pagar.`, link: { label: 'Consultar envíos', to: '/help#shipping' } };
  }
  if (/pago|pagar|yape|plin|tarjeta|transferencia|comprobante/.test(text)) {
    return { text: 'El checkout muestra los métodos de pago disponibles. Para Yape o Plin, confirma primero el pedido y revisa los datos de cobro en su detalle. Luego adjunta el comprobante allí; el pago queda pendiente de revisión. Si ya pagaste, no transfieras de nuevo.', link: { label: 'Ver ayuda de pagos', to: '/help#payments' } };
  }
  if (/pedido|seguimiento|tracking|orden|compra.*estado/.test(text)) {
    return { text: 'En Mis pedidos puedes consultar el estado del pago, la preparación, el envío y la entrega. Inicia sesión y abre el detalle del pedido que deseas revisar.', link: { label: 'Ir a mis pedidos', to: '/orders' } };
  }
  if (/producto|laptop|teclado|mouse|gaming|estudi|trabaj|recom|elegir|comprar|catalogo|precio|stock|disponib/.test(text)) {
    return { text: 'Encuentra productos y precios en el catálogo. Si necesitas ayuda para elegir según tu uso y presupuesto, prueba el asesor de compra. Confirma la disponibilidad en la ficha del producto.', link: { label: 'Encontrar mi equipo', to: '/advisor' } };
  }
  if (/\b(hola|buenas|buenos dias|gracias|hey)\b/.test(text)) {
    return { text: '¡Hola! Soy el asistente automático de Urbaniq. Puedo orientarte sobre productos, envíos, pagos y pedidos. ¿Con qué te ayudo?' };
  }
  return { text: 'Todavía no tengo una respuesta específica para esa consulta. Puedes elegir uno de los temas rápidos o escribirnos por WhatsApp para recibir ayuda personal.', link: { label: 'Abrir centro de ayuda', to: '/help' } };
}
