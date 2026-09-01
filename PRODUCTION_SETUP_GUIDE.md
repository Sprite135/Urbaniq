# 🚀 Guía Completa de Configuración de Producción - Urbaniq

## 📋 Resumen de Cambios Críticos Realizados

### ✅ 1. Script de Backup Mejorado
**Archivo:** `scripts/backup-database.ps1`

**Mejoras implementadas:**
- ✅ Logging detallado con timestamps y niveles (INFO, ERROR, WARNING)
- ✅ Validación de parámetros antes de ejecutar
- ✅ Verificación de escritura en directorio de backup
- ✅ Verificación de disponibilidad de `sqlcmd`
- ✅ Test de conexión a SQL Server antes del backup
- ✅ Verificación de que el archivo de backup se creó y tiene contenido
- ✅ Logging a archivo (`backup.log`) en el directorio de backup
- ✅ Reporte final con estadísticas (número de backups, tamaño total)
- ✅ Manejo robusto de errores con códigos de salida correctos

**Uso:**
```powershell
.\backup-database.ps1 -BackupPath "C:\backups" -DatabaseName "EcommerceDb" -ServerInstance "(localdb)\MSSQLLocalDB" -RetentionDays 7
```

### ✅ 2. Credenciales de Admin Actualizadas
**Archivo:** `Backend/Ecommerce.Api/appsettings.LocalDb.json`

**Cambios:**
- **Email:** `admin@pccomponents.com` → `admin@urbaniq.com`
- **Password:** `Admin123!` → `Urbaniq#2024!Secure`
- **JWT Key:** Clave simple → Clave segura de 64+ caracteres
- **Issuer/Audience:** Actualizados al puerto correcto (5215)

**⚠️ IMPORTANTE:** Estas credenciales siguen siendo de desarrollo. Para producción, debes cambiarlas nuevamente a credenciales únicas y seguras.

### ✅ 3. Health Checks Verificados
**Endpoints:**
- ✅ `/health` - Responde "Healthy" (SQL Server check)
- ✅ `/swagger` - Documentación OpenAPI disponible (200 OK)

---

## 🔧 CONFIGURACIÓN DE PRODUCCIÓN - PASO A PASO

### **FASE 1: Configuración de Base de Datos**

#### 1.1 Configurar SQL Server de Producción
```json
// appsettings.Production.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_PROD_SERVER;Database=UrbaniqProdDb;User Id=urbaniq_user;Password=YOUR_SECURE_PASSWORD;MultipleActiveResultSets=true;TrustServerCertificate=False;Encrypt=True;"
  }
}
```

**Requisitos:**
- SQL Server Standard/Enterprise Edition
- Base de datos dedicada (no compartir con otros apps)
- Usuario de base de datos con permisos limitados (db_datareader, db_datawriter)
- Habilitar Transparent Data Encryption (TDE) si es posible
- Configurar backup automático en el servidor SQL

#### 1.2 Configurar Redis de Producción
```json
{
  "ConnectionStrings": {
    "Redis": "YOUR_REDIS_SERVER:6380,password=YOUR_REDIS_PASSWORD,ssl=True"
  }
}
```

**Opciones:**
- Azure Redis Cache
- AWS ElastiCache
- Redis Cloud
- Redis propio en VPS

---

### **FASE 2: Configuración de Seguridad**

#### 2.1 Generar JWT Key Seguro
```powershell
# Generar clave segura de 64 caracteres
$Key = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
Write-Host $Key
```

Actualizar en `appsettings.Production.json`:
```json
{
  "Jwt": {
    "Issuer": "https://tu-dominio.com",
    "Audience": "https://tu-dominio.com",
    "Key": "TU_CLAVE_GENERADA_DE_64_CARACTERES"
  }
}
```

#### 2.2 Configurar Credenciales de Admin Reales
```json
{
  "AdminSettings": {
    "Email": "admin@tu-dominio.com",
    "Password": "TuContraseñaMuySegura123!@#"
  }
}
```

