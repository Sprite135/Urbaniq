# Urbaniq - Guía de Demo de Pagos con Dinero Real (Yape/Plin)

## 🎯 **Objetivo: Configurar Urbaniq para aceptar pagos reales con Yape/Plin para demo de presentación**

---

## 💳 **Estado Actual del Sistema de Pagos**

### **Métodos Disponibles:**

#### **1. Yape/Plin (Billeteras Digitales Peruanas)**
- **Estado:** ✅ CONFIGURADO (con datos de desarrollo)
- **Método:** Subida de comprobantes de pago
- **Procesamiento:** Aprobación manual por admin
- **Costo:** Sin comisiones
- **Tiempo:** Inmediato

#### **2. Stripe (Tarjetas)**
- **Estado:** ❌ NO CONFIGURADO (solo placeholders)
- **Método:** Pagos con tarjeta (requiere configuración externa)
- **Procesamiento:** Automático
- **Costo:** 2.9% + 30¢ por transacción
- **Tiempo:** Configuración 2-3 días

---

## 🚀 **Configuración para Demo de Dinero Real (Yape/Plin)**

### **Paso 1: Actualizar Datos de Pago**

#### **1.1 Editar archivo .env.development**
Actualiza con tus datos reales:

```bash
# En .env.development
YAPE_PHONE=999888777        # ← Tu número real de celular (9 dígitos)
YAPE_OWNER_NAME=Jesus Sebastian Cumpa Torres  # ← Tu nombre real
PLIN_PHONE=999888777        # ← Tu número real de celular (9 dígitos)
PLIN_OWNER_NAME=Jesus Sebastian Cumpa Torres  # ← Tu nombre real
```

#### **1.2 Si usas variables de entorno directas**
En `Backend/Ecommerce.Api/appsettings.LocalDb.json`:

```json
"MerchantPaymentSettings": {
  "Yape": {
    "Phone": "999888777",           // Tu número real
    "OwnerName": "Jesus Sebastian Cumpa Torres",  // Tu nombre real
    "QrImageUrl": "/uploads/payments/yape.png"
  },
  "Plin": {
    "Phone": "999888777",           // Tu número real
    "OwnerName": "Jesus Sebastian Cumpa Torres",  // Tu nombre real
    "QrImageUrl": "/uploads/payments/plin.png"
  }
}
```

---

### **Paso 2: Generar QR Codes de Yape/Plin**

#### **2.1 Generar QR de Yape**
1. Abre la app de Yape en tu celular
2. Ve a la sección "Cobrar"
3. Genera un QR para cobros
4. Toma una captura de pantalla del QR
5. Guarda la imagen como `yape.png`

#### **2.2 Generar QR de Plin**
1. Abre la app de Plin en tu celular
2. Ve a la sección "Cobrar"
3. Genera un QR para cobros
4. Toma una captura de pantalla del QR
5. Guarda la imagen como `plin.png`

#### **2.3 Colocar las imágenes en el proyecto**
```bash
# Crear directorio si no existe
mkdir Backend/Ecommerce.Api/wwwroot/uploads/payments

# Copiar las imágenes
# Copia yape.png a Backend/Ecommerce.Api/wwwroot/uploads/payments/yape.png
# Copia plin.png a Backend/Ecommerce.Api/wwwroot/uploads/payments/plin.png
```

---

### **Paso 3: Verificar Configuración**

#### **3.1 Iniciar el Backend**
```bash
cd Backend
dotnet run --project Ecommerce.Api\Ecommerce.Api.csproj --environment Development
```

#### **3.2 Verificar endpoint de métodos de pago**
Abre en tu navegador:
```
http://localhost:5215/api/v1/payment/merchant-methods
```

Deberías ver:
```json
{
  "yape": {
    "phone": "999888777",
    "ownerName": "Jesus Sebastian Cumpa Torres",
    "qrImageUrl": "/uploads/payments/yape.png"
  },
  "plin": {
    "phone": "999888777",
    "ownerName": "Jesus Sebastian Cumpa Torres",
    "qrImageUrl": "/uploads/payments/plin.png"
  }
}
```

---

### **Paso 4: Probar el Flujo Completo**

#### **4.1 Iniciar Frontend**
```bash
cd Frontend
npm run dev
```

#### **4.2 Realizar una Compra de Prueba**
1. Ve a `http://localhost:5173`
2. Agrega productos al carrito
3. Ve al checkout
4. Selecciona "Yape" o "Plin" como método de pago
5. Verás los datos de pago (teléfono y QR)

#### **4.3 Pagar con Dinero Real**
1. Con tu celular, paga al número configurado usando Yape/Plin
2. Toma un screenshot del comprobante de pago
3. En el checkout, sube el comprobante
4. Completa el pedido

