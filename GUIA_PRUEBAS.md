# Guía de Pruebas - Urbaniq E-commerce 🚀

## 📋 **REQUISITOS PREVIOS**

### **Software Necesario:**
- ✅ .NET 8 SDK
- ✅ Node.js 18+ 
- ✅ SQL Server (LocalDB o SQL Server Express)
- ✅ Git
- ✅ VS Code o Visual Studio

---

## 🔧 **CONFIGURACIÓN DEL BACKEND**

### **1. Restaurar Dependencias**
```bash
cd Backend
dotnet restore
```

### **2. Configurar appsettings.json**

Edita `Backend/Ecommerce.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=UrbaniqDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "StripeSettings": {
    "SecretKey": "sk_test_tu_stripe_secret_key",
    "PublishableKey": "pk_test_tu_stripe_publishable_key",
    "WebhookSecret": "whsec_tu_webhook_secret"
  },
  "CloudinarySettings": {
    "CloudName": "SET_VIA_USER_SECRETS_OR_ENV_VAR",
    "ApiKey": "SET_VIA_USER_SECRETS_OR_ENV_VAR",
    "ApiSecret": "SET_VIA_USER_SECRETS_OR_ENV_VAR"
  },
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "Port": 587,
    "SenderEmail": "tu-email@gmail.com",
    "SenderName": "Urbaniq",
    "Password": "tu-app-password"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "JwtSettings": {
    "SecretKey": "tu-secret-key-minimo-32-caracteres",
    "Issuer": "Urbaniq",
    "Audience": "UrbaniqUsers",
    "ExpirationInMinutes": 60
  }
}
```

**NOTA:** Para desarrollo, puedes dejar Stripe y Cloudinary con placeholders - el sistema usará modo local automáticamente.

---

### **3. Ejecutar Migraciones**
```bash
cd Backend/Ecommerce.Infrastructure
dotnet ef database update --startup-project ../Ecommerce.Api
```

Esto creará la base de datos y todas las tablas.

---

### **4. Seeding de Datos (Opcional)**

El sistema tiene un `DbSeeder` que creará:
- Usuario admin: `admin@urbaniq.com` / password configurado
- Categorías básicas
- Productos de ejemplo

**Para ejecutar el seeder:**
El seeder se ejecuta automáticamente al iniciar la API si no hay datos.

---

## 🎨 **CONFIGURACIÓN DEL FRONTEND**

### **1. Instalar Dependencias**
```bash
cd Frontend
npm install
```

### **2. Configurar API URL**

Edita `Frontend/src/app/apiSlice.ts`:

```typescript
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/api', // Asegúrate que coincida con el backend
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
```

---

## 🚀 **EJECUTAR EL PROYECTO**

### **Opción A: Modo Desarrollo (Recomendado para pruebas)**

**Terminal 1 - Backend:**
```bash
cd Backend/Ecommerce.Api
dotnet run
```

Backend se ejecutará en: `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
```

Frontend se ejecutará en: `http://localhost:5173`

---

### **Opción B: Modo Producción (Frontend servido por Backend)**

**1. Build del Frontend:**
```bash
cd Frontend
npm run build
```

**2. Ejecutar Backend:**
```bash
cd Backend/Ecommerce.Api
dotnet run
```

Accede a: `http://localhost:5000`

---

## 🧪 **PRUEBAS MANUAL - FLUJOS PRINCIPALES**

### **1. Probar API Backend**

Abre el navegador en: `http://localhost:5000/swagger`

**Endpoints para probar:**

#### **Auth:**
- ✅ `POST /api/v1.0/Auth/register` - Registrar usuario
- ✅ `POST /api/v1.0/Auth/login` - Login
- ✅ `POST /api/v1.0/Auth/forgot-password` - Recuperar contraseña

#### **Productos:**
- ✅ `GET /api/v1.0/Product/All` - Listar productos
- ✅ `GET /api/v1.0/Product/{id}` - Obtener producto

#### **Categorías:**
- ✅ `GET /api/v1.0/Admin/categories` - Listar categorías

#### **Pagos:**
- ✅ `GET /api/v1.0/Payment/config` - Configuración Stripe

---

### **2. Probar Frontend Cliente**

**Accede a:** `http://localhost:5173`

#### **Flujo 1: Registro y Login**
1. Ve a `/register`
2. Registra un nuevo usuario
3. Verifica el email (opcional)
4. Login con el usuario creado

#### **Flujo 2: Navegación de Productos**
1. Home → Ver slider y productos destacados
2. Catálogo → Filtrar por categoría, precio
3. Producto detalle → Ver imágenes, variantes, reviews

#### **Flujo 3: Carrito y Checkout**
1. Agrega productos al carrito
2. Aplica cupón (si hay cupones activos)
3. Ve a checkout
4. Agrega dirección de envío
5. Selecciona método de pago:
   - Tarjeta (Stripe) - requiere configuración
   - Yape/Plin - upload de voucher
   - Contra entrega
6. Completa el pedido

#### **Flujo 4: Mi Cuenta**
1. Ve a `/account`
2. Ver pedidos pasados
3. Ver wishlist
4. Editar perfil

---

### **3. Probar Admin Panel**

**Accede a:** `http://localhost:5173/admin-login`

**Credenciales Admin:**
- Email: `admin@urbaniq.com`
- Password: Verifica en `Backend/Ecommerce.Infrastructure/Data/DbSeeder.cs` (línea de configuración de admin)

#### **Flujo 1: Dashboard**
1. Ver KPIs (ingresos, pedidos, usuarios)
2. Ver productos con stock bajo
3. Ver pedidos recientes