**Requisitos:**
- Mínimo 12 caracteres
- Incluir mayúsculas, minúsculas, números y símbolos
- No usar palabras comunes
- Guardar en secret manager (Azure Key Vault, AWS Secrets Manager)

#### 2.3 Configurar Stripe (Pagos)
```json
{
  "Stripe": {
    "PublishableKey": "pk_live_TU_PUBLIC_KEY",
    "SecretKey": "sk_live_TU_SECRET_KEY",
    "WebhookSecret": "whsec_TU_WEBHOOK_SECRET"
  }
}
```

**Pasos:**
1. Crear cuenta en Stripe Dashboard
2. Modo "Live" (no Test)
3. Obtener API keys
4. Configurar webhook para tu dominio
5. Guardar en secret manager

#### 2.4 Configurar SMTP (Emails)
```json
{
  "SmtpSettings": {
    "Host": "smtp.tu-proveedor.com",
    "Port": 587,
    "UseSsl": true,
    "Username": "no-reply@tu-dominio.com",
    "Password": "TU_SMTP_PASSWORD",
    "FromEmail": "no-reply@tu-dominio.com",
    "FromName": "Urbaniq Store"
  }
}
```

**Opciones:**
- SendGrid
- Mailgun
- AWS SES
- SMTP propio

#### 2.5 Configurar Cloudinary (Imágenes)
```json
{
  "CloudinarySettings": {
    "CloudName": "tu-cloud-name",
    "ApiKey": "TU_API_KEY",
    "ApiSecret": "TU_API_SECRET"
  }
}
```

**Pasos:**
1. Crear cuenta en Cloudinary
2. Configurar folder structure (products, categories, payments)
3. Configurar transformation settings
4. Habilitar auto-upload from URL

#### 2.6 Configurar Sentry (Error Tracking) - OPCIONAL
```json
{
  "Sentry": {
    "Dsn": "https://TU_SENTRY_DSN@sentry.io/PROJECT_ID",
    "Environment": "production",
    "Release": "urbaniq-v1.0.0"
  }
}
```

**Pasos:**
1. Crear cuenta en Sentry
2. Crear nuevo proyecto
3. Obtener DSN
4. Configurar alertas (email, Slack)
5. Configurar sample rate para transactions

**Opción alternativa (sin Sentry):**
- Urbaniq ya tiene Serilog configurado para guardar logs en archivos
- Ver sección "FASE 8: Configuración de Logs" para más detalles

---

### **FASE 3: Configuración de Servidor**

#### 3.1 Configurar IIS (Windows Server)
```powershell
# Instalar ASP.NET Core Hosting Bundle
# Descargar: https://dotnet.microsoft.com/download/dotnet/6.0

# Crear sitio en IIS
# - Physical Path: C:\inetpub\Urbaniq\Backend
# - Binding: http://*:80, https://*:443

# Configurar Application Pool
# - .NET CLR Version: No Managed Code
# - Pipeline Mode: Integrated
# - Identity: ApplicationPoolIdentity (con permisos de escritura)
```

#### 3.2 Configurar Reverse Proxy (Nginx/Linux)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3.3 Configurar HTTPS
```powershell
# Usar Let's Encrypt (gratis)
# Instalar certbot: https://certbot.eff.org/

certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---

### **FASE 4: Configuración de Backup**

#### 4.1 Crear Directorio de Backup
```powershell
New-Item -ItemType Directory -Path "C:\backups" -Force
New-Item -ItemType Directory -Path "C:\backups\logs" -Force
```

#### 4.2 Ejecutar Script de Backup Manualmente (Prueba)
```powershell
cd C:\Users\sprit\CascadeProjects\Urbaniq\scripts
.\backup-database.ps1 -BackupPath "C:\backups" -DatabaseName "UrbaniqProdDb" -ServerInstance "YOUR_PROD_SERVER" -RetentionDays 7
```

#### 4.3 Configurar Tarea Programada (Windows Task Scheduler)
**Ver documentación detallada en `BACKUP_SETUP.md`**

Resumen:
1. Abrir Task Scheduler como Administrator
2. Crear tarea: "Urbaniq Database Backup"
3. Trigger: Daily a las 2:00 AM
4. Action: Ejecutar `backup-database.ps1`
5. Configurar para ejecutar como usuario con permisos SQL

---

### **FASE 5: Configuración de Monitoring**

#### 5.1 Configurar Uptime Monitoring
**Ver documentación en `UPTIME_MONITORING.md`**

**Servicios recomendados:**
- UptimeRobot (gratis hasta 50 monitores)
- Pingdom (plan básico)
- StatusCake (gratis)

**Monitores a configurar:**
- `https://tu-dominio.com/health` - Health check (cada 1 min)
- `https://tu-dominio.com/` - Homepage (cada 5 min)
- `https://tu-dominio.com/api/v1/catalog/products` - API endpoint (cada 5 min)

