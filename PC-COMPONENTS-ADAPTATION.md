# UrbanIQ - Adaptación para Componentes de PC

Este documento describe la adaptación del proyecto UrbanIQ para vender componentes de PC en lugar de ropa.

## 📋 Cambios Realizados

### 1. Nueva Entidad: PcSpecification

**Archivo:** `Backend/Ecommerce.Domain/Entities/PcSpecification.cs`

Sistema de especificaciones dinámicas para componentes de PC:
- `SpecKey` - Nombre de la especificación (Socket, Cores, TDP, VRAM, etc.)
- `SpecValue` - Valor de la especificación (AM5, 8, 120W, 24GB, etc.)
- `DataType` - Tipo de dato para validación (String, Number, Boolean)
- `DisplayOrder` - Orden de visualización en UI
- `IsRequired` - Si la especificación es obligatoria para la categoría

### 2. Modificaciones al Schema

**Archivos modificados:**
- `Backend/Ecommerce.Domain/Entities/Product.cs` - Añadido `Specifications` navigation property
- `Backend/Ecommerce.Infrastructure/Data/AppDbContext.cs` - Añadido `DbSet<PcSpecification>`
- `Backend/Ecommerce.Infrastructure/Configurations/PcSpecificationConfiguration.cs` - Configuración EF Core

### 3. Migración de Base de Datos

**Migración creada:** `AddPcSpecifications`

Esta migración añade la tabla `PcSpecifications` con:
- Índice único compuesto (ProductId + SpecKey)
- Índices para filtrado por SpecKey y SpecValue
- Relación cascade con Product

### 4. Seed Data para Componentes PC

**Archivo:** `Backend/Ecommerce.Infrastructure/Data/PcComponentsSeeder.cs`

Categorías creadas:
- CPU
- GPU
- RAM
- Motherboard
- PSU
- Storage
- Cooling
- PC Case

Productos de ejemplo:
- AMD Ryzen 7 7800X3D (con especificaciones: Socket AM5, 8 Cores, 16 Threads, 120W TDP)
- Intel Core i9-14900K (con especificaciones: Socket LGA1700, 24 Cores, 32 Threads, 125W TDP)
- NVIDIA GeForce RTX 4090 (con especificaciones: 24GB VRAM, GDDR6X, 450W TDP)

## 🚀 Cómo Usar

### Prerrequisitos
- SQL Server instalado (o LocalDB)
- .NET SDK 8.0+
- Node.js 20+ (para el frontend)

### Configuración

1. **Configurar conexión a base de datos:**

   Crear `Backend/Ecommerce.Api/appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=EcommerceDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;Encrypt=False"
     },
     "Jwt": {
       "Issuer": "https://localhost:7078",
       "Audience": "https://localhost:7078",
       "Key": "YOUR_SECRET_KEY_MINIMUM_32_CHARACTERS"
     }
   }
   ```

2. **Ejecutar migraciones:**
   ```bash
   dotnet ef database update --project Backend/Ecommerce.Infrastructure --startup-project Backend/Ecommerce.Api
   ```

3. **Ejecutar seed de componentes PC:**

   Modificar `Backend/Ecommerce.Api/Program.cs` para llamar al seed:
   ```csharp
   // En el método Main o Configure
   using (var scope = app.Services.CreateScope())
   {
       await DbSeeder.SeedPcComponentsAsync(scope.ServiceProvider);
   }
   ```

   O ejecutar manualmente desde una herramienta de base de datos:
   ```bash
   # O usar el método DbSeeder.SeedPcComponentsAsync desde tu código
   ```

## 📊 Especificaciones por Categoría

### CPU
- Socket (AM4, AM5, LGA1700)
- Cores (6, 8, 12, 16, 24)
- Threads (12, 16, 24, 32)
- Base Clock (GHz)
- Boost Clock (GHz)
- TDP (Watts)
- Generation (Ryzen 7000, Intel 13th/14th)
- Integrated Graphics (Yes/No)

### GPU
- VRAM (8GB, 12GB, 16GB, 24GB)
- Memory Type (GDDR6, GDDR6X)
- CUDA/Stream Processors
- Base Clock (MHz)
- Boost Clock (MHz)
- TDP (Watts)
- Interface (PCIe 4.0, PCIe 5.0)
- Length (mm)

### RAM
- Capacity (8GB, 16GB, 32GB, 64GB)
- Speed (MHz) (3200, 3600, 4800, 6000+)
- RAM Type (DDR4, DDR5)
- CAS Latency (CL14, CL16, CL30, CL36)
- Modules (1x8GB, 2x16GB, 2x32GB)

