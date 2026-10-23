# Urbaniq — guía de pagos de demostración

## Alcance académico

Urbaniq ofrece dos flujos distintos:

1. **Yape de prueba con Mercado Pago:** simulación automática en el sandbox oficial. No mueve dinero ni cobra comisiones.
2. **Yape/Plin manual:** muestra datos ficticios del comercio y permite adjuntar un comprobante de demostración para que un administrador lo revise.

No uses números, QR ni credenciales reales en la exposición universitaria.

## Yape sandbox automático

La aplicación de prueba se crea en el panel de Mercado Pago Developers con **Checkout API**, API **Orders** y credenciales de prueba. Las claves se guardan con .NET User Secrets; nunca se escriben en Git.

```powershell
dotnet user-secrets set "MercadoPagoSettings:AccessToken" "APP_USR-..." --project Backend/Ecommerce.Api/Ecommerce.Api.csproj
dotnet user-secrets set "MercadoPagoSettings:PublicKey" "APP_USR-..." --project Backend/Ecommerce.Api/Ecommerce.Api.csproj
dotnet user-secrets set "MercadoPagoSettings:SandboxMode" "true" --project Backend/Ecommerce.Api/Ecommerce.Api.csproj
```

Al abrir el checkout local aparecerá **Yape de prueba — Sin dinero real**. La pantalla ya propone el escenario aprobado del sandbox:

- Teléfono: `111111111`
- Código OTP: `123456`

El navegador genera un token con MercadoPago.js, el backend crea la operación en `/v1/orders` y Urbaniq marca el pedido como pagado únicamente cuando el proveedor responde `processed/accredited`, con el importe y la moneda esperados. En Checkout API vía Orders, tanto las credenciales de prueba como las productivas pueden comenzar con `APP_USR`; verifica siempre que las copies desde la sección de pruebas.

## Yape/Plin manual

Los datos ficticios se encuentran en `Backend/Ecommerce.Api/appsettings.LocalDb.json`. Este flujo crea el pedido como pendiente; el usuario adjunta una imagen de demostración y el administrador decide si la aprueba.

## Ejecutar la demostración

```powershell
dotnet run --project Backend/Ecommerce.Api/Ecommerce.Api.csproj --launch-profile http
```

En otra terminal:

```powershell
cd Frontend
npm run dev
```

Después abre `http://localhost:5173`, inicia sesión, añade un producto, entra al checkout y elige **Yape de prueba**.

## Paso a producción

`SandboxMode` debe permanecer en `false` en producción. Una operación comercial real requiere credenciales productivas del titular, validación de identidad, webhooks con firma, pruebas operativas y revisión legal/fiscal. Las credenciales de prueba no aceptan ni transfieren dinero real.