#### **Flujo 2: Gestión de Productos**
1. Ve a `/admin/products`
2. Crea nuevo producto
3. Sube imágenes (múltiples)
4. Edita producto existente
5. Elimina producto

#### **Flujo 3: Gestión de Pedidos**
1. Ve a `/admin/orders`
2. Cambia estado de pedido (Pending → Processing → Shipped → Delivered)
3. Ver detalles de pedido

#### **Flujo 4: Gestión de Cupones**
1. Ve a `/admin/coupons`
2. Crea cupón nuevo (tipo, valor, fechas)
3. Configura reglas avanzadas (exclusiones, combinaciones)
4. Ve a `/admin/coupons/analytics` para ver métricas

#### **Flujo 5: Gestión de Categorías**
1. Ve a `/admin/categories`
2. Crea categoría raíz
3. Crea subcategorías
4. Sube imagen de categoría

#### **Flujo 6: Gestión de Usuarios**
1. Ve a `/admin/users`
2. Bloquea/desbloquea usuarios
3. Ver información de usuarios

---

## 🧪 **PRUEBAS AUTOMATIZADAS**

### **Tests Unitarios (Backend)**
```bash
cd Backend/Ecommerce.Application.Tests
dotnet test
```

### **Tests de Carga (K6)**
```bash
# Asegúrate que el backend esté corriendo
cd tests
k6 run load-test-basic.js
```

---

## 🔍 **VERIFICACIÓN DE FEATURES**

### **✅ Cupones**
- Crear cupón en admin
- Aplicar cupón en carrito
- Verificar descuento aplicado
- Verificar tracking de uso
- Ver analytics de cupones

### **✅ Pagos**
- Probar Stripe (requiere claves reales)
- Probar Yape/Plin (upload voucher)
- Probar contra entrega
- Verificar webhook (requiere ngrok o túnel)

### **✅ Imágenes**
- Subir imágenes de producto
- Ver imágenes en frontend
- Probar fallback si imagen falla
- Subir imagen de categoría

### **✅ Notificaciones**
- Probar email de confirmación de pedido
- Probar email de recuperación de contraseña
- Probar email de verificación
- Verificar queue de emails (en logs)

### **✅ Inventario**
- Crear producto con stock
- Agregar al carrito
- Completar pedido → stock debe reducirse
- Verificar alertas de stock bajo

### **✅ Wishlist**
- Agregar producto a wishlist
- Ver alerta de reducción de precio
- Ver alerta de stock disponible

---

## 🐛 **SOLUCIÓN DE PROBLEMAS COMUNES**

### **Problema: Error de conexión a base de datos**
**Solución:**
```bash
# Verificar que SQL Server LocalDB esté instalado
sqllocaldb info

# Si no existe, crear base de datos manualmente
sqllocaldb create UrbaniqDb
```

### **Problema: Frontend no conecta con backend**
**Solución:**
- Verificar que backend esté corriendo en `http://localhost:5000`
- Verificar CORS en `Program.cs`
- Verificar URL en `apiSlice.ts`

### **Problema: Stripe no funciona**
**Solución:**
- Dejar Stripe en placeholders → usará modo local
- O configurar claves de prueba en Stripe Dashboard

### **Problema: Imágenes no cargan**
**Solución:**
- Verificar que `wwwroot/uploads/products/` exista
- O configurar Cloudinary con credenciales reales

### **Problema: Emails no se envían**
**Solución:**
- Configurar SMTP real (Gmail, SendGrid, etc.)
- O usar servicio de email sandbox (Mailtrap)

---

## 📊 **CHECKLIST DE PRUEBAS**

### **Backend:**
- [ ] API responde en Swagger
- [ ] Auth funciona (register/login)
- [ ] Productos se listan correctamente
- [ ] Categorías funcionan
- [ ] Migraciones aplicadas
- [ ] DbSeeder ejecutó

### **Frontend:**
- [ ] Home carga correctamente
- [ ] Catálogo filtra correctamente
- [ ] Detalle de producto muestra imágenes
- [ ] Carrito funciona
- [ ] Checkout completo
- [ ] Login/Registro funciona

### **Admin:**
- [ ] Login admin funciona
- [ ] Dashboard muestra KPIs
- [ ] CRUD productos funciona
- [ ] CRUD pedidos funciona
- [ ] CRUD cupones funciona
- [ ] Upload imágenes funciona

### **Features Específicos:**
- [ ] Cupones aplican descuento
- [ ] Imágenes se ven correctamente
- [ ] Inventario se actualiza
- [ ] Wishlist funciona
- [ ] Notificaciones se envían

---

## 🎯 **PRÓXIMOS PASOS DESPUÉS DE PRUEBAS**

1. ✅ Configurar credenciales reales (Stripe, Cloudinary, Email)
2. ✅ Configurar backup de base de datos
3. ✅ Configurar monitoring (Sentry)
4. ✅ Desplegar a producción (Azure, AWS, VPS)
5. ✅ Configurar dominio y SSL
6. ✅ Configurar CDN (CloudFront/Cloudflare)

---

## 📝 **DOCUMENTACIÓN ADICIONAL**

- `IMPLEMENTATION_COMPLETE.md` - Lista completa de features
- `QUE_FALTA.md` - Lo que falta para 100% enterprise-grade
- `IMAGES_ADMIN_STATUS.md` - Sistema de imágenes
- `IMAGES_DISPLAY_STATUS.md` - Visualización de imágenes

---

**¡Listo para probar!** 🚀
