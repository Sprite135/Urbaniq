# Production Checklist - Urbaniq E-commerce

## 📋 **RESUMEN**

Checklist completa para deploy a producción de Urbaniq.

---

## 🔧 **INFRAESTRUCTURA**

### **Servidor**
- [ ] Servidor configurado (Azure App Service / AWS EC2 / VPS)
- [ ] .NET 8 Runtime instalado
- [ ] SQL Server configurado (Azure SQL / AWS RDS / LocalDB para dev)
- [ ] Firewall configurado (puertos 80, 443 abiertos)
- [ ] SSL/TLS certificado configurado

### **Base de Datos**
- [ ] Base de datos creada en producción
- [ ] Migraciones aplicadas: `dotnet ef database update`
- [ ] Connection string configurada en appsettings.json
- [ ] Backup automatizado configurado (Tarea programada Windows)
- [ ] Política de retención definida (7 días)
- [ ] Prueba de restauración de backup realizada

### **Imágenes**
- [ ] Cloudinary configurado (o local storage en producción)
- [ ] Directorio `wwwroot/uploads/products` con permisos de escritura
- [ ] CDN configurado (opcional)

---

## 🔐 **SEGURIDAD**

### **API Keys y Secrets**
- [ ] JWT Secret Key configurado (mínimo 32 caracteres)
- [ ] Stripe Secret Key configurado
- [ ] Stripe Publishable Key configurado
- [ ] Cloudinary API Key configurado
- [ ] Email SMTP credentials configurados
- [ ] Todos los secrets en User Secrets / Environment Variables (NO en código)

### **CORS**
- [ ] Frontend domain agregado a AllowedOrigins
- [ ] Solo dominios permitidos configurados

### **Authentication**
- [ ] Admin password cambiado de default
- [ ] JWT expiration configurado (60 minutos)
- [ ] Password complexity enforcement

---

## 📊 **MONITORING**

### **Sentry (Error Tracking)**
- [ ] Cuenta Sentry creada
- [ ] Proyecto "Urbaniq Backend" creado
- [ ] DSN configurado en appsettings.json
- [ ] Environment configurado (Production)
- [ ] Alertas de email configuradas
- [ ] Slack webhook configurado (opcional)
- [ ] Release tracking habilitado

### **Uptime Monitoring**
- [ ] Cuenta UptimeRobot creada
- [ ] Monitor de backend configurado (endpoint `/health`)
- [ ] Monitor de frontend configurado
- [ ] Intervalo de 5 minutos configurado
- [ ] Alertas de email configuradas
- [ ] Alertas de Slack configuradas (opcional)
- [ ] Página de estado creada (opcional)

---

## 🚀 **DEPLOYMENT**

### **Backend**
- [ ] Build exitoso: `dotnet build --configuration Release`
- [ ] Public ejecutado: `dotnet publish --configuration Release`
- [ ] Application pool configurado (IIS) / servidor configurado
- [ ] Variables de entorno configuradas
- [ ] Health check accesible: `https://api.urbaniq.com/health`
- [ ] Swagger accesible: `https://api.urbaniq.com/swagger`

### **Frontend**
- [ ] Build exitoso: `npm run build`
- [ ] Assets copiados a servidor
- [ ] Frontend accesible: `https://urbaniq.com`
- [ ] SPA routing funcionando
- [ ] Imágenes cargando correctamente
- [ ] API calls funcionando

---

## 🧪 **TESTING**

### **Manual Testing - Critical Flows**
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Búsqueda de productos funciona
- [ ] Agregar al carrito funciona
- [ ] Checkout completo funciona
- [ ] Pago con Stripe funciona (modo test)
- [ ] Pago con métodos locales funciona
- [ ] Creación de pedido funciona
- [ ] Email de confirmación recibido
- [ ] Admin login funciona
- [ ] Crear producto funciona
- [ ] Crear cupón funciona

### **Integration Testing**
- [ ] API endpoints probados
- [ ] Database connections probadas
- [ ] External services probados (Stripe, Cloudinary, Email)

---

## 📧 **NOTIFICATIONS**

### **Email Configuration**
- [ ] SMTP server configurado
- [ ] Email templates probados
- [ ] Email de confirmación funciona
- [ ] Email de recuperación de contraseña funciona
- [ ] Email de actualización de pedido funciona
- [ ] Alertas de stock funcionan

---

## 📋 **DATA**

### **Seed Data**
- [ ] Datos iniciales cargados (productos, categorías, cupones)
- [ ] Admin user creado
- [ ] Payment methods configurados

### **Testing Data**
- [ ] Cuenta de prueba creada
- [ ] Productos de prueba creados
- [ ] Cupones de prueba creados

---

## 🔚 **POST-DEPLOYMENT**

### **Verification**
- [ ] Load testing con k6 (opcional)
- [ ] Security scan (opcional)
- [ ] Performance review (opcional)
- [ ] Accessibility review (opcional)

### **Documentation**
- [ ] Runbook de operaciones creado
- [ ] Runbook de incident response creado
- [ ] Procedimientos de backup documentados
- [ ] Procedimientos de restore documentados

---

## 🎯 **CRITICAL PATH TO PRODUCTION**

### **Mínimo Absoluto:**
1. ✅ Backup automatizado configurado
2. ✅ Sentry configurado
3. ✅ Uptime monitoring configurado
4. ⏳ Servidor configurado
5. ⏳ Database configurado
6. ⏳ Secrets configurados
7. ⏳ Frontend deployado
8. ⏳ Backend deployado
9. ⏳ Testing manual completo

### **Ideal:**
1. ✅ Todo lo anterior
2. CI/CD pipeline
3. Tests E2E
4. CDN configurado
5. Off-site backup

---

## 📞 **SUPPORT**

### **Contact Information**
- **Primary Support:** tu-email@urbaniq.com
- **Emergency Support:** +51-XXX-XXX-XXX
- **Documentation:** https://docs.urbaniq.com

### **Escalation**
- **Level 1:** Soporte técnico (24 horas)
- **Level 2:** Desarrollador senior (4 horas crítico)
- **Level 3:** CTO/Founder (1 hora crítico)

---

## ✅ **FIRMA OFF**

**Deploy Authorization:**
- [ ] Authorized by: _________________
- [ ] Date: _________________
- [ ] Environment: Production
- [ ] Version: _________________

**Post-Deploy Verification:**
- [ ] Verified by: _________________
- [ ] Date: _________________
- [ ] Health Check: _________________
- [ ] Critical Flows: _________________
