# Urbaniq - Guía de Despliegue a Azure

## 📋 Visión General

Esta guía explica cómo desplegar Urbaniq a Azure App Service con Docker Compose.

---

## 🎯 Arquitectura de Despliegue

```
Internet
    ↓
Azure Front Door (Opcional - CDN)
    ↓
Azure App Service (Frontend - React)
    ↓
Azure App Service (Backend - .NET API)
    ↓
Azure SQL Database
    ↓
Azure Redis Cache
```

---

## 🚀 Paso 1: Crear Cuenta de Azure

### 1.1 Registrarse en Azure
1. Ve a https://azure.microsoft.com/
2. Crea una cuenta gratuita (Free Tier)
3. Verifica tu identidad con tarjeta de crédito (no se cobrará en Free Tier)

### 1.2 Crear Resource Group
1. Ve al portal de Azure: https://portal.azure.com/
2. Busca "Resource Groups"
3. Crea un nuevo Resource Group
   - **Nombre:** `urbaniq-rg`
   - **Región:** `East US` o `South Central US` (recomendado para Perú)
   - **SKU:** Free tier

---

## 🗄️ Paso 2: Crear Azure SQL Database

### 2.1 Crear SQL Server
1. En el portal de Azure, busca "SQL Server"
2. Crea un nuevo SQL Server
   - **Nombre:** `urbaniq-sql-server`
   - **Resource Group:** `urbaniq-rg`
   - **Región:** Misma que el Resource Group
   - **Admin login:** `urbaniq_admin`
   - **Password:** Genera una password fuerte (guárdala en lugar seguro)
   - **Allow Azure services:** Yes

### 2.2 Crear SQL Database
1. En el SQL Server creado, busca "SQL Databases"
2. Crea una nueva base de datos
   - **Nombre:** `UrbaniqDb`
   - **Server:** El servidor creado arriba
   - **Compute + storage:** `Serverless` (más económico)
   - **Backup storage:** 7 días (Free Tier)
   - **SKU:** Free tier

### 2.3 Obtener Connection String
1. Ve a la base de datos creada
2. En "Connection Strings", copia la cadena de conexión
3. Formato: `Server=tcp:urbaniq-sql-server.database.windows.net,1433;Database=UrbaniqDb;User ID=urbaniq_admin;Password=your_password;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`

---

## 🧠 Paso 3: Crear Azure Redis Cache

### 3.1 Crear Redis Cache
1. En el portal de Azure, busca "Azure Cache for Redis"
2. Crea un nuevo Redis Cache
   - **Nombre:** `urbaniq-redis`
   - **Resource Group:** `urbaniq-rg`
   - **Región:** Misma que el Resource Group
   - **Pricing tier:** `Basic C0` (más económico)
   - **Capacity:** 0.5 GB

### 3.2 Obtener Connection String
1. Ve al Redis Cache creado
2. En "Access keys", copia la "Primary connection string"
3. Formato: `urbaniq.redis.cache.windows.net:6380,password=your_password,ssl=True`

---

## 🐳 Paso 4: Preparar el Proyecto para Azure

### 4.1 Configurar Azure Container Registry (Opcional)
Si quieres usar tu propio registro de contenedores:

1. Busca "Container Registry" en Azure
2. Crea un nuevo ACR
   - **Nombre:** `urbaniqacr`
   - **Resource Group:** `urbaniq-rg`
   - **SKU:** `Basic`

### 4.2 Build Docker Images Localmente
```bash
# Build backend
cd Backend
docker build -t urbaniq-backend:latest .

# Build frontend
cd ../Frontend
docker build -t urbaniq-frontend:latest .
```

### 4.3 Push a Azure Container Registry (Opcional)
```bash
# Login a ACR
az acr login --name urbaniqacr

# Tag images
docker tag urbaniq-backend:latest urbaniqacr.azurecr.io/urbaniq-backend:latest
docker tag urbaniq-frontend:latest urbaniqacr.azurecr.io/urbaniq-frontend:latest

# Push images
docker push urbaniqacr.azurecr.io/urbaniq-backend:latest
docker push urbaniqacr.azurecr.io/urbaniq-frontend:latest
```

---

## 🌐 Paso 5: Crear Azure App Service (Backend)

### 5.1 Crear Web App para Backend
1. En el portal de Azure, busca "App Services"
2. Crea un nuevo Web App
   - **Nombre:** `urbaniq-backend`
   - **Resource Group:** `urbaniq-rg`
   - **Runtime stack:** `Linux`
   - **Publish:** `Docker Container`
   - **Region:** Misma que el Resource Group
   - **SKU:** `Free F1` (Free Tier)

