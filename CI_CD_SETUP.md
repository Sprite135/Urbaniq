# 🔄 CI/CD Pipeline Guide

Guía para configurar y usar el pipeline de CI/CD con GitHub Actions.

## 📋 ¿Qué es CI/CD?

### **CI (Continuous Integration)**
- Integración continua de código
- Tests automáticos en cada commit
- Detección temprana de errores

### **CD (Continuous Deployment)**
- Despliegue automático
- Build automatizado
- Publicación de imágenes Docker

---

## 🚀 Pipeline Implementado

### **Jobs:**

#### 1. Build and Test
- ✅ Restaura dependencias .NET
- ✅ Compila backend
- ✅ Ejecuta 50 tests automatizados
- ✅ Compila frontend
- ✅ Ejecuta tests de frontend
- ✅ Sube artefactos de build

#### 2. Docker Build (Solo en main)
- ✅ Construye imágenes Docker
- ✅ Publica en Docker Hub
- ✅ Tags con version y SHA

#### 3. Deploy (Solo en main)
- ✅ Despliegue a producción
- ✅ Health checks
- ✅ Notificaciones

---

## ⚙️ Configuración Requerida

### **1. Secrets en GitHub**

Ve a: `Repository → Settings → Secrets and variables → Actions`

Agrega estos secrets:

```bash
DOCKER_USERNAME=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password
```

### **2. Docker Hub**

Crear cuenta en: https://hub.docker.com/

---

## 📊 Eventos que Activan el Pipeline

### **Push:**
- Branch `main` → Build + Test + Docker + Deploy
- Branch `develop` → Build + Test

### **Pull Request:**
- A `main` → Build + Test
- A `develop` → Build + Test

---

## 🔄 Flujo del Pipeline

```
┌─────────────────┐
│  Push/PR       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build & Test   │
│ - .NET Build    │
│ - 50 Tests     │
│ - React Build   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Docker Build    │
│ (Solo main)     │
│ - Backend Image │
│ - Frontend Image│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy          │
│ (Solo main)     │
│ - Production    │
│ - Health Check  │
└─────────────────┘
```

---

## 🧪 Testing Automatizado

### **Tests Ejecutados:**
- ✅ Domain Tests: 45 tests
- ✅ Application Tests: 2 tests
- ✅ Infrastructure Tests: 1 test
- ✅ API Tests: 2 tests
- **Total: 50 tests**

### **Fail Fast:**
- Si tests fallan → Pipeline se detiene
- No se construyen imágenes Docker
- No se despliega a producción

---

## 🐳 Docker Images

### **Backend:**
- `your-username/urbaniq-backend:latest`
- `your-username/urbaniq-backend:{sha}`

### **Frontend:**
- `your-username/urbaniq-frontend:latest`
- `your-username/urbaniq-frontend:{sha}`

---

## 📈 Monitoreo

### **Ver Status del Pipeline:**
1. Ir al repositorio en GitHub
2. Click en "Actions" tab
3. Ver workflows ejecutándose
4. Ver logs detallados

### **Notificaciones:**
- GitHub notifica por email
- Status badges en README
- PR checks en Pull Requests

---

## 🔧 Solución de Problemas

### **Pipeline Falla en Tests**
- Ver logs en GitHub Actions
- Ejecutar tests localmente: `dotnet test`
- Arreglar tests fallidos
- Push nuevo commit

### **Docker Build Falla**
- Verificar Docker Hub credentials
- Verificar Dockerfile syntax
- Verificar .dockerignore

### **Deploy Falla**
- Verificar secrets configurados
- Verificar servidor de producción
- Verificar network connectivity

---

## 🎯 Beneficios

### **Automatización:**
- ✅ Tests en cada commit
- ✅ Builds automáticos
- ✅ Despliegue automático
- ✅ Detección temprana de errores

### **Calidad:**
- ✅ Sin manual errors
- ✅ Consistencia en despliegues
- ✅ Rollback fácil
- ✅ Auditoría de cambios

### **Velocidad:**
- ✅ Despliegue en minutos
- ✅ Sin intervención manual
- ✅ Escalabilidad automática

---

## 📚 Recursos

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub](https://hub.docker.com/)
- [CI/CD Best Practices](https://docs.github.com/en/actions/about-github-actions/best-practices-for-github-actions)

---

## 💡 Notas Importantes

- Pipeline usa GitHub Actions (gratuito para repos públicos)
- Docker Hub privado limits
- Para producción real, usar Azure DevOps o GitLab CI
- Configurar environment variables apropiadas
- Usar secrets sensibles, nunca hardcode

---

**Última actualización:** Septiembre 2026
