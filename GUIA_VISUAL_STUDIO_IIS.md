# Guía Visual Studio + IIS - Urbaniq E-commerce 🖥️

## 📋 **REQUISITOS**

- ✅ Visual Studio 2022 (Community, Professional, o Enterprise)
- ✅ ASP.NET and web development workload instalado
- ✅ IIS Express (incluido con Visual Studio)
- ✅ SQL Server LocalDB o SQL Server

---

## 🔧 **CONFIGURACIÓN EN VISUAL STUDIO**

### **1. Abrir el Proyecto**

1. Abre Visual Studio 2022
2. `File` → `Open` → `Project/Solution`
3. Navega a: `C:\Users\sprit\CascadeProjects\Urbaniq\Backend`
4. Selecciona `Urbaniq.sln` (o crea uno si no existe)

**Si no hay solution file, créalo:**
```
File → New → Project → Other Project Types → Blank Solution
Nombre: Urbaniq
Ubicación: C:\Users\sprit\CascadeProjects\Urbaniq\Backend
```

Luego:
- Right-click en Solution → `Add` → `Existing Project`
- Agrega:
  - `Ecommerce.Domain/Ecommerce.Domain.csproj`
  - `Ecommerce.Application/Ecommerce.Application.csproj`
  - `Ecommerce.Infrastructure/Ecommerce.Infrastructure.csproj`
  - `Ecommerce.Api/Ecommerce.Api.csproj`

---

### **2. Configurar Startup Project**

1. Right-click en `Ecommerce.Api` en Solution Explorer
2. `Set as Startup Project`

---

### **3. Configurar appsettings.json**

Abre `Ecommerce.Api/appsettings.json` y configura:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=UrbaniqDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "StripeSettings": {
    "SecretKey": "sk_test_placeholder",
    "PublishableKey": "pk_test_placeholder",
    "WebhookSecret": "whsec_placeholder"
  },
  "CloudinarySettings": {
    "CloudName": "SET_VIA_USER_SECRETS_OR_ENV_VAR",
    "ApiKey": "SET_VIA_USER_SECRETS_OR_ENV_VAR",
    "ApiSecret": "SET_VIA_USER_SECRETS_OR_ENV_VAR"
  },
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "Port": 587,
    "SenderEmail": "tu-email@gmail.com",
    "SenderName": "Urbaniq",
    "Password": "tu-app-password"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "JwtSettings": {
    "SecretKey": "tu-secret-key-minimo-32-caracteres-aqui",
    "Issuer": "Urbaniq",
    "Audience": "UrbaniqUsers",
    "ExpirationInMinutes": 60
  }
}
```

---

### **4. Ejecutar Migraciones desde Visual Studio**

**Opción A: Package Manager Console**
1. `Tools` → `NuGet Package Manager` → `Package Manager Console`
2. En "Default project" selecciona `Ecommerce.Infrastructure`
3. Ejecuta:
```powershell
Update-Database -StartupProject Ecommerce.Api
```

**Opción B: Developer PowerShell**
1. Right-click en `Ecommerce.Infrastructure` → `Open in Terminal`
2. Ejecuta:
```bash
dotnet ef database update --startup-project ../Ecommerce.Api
```

---

## 🚀 **EJECUTAR CON IIS EXPRESS (RECOMENDADO)**

### **Método 1: Botón de Play**

1. En la barra superior de Visual Studio, asegúrate que diga **IIS Express**
2. Click en el botón verde **Play** (▶)
3. El navegador se abrirá automáticamente en `http://localhost:5000` (o puerto configurado)

### **Método 2: Debug Configuration**

1. Click en el dropdown al lado del botón Play
2. Selecciona `Ecommerce.Api (IIS Express)`
3. Click en el botón Play

### **Método 3: Properties**

1. Right-click en `Ecommerce.Api` → `Properties`
2. Ve a la sección `Debug`
3. En "Profile" selecciona `IIS Express`
4. Verifica la URL: `http://localhost:5000`
5. Click en el botón Play

---

## 🌐 **EJECUTAR CON IIS LOCAL (OPCIONAL)**

### **1. Habilitar IIS en Windows**

1. `Control Panel` → `Programs and Features` → `Turn Windows features on or off`
2. Habilita:
   - ✅ Internet Information Services
   - ✅ World Wide Web Services
   - ✅ Application Development Features
   - ✅ ASP.NET 4.8
   - ✅ ISAPI Extensions
   - ✅ ISAPI Filters
3. Click OK y espera instalación

### **2. Configurar Pool de Aplicaciones**

1. Abre `IIS Manager` (Windows Key → "IIS Manager")
2. Right-click en `Application Pools` → `Add Application Pool`
3. Nombre: `UrbaniqPool`
4. .NET CLR Version: `No Managed Code` (para .NET 8)
5. Click OK

### **3. Crear Sitio Web**

1. Right-click en `Sites` → `Add Website`
2. Site name: `Urbaniq`
3. Application pool: `UrbaniqPool`
4. Physical path: `C:\Users\sprit\CascadeProjects\Urbaniq\Backend\Ecommerce.Api`
5. Port: `5000` (o el puerto que prefieras)
6. Click OK

### **4. Configurar IIS en Visual Studio**