### 5.2 Configurar Docker en Web App
1. En el Web App creado, ve a "Configuration"
2. En "Docker settings", configura:
   - **Image source:** `Docker Hub` o `Azure Container Registry`
   - **Image name:** `urbaniq-backend:latest` (o `urbaniqacr.azurecr.io/urbaniq-backend:latest`)
   - **Tag:** `latest`

### 5.3 Configurar Variables de Entorno
1. En el Web App, ve a "Configuration" → "Environment variables"
2. Agrega las siguientes variables:

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=tcp:urbaniq-sql-server.database.windows.net,1433;Database=UrbaniqDb;User ID=urbaniq_admin;Password=your_password;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
Redis__ConnectionString=urbaniq.redis.cache.windows.net:6380,password=your_redis_password,ssl=True
JwtSettings__SecretKey=your_jwt_secret_key_32_chars_min
JwtSettings__Issuer=https://urbaniq-backend.azurewebsites.net
JwtSettings__Audience=https://urbaniq-backend.azurewebsites.net
JwtSettings__ExpirationInMinutes=60
```

### 5.4 Configurar CORS
1. En el Web App, ve a "Configuration" → "CORS"
2. Agrega tu dominio frontend:
   - `https://urbaniq-frontend.azurewebsites.net`
   - `http://localhost:5173` (para desarrollo)

---

## 🌐 Paso 6: Crear Azure App Service (Frontend)

### 6.1 Crear Web App para Frontend
1. En el portal de Azure, busca "App Services"
2. Crea un nuevo Web App
   - **Nombre:** `urbaniq-frontend`
   - **Resource Group:** `urbaniq-rg`
   - **Runtime stack:** `Linux`
   - **Publish:** `Docker Container`
   - **Region:** Misma que el Resource Group
   - **SKU:** `Free F1` (Free Tier)

### 6.2 Configurar Docker en Web App
1. En el Web App creado, ve a "Configuration"
2. En "Docker settings", configura:
   - **Image source:** `Docker Hub` o `Azure Container Registry`
   - **Image name:** `urbaniq-frontend:latest` (o `urbaniqacr.azurecr.io/urbaniq-frontend:latest`)
   - **Tag:** `latest`

### 6.3 Configurar Variables de Entorno
1. En el Web App, ve a "Configuration" → "Environment variables"
2. Agrega la variable:

```bash
VITE_API_URL=https://urbaniq-backend.azurewebsites.net
```

---

## 🔧 Paso 7: Configurar Azure Key Vault (Opcional pero Recomendado)

### 7.1 Crear Key Vault
1. En el portal de Azure, busca "Key Vaults"
2. Crea un nuevo Key Vault
   - **Nombre:** `urbaniq-kv`
   - **Resource Group:** `urbaniq-rg`
   - **Región:** Misma que el Resource Group
   - **SKU:** `Standard`

### 7.2 Agregar Secrets
1. En el Key Vault, ve a "Secrets"
2. Agrega los siguientes secrets:
   - `SQL-Server-Password`: Tu password de SQL Server
   - `JWT-Secret-Key`: Tu JWT secret key
   - `Stripe-Secret-Key`: Tu Stripe secret key
   - `Cloudinary-Api-Secret`: Tu Cloudinary API secret

### 7.3 Integrar Key Vault con App Service
1. En el Web App, ve a "Configuration" → "Key Vault references"
2. Agrega referencias a los secrets del Key Vault

---

## 🔄 Paso 8: Configurar CI/CD con GitHub Actions

### 8.1 Crear Service Principal
```bash
# Usar Azure CLI
az login
az ad sp create-for-rbac --name "urbaniq-github-actions" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/urbaniq-rg --sdk-auth
```

### 8.2 Agregar Secrets a GitHub
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agrega los siguientes secrets:
   - `AZURE_CREDENTIALS`: Output del comando anterior
   - `AZURE_WEBAPP_NAME_BACKEND`: `urbaniq-backend`
   - `AZURE_WEBAPP_NAME_FRONTEND`: `urbaniq-frontend`
   - `AZURE_RESOURCE_GROUP`: `urbaniq-rg`

