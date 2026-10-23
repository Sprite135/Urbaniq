# Urbaniq - Azure Key Vault Integration Guide

## 📋 Visión General

Azure Key Vault es un servicio seguro para almacenar y acceder a secrets, claves y certificados. Esta guía explica cómo integrar Key Vault con Urbaniq para producción.

---

## 🎯 Por qué usar Azure Key Vault?

### ✅ Beneficios:
- **Seguridad:** Secrets encriptados y control de acceso granular
- **Rotación automática:** Soporta rotación automática de secrets
- **Auditoría:** Logs de acceso a secrets
- **Centralización:** Un solo lugar para todos los secrets
- **Compliance:** Cumple con estándares de seguridad (SOC 2, ISO 27001, etc.)

### ❌ Sin Key Vault:
- Secrets en variables de entorno (visibles en logs)
- Secrets hardcodeados en código (riesgo de seguridad)
- Dificultad para rotar secrets
- Sin auditoría de acceso

---

## 🚀 Paso 1: Crear Azure Key Vault

### 1.1 Crear Key Vault
1. Ve al portal de Azure: https://portal.azure.com/
2. Busca "Key Vaults"
3. Crea un nuevo Key Vault
   - **Nombre:** `urbaniq-kv-{random}` (debe ser único globalmente)
   - **Resource Group:** `urbaniq-rg`
   - **Región:** Misma que tus otros recursos de Azure
   - **Pricing tier:** `Standard` (suficiente para la mayoría de casos)
   - **Soft delete:** Enabled (recomendado)
   - **Purge protection:** Enabled (recomendado)

### 1.2 Configurar Permisos de Acceso
1. En el Key Vault creado, ve a "Access configuration"
2. Elige "Vault access policy" (más simple para empezar)
3. Ve a "Access policies" → "Create"
4. Agrega permisos para tu aplicación:
   - **Secret permissions:** Get, List, Set, Delete
   - **Key permissions:** Get, List, Create, Delete
   - **Certificate permissions:** Get, List, Create, Delete

---

## 🔐 Paso 2: Agregar Secrets a Key Vault

### 2.1 Secrets para Database
```bash
# SQL Server Password
Nombre: SQL-Server-Password
Valor: Tu password fuerte de SQL Server
Tags: Environment=Production, Category=Database
```

### 2.2 Secrets para JWT
```bash
# JWT Secret Key
Nombre: JWT-Secret-Key
Valor: Tu JWT secret key (32+ caracteres)
Tags: Environment=Production, Category=Authentication
```

### 2.3 Secrets para Email
```bash
# Email SMTP Password
Nombre: Email-SMTP-Password
Valor: Tu password de SMTP
Tags: Environment=Production, Category=Email
```

### 2.4 Secrets para Stripe
```bash
# Stripe Secret Key
Nombre: Stripe-Secret-Key
Valor: sk_live_...
Tags: Environment=Production, Category=Payment

# Stripe Webhook Secret
Nombre: Stripe-Webhook-Secret
Valor: whsec_...
Tags: Environment=Production, Category=Payment
```

### 2.5 Secrets para Cloudinary
```bash
# Cloudinary API Secret
Nombre: Cloudinary-Api-Secret
Valor: Tu API secret de Cloudinary
Tags: Environment=Production, Category=Storage
```

### 2.6 Secrets para Admin
```bash
# Admin Password
Nombre: Admin-Password
Valor: Tu password de admin
Tags: Environment=Production, Category=Authentication
```

---

## 🔧 Paso 3: Integrar Key Vault con .NET

### 3.1 Agregar NuGet Package
```bash
cd Backend/Ecommerce.Api
dotnet add package Azure.Identity
dotnet add package Azure.Security.KeyVault.Secrets
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
```

### 3.2 Configurar Program.cs
Agrega este código después de `builder.Host.UseSerilog(...)`:

```csharp
// ===================== Azure Key Vault Integration =====================
if (builder.Environment.IsProduction())
{
    try
    {
        var keyVaultUrl = builder.Configuration["KeyVault:VaultUri"];
        if (!string.IsNullOrWhiteSpace(keyVaultUrl))
        {
            var secretClient = new SecretClient(
                new Uri(keyVaultUrl),
                new DefaultAzureCredential());

            builder.Configuration.AddAzureKeyVault(secretClient, new KeyVaultSecretManager());
        }
    }
    catch (Exception ex)
    {
        // Log warning but don't fail startup if Key Vault is not available
        builder.Logging.AddConsole();
        builder.Logging.CreateLogger<Program>().LogWarning(
            "Azure Key Vault not configured or not accessible: {Message}", ex.Message);
    }
}
```

### 3.3 Agregar Configuración a appsettings.Production.json
```json
{
  "KeyVault": {
    "VaultUri": "https://urbaniq-kv-{random}.vault.azure.net/"
  }
}
```

---

## 🔐 Paso 4: Configurar Managed Identity

### 4.1 Habilitar Managed Identity en App Service
1. Ve al Web App de backend en Azure
2. En "Settings", ve a "Identity"
3. En "System assigned", cambia "Status" a "On"
4. Click "Save"

### 4.2 Dar permisos al Managed Identity
1. Ve al Key Vault
2. En "Access policies", crea una nueva policy
3. En "Principal", busca el nombre del Web App
4. Agrega permisos de secrets (Get, List)
5. Click "Create"

---

## 🔄 Paso 5: Usar Secrets en la Aplicación

