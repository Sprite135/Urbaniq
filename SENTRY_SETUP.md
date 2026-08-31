# Sentry Error Tracking Configuration - Urbaniq

## 📋 **RESUMEN**

Sentry integrado para error tracking en tiempo real de la aplicación ASP.NET Core.

---

## 🛠️ **INSTALACIÓN**

### **1. Crear cuenta en Sentry**

1. Ir a https://sentry.io/signup
2. Crear cuenta (gratis para desarrollo)
3. Crear nuevo proyecto: "Urbaniq Backend"
4. Plataforma: .NET
5. Obtener DSN (Data Source Name)

### **2. Configurar DSN en appsettings.json**

```json
{
  "Sentry": {
    "Dsn": "https://tu-dsn@sentry.io/project-id"
  }
}
```

### **3. Configurar variables de entorno (Producción)**

```bash
# En Azure App Service, Docker, o servidor de producción
SENTRY_DSN=https://tu-dsn@sentry.io/project-id
```

---

## 🔧 **CONFIGURACIÓN IMPLEMENTADA**

### **Sentry Options en Program.cs:**

```csharp
builder.Web.UseSentry(options =>
{
    options.Dsn = sentryDsn;
    options.Debug = builder.Environment.IsDevelopment();
    options.TracesSampleRate = 1.0;           // Captura todas las transacciones
    options.ProfilesSampleRate = 1.0;          // Captura todos los perfiles
    options.Environment = builder.Environment.EnvironmentName;
    options.SendDefaultPii = false;             // No enviar datos personales
    options.MaxBreadcrumbs = 50;               // Máximo 50 breadcrumbs
    options.AttachStacktrace = true;            // Adjuntar stacktrace
    options.StackTraceHint = Sentry.StackTraceHint.Always;
});
```

---

## 🎯 **CONFIGURACIÓN ADICIONAL (OPCIONAL)**

### **1. Performance Monitoring**

Para monitorear performance de endpoints:

```csharp
builder.Web.UseSentry(options =>
{
    // ... existing config
    options.TracesSampleRate = 0.1; // Muestrear 10% de transacciones en producción
});
```

### **2. Session Replay**

Para grabar sesiones de usuario cuando hay errores:

```csharp
builder.Web.UseSentry(options =>
{
    // ... existing config
    options.SessionRecordingMode = SessionRecordingMode.Error;
});
```

### **3. Alertas**

Configurar alertas en Sentry Dashboard:
- Alerts → New Alert
- Trigger: Issue created
- Conditions: Environment = Production
- Actions: Email, Slack, PagerDuty

---

## 📊 **DASHBOARD SENTRY**

### **Métricas Disponibles:**

1. **Errors:** Número de errores por tiempo
2. **Performance:** Latencia de endpoints
3. **Transactions:** Tráfico de la aplicación
4. **Release Tracking:** Errors por versión
5. **User Impact:** Usuarios afectados por errores

### **Vistas Importantes:**

- **Issues:** Lista de errores agrupados
- **Performance:** Latencia y throughput
- **Releases:** Tracking de versiones
- **Projects:** Dashboard general

---

## 🚨 **FLUJO DE ERROR**

### **1. Error Ocurre:**
- Excepción en backend
- Sentry captura automáticamente
- Stacktrace, breadcrumbs, user context enviados

### **2. Alerta:**
- Email/SMS enviado (configurado en Sentry)
- Slack webhook (opcional)
- PagerDuty integración (opcional)

### **3. Investigación:**
- Ir a Sentry Dashboard
- Ver detalles del error
- Ver breadcrumbs (pasos previos)
- Ver información de usuario (sanitizada)

### **4. Resolución:**
- Crear issue en GitHub (opcional)
- Asignar a desarrollador
- Fix y deploy
- Verificar en Sentry que error está resuelto

---

## 🔒 **SEGURIDAD**

### **Datos Capturados:**

✅ **Capturado:**
- Stacktraces
- Request headers (sanitizados)
- Breadcrumbs (navegación)
- Environment information
- Release version

❌ **No Capturado:**
- Passwords
- Credit card numbers
- PII personal (configurado con `SendDefaultPii = false`)

---

## 📋 **CHECKLIST PRODUCCIÓN**

- [ ] Cuenta Sentry creada
- [ ] Proyecto "Urbaniq Backend" creado
- [ ] DSN configurado en appsettings.json
- [ ] Variables de entorno configuradas
- [ ] Alertas configuradas (email/Slack)
- [ ] Release tracking habilitado
- [ ] Performance monitoring configurado
- [ ] Filtros de PII revisados

---

## 🆘 **TROUBLESHOOTING**

### **Sentry no captura errores:**

```bash
# Verificar DSN correcto
# Verificar que el SDK esté inicializado
# Verificar conectividad a Sentry
```

### **Too many errors:**

```csharp
// Reducir sample rate en producción
options.TracesSampleRate = 0.1;
options.ProfilesSampleRate = 0.1;
```

### **Faltan breadcrumbs:**

```csharp
// Aumentar breadcrumbs
options.MaxBreadcrumbs = 100;
```

---

## 💡 **BEST PRACTICES**

1. **Separar ambientes:** Development/Production projects en Sentry
2. **Sample rate:** Bajar en producción para reducir costo
3. **Custom attributes:** Agregar contexto específico del negocio
4. **Release tracking:** Crear release con cada deploy
5. **Source maps:** Configurar para mejor debugging

---

## ✅ **ESTADO**

- **Package Sentry.AspNetCore:** ✅ Instalado
- **Configuración Program.cs:** ✅ Implementada
- **appsettings.json:** ✅ Configurado
- **Documentación:** ✅ Creada
- **Cuenta Sentry:** ⏳ Crear cuenta
- **DSN configurado:** ⏳ Configurar
- **Alertas:** ⏳ Configurar
