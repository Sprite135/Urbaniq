# Urbaniq - Guía de Configuración de Producción

## 📋 Requisitos Previos

Antes de desplegar a producción, asegúrate de tener:

- [x] Cuenta de Azure (Free Tier funciona para desarrollo)
- [x] Docker instalado localmente
- [x] Git instalado
- [x] Dominio registrado (opcional, puede usar .azurewebsites.net)
- [x] Credenciales de servicios externos (Stripe, Cloudinary, etc.)

---

## 🔐 Variables de Entorno Requeridas

### 1. Variables de Entorno (CRÍTICAS)

#### **ASPNETCORE_ENVIRONMENT**
- **Desarrollo:** `Development`
- **Producción:** `Production`
- **Importancia:** Controla logging, error handling, y configuración

#### **SQL_SERVER_PASSWORD**
- **Formato:** Password fuerte (mínimo 12 caracteres, mayúsculas, minúsculas, números, símbolos)
- **Ejemplo:** `Urbaniq@Prod#2024!Secure`
- **Importancia:** Acceso a base de datos SQL Server

#### **DB_CONNECTION_STRING**
- **Formato:** `Server=db,1433;Database=UrbaniqDb;User Id=sa;Password={SQL_SERVER_PASSWORD};TrustServerCertificate=True;MultipleActiveResultSets=true`
- **Importancia:** Conexión a base de datos

#### **REDIS_CONNECTION_STRING**
- **Formato:** `redis:6379`
- **Importancia:** Conexión a Redis para caching

#### **JWT_SECRET_KEY**
- **Formato:** Mínimo 32 caracteres, aleatorio y seguro
- **Ejemplo:** `UrbaniqSecureJwtKey2024!@#$%^&*()_+-=[]{}|;:,.<>?/RandomSecretString`
- **Importancia:** Firma de tokens JWT autenticación

#### **JWT_ISSUER**
- **Formato:** URL de tu dominio
- **Ejemplo:** `https://urbaniq.azurewebsites.net`
- **Importancia:** Validación de tokens JWT

#### **JWT_AUDIENCE**
- **Formato:** URL de tu dominio
- **Ejemplo:** `https://urbaniq.azurewebsites.net`
- **Importancia:** Validación de tokens JWT

#### **JWT_EXPIRATION_MINUTES**
- **Formato:** Número entero
- **Ejemplo:** `60` (1 hora)
- **Importancia:** Tiempo de expiración de tokens

---

### 2. Variables de Email (Opcionales pero Recomendadas)

#### **EMAIL_HOST**
- **Ejemplo:** `smtp.gmail.com` o `smtp.sendgrid.net`
- **Importancia:** Servidor SMTP para envío de emails

#### **EMAIL_PORT**
- **Ejemplo:** `587` (TLS) o `465` (SSL)
- **Importancia:** Puerto del servidor SMTP

#### **EMAIL_USERNAME**
- **Ejemplo:** `urbaniq@gmail.com`
- **Importancia:** Usuario del servidor SMTP

#### **EMAIL_PASSWORD**
- **Ejemplo:** Tu password de aplicación (no password real)
- **Importancia:** Autenticación SMTP

#### **EMAIL_FROM_ADDRESS**
- **Ejemplo:** `noreply@urbaniq.com`
- **Importancia:** Remitente de emails

#### **EMAIL_FROM_NAME**
- **Ejemplo:** `Urbaniq`
- **Importancia:** Nombre del remitente

---

### 3. Variables de Stripe (Opcionales)

#### **STRIPE_PUBLISHABLE_KEY**
- **Formato:** `pk_live_...` o `pk_test_...`
- **Importancia:** Clave pública de Stripe (pago con tarjetas)

#### **STRIPE_SECRET_KEY**
- **Formato:** `sk_live_...` o `sk_test_...`
- **Importancia:** Clave secreta de Stripe (procesamiento de pagos)

#### **STRIPE_WEBHOOK_SECRET**
- **Formato:** `whsec_...`
- **Importancia:** Validación de webhooks de Stripe

---

### 4. Variables de Cloudinary (Opcionales)

#### **CLOUDINARY_CLOUD_NAME**
- **Ejemplo:** `urbaniq-cloud`
- **Importancia:** Nombre de tu cuenta Cloudinary

#### **CLOUDINARY_API_KEY**
- **Formato:** Clave API de Cloudinary
- **Importancia:** Autenticación con Cloudinary

#### **CLOUDINARY_API_SECRET**
- **Formato:** Secret API de Cloudinary
- **Importancia:** Autenticación con Cloudinary