### 5.1 Acceder a Secrets desde Configuration
Los secrets de Key Vault estarán disponibles automáticamente en `IConfiguration`:

```csharp
public class MyService
{
    private readonly IConfiguration _configuration;

    public MyService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetJwtSecret()
    {
        // Esto buscará en Key Vault primero, luego en appsettings
        return _configuration["JWT-Secret-Key"];
    }
}
```

### 5.2 Mapear a Configuración Existente
Los secrets de Key Vault pueden tener el mismo nombre que las variables de entorno:

```csharp
// En Program.cs
builder.Services.Configure<JwtSettings>(options =>
{
    options.SecretKey = _configuration["JWT-Secret-Key"]
                        ?? _configuration["JwtSettings:SecretKey"];
    options.Issuer = _configuration["JWT-Issuer"]
                    ?? _configuration["JwtSettings:Issuer"];
    options.Audience = _configuration["JWT-Audience"]
                     ?? _configuration["JwtSettings:Audience"];
});
```

---

## 🧪 Paso 6: Probar la Integración

### 6.1 Probar Localmente con Azure CLI
```bash
# Login a Azure
az login

# Verificar que puedes acceder al Key Vault
az keyvault secret show --vault-name urbaniq-kv-{random} --name JWT-Secret-Key
```

### 6.2 Probar en Azure
1. Revisa los logs del Web App
2. Busca mensajes de "Azure Key Vault"
3. Verifica que no haya errores de autenticación
4. Verifica que la aplicación pueda acceder a los secrets

---

## 📊 Paso 7: Monitoring y Auditoría

### 7.1 Habilitar Diagnostic Settings
1. Ve al Key Vault
2. En "Monitoring", ve a "Diagnostic settings"
3. Crea un nuevo diagnostic setting
4. Envía logs a:
   - Azure Storage Account
   - Azure Log Analytics Workspace
   - Event Hub

### 7.2 Ver Logs de Acceso
```bash
# Usar Azure CLI
az keyvault list-deleted --resource-group urbaniq-rg
az keyvault show --name urbaniq-kv-{random}
```

---

## 🔄 Paso 8: Rotación de Secrets

### 8.1 Rotación Manual
```bash
# Actualizar secret en Key Vault
az keyvault secret set --vault-name urbaniq-kv-{random} --name JWT-Secret-Key --value "new-secret-key"

# La aplicación automáticamente leerá el nuevo valor en el próximo reinicio
```

### 8.2 Rotación Automática (Avanzado)
Configurar Azure Key Vault para rotación automática:
1. Ve al secret específico
2. En "Set expiration", configura la fecha de expiración
3. Crea una Azure Function para rotar el secret automáticamente
4. Configura el secret para usar Azure Key Vault references

---

## 🚨 Troubleshooting

### Error: "Access denied"
- Verifica que el Managed Identity tenga permisos
- Verifica que la access policy esté configurada correctamente
- Espera unos minutos para que los permisos se propaguen

### Error: "Key Vault not found"
- Verifica el nombre del Key Vault en la configuración
- Verifica que el Key Vault exista
- Verifica que la URI sea correcta

### Error: "Secret not found"
- Verifica que el secret exista en el Key Vault
- Verifica el nombre exacto del secret (case-sensitive)
- Verifica que el secret no esté en "soft delete"

### Error: "Authentication failed"
- Verifica que el Managed Identity esté habilitado
- Verifica que la aplicación esté en Azure (no local)
- Para pruebas locales, usa Azure CLI credentials

---

## 💰 Costos

| Servicio | Costo | Detalles |
|----------|-------|----------|
| Azure Key Vault (Standard) | S/ 5-10/mes | 10,000 operaciones/mes gratis |
| Operaciones adicionales | S/ 0.006/10,000 ops | Más allá del límite gratuito |
| Managed Identity | Gratis | Sin costo adicional |

**Costo total estimado:** S/ 5-15/mes

---

## 🎯 Best Practices

### ✅ DO:
- ✅ Usar Managed Identity en lugar de service principals
- ✅ Habilitar soft delete y purge protection
- ✅ Configurar diagnostic settings para auditoría
- ✅ Usar tags para organizar secrets
- ✅ Rotar secrets regularmente
- ✅ Limitar permisos al mínimo necesario

### ❌ DON'T:
- ❌ Hardcodear secrets en el código
- ❌ Compartir secrets por email o chat
- ❌ Usar el mismo secret para múltiples propósitos
- ❌ Deshabilitar soft delete
- ❌ Dar permisos excesivos

---

## 📋 Checklist de Implementación

- [ ] Key Vault creado en Azure
- [ ] Managed Identity habilitado en App Service
- [ ] Access policies configuradas
- [ ] Secrets agregados al Key Vault
- [ ] Paquetes NuGet agregados al proyecto
- [ ] Código de integración agregado a Program.cs
- [ ] Configuración agregada a appsettings.Production.json
- [ ] Pruebas locales completadas
- [ ] Pruebas en Azure completadas
- [ ] Diagnostic settings configurados
- [ ] Proceso de rotación de secrets definido

---

## 🎯 Recursos Adicionales

- [Documentación de Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/azure/key-vault/general/best-practices)
- [Azure Key Vault Pricing](https://azure.microsoft.com/pricing/details/key-vault/)
- [.NET Azure Key Vault Client](https://docs.microsoft.com/dotnet/api/azure.security.keyvault.secrets?view=azure-dotnet)
