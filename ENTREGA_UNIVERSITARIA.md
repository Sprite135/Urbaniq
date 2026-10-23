# Entrega universitaria de Urbaniq

Estado verificado: 23 de octubre de 2026.

## Identidad ficticia

- Razón social: **Urbaniq Tecnología Académica S.A.C.**
- RUC: **20000000000 (ficticio y no válido)**
- Dirección: **Av. de la Innovación 123, Lima, Perú (ficticia)**
- Correo: **soporte@urbaniq.example**
- Comprobantes: referencias de boleta/factura de demostración, sin emisión SUNAT ni validez fiscal.
- Pagos: Stripe debe usarse únicamente en modo de prueba. Los datos Yape/Plin locales son ficticios. Yape automático usa el sandbox oficial de Mercado Pago y no mueve dinero.

## Trabajo completado

- El pedido se crea antes del cobro con tarjeta, usa importe calculado por el servidor y se asocia de forma idempotente al PaymentIntent.
- Las reservas tienen vencimiento y un servicio libera el stock de pedidos impagos.
- Productos, variantes, pedidos y usuarios tienen control de concurrencia; la reposición de stock es idempotente.
- Se añadieron reembolsos parciales/totales, decisión de devoluciones, referencias de despacho y comprobante demo.
- Los datos históricos del producto y la dirección se congelan dentro del pedido.
- Los comprobantes de pago se guardan fuera de archivos públicos y su descarga exige ser propietario o administrador.
- El correo debe verificarse antes de iniciar sesión; el restablecimiento limita intentos, invalida sesiones y el refresh token usa cookie HttpOnly.
- El administrador inicial ya no recupera privilegios, desbloqueo o contraseña durante cada arranque.
- Los correos usan una outbox persistente con reintentos. El panel **Operaciones** permite revisar la cola y la bitácora.
- Se añadieron SEO compatible con React 19, página 404, recuperación ante errores de render y páginas de términos, privacidad y reclamaciones demo.
- Se añadió Yape sandbox automático mediante MercadoPago.js y validación del pago en el servidor; las credenciales de prueba se guardan fuera de Git.
- El pipeline principal usa Node 24, compila la solución oficial, ejecuta todas las pruebas y publica el backend con `dotnet publish`.
- La caché admite invalidación distribuida por prefijo mediante generaciones compartidas.

## Validación automatizada

| Verificación | Resultado |
|---|---:|
| Backend, pruebas unitarias | 118/118 |
| Backend, pruebas de integración | 21/21 |
| Frontend, Vitest | 52/52 en 13 archivos |
| E2E y visuales | 10/10 en escritorio y móvil |
| Frontend, ESLint | Correcto |
| Frontend, TypeScript + Vite producción | Correcto |
| Imágenes del catálogo | 144/144 disponibles |

## Puesta en marcha

1. Instalar .NET 8, Node.js 24 y SQL Server LocalDB.
2. Copiar la configuración de ejemplo y mantener secretos reales fuera del repositorio.
3. Aplicar la migración:

   ```powershell
   dotnet ef database update --project Backend/Ecommerce.Infrastructure --startup-project Backend/Ecommerce.Api
   ```

4. Iniciar la API:

   ```powershell
   dotnet run --project Backend/Ecommerce.Api
   ```

5. En otra terminal, iniciar el frontend:

   ```powershell
   cd Frontend
   npm ci
   npm run dev
   ```

La opción `Database:ApplyMigrations` permite aplicar migraciones al arrancar cuando se establece en `true`. En un despliegue real debe controlarse desde el proceso de publicación.

## Límites conscientes de la entrega

La aplicación está lista para una demostración académica local. Una operación comercial real todavía requiere credenciales productivas y cuentas verificadas, homologación fiscal, pruebas con SQL Server, webhooks de pagos, SMTP, respaldo/restauración, revisión legal y un despliegue verificado. Estos puntos dependen de servicios y decisiones externas y no deben simularse como si fueran producción.
