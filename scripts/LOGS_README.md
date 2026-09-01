# 📊 Sistema de Logs - Urbaniq

## 📋 Descripción

Urbaniq utiliza **Serilog** para el logging automático con rotación de archivos. Los logs se guardan automáticamente en archivos con rotación diaria y retención configurable.

---

## 📁 Ubicación de Logs

```
Backend/Ecommerce.Api/logs/
├── urbaniq-20240115.log          # Log general del día
├── urbaniq-20240116.log
├── urbaniq-20240117.log
└── urbaniq-errors-20240115.log  # Solo errores (producción)
```

---

## 🔧 Configuración

### **Desarrollo (`appsettings.json`)**
- **Nivel mínimo:** Information
- **Retención:** 30 días
- **Rotación:** Diaria
- **Ubicación:** `Backend/Ecommerce.Api/logs/urbaniq-.log`

### **Producción (`appsettings.Production.json`)**
- **Nivel mínimo:** Warning
- **Retención:** 90 días (logs generales), 365 días (errores)
- **Rotación:** Diaria
- **Ubicación:**
  - `logs/urbaniq-.log` (todos los logs)
  - `logs/urbaniq-errors-.log` (solo errores)

---

## 🎯 Script para Ver Logs

**Archivo:** `scripts/view-logs.ps1`

### **Uso Básico**

```powershell
# Ver últimas 50 líneas (default)
.\scripts\view-logs.ps1

# Ver últimas 100 líneas
.\scripts\view-logs.ps1 -Tail 100

# Ver solo errores
.\scripts\view-logs.ps1 -ErrorOnly

# Buscar patrón específico
.\scripts\view-logs.ps1 -Search "Stripe"

# Ver logs de hoy
.\scripts\view-logs.ps1 -Today

# Combinar filtros
.\scripts\view-logs.ps1 -ErrorOnly -Tail 20
.\scripts\view-logs.ps1 -Search "Payment" -Tail 50
```

### **Parámetros**

| Parámetro | Descripción | Default |
|-----------|-------------|---------|
| `-Tail` | Número de líneas a mostrar | 50 |
| `-Level` | Filtrar por nivel (Information, Warning, Error, Fatal) | - |
| `-Search` | Buscar patrón específico | - |
| `-ErrorOnly` | Mostrar solo errores | $false |
| `-Today` | Mostrar solo logs de hoy | $false |

---

## 🔍 Revisión Manual de Logs

### **Ver log de hoy**
```powershell
Get-Content Backend\Ecommerce.Api\logs\urbaniq-$((Get-Date).ToString('yyyyMMdd')).log -Tail 50
```

### **Buscar errores**
```powershell
Select-String -Path Backend\Ecommerce.Api\logs\*.log -Pattern "\[ERR\]" | Select-Object -Last 20
```

### **Ver errores recientes (producción)**
```powershell
Get-Content Backend\Ecommerce.Api\logs\urbaniq-errors-$((Get-Date).ToString('yyyyMMdd')).log -Tail 20
```

### **Buscar patrones específicos**
```powershell
Select-String -Path Backend\Ecommerce.Api\logs\*.log -Pattern "Stripe" | Select-Object -Last 10
```

---

## 🎨 Niveles de Log

| Nivel | Código | Descripción | Uso |
|-------|--------|-------------|-----|
| **Verbose** | VRB | Información muy detallada | Debugging detallado |
| **Debug** | DBG | Información de debugging | Desarrollo |
| **Information** | INF | Información general | Eventos normales |
| **Warning** | WRN | Advertencias | Problemas no críticos |
| **Error** | ERR | Errores | Errores que no detienen la app |
| **Fatal** | FAT | Errores fatales | Errores que detienen la app |

---

## 📊 Formato de Log

```
2024-01-15 14:32:15.123 +00:00 [INF] Request completed: GET /api/v1/catalog/products - 200 OK in 45ms
2024-01-15 14:32:16.456 +00:00 [WRN] Stock low for product ID 12345 (5 units remaining)
2024-01-15 14:32:17.789 +00:00 [ERR] Payment processing failed: StripeInvalidRequestException
```

**Componentes:**
- **Timestamp:** Fecha y hora con zona horaria
- **Level:** Nivel de log (INF, WRN, ERR, etc.)
- **Message:** Mensaje del log
- **Exception:** Stack trace (si aplica)

---

## 🔐 Permisos en Producción (IIS)

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

---

## 🚨 Integración con Alertas (Opcional)

Para complementar el sistema de logs, puedes crear un script que verifique errores recientes y envíe alertas:

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

---

## 🆚 Comparación: Serilog vs Sentry

| Aspecto | Serilog Archivos | Sentry |
|---------|------------------|--------|
| **Costo** | Gratis | Gratis (5K errores/mes) |
| **Configuración** | Ya configurado | 15 min |
| **Alertas** | Manual (requiere script) | Automáticas |
| **Dashboard** | Texto/archivos | Visual |
| **Agregación** | Manual (grep) | Automática |
| **Visibilidad** | Revisar archivos | Tiempo real |
| **Dependencia externa** | No | Sí |
| **Retención** | Configurable (30-365 días) | 90 días |

**Recomendación:**
- **Para empezar:** Serilog archivos es suficiente
- **Para crecimiento:** Agregar Sentry para alertas automáticas
- **Para producción robusta:** Ambos (Sentry para alertas, Serilog para archivo histórico)

---

## 📞 Troubleshooting

### **Logs no se crean**
1. Verificar que el directorio `logs` existe
2. Verificar permisos de escritura
3. Verificar configuración en `appsettings.json`
4. Revisar logs de la aplicación en Event Viewer

### **Logs rotan muy rápido**
1. Aumentar `retainedFileCountLimit` en configuración
2. Reducir nivel de log (de Information a Warning)

### **Logs son muy grandes**
1. Reducir nivel de log (de Information a Warning)
2. Configurar rollingInterval por hora en lugar de día
3. Revisar que no haya logs excesivos en un solo endpoint

---

## 📚 Documentación Adicional

- **Guía de Producción:** `PRODUCTION_SETUP_GUIDE.md` (sección FASE 8)
- **Configuración de Backup:** `BACKUP_SETUP.md`
- **Health Checks:** Ver endpoint `/health`

---

## ✅ Conclusión

El sistema de logs de Urbaniq está **completamente configurado** y listo para uso en desarrollo y producción. No requiere configuración adicional, solo revisar los logs según necesidad.

**Para producción:** Revisa que el directorio `logs` tenga permisos de escritura correctos.
