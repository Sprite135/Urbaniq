# Guía de Configuración Rápida - Urbaniq Production

## 🎯 **OBJETIVO**

Configurar todo lo necesario para producción en 15 minutos.

---

## ⏰ **TIEMPO ESTIMADO**

- Backup: 5 minutos
- Sentry: 5 minutos
- UptimeRobot: 5 minutos

---

## 📋 **CHECKLIST**

- [ ] Paso 1: Configurar backup (5 min)
- [ ] Paso 2: Configurar Sentry (5 min)
- [ ] Paso 3: Configurar UptimeRobot (5 min)

---

## 🔧 **PASO 1: CONFIGURAR BACKUP (5 minutos)**

### **1.1 Probar backup manual**
```powershell
cd C:\Users\sprit\CascadeProjects\Urbaniq\scripts
.\backup-database.ps1
```

### **1.2 Configurar tarea programada**
```powershell
# Right-click en create-backup-task.ps1 → Ejecutar como Administrador
cd C:\Users\sprit\CascadeProjects\Urbaniq\scripts
.\create-backup-task.ps1
```

### **1.3 Verificar**
- Abre Programador de Tareas (Win + R → `taskschd.msc`)
- Busca "Urbaniq Database Backup"
- Right-click → Ejecutar para probar

---

## 🔔 **PASO 2: CONFIGURAR SENTRY (5 minutos)**

### **2.1 Crear cuenta**
1. Ir a https://sentry.io/signup
2. Email: tu-email@urbaniq.com
3. Password: crear contraseña
4. Verify email

### **2.2 Crear proyecto**
1. Click "Create Project"
2. Nombre: `Urbaniq Backend`
3. Plataforma: `.NET`
4. Click "Create Project"

### **2.3 Obtener DSN**
1. En el proyecto, ir a "Settings" → "Client Keys (DSN)"
2. Copiar el DSN (algo como: `https://abc123@sentry.io/456`)
3. Guardar este DSN

### **2.4 Configurar en appsettings.json**
```json
{
  "Sentry": {
    "Dsn": "https://abc123@sentry.io/456"  // Pegar tu DSN aquí
  }
}
```

### **2.5 Configurar alertas**
1. En Sentry → Alerts → New Alert
2. Trigger: Issue created
3. Conditions: Environment = Production
4. Actions: Email (tu-email@urbaniq.com)
5. Click "Save Rule"

---

## 📊 **PASO 3: CONFIGURAR UPTIMEROBOT (5 minutos)**

### **3.1 Crear cuenta**
1. Ir a https://uptimerobot.com
2. Email: tu-email@urbaniq.com
3. Password: crear contraseña
4. Verify email

### **3.2 Crear monitor backend**
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: `Urbaniq Backend API`
4. URL: `http://localhost:5000/health` (o tu URL de producción)
5. Interval: Every 5 Minutes
6. Click "Create Monitor"

### **3.3 Crear monitor frontend**
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: `Urbaniq Frontend`
4. URL: `http://localhost:31349` (o tu URL de producción)
5. Interval: Every 5 Minutes
6. Click "Create Monitor"

### **3.4 Configurar alertas**
1. Ir a Settings → Alert Contacts
2. Agregar email: tu-email@urbaniq.com
3. Verificar email
4. Configurar Slack (opcional):
   - En Slack: Apps → Custom Integrations → Incoming Webhooks
   - Copiar Webhook URL
   - En UptimeRobot: Settings → Alert Contacts → Slack
   - Pegar Webhook URL

---

## ✅ **VERIFICACIÓN FINAL**

### **Verificar backup:**
```powershell
# Revisar que los archivos de backup existen
dir C:\Users\sprit\CascadeProjects\Urbaniq\backups
```

### **Verificar Sentry:**
- Ejecutar la aplicación
- Provocar un error intencional (ej: endpoint que no existe)
- Verificar que el error aparece en Sentry Dashboard

### **Verificar UptimeRobot:**
- Ir a UptimeRobot Dashboard
- Ver que los monitores dicen "UP"
- Parar el servidor brevemente
- Ver que llega alerta de email

---

## 🎉 **LISTO**

Una vez completados estos 3 pasos, tu aplicación está **production-ready** con:
- ✅ Backup diario automático
- ✅ Error tracking en tiempo real
- ✅ Monitoreo de disponibilidad 24/7

---

## 📞 **SOPORTE**

Si tienes problemas con alguno de los pasos:

**Backup:**
- Verificar que SQL Server está corriendo
- Verificar permisos en directorio de backups
- Verificar que sqlcmd está instalado

**Sentry:**
- Verificar que el DSN sea correcto
- Verificar que el código esté deployado
- Verificar network connectivity

**UptimeRobot:**
- Verificar que las URLs sean accesibles públicamente
- Verificar que el puerto 80/443 esté abierto
- Verificar firewall settings