#### 5.2 Configurar Alertas
- Email para downtimes > 1 min
- SMS para downtimes > 5 min
- Slack/Webhook para downtimes > 10 min

---

### **FASE 6: Configuración de CORS**

```json
{
  "AllowedOrigins": [
    "https://tu-dominio.com",
    "https://www.tu-dominio.com"
  ]
}
```

**Remover:**
- `http://localhost:*` (solo desarrollo)
- `http://127.0.0.1:*` (solo desarrollo)

---

### **FASE 7: Configuración de Yape Real**

#### 7.1 Subir QR Real
```powershell
# Copiar tu QR real de Yape a:
Backend/Ecommerce.Api/wwwroot/uploads/payments/yape.png
```

#### 7.2 Configurar Datos Reales
```json
{
  "MerchantPaymentSettings": {
    "Yape": {
      "Phone": "999888777",  // Tu número real de Yape
      "OwnerName": "Tu Nombre Real",
      "QrImageUrl": "/uploads/payments/yape.png"
    }
  }
}
```

---

### **FASE 8: Configuración de Logs**

#### 8.1 Logs Archivados Automáticamente (Serilog)
Urbaniq ya tiene Serilog configurado para guardar logs en archivos automáticamente.

**Configuración en `appsettings.json` (Desarrollo):**
```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Information",
        "System": "Warning"
      }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/urbaniq-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30,
          "outputTemplate": "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
        }
      }
    ]
  }
}
```

**Configuración en `appsettings.Production.json` (Producción):**
```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Warning",
      "Override": {
        "Microsoft": "Warning",
        "System": "Error",
        "Microsoft.EntityFrameworkCore": "Error"
      }
    },
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "path": "logs/urbaniq-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 90
        }
      },
      {
        "Name": "File",
        "Args": {
          "path": "logs/urbaniq-errors-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 365,
          "restrictedToMinimumLevel": "Error"
        }
      }
    ]
  }
}
```

**Características:**
- ✅ **Rotación diaria:** Un nuevo archivo cada día (`urbaniq-20240115.log`)
- ✅ **Retención automática:** Desarollo = 30 días, Producción = 90 días (logs generales), 365 días (errores)
- ✅ **Logs de errores separados:** En producción, los errores se guardan en archivo separado con retención de 1 año
- ✅ **Niveles de log:** Information, Warning, Error, Fatal
- ✅ **Enrichment:** Machine name, Thread ID, Log Context

#### 8.2 Ubicación de Logs
```
Backend/Ecommerce.Api/logs/
├── urbaniq-20240115.log
├── urbaniq-20240116.log
├── urbaniq-20240117.log
└── urbaniq-errors-20240115.log (solo en producción)
```

#### 8.3 Script para Ver Logs
**Archivo:** `scripts/view-logs.ps1`

**Uso básico:**
```powershell
# Ver últimas 50 líneas
.\scripts\view-logs.ps1

# Ver últimas 100 líneas
.\scripts\view-logs.ps1 -Tail 100

# Ver solo errores
.\scripts\view-logs.ps1 -ErrorOnly

# Buscar patrón específico
.\scripts\view-logs.ps1 -Search "Stripe"

# Ver logs de hoy
.\scripts\view-logs.ps1 -Today

# Ver solo errores de las últimas 20 líneas
.\scripts\view-logs.ps1 -ErrorOnly -Tail 20
```

