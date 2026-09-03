# 🛒 Urbaniq - E-commerce Platform

Plataforma de e-commerce completa desarrollada con arquitectura moderna Clean Architecture, diseñada para ser escalable, mantenible y profesional.

![.NET](https://img.shields.io/badge/.NET-8.0-purple)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![SQL Server](https://img.shields.io/badge/SQL%20Server-2022-red)

## 📋 Índice

- [Descripción del Proyecto](#descripción-del-proyecto)
- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución del Proyecto](#ejecución-del-proyecto)
- [Testing](#testing)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Despliegue](#despliegue)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## 🎯 Descripción del Proyecto

Urbaniq es una plataforma de e-commerce completa con:
- **Backend:** API RESTful con .NET 8 siguiendo Clean Architecture
- **Frontend:** SPA moderna con React + TypeScript + Vite
- **Base de Datos:** SQL Server con Entity Framework Core
- **Caching:** Redis con fallback a DistributedMemoryCache
- **Pagos:** Integración con Stripe, Yape, Plin y otros métodos peruanos
- **Admin Panel:** Panel de administración completo

Ideal para portafolio profesional y demostración de habilidades técnicas para posiciones junior en Perú.

---

## ✨ Características

### 🛍️ Funcionalidades de E-commerce
- ✅ Catálogo de productos con filtros y búsqueda
- ✅ Carrito de compras completo
- ✅ Checkout multi-paso
- ✅ Múltiples métodos de pago (Stripe, Yape, Plin, Contra Entrega)
- ✅ Sistema de cupones avanzado
- ✅ Reviews y calificaciones
- ✅ Wishlist
- ✅ Gestión de direcciones
- ✅ Órdenes completas con tracking
- ✅ Panel de administración completo

### 🔐 Seguridad y Autenticación
- ✅ JWT Authentication + Refresh Tokens
- ✅ Roles de usuario (Admin, Customer)
- ✅ Rate limiting
- ✅ Security headers
- ✅ CORS configurado

### 📊 Calidad y Testing
- ✅ 50+ tests automatizados (Unit + Integration)
- ✅ Clean Architecture
- ✅ SOLID principles
- ✅ Repository Pattern + Unit of Work
- ✅ FluentValidation

### 🚀 Infraestructura
- ✅ Health checks
- ✅ Serilog logging con rotación
- ✅ Redis caching
- ✅ Swagger/OpenAPI documentation
- ✅ Background services

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** .NET 8 / ASP.NET Core Web API
- **Arquitectura:** Clean Architecture (Domain, Application, Infrastructure, API)
- **ORM:** Entity Framework Core
- **Base de Datos:** SQL Server / LocalDB
- **Caching:** Redis (opcional) + DistributedMemoryCache
- **Autenticación:** JWT Bearer Tokens
- **Validación:** FluentValidation
- **Logging:** Serilog
- **API Documentation:** Swagger/OpenAPI
- **Testing:** xUnit + Moq

### Frontend
- **Framework:** React 18+ + TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Payment:** Stripe React Integration
- **Notifications:** React Toastify

### DevOps
- **Containerización:** Docker (preparado)
- **CI/CD:** GitHub Actions (preparado)
- **Source Control:** Git + GitHub

---

## 🏗️ Arquitectura

### Clean Architecture Layers

```
├── Ecommerce.Domain          # Entities, Interfaces, Value Objects
├── Ecommerce.Application     # Services, DTOs, Use Cases
├── Ecommerce.Infrastructure  # Repositories, External Services, Data Access
└── Ecommerce.Api             # Controllers, Middleware, Configuration
```

### Patrones Implementados
- **Repository Pattern:** Abstracción de acceso a datos
- **Unit of Work:** Gestión de transacciones
- **Factory Pattern:** Creación de objetos complejos
- **Strategy Pattern:** Algoritmos intercambiables
- **Dependency Injection:** Inversión de dependencias
- **CQRS:** Separación de lectura/escritura (parcial)

---

## 📦 Requisitos Previos

### Backend
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [SQL Server LocalDB](https://docs.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb)
- [Redis](https://redis.io/download) (opcional, para producción)
- Git

### Frontend
- [Node.js](https://nodejs.org/) 18+ o superior
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### Herramientas Opcionales
- [Visual Studio 2022](https://visualstudio.microsoft.com/) o [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) para probar API
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (para contenedores)

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Sprite135/Urbaniq.git
cd Urbaniq
```

### 2. Instalación del Backend

```bash
cd Backend

# Restaurar dependencias
dotnet restore

# Configurar base de datos (ver sección Configuración)
# Editar Ecommerce.Api/appsettings.LocalDb.json

# Ejecutar migraciones
cd Ecommerce.Api
dotnet ef database update
```

### 3. Instalación del Frontend

```bash
cd Frontend

# Instalar dependencias
npm install
```

---

## ⚙️ Configuración

### Backend Configuration

#### Base de Datos Local

Editar `Backend/Ecommerce.Api/appsettings.LocalDb.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=UrbaniqDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "JwtSettings": {
    "SecretKey": "TU_CLAVE_SECRETA_SUPER_LARGA_AQUI",
    "Issuer": "https://localhost:44320",
    "Audience": "https://localhost:44320",
    "ExpirationInMinutes": 60
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Stripe": {
    "SecretKey": "sk_test_tu_clave_stripe",
    "PublishableKey": "pk_test_tu_clave_stripe"
  },
  "Cloudinary": {
    "CloudName": "tu_cloud_name",
    "ApiKey": "tu_api_key",
    "ApiSecret": "tu_api_secret"
  }
}
```

#### Variables de Entorno

Para producción, usa variables de entorno o `appsettings.Production.json`:

```bash
# Backend
export ConnectionStrings__DefaultConnection="Server=tu_servidor;Database=UrbaniqDb;..."
export JwtSettings__SecretKey="tu_clave_secreta"
export Stripe__SecretKey="sk_live_tu_clave"
```

### Frontend Configuration

Crear `Frontend/.env`:

```env
VITE_API_URL=https://localhost:44320
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave
```

---

## 🏃 Ejecución del Proyecto

### Opción 1: Docker (Recomendado - Rápido y Fácil)

#### Requisitos
- Docker Desktop instalado y ejecutándose

#### Ejecución
```bash
# Desde la raíz del proyecto
docker-compose up --build
```

#### Acceder a la Aplicación
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:44320
- **Swagger:** http://localhost:44320/swagger

#### Comandos Útiles
```bash
# Ejecutar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (borra base de datos)
docker-compose down -v
```

Para más detalles, ver [DOCKER_SETUP.md](DOCKER_SETUP.md)

### Opción 2: Desarrollo Local

#### Backend (Visual Studio)
1. Abrir `Backend/Urbaniq.sln` en Visual Studio 2022
2. Configurar `Ecommerce.Api` como proyecto de inicio
3. Presionar F5 o "Iniciar"

#### Backend (Terminal)
```bash
cd Backend/Ecommerce.Api
dotnet run
```
Backend estará disponible en: `https://localhost:44320`

#### Frontend
```bash
cd Frontend
npm run dev
```
Frontend estará disponible en: `http://localhost:5173`

---

## 🧪 Testing

### Ejecutar Todos los Tests

```bash
cd Backend
dotnet test
```

### Ejecutar Tests por Proyecto

```bash
# Tests de Domain
dotnet test Ecommerce.Domain.Tests

# Tests de Application
dotnet test Ecommerce.Application.Tests

# Tests de Infrastructure
dotnet test Ecommerce.Infrastructure.Tests

# Tests de API
dotnet test Ecommerce.Api.Tests
```

### Resultados Actuales
- **Domain Tests:** 45/45 ✅
- **Application Tests:** 2/2 ✅
- **Infrastructure Tests:** 1/1 ✅
- **API Tests:** 2/2 ✅
- **Total:** 50/50 tests pasando

---

## 📁 Estructura del Proyecto

```
Urbaniq/
├── Backend/
│   ├── Ecommerce.Domain/           # Entities, Interfaces
│   ├── Ecommerce.Application/      # Services, DTOs
│   ├── Ecommerce.Infrastructure/   # Repositories, Data Access
│   ├── Ecommerce.Api/             # Controllers, Middleware
│   ├── Ecommerce.Domain.Tests/     # Unit tests de dominio
│   ├── Ecommerce.Application.Tests/# Tests de servicios
│   ├── Ecommerce.Infrastructure.Tests/# Tests de infraestructura
│   ├── Ecommerce.Api.Tests/       # Integration tests de API
│   └── Urbaniq.sln                # Solution file
├── Frontend/
│   ├── src/
│   │   ├── app/                   # Redux store, API slices
│   │   ├── features/              # Feature modules
│   │   ├── layouts/               # Layout components
│   │   ├── components/            # Shared components
│   │   └── main.tsx               # Entry point
│   ├── public/                    # Static assets
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🚀 Despliegue

### Backend (Azure App Service)

```bash
# Build para producción
dotnet publish -c Release -o ./publish

# Deploy a Azure
az webapp up --resource-group UrbaniqRG --name urbaniq-api --sku F1
```

### Frontend (Vercel/Netlify)

```bash
# Build para producción
cd Frontend
npm run build

# Deploy a Vercel
vercel --prod
```

### Docker Compose (Producción)

```yaml
version: '3.8'
services:
  backend:
    build: ./Backend
    ports:
      - "44320:44320"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    depends_on:
      - db
      - redis

  frontend:
    build: ./Frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourPassword123

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Credenciales de Desarrollo

⚠️ **IMPORTANTE:** Estas credenciales son SOLO para desarrollo local. Nunca las uses en producción.

### Admin User
- **Email:** admin@urbaniq.com
- **Password:** Urbaniq#2024!Secure

### Base de Datos Local
- **Server:** (localdb)\mssqllocaldb
- **Database:** UrbaniqDb
- **Authentication:** Windows Authentication

---

## 📄 Licencia

Este proyecto es para propósitos educativos y de portafolio.

---

## 👨‍💻 Autor

**Desarrollado por:** [Tu Nombre]

**LinkedIn:** [Tu LinkedIn]
**GitHub:** [Sprite135](https://github.com/Sprite135)

---

## 🎓 Propósito del Proyecto

Este proyecto fue desarrollado como:
- ✅ Portafolio profesional para posiciones junior en Perú
- ✅ Demostración de habilidades técnicas en .NET y React
- ✅ Proyecto académico para presentación universitaria
- ✅ Ejemplo de Clean Architecture y mejores prácticas

---

## 📞 Soporte

Para preguntas o soporte:
- Abre un issue en GitHub
- Contacta por LinkedIn
- Email: [tu-email@ejemplo.com]

---

## 🙏 Agradecimientos

- Microsoft por .NET y ASP.NET Core
- React community por las herramientas modernas
- Open source community por las librerías utilizadas

---

**Última actualización:** Septiembre 2026
