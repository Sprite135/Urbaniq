# Uptime Monitoring Configuration - Urbaniq

## 📋 **RESUMEN**

Sistema de monitoreo de disponibilidad 24/7 para el backend y frontend.

---

## 🛠️ **OPCIONES GRATUITAS**

### **1. UptimeRobot (Recomendado)**

**Ventajas:**
- ✅ Gratis hasta 50 monitores
- ✅ Intervalos de 5 minutos
- ✅ Alertas por email, SMS, Slack, Telegram
- ✅ Dashboard simple
- ✅ API pública

**Registro:**
1. Ir a https://uptimerobot.com
2. Crear cuenta gratuita
3. Verificar email

### **2. Pingdom (Alternativa)**

**Ventajas:**
- ✅ Dashboard profesional
- ✅ Integración con Slack/Teams
- ✅ Análisis de performance

**Registro:**
1. Ir a https://www.pingdom.com
2. Crear cuenta gratuita

### **3. StatusCake (Alternativa)**

**Ventajas:**
- ✅ Free tier generoso
- ✅ Página de estado pública
- ✅ Múltiples ubicaciones

**Registro:**
1. Ir to https://www.statuscake.com
2. Crear cuenta gratuita

---

## 🔧 **CONFIGURACIÓN UPTIMEROBOT**

### **1. Crear Monitor para Backend**

**Tipo:** HTTP(s)
**URL:** `https://tu-backend-url.com/health`
**Interval:** 5 minutos
**Timeout:** 30 segundos

**Configuración:**
- ✅ Check SSL certificate
- ✅ Follow redirects
- ✅ Alert sensitivity: Down (only when server is down)

### **2. Crear Monitor para Frontend**

**Tipo:** HTTP(s)
**URL:** `https://tu-frontend-url.com`
**Interval:** 5 minutos
**Timeout:** 30 segundos

**Configuración:**
- ✅ Check SSL certificate
- ✅ Follow redirects
- ✅ Alert sensitivity: Down

### **3. Configurar Alertas**

**Contactos:**
- **Email:** tu-email@urbaniq.com
- **SMS:** (opcional, requiere pago)
- **Slack:** (opcional, webhook)
- **Telegram:** (opcional, bot)

**Alert Settings:**
- ✅ Alert immediately when down
- ✅ Alert when back up
- ✅ Send 1 alert per outage

---

## 🔧 **CONFIGURACIÓN PINGDOM**

### **1. Crear Uptime Check**

**Type:** Uptime
**URL:** `https://tu-backend-url.com/health`
**Check Frequency:** Every 5 minutes
**Regions:** Multiple regions

**Alerts:**
- **Email:** tu-email@urbaniq.com
- **Slack:** Configurar webhook
- **Sensitivity:** Alert when down for 1 check

### **2. Page Speed Check**

**URL:** `https://tu-frontend-url.com`
**Frequency:** Every 1 hour
**Locations:** 3+ locations

---

## 📊 **CONFIGURACIÓN DE PÁGINA DE ESTADO (OPCIONAL)**

### **StatusCake Status Page**

**Ventajas:**
- Página pública de estado
- Integración con Twitter
- Incident history
- Branding personalizado

**Configuración:**
1. Crear Status Page en StatusCake
2. Agregar monitors: Backend, Frontend, Database
3. Configurar dominio: `status.urbaniq.com`
4. Añadir branding: logo, colores

### **Crear página de estado manual (Opción B)**

Usar **Statuspage.io** (gratuito):
1. Ir a https://statuspage.io
2. Crear página: `status.urbaniq.com`
3. Agregar monitors: Backend API, Frontend, Database
4. Configurar notificaciones: email, Slack

---

## 🔔 **INTEGRACIÓN CON SLACK (OPCIONAL)**

### **UptimeRobot Slack Integration:**

1. En Slack: Apps → Custom Integrations → Incoming Webhooks
2. Copiar Webhook URL
3. En UptimeRobot: My Settings → Alert Contacts → Slack
4. Pegar Webhook URL
5. Test webhook

### **Configurar canal específico:**

```
# Canal: #alerts
# Mensaje cuando el sitio está down:
🚨 ALERT: Backend is DOWN
URL: https://api.urbaniq.com
Time: {timestamp}

# Mensaje cuando el sitio está up:
✅ ALERT: Backend is UP
URL: https://api.urbaniq.com
Time: {timestamp}
```

---

## 📱 **INTEGRACIÓN CON TELEGRAM (OPCIONAL)**

### **Crear bot de Telegram:**

1. Crear bot con @BotFather
2. Obtener token: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
3. Obtener chat ID: Usar @userinfobot
4. En UptimeRobot: configurar URL webhook de Telegram

**Webhook URL:**
```
https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text={MESSAGE}
```

---

## 📊 **DASHBOARD DE MONITOREO**

### **Métricas Importantes:**

1. **Uptime:** % de tiempo online (objetivo: 99.9%)
2. **Response Time:** Tiempo de respuesta (objetivo: < 500ms)
3. **Availability:** Número de checks exitosos
4. **Outages:** Historial de caídas
5. **Trends:** Tendencias de performance

### **Alert Levels:**

- **Critical:** Site down por > 5 minutos
- **Warning:** Response time > 2 segundos
- **Info:** Degradation de performance

---

## 🚨 **RESPUESTA A ALERTAS**

### **Procedimiento cuando hay alerta:**

1. **Recibir alerta:** Email/Slack/Telegram
2. **Verificar status:** Abrir Dashboard de uptime
3. **Investigar:** Ver logs en Sentry
4. **Comunicar:** Notificar a stakeholders
5. **Resolver:** Fix el problema
6. **Verificar:** Confirmar que el servicio está up
7. **Documentar:** Crear post-mortem si fue crítico

---

## 📋 **CHECKLIST PRODUCCIÓN**

- [ ] Cuenta en UptimeRobot creada
- [ ] Monitor de backend configurado
- [ ] Monitor de frontend configurado
- [ ] Monitor de database configurado (opcional)
- [ ] Alertas de email configuradas
- [ ] Alertas de Slack configuradas (opcional)
- [ ] Página de estado creada (opcional)
- [ ] Frecuencia de checks: 5 minutos
- [ ] Umbral de alerta: down inmediato
- [ ] Configuración de backup alertas

---

## 💡 **BEST PRACTICES**

1. **Múltiples ubicaciones:** Monitorear desde diferentes regiones
2. **Health check endpoint:** Usar `/health` en lugar de homepage
3. **Alertas en cascada:** Email + Slack + SMS para críticos
4. **Página de estado:** Informar a usuarios sobre issues
5. **Post-mortem:** Documentar incidentes mayores
6. **Maintenance windows:** Programar downtimes cuando sea necesario

---

## 🎯 **CONFIGURACIÓN DE HEALTH CHECK**

### **Backend Health Check:**

El backend ya tiene `/health` endpoint configurado. Verifica:
- Database connectivity
- External services (Cloudinary, Stripe)
- Memory usage
- CPU usage

### **Endpoint `/health` Response:**

```json
{
  "status": "Healthy",
  "checks": {
    "database": "Healthy",
    "external_services": "Healthy"
  }
}
```

---

## ✅ **ESTADO**

- **Cuenta UptimeRobot:** ⏳ Crear cuenta
- **Monitor backend:** ⏳ Configurar
- **Monitor frontend:** ⏳ Configurar
- **Alertas email:** ⏳ Configurar
- **Alertas Slack:** ⏳ Opcional
- **Página de estado:** ⏳ Opcional
- **Documentación:** ✅ Creada