### 8.3 Crear Workflow de GitHub Actions
Crea el archivo `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '8.0.x'

    - name: Build Backend
      run: |
        cd Backend
        dotnet build --configuration Release

    - name: Build Frontend
      run: |
        cd Frontend
        npm install
        npm run build

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Deploy Backend to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ secrets.AZURE_WEBAPP_NAME_BACKEND }}
        resource-group: ${{ secrets.AZURE_RESOURCE_GROUP }}
        images: 'urbaniq-backend:latest'

    - name: Deploy Frontend to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ secrets.AZURE_WEBAPP_NAME_FRONTEND }}
        resource-group: ${{ secrets.AZURE_RESOURCE_GROUP }}
        images: 'urbaniq-frontend:latest'
```

---

## 🧪 Paso 9: Probar el Despliegue

### 9.1 Verificar Backend
1. Ve a `https://urbaniq-backend.azurewebsites.net/health`
2. Deberías ver un JSON con el estado de salud
3. Ve a `https://urbaniq-backend.azurewebsites.net/swagger`
4. Deberías ver la documentación de Swagger

### 9.2 Verificar Frontend
1. Ve a `https://urbaniq-frontend.azurewebsites.net`
2. Deberías ver la aplicación Urbaniq
3. Prueba navegar por el catálogo
4. Prueba crear una cuenta
5. Prueba hacer una compra

### 9.3 Verificar Logs
1. En el portal de Azure, ve al Web App
2. En "Log Stream", verás los logs en tiempo real
3. Revisa los Application Logs para errores

---

## 🔐 Paso 10: Configurar SSL y Dominio (Opcional)

### 10.1 Dominio Personalizado
1. En el Web App, ve a "Custom domains"
2. Agrega tu dominio (ej. `urbaniq.com`)
3. Configura los DNS de tu dominio para apuntar a Azure

### 10.2 SSL Certificate
1. Azure App Service incluye SSL gratuito
2. O compra un certificado SSL y configúralo en Azure

---

## 📊 Paso 11: Configurar Monitoring

### 11.1 Application Insights (Opcional)
1. En el portal de Azure, busca "Application Insights"
2. Crea un nuevo Application Insights
3. Agrega la clave de instrumentación a tu backend
4. Verás métricas de rendimiento y errores

### 11.2 Azure Monitor
1. Configura alertas para:
   - Errores HTTP 5xx
   - Alto uso de CPU
   - Alto uso de memoria
   - Fallos de conexión a base de datos

---

## 💰 Costos Estimados (Free Tier)

| Servicio | Tier | Costo Mensual |
|----------|------|---------------|
| Azure App Service (Backend) | Free F1 | S/ 0 |
| Azure App Service (Frontend) | Free F1 | S/ 0 |
| Azure SQL Database | Serverless | S/ 0-50 |
| Azure Redis Cache | Basic C0 | S/ 20-50 |
| Azure Key Vault | Standard | S/ 10-20 |
| **Total** | | **S/ 30-120/mes** |

**Nota:** Free Tier tiene limitaciones. Para producción real, considera tiers pagos.

---

## 🚨 Troubleshooting

### Error: "Connection string not found"
- Verifica que las variables de entorno estén configuradas
- Revisa el nombre exacto de las variables (case-sensitive)

### Error: "CORS not configured"
- Verifica que el dominio frontend esté en la lista de CORS del backend
- Espera unos minutos para que los cambios se propaguen

### Error: "Container not starting"
- Revisa los logs del contenedor en "Log Stream"
- Verifica que la imagen Docker sea válida
- Verifica que las variables de entorno sean correctas

### Error: "Database connection failed"
- Verifica la connection string
- Verifica que el firewall de Azure permita conexiones
- Verifica que las credenciales sean correctas

---

## 🎯 Checklist Final

Antes de considerar el despliegue completo:

- [ ] Todos los servicios de Azure creados
- [ ] Variables de entorno configuradas
- [ ] Docker images construidas y desplegadas
- [ ] Health checks funcionando
- [ ] CORS configurado correctamente
- [ ] SSL configurado (automático en Azure)
- [ ] Monitoring configurado
- [ ] Backup strategy configurado
- [ ] Dominio configurado (opcional)
- [ ] CI/CD configurado (opcional)
- [ ] Tests manuales completados
- [ ] Logs revisados sin errores críticos

---

## 📞 Soporte

- Documentación de Azure: https://docs.microsoft.com/azure/
- Soporte de Azure: https://azure.microsoft.com/support/
- Comunidad de Azure: https://stackoverflow.com/questions/tagged/azure