1. Right-click en `Ecommerce.Api` → `Properties`
2. Ve a `Debug`
3. En "Profile" click en `New`
4. Nombre: `IIS Local`
5. Click en `Create`
6. En la nueva configuración:
   - Launch: `IIS`
   - App URL: `http://localhost:5000`
   - Launch browser: ✅
7. Click OK

### **5. Ejecutar**

1. En el dropdown de perfiles, selecciona `IIS Local`
2. Click en el botón Play

---

## 🖥️ **CONFIGURAR FRONTEND**

### **Opción A: Ejecutar Frontend por separado (Recomendado)**

1. Abre un terminal
2. Navega al frontend:
```bash
cd C:\Users\sprit\CascadeProjects\Urbaniq\Frontend
```
3. Instala dependencias:
```bash
npm install
```
4. Ejecuta:
```bash
npm run dev
```
5. Accede a: `http://localhost:5173`

### **Opción B: Integrar Frontend en Visual Studio**

**Método 1: Agregar proyecto existente**
1. Right-click en Solution → `Add` → `Existing Project`
2. Navega a `Frontend`
3. Selecciona `package.json` (Visual Studio lo reconocerá como proyecto Node.js)

**Método 2: Crear script de npm en Visual Studio**
1. Right-click en `Ecommerce.Api` → `Properties`
2. Ve a `Build Events` → `Post-build event`
3. Agrega:
```batch
cd $(SolutionDir)..\Frontend
npm run build
xcopy /E /I /Y dist "$(ProjectDir)wwwroot"
```

Esto buildará el frontend y lo copiará a `wwwroot` automáticamente.

---

## 🔍 **VERIFICACIÓN**

### **1. Probar Backend**

Abre el navegador:
- Swagger: `http://localhost:5000/swagger`
- Health check: `http://localhost:5000/health`
- Sitemap: `http://localhost:5000/sitemap.xml`

### **2. Probar Frontend**

Si frontend está corriendo separado:
- Frontend: `http://localhost:5173`

Si frontend está integrado:
- Frontend: `http://localhost:5000`

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Problema: "Port 5000 is already in use"**

**Solución:**
1. Cambiar puerto en `launchSettings.json`:
```json
"iisSettings": {
  "iisExpress": {
    "applicationUrl": "http://localhost:5001",
    "sslPort": 44301
  }
}
```

### **Problema: "403 Forbidden" en IIS**

**Solución:**
1. Abre IIS Manager
2. Right-click en el sitio → `Edit Permissions`
3. Pestaña `Security` → `Edit`
4. Agrega tu usuario con `Full Control`

### **Problema: "HTTP Error 500.19"**

**Solución:**
1. Verifica que el path físico sea correcto
2. Verifica que .NET 8 Runtime esté instalado
3. Ejecuta como administrador

### **Problema: Migraciones no funcionan**

**Solución:**
```powershell
# Desde Package Manager Console
Update-Database -StartupProject Ecommerce.Api -Verbose
```

### **Problema: Frontend no conecta con backend**

**Solución:**
1. Verifica que backend esté corriendo
2. Verifica CORS en `Program.cs`
3. Verifica URL en `Frontend/src/app/apiSlice.ts`

---

## 📊 **CONFIGURACIÓN DE DEBUG**

### **Breakpoints**

1. Abre cualquier archivo `.cs`
2. Click en el margen izquierdo para agregar breakpoint (punto rojo)
3. Ejecuta con Debug (▶ button)
4. La ejecución se detendrá en el breakpoint

### **Ver Variables**

1. Mientras estás en debug
2. Hover sobre variables para ver valores
3. Usa `Locals` window para ver todas las variables locales
4. Usa `Watch` window para agregar expresiones a monitorear

### **Output Window**

1. `View` → `Output`
2. Verás logs de la aplicación
3. Útil para debugging

---

## 🎯 **CHECKLIST**

- [ ] Solution abierta en Visual Studio
- [ ] Startup project configurado (Ecommerce.Api)
- [ ] appsettings.json configurado
- [ ] Migraciones ejecutadas
- [ ] IIS Express seleccionado como perfil
- [ ] Backend ejecutándose en http://localhost:5000
- [ ] Swagger accesible
- [ ] Frontend ejecutándose (separado o integrado)
- [ ] Frontend conecta con backend

---

## 🚀 **FLUJO COMPLETO DE PRUEBA**

1. **Abrir Visual Studio** → Abrir solution
2. **Configurar appsettings.json**
3. **Ejecutar migraciones** (Package Manager Console)
4. **Ejecutar con IIS Express** (▶ button)
5. **Verificar Swagger** en navegador
6. **Ejecutar Frontend** (npm run dev en terminal)
7. **Probar aplicación completa**

---

## 📝 **NOTAS ADICIONALES**

### **Hot Reload**
- Visual Studio soporta Hot Reload para cambios en tiempo real
- Cambios en código se aplican sin reiniciar

### **Publishing**
Para publicar en IIS de producción:
1. Right-click en `Ecommerce.Api` → `Publish`
2. Selecciona `IIS, FTP, etc.`
3. Configura los settings de destino
4. Click `Publish`

### **SQL Server Management Studio**
- Para ver la base de datos: abrir SSMS
- Conectar a `(localdb)\mssqllocaldb`
- Ver database `UrbaniqDb`

---

**¡Listo para ejecutar desde Visual Studio con IIS!** 🎉
