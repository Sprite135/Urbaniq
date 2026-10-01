# Operación de Urbaniq

## Estado verificado el 1 de octubre de 2026

- Aplicación Azure: `urbaniq-backend-jesus2024`, grupo `urbaniq-rg`.
- Tienda y API: https://urbaniq-backend-jesus2024-b0d6huewaubghcg7.brazilsouth-01.azurewebsites.net
- App Service tiene comprobación de estado habilitada en `/health`, con umbral de 10 minutos. El endpoint comprueba SQL y Redis. Con una instancia, Azure puede reemplazarla tras una hora de fallos continuos.
- SQL `urbaniqDb`: retención PITR de 7 días, diferenciales cada 24 horas; primer punto disponible observado: 2026-09-30 23:17 UTC. No hay retención a largo plazo configurada. Se verificó la disponibilidad en el portal; no se ha ejecutado una restauración de prueba.
- Prueba de integración: registro con verificación simulada, login, dirección, carrito, pedido contra entrega, consulta y cancelación. Comprueba descuento de stock, vaciado del carrito y devolución de stock una sola vez. Usa base de datos de pruebas y correo simulado; no demuestra entrega SMTP ni cobro real.

## Correo Gmail

En App Service → Variables de entorno, configurar:

| Variable | Valor |
| --- | --- |
| `EmailSettings__Host` | `smtp.gmail.com` |
| `EmailSettings__Port` | `587` |
| `EmailSettings__Username` | `spritesebastian@gmail.com` |
| `EmailSettings__FromAddress` | `spritesebastian@gmail.com` |
| `EmailSettings__FromName` | `Urbaniq` |
| `EmailSettings__Password` | Contraseña de aplicación de Google, ingresada directamente por el propietario |
| `EmailSettings__FrontendUrl` | URL de la tienda indicada arriba |

Google requiere verificación en dos pasos para usar contraseñas de aplicación: https://support.google.com/accounts/answer/185833
No guardar secretos en Git ni enviarlos por chat. Tras guardar la contraseña, probar registro, recepción del código, verificación y recuperación de contraseña con una cuenta controlada por el propietario.
El frontend publica el correo de contacto mediante `VITE_SUPPORT_EMAIL` en los workflows de Azure y Vercel.

## Stripe pendiente

Configurar en Azure `StripeSettings__PublishableKey`, `StripeSettings__SecretKey` y `StripeSettings__WebhookSecret`, con claves del mismo entorno. Empezar con un sandbox de Stripe.
Registrar el webhook `https://urbaniq-backend-jesus2024-b0d6huewaubghcg7.brazilsouth-01.azurewebsites.net/api/v1/Payment/webhook` y el evento `payment_intent.succeeded`.
Referencia: https://docs.stripe.com/webhooks
Validar un pago de prueba, firma del webhook, importe/moneda, estado pagado y repetición del evento sin duplicar efectos. No se ha realizado esta prueba con Stripe real.

## Información comercial pendiente

Confirmar costos y plazos de envío, condiciones de devoluciones, datos del negocio y destinos reales de Yape/Plin/transferencia antes de publicar políticas definitivas.

## Prioridad: Yape, Plin y seguimiento

El propietario solicita cobros automáticos con Yape y Plin. El flujo actual de transferencia es manual: una referencia ingresada por el cliente no confirma el abono. No hay integración automática de billeteras activa ni una transacción real verificada.

Izipay es la propuesta de pasarela pendiente de confirmar la afiliación del comercio. Su SDK web ofrece Yape, Plin Interbank y QR interoperable; las modalidades y límites deben habilitarse y verificarse con la cuenta contratada. Referencias oficiales:
- https://developers.izipay.pe/value-table/
- https://developers.izipay.pe/web-core/use-cases/pay/
- https://developers.izipay.pe/credentials/
- https://developers.izipay.pe/notifications/

Pasos pendientes para automatizar: obtener cuenta de comercio y credenciales de integración; elegir el producto/API contratado; crear el pago desde el servidor con importe PEN calculado a partir del pedido; mostrar el checkout oficial; verificar la autenticidad de la notificación y el pedido, importe, moneda y resultado; confirmar una sola vez el pago y pasar el pedido a preparación. Los datos enviados por el navegador o una captura no deben marcar un pedido pagado. Probar éxito, rechazo, expiración, importe distinto y notificaciones repetidas en sandbox antes de activar producción. Las credenciales se guardan directamente en Azure.

El tracker del cliente representa los estados del pedido, con consulta cada 30 segundos mientras la página está enfocada. No incorpora ubicación GPS ni guía de una agencia externa. El pago se muestra por separado. El checkout consulta `/api/v1/Payment/shipping-config` para utilizar las mismas tarifas que el servidor; los plazos comerciales deben confirmarse antes de prometer fechas de entrega.

## Incidentes y restauración

1. Consultar `/health`, estado del App Service y Secuencia de registro.
2. Si SQL falla, revisar disponibilidad y conectividad de `urbaniqDb`. Si Redis falla, revisar el recurso y `ConnectionStrings__Redis`.
3. Para restaurar SQL: servidor SQL → Copias de seguridad → Restaurar. Elegir un punto y un nombre nuevo para una base de pruebas. La restauración crea otro recurso y puede generar costo; acordar presupuesto antes de ejecutarla.
4. Validar tablas, cantidades y un pedido en la base restaurada antes de planificar la sustitución de producción.
5. Para revertir código, desplegar un commit conocido mediante el workflow Azure; esto no revierte cambios en la base de datos.

Azure Monitor tiene configurados el grupo global `urbaniq-operaciones` (correo `spritesebastian@gmail.com`) y la regla `urbaniq-salud-appservice`, para cambios de Resource Health del App Service, incluidos incidentes y recuperación. Esto supervisa eventos de plataforma; no sustituye una alerta de fallos HTTP o del endpoint `/health`. La recepción del correo todavía debe verificarse con el propietario.