### Motherboard
- Socket (AM4, AM5, LGA1700)
- Chipset (B650, X670, Z790, B760)
- Form Factor (ATX, Micro-ATX, ITX)
- RAM Slots (2, 4)
- Max RAM Speed
- PCIe Slots
- M.2 Slots

### PSU
- Wattage (550W, 650W, 750W, 850W, 1000W+)
- Efficiency Rating (80+ Bronze, Gold, Platinum)
- Modular (Non, Semi, Full)
- Connectors

### Storage
- Capacity (usando atributo compartido)
- Storage Type (NVMe SSD, SATA SSD, HDD)
- Form Factor (M.2, 2.5", 3.5")
- Read Speed (MB/s)
- Write Speed (MB/s)

### Cooling
- Cooling Type (Air Cooler, AIO Liquid, Custom Loop)
- Fan Size (120mm, 140mm, 240mm, 360mm)
- RGB (Yes/No)

### PC Cases
- Form Factor (ATX Full Tower, ATX Mid Tower, Micro-ATX, Mini-ITX)
- Size

## 🔧 Modificaciones Adicionales Necesarias

### Backend

1. **Añadir endpoints para especificaciones PC:**
   - GET `/api/products/{id}/specifications` - Obtener especificaciones de un producto
   - POST `/api/products/{id}/specifications` - Añadir especificación
   - PUT `/api/products/{id}/specifications/{specId}` - Actualizar especificación
   - DELETE `/api/products/{id}/specifications/{specId}` - Eliminar especificación

2. **Modificar DTOs de Product:**
   - Añadir `Specifications` a `ProductDto`
   - Crear `PcSpecificationDto`

### Frontend

1. **Componentes de especificaciones:**
   - Crear componente para mostrar especificaciones dinámicas
   - Crear formulario para añadir/editar especificaciones en admin

2. **Filtros de búsqueda:**
   - Implementar filtros por especificaciones (Socket, TDP, etc.)
   - Crear filtros específicos por categoría

## 📝 Ejemplo de Uso

### Crear producto CPU con especificaciones

```csharp
var product = new Product
{
    ProductName = "AMD Ryzen 7 7800X3D",
    SKU = "CPU-AMD-7800X3D",
    Slug = "amd-ryzen-7-7800x3d",
    Quantity = 25,
    Price = 449.99m,
    Description = "8-core, 16-thread gaming processor",
    CategoryId = cpuCategoryId
};

context.Products.Add(product);
await context.SaveChangesAsync();

var specs = new List<PcSpecification>
{
    new PcSpecification { ProductId = product.Id, SpecKey = "Socket", SpecValue = "AM5", DataType = "String", DisplayOrder = 1 },
    new PcSpecification { ProductId = product.Id, SpecKey = "Cores", SpecValue = "8", DataType = "Number", DisplayOrder = 2 },
    new PcSpecification { ProductId = product.Id, SpecKey = "TDP", SpecValue = "120W", DataType = "String", DisplayOrder = 3 }
};

context.PcSpecifications.AddRange(specs);
await context.SaveChangesAsync();
```

## ⚠️ Notas Importantes

1. **Migración:** La migración `AddPcSpecifications` ya está creada. Solo necesitas ejecutarla.

2. **Seed Data:** El seed de componentes PC es idempotente - se puede ejecutar múltiples veces sin duplicados.

3. **Compatibilidad con ropa original:** El schema original de ropa (Size, Color, Material) sigue existiendo. Puedes tener ambos tipos de productos si lo deseas.

4. **Imágenes:** Los productos de ejemplo usan URLs placeholder de Cloudinary. Necesitas configurar Cloudinary y subir imágenes reales.

5. **Frontend:** El frontend React necesita modificaciones para mostrar y gestionar las especificaciones PC.

## 🎯 Próximos Pasos

1. Configurar Cloudinary para imágenes reales
2. Implementar endpoints API para especificaciones
3. Modificar frontend React para mostrar especificaciones
4. Crear filtros de búsqueda por especificaciones
5. Implementar sistema de compatibilidad (opcional)

## 📞 Recursos

- **Repositorio original:** https://github.com/MuhammedRiyasB/Urbaniq
- **Live Demo:** https://urbaniq.ddnsking.com
- **API Swagger:** https://urbaniq.ddns.net/swagger