#### 8.4 Revisión Manual de Logs
**Para desarrollo:**
```powershell
# Ver log de hoy
Get-Content Backend\Ecommerce.Api\logs\urbaniq-$((Get-Date).ToString('yyyyMMdd')).log -Tail 50

# Buscar errores
Select-String -Path Backend\Ecommerce.Api\logs\*.log -Pattern "\[ERR\]" | Select-Object -Last 20
```

**Para producción:**
```powershell
# Ver errores recientes
Get-Content Backend\Ecommerce.Api\logs\urbaniq-errors-$((Get-Date).ToString('yyyyMMdd')).log -Tail 20

# Buscar errores en los últimos 7 días
Get-ChildItem Backend\Ecommerce.Api\logs\urbaniq-errors-*.log |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 7 |
    ForEach-Object { Get-Content $_.FullName | Select-String "\[ERR\]" }
```

#### 8.5 Configuración de Log Retention (IIS)
Si usas IIS, asegúrate que el Application Pool Identity tenga permisos de escritura en el directorio `logs`:

```powershell
# Crear directorio de logs si no existe
New-Item -ItemType Directory -Path "C:\inetpub\Urbaniq\logs" -Force

# Configurar permisos (ejecutar como Administrator)
$acl = Get-Acl "C:\inetpub\Urbaniq\logs"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\Urbaniq",
    "Modify",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($accessRule)
Set-Acl "C:\inetpub\Urbaniq\logs" $acl
```

#### 8.6 Integración con Uptime Monitoring
Para complementar UptimeRobot, puedes configurar un script que verifique errores recientes y envíe alertas:

```powershell
# scripts\check-logs.ps1
$LogDir = "C:\inetpub\Urbaniq\logs"
$ErrorLog = Get-ChildItem $LogDir -Filter "urbaniq-errors-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$RecentErrors = Get-Content $ErrorLog.FullName -Tail 10

if ($RecentErrors.Count -gt 0) {
    # Enviar alerta (puedes usar Send-MailMessage o webhook)
    Write-Host "⚠️ Se detectaron errores recientes: $($RecentErrors.Count)"
}
```

#### 8.7 Comparación: Sentry vs Serilog Archivos

| Aspecto | Sentry | Serilog Archivos |
|---------|--------|------------------|
| Costo | Gratis (5K errores/mes) | Gratis |
| Configuración | 15 min | Ya configurado |
| Alertas | Automáticas | Manual (requiere script) |
| Dashboard | Visual | Texto/archivos |
| Agregación | Automática | Manual (grep) |
| Visibilidad | Tiempo real | Revisar archivos |
| Dependencia externa | Sí | No |
| Retención | 90 días | Configurable (30-365 días) |

**Recomendación:**
- **Para empezar:** Serilog archivos es suficiente
- **Para crecimiento:** Agregar Sentry para alertas automáticas
- **Para producción robusta:** Ambos (Sentry para alertas, Serilog para archivo histórico)

---

## 🧪 PRUEBAS OBLIGATORIAS ANTES DE LANZAR

### **Prueba 1: Health Check**
```powershell
Invoke-WebRequest -Uri "https://tu-dominio.com/health" -UseBasicParsing
# Debe responder: "Healthy"
```

### **Prueba 2: Swagger**
```powershell
# Navegar a: https://tu-dominio.com/swagger
# Verificar que todos los endpoints se muestran
# Probar autenticación
```

### **Prueba 3: Flujo Completo de Compra**
1. Registrar nuevo usuario
2. Agregar producto al carrito
3. Proceder a checkout
4. Completar dirección
5. Seleccionar método de pago
6. Completar pedido
7. Verificar email de confirmación

### **Prueba 4: Admin Panel**
1. Login con credenciales de admin
2. Verificar dashboard
3. Crear/Editar producto
4. Crear cupón
5. Verificar analytics

### **Prueba 5: Backup**
1. Ejecutar script de backup manualmente
2. Verificar que archivo `.bak` se creó
3. Verificar tamaño > 0
4. Verificar archivo de log