---

### 5. Variables de Pagos Yape/Plin

#### **YAPE_PHONE**
- **Formato:** Número de celular (9 dígitos)
- **Ejemplo:** `999888777`
- **Importancia:** Número para pagos Yape

#### **YAPE_OWNER_NAME**
- **Ejemplo:** `Jesus Sebastian Cumpa Torres`
- **Importancia:** Nombre del dueño de la cuenta Yape

#### **PLIN_PHONE**
- **Formato:** Número de celular (9 dígitos)
- **Ejemplo:** `999888777`
- **Importancia:** Número para pagos Plin

#### **PLIN_OWNER_NAME**
- **Ejemplo:** `Jesus Sebastian Cumpa Torres`
- **Importancia:** Nombre del dueño de la cuenta Plin

---

### 6. Variables de Admin

#### **ADMIN_EMAIL**
- **Ejemplo:** `admin@urbaniq.com`
- **Importancia:** Email del usuario administrador

#### **ADMIN_PASSWORD**
- **Formato:** Password fuerte
- **Ejemplo:** `Urbaniq#Admin!2024`
- **Importancia:** Password del usuario administrador

---

### 7. Variables de Frontend

#### **FRONTEND_URL**
- **Ejemplo:** `https://urbaniq.azurewebsites.net`
- **Importancia:** URL del frontend para CORS y email links

#### **FRONTEND_API_URL**
- **Ejemplo:** `https://urbaniq-backend.azurewebsites.net`
- **Importancia:** URL del backend API para el frontend

---

### 8. Variables de Sentry (Opcionales)

#### **SENTRY_DSN**
- **Formato:** URL de DSN de Sentry
- **Ejemplo:** `https://your-dsn@sentry.io/project-id`
- **Importancia:** Monitoreo de errores en producción

---

## 🚀 Configuración Local para Desarrollo

### Paso 1: Crear archivo .env
```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

### Paso 2: Editar .env con tus valores
```bash
# Editar el archivo .env con tus credenciales reales
notepad .env
```

### Paso 3: Usar Docker Compose con variables de entorno
```bash
# Desarrollo
docker-compose up -d

# Producción
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔐 Generación de Secrets Seguros

### Generar JWT Secret Key
```bash
# Usar PowerShell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$rng.GetBytes($bytes)
$secret = [System.Convert]::ToBase64String($bytes)
Write-Host $secret
```

### Generar SQL Server Password
```bash
# Requisitos: 12+ caracteres, mayúsculas, minúsculas, números, símbolos
# Ejemplo: Urbaniq@Prod#2024!Secure
```

---

## 📋 Checklist Pre-Producción

### Antes de desplegar a Azure:

- [ ] Crear archivo `.env` con valores de producción
- [ ] Generar JWT secret key segura (32+ caracteres)
- [ ] Generar SQL Server password fuerte
- [ ] Configurar credenciales de email (opcional)
- [ ] Configurar credenciales de Stripe (opcional)
- [ ] Configurar credenciales de Cloudinary (opcional)
- [ ] Configurar credenciales de Sentry (opcional)
- [ ] Probar localmente con `docker-compose.production.yml`
- [ ] Verificar que todos los servicios inicien correctamente
- [ ] Probar health checks de todos los servicios
- [ ] Verificar CORS configurado correctamente
- [ ] Asegurar que no hay credenciales hardcodeadas en el código

---

## ⚠️ Seguridad

### Nunca commits:
- ❌ Archivo `.env` con credenciales reales
- ❌ Credenciales hardcodeadas en el código
- ❌ Passwords en comentarios
- ❌ Secrets en repositorios públicos

### Siempre usar:
- ✅ Variables de entorno
- ✅ Secrets management de Azure
- ✅ Azure Key Vault para producción
- ✅ GitHub Secrets para CI/CD

---

## 🎯 Próximos Pasos

1. **Configurar recursos de Azure**
   - Azure App Service (Backend)
   - Azure SQL Database
   - Azure Redis Cache
   - Azure Blob Storage (opcional)

2. **Configurar CI/CD**
   - GitHub Actions con Azure Web App
   - Variables de entorno en GitHub Secrets

3. **Desplegar a producción**
   - Usar `docker-compose.production.yml`
   - Configurar dominio personal (opcional)
   - Configurar SSL (automático en Azure)

---

## 📞 Soporte

Para problemas de configuración:
- Revisa los logs de los contenedores: `docker-compose logs`
- Verifica las variables de entorno: `docker-compose config`
- Consulta la documentación de Azure Web Apps