#### **4.4 Aprobar el Pago (Admin)**
1. Accede al panel admin: `http://localhost:5173/admin`
2. Credenciales: `admin@urbaniq.com` / `Urbaniq#2024!Secure`
3. Ve a "Pedidos"
4. Busca el pedido recién creado
5. Revisa el comprobante subido
6. Acepta el pago
7. El pedido cambiará a estado "Pagado"

---

## 🎯 **Flujo para Demo de Presentación**

### **Escenario 1: Demo Interactiva (Con Asistentes)**

1. **Antes de la presentación:**
   - Configura tu número real de Yape/Plin
   - Genera QR codes
   - Inicia backend y frontend
   - Asegúrate de tener saldo en tu cuenta

2. **Durante la presentación:**
   - Muestra el catálogo de productos
   - Agrega productos al carrito
   - Muestra el checkout con opciones de pago
   - Pide a un asistente que pague con Yape/Plin
   - Muestra cómo sube el comprobante
   - Acepta el pago en el panel admin
   - Muestra el pedido completado

3. **Después de la presentación:**
   - Verifica que el dinero esté en tu cuenta
   - Acepta o rechaza los pedidos según corresponda

### **Escenario 2: Demo Pasiva (Sin Asistentes)**

1. **Preparación:**
   - Configura tu número real
   - Genera QR codes
   - Prepara screenshots del flujo completo

2. **Durante la presentación:**
   - Muestra screenshots del checkout
   - Explica el flujo de pago
   - Muestra el panel admin
   - Explica el proceso de aprobación

---

## 💰 **Costos y Comisiones**

### **Yape/Plin:**
- **Comisión:** 0% (gratis para el vendedor)
- **Tiempo:** Inmediato
- **Límite:** Sin límite (depende de tu banco)
- **Costo:** Solo costo de la transacción según tu banco

### **Dinero Recibido:**
- 100% del monto de la compra
- Sin comisiones de Urbaniq
- Dinero real en tu cuenta de Yape/Plin

---

## ⚠️ **Consideraciones de Seguridad**

### **Para Demo de Presentación:**
- ✅ Usa tu número real (ya está configurado)
- ✅ Genera QR codes reales
- ✅ Acepta pagos reales durante la demo
- ✅ Procesa manualmente los pedidos

### **Para Producción Real:**
- ⚠️ Considera implementar verificación automática de comprobantes
- ⚠️ Configura límites de monto
- ⚠️ Implementa antifraude básico
- ⚠️ Considera integración con API de Yape/Plin (si disponible)

---

## 🎯 **Alternativa: Stripe Test Mode (Simulación)**

Si prefieres NO usar dinero real, puedes configurar Stripe en modo test:

### **Ventajas:**
- ✅ Simulación realista de pago con tarjeta
- ✅ Sin riesgo de perder dinero
- ✅ UI profesional

### **Desventajas:**
- ❌ No es dinero real
- ❌ Requiere configuración de cuenta Stripe
- ❌ Tarjetas de prueba (no funcionan en Perú)

### **Configuración:**
```bash
# Cuenta de Stripe: https://stripe.com/
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 📋 **Checklist para Demo de Presentación**

### **Preparación (Antes de la presentación):**
- [ ] Actualizar número de celular en configuración
- [ ] Generar QR codes de Yape/Plin
- [ ] Colocar QR codes en el proyecto
- [ ] Verificar endpoint de métodos de pago
- [ ] Probar flujo completo de compra
- [ ] Asegurar saldo en cuenta de Yape/Plin
- [ ] Preparar cuenta de admin para demo

### **Durante la presentación:**
- [ ] Iniciar backend y frontend
- [ ] Mostrar catálogo de productos
- [ ] Demostrar carrito de compras
- [ ] Mostrar checkout con opciones de pago
- [ ] Procesar pago real con Yape/Plin
- [ ] Aprobar pago en panel admin
- [ ] Mostrar pedido completado

### **Después de la presentación:**
- [ ] Verificar pagos recibidos
- [ ] Procesar pedidos pendientes
- [ ] Limpiar datos de prueba (si necesario)

---

## 🎯 **Conclusión**

**Para demo de presentación con dinero real:**
- ✅ Usa Yape/Plin (ya configurado)
- ✅ Actualiza con tu número real
- ✅ Genera QR codes
- ✅ Probar el flujo completo
- ✅ Los asistentes pueden pagar de verdad

**El sistema está listo para aceptar pagos reales con Yape/Plin inmediatamente.**

**¿Quieres que te ayude a actualizar la configuración con tu número real o generar los QR codes?**