### **Prueba 6: Payment Methods**
1. Probar Stripe (si configurado)
2. Probar Yape manual
3. Probar Pago contra entrega

---

## 📋 CHECKLIST FINAL DE PRODUCCIÓN

### **Seguridad**
- [ ] Cambiar credenciales de admin
- [ ] Cambiar JWT key a clave segura
- [ ] Configurar HTTPS con certificado válido
- [ ] Remover endpoints de desarrollo
- [ ] Configurar CORS solo para dominios permitidos
- [ ] Habilitar CSP headers
- [ ] Configurar rate limiting agresivo

### **Base de Datos**
- [ ] Configurar SQL Server de producción
- [ ] Configurar usuario con permisos limitados
- [ ] Habilitar TDE (Transparent Data Encryption)
- [ ] Configurar backup automático en SQL Server
- [ ] Ejecutar script de backup manualmente
- [ ] Configurar tarea programada de backup

### **Servicios Externos**
- [ ] Configurar Stripe live keys
- [ ] Configurar SMTP real
- [ ] Configurar Cloudinary real
- [ ] Configurar Sentry DSN
- [ ] Configurar Redis de producción

### **Monitoring**
- [ ] Configurar UptimeRobot/Pingdom
- [ ] Configurar alertas de email
- [ ] Configurar alertas de SMS
- [ ] Verificar health check endpoint
- [ ] Verificar que logs se guardan en archivos
- [ ] Configurar permisos de escritura en directorio logs
- [ ] Probar script view-logs.ps1
- [ ] Configurar script de verificación de errores (opcional)

### **Funcionalidad**
- [ ] Probar flujo completo de compra
- [ ] Probar admin panel
- [ ] Probar cupones
- [ ] Probar Yape manual
- [ ] Probar emails de notificación
- [ ] Probar recuperación de contraseña

### **Performance**
- [ ] Configurar CDN para frontend
- [ ] Habilitar compresión HTTP
- [ ] Configurar caching headers
- [ ] Optimizar imágenes
- [ ] Minificar CSS/JS

---

## 🚨 ROLLBACK PLAN

Si algo sale mal después del lanzamiento:

### **Opción 1: Restaurar Backup**
```powershell
# Restaurar último backup
sqlcmd -S YOUR_SERVER -Q "RESTORE DATABASE UrbaniqProdDb FROM DISK = 'C:\backups\UrbaniqProdDb_YYYYMMDD_HHMMSS.bak' WITH REPLACE"
```

### **Opción 2: Revertir a Versión Anterior**
```powershell
# Detener IIS
Stop-Website -Name "Urbaniq"

# Restaurar versión anterior
Copy-Item -Path "C:\backup\Urbaniq\v1.0.0\*" -Destination "C:\inetpub\Urbaniq" -Recurse -Force

# Iniciar IIS
Start-Website -Name "Urbaniq"
```

### **Opción 3: Switch a Blue-Green Deployment**
- Tener 2 servidores idénticos
- Cambiar DNS para apuntar al servidor verde si el azul falla

---

## 📞 SOPORTE POST-LANZAMIENTO

### **Primeras 24 Horas**
- Monitorear logs cada 2 horas
- Verificar health checks
- Revisar Sentry para errores
- Monitorear throughput de órdenes
- Verificar que backups se ejecuten

### **Primeras 72 Horas**
- Analizar patrones de uso
- Optimizar queries lentos
- Ajustar configuración de caching
- Revisar feedback de usuarios
- Planificar mejoras

---

## 🎯 RESUMEN

### **✅ Completado en esta sesión:**
1. Script de backup mejorado con logging y validación
2. Credenciales de admin actualizadas (desarrollo)
3. Health checks verificados
4. Documentación completa de configuración

### **⏳ Pendiente (requiere tus datos):**
1. Configurar Sentry DSN real
2. Configurar SMTP real
3. Configurar Stripe real
4. Configurar Cloudinary real
5. Configurar tarea programada de backup como Admin
6. Configurar uptime monitoring real

### **📝 Para producción:**
Revisa esta guía completa y configura cada sección según tu entorno de producción específico.
