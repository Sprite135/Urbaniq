# 🐳 Docker Setup Guide

Guía rápida para ejecutar Urbaniq con Docker.

## 📋 Requisitos Previos

- Docker Desktop instalado y ejecutándose
- Git clonado: `git clone https://github.com/Sprite135/Urbaniq.git`

---

## 🚀 Ejecución Rápida

### 1. Navegar al Proyecto

```bash
cd Urbaniq
```

### 2. Ejecutar con Docker Compose

```bash
docker-compose up --build
```

Este comando:
- Construye todas las imágenes Docker
- Inicia SQL Server, Redis, Backend y Frontend
- Configura redes y volúmenes automáticamente

### 3. Acceder a la Aplicación

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:44320
- **Swagger:** http://localhost:44320/swagger

---

## 🛑 Comandos Útiles

### Ejecutar en Segundo Plano (Background)

```bash
docker-compose up -d
```

### Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### Detener Servicios

```bash
docker-compose down
```

### Detener y Eliminar Volúmenes (borra base de datos)

```bash
docker-compose down -v
```

### Reconstruir Solo un Servicio

```bash
docker-compose up --build backend
```

---

## 🗄️ Base de Datos

### Acceder a SQL Server

```bash
docker exec -it urbaniq-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Urbaniq@2024!Secure'
```

### Ejecutar Migraciones

```bash
docker exec -it urbaniq-backend dotnet ef database update
```

---

## 🔧 Solución de Problemas

### "Connection refused" en Backend

Asegúrate de que SQL Server esté listo:
```bash
docker-compose logs db
```

### Puerto ya en uso

Cambia los puertos en `docker-compose.yml`:
```yaml
ports:
  - "44321:80"  # Cambiar 44320 a 44321
```

### Limpiar Todo y Empezar de Cero

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

## 📊 Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 5173 | React + Nginx |
| Backend | 44320 | .NET 8 API |
| SQL Server | 1433 | Base de datos |
| Redis | 6379 | Cache |

---

## 🎯 Ventajas de Docker

- ✅ Instalación en 5 minutos (vs 2-4 horas manual)
- ✅ Entorno consistente en todas partes
- ✅ Aislamiento de dependencias
- ✅ Fácil escalabilidad
- ✅ Despliegue simple

---

## 💡 Notas Importantes

- Las credenciales de desarrollo están en `docker-compose.yml`
- Para producción, usa variables de entorno externas
- Los datos de la base de datos persisten en volúmenes Docker
- Redis es opcional, el sistema usa fallback a DistributedMemoryCache

---

## 📚 Recursos Adicionales

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [.NET Docker Images](https://hub.docker.com/_/microsoft-dotnet)
