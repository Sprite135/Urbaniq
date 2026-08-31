using Ecommerce.Application.Common.ProductOptions;
using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Text.RegularExpressions;

namespace Ecommerce.Infrastructure.Data
{
    /// <summary>
    /// Seeder for PC component categories and products with specifications.
    /// </summary>
    public static class PcComponentsSeeder
    {
        private const string DefaultSize = "Standard";
        private const string DefaultColor = "Default";
        // Delivery is zone-based (Lima Metropolitana / Provincias) for Peru; zones are optional.
        private const string DefaultDeliverableZones = "";
        private const string AmdRyzen7800X3DImage = "/product-images/amd-ryzen-7-7800x3d.svg";
        private const string IntelCoreI914900KImage = "/product-images/intel-core-i9-14900k.svg";
        private const string Rtx4090Image = "/product-images/rtx-4090.svg";

        // Category illustrations (served from Frontend/dist/product-images)
        private const string CpuImage = "/product-images/cpu.svg";
        private const string GpuImage = "/product-images/gpu.svg";
        private const string RamImage = "/product-images/ram.svg";
        private const string MotherboardImage = "/product-images/motherboard.svg";
        private const string PsuImage = "/product-images/psu.svg";
        private const string StorageImage = "/product-images/storage.svg";
        private const string CoolingImage = "/product-images/cooling.svg";
        private const string CaseImage = "/product-images/pc-case.svg";
        private const string PlaceholderImage = "/product-images/placeholder.svg";

        private static readonly string[] PcCategorySlugs =
        [
            "cpu",
            "gpu",
            "ram",
            "motherboard",
            "psu",
            "storage",
            "cooling",
            "pc-case"
        ];

        public static async Task SeedPcComponentsAsync(AppDbContext context, string? contentRootPath = null)
        {
            // Ensure the full category set exists (idempotent; adds new categories without duplicating).
            await EnsureCategoriesExistAsync(context);

            // Check if PC categories already exist
            if (await context.Categories.AnyAsync(c => c.CategoryName == "CPU"))
            {
                await EnsurePcProductsArePurchasableAsync(context);
                await EnsureExtraProductsAsync(context);
                await EnsureProductsFromImagesAsync(context, contentRootPath);
                await EnsureDemoOffersAsync(context);
                Console.WriteLine("PC components already seeded. Skipping full reseed.");
                return;
            }

            Console.WriteLine("Seeding PC components...");

            // Create PC Component Categories
            var cpuCategory = new Category
            {
                CategoryName = "CPU",
                Slug = "cpu",
                Description = "Central Processing Units for desktop and gaming PCs",
                ImageUrl = null,
                DisplayOrder = 1,
                IsActive = true,
                ParentCategoryId = null
            };

            var gpuCategory = new Category
            {
                CategoryName = "GPU",
                Slug = "gpu",
                Description = "Graphics Processing Units for gaming and professional work",
                ImageUrl = null,
                DisplayOrder = 2,
                IsActive = true,
                ParentCategoryId = null
            };

            var ramCategory = new Category
            {
                CategoryName = "RAM",
                Slug = "ram",
                Description = "System memory modules for high-performance computing",
                ImageUrl = null,
                DisplayOrder = 3,
                IsActive = true,
                ParentCategoryId = null
            };

            var motherboardCategory = new Category
            {
                CategoryName = "Motherboard",
                Slug = "motherboard",
                Description = "Main circuit boards for PC builds",
                ImageUrl = null,
                DisplayOrder = 4,
                IsActive = true,
                ParentCategoryId = null
            };

            var psuCategory = new Category
            {
                CategoryName = "PSU",
                Slug = "psu",
                Description = "Power supply units for stable power delivery",
                ImageUrl = null,
                DisplayOrder = 5,
                IsActive = true,
                ParentCategoryId = null
            };

            var storageCategory = new Category
            {
                CategoryName = "Storage",
                Slug = "storage",
                Description = "SSDs, HDDs, and other storage solutions",
                ImageUrl = null,
                DisplayOrder = 6,
                IsActive = true,
                ParentCategoryId = null
            };

            var coolingCategory = new Category
            {
                CategoryName = "Cooling",
                Slug = "cooling",
                Description = "CPU coolers, case fans, and thermal solutions",
                ImageUrl = null,
                DisplayOrder = 7,
                IsActive = true,
                ParentCategoryId = null
            };

            var caseCategory = new Category
            {
                CategoryName = "PC Case",
                Slug = "pc-case",
                Description = "Computer cases and chassis for builds",
                ImageUrl = null,
                DisplayOrder = 8,
                IsActive = true,
                ParentCategoryId = null
            };

            context.Categories.AddRange(cpuCategory, gpuCategory, ramCategory, motherboardCategory, 
                                       psuCategory, storageCategory, coolingCategory, caseCategory);
            await context.SaveChangesAsync();

            // Create CPU Products
            var amd7800X3D = new Product
            {
                ProductName = "AMD Ryzen 7 7800X3D",
                SKU = "CPU-AMD-7800X3D",
                Slug = "amd-ryzen-7-7800x3d",
                Quantity = 25,
                Price = 449.99m,
                Discount = 0m,
                TotalSold = 0,
                Description = "8-core, 16-thread gaming processor with 3D V-Cache technology",
                Image = AmdRyzen7800X3DImage,
                Size = DefaultSize,
                Color = DefaultColor,
                AvailableSizes = DefaultSize,
                AvailableColors = DefaultColor,
                DeliverableZones = DefaultDeliverableZones,
                Material = null,
                CategoryId = cpuCategory.CategoryId,
                SubCategoryId = null,
                Variants = [CreateDefaultVariant("CPU-AMD-7800X3D", 25)]
            };

            var intel14900K = new Product
            {
                ProductName = "Intel Core i9-14900K",
                SKU = "CPU-INT-14900K",
                Slug = "intel-core-i9-14900k",
                Quantity = 15,
                Price = 589.99m,
                Discount = 0m,
                TotalSold = 0,
                Description = "24-core, 32-thread flagship processor for enthusiasts",
                Image = IntelCoreI914900KImage,
                Size = DefaultSize,
                Color = DefaultColor,
                AvailableSizes = DefaultSize,
                AvailableColors = DefaultColor,
                DeliverableZones = DefaultDeliverableZones,
                Material = null,
                CategoryId = cpuCategory.CategoryId,
                SubCategoryId = null,
                Variants = [CreateDefaultVariant("CPU-INT-14900K", 15)]
            };

            context.Products.AddRange(amd7800X3D, intel14900K);
            await context.SaveChangesAsync();

            // Add CPU Specifications
            var amdSpecs = new List<PcSpecification>
            {
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Socket", SpecValue = "AM5", DataType = "String", DisplayOrder = 1, IsRequired = true },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Cores", SpecValue = "8", DataType = "Number", DisplayOrder = 2, IsRequired = true },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Threads", SpecValue = "16", DataType = "Number", DisplayOrder = 3, IsRequired = true },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Base Clock", SpecValue = "4.2 GHz", DataType = "String", DisplayOrder = 4, IsRequired = false },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Boost Clock", SpecValue = "5.0 GHz", DataType = "String", DisplayOrder = 5, IsRequired = false },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "TDP", SpecValue = "120W", DataType = "String", DisplayOrder = 6, IsRequired = true },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Generation", SpecValue = "Ryzen 7000", DataType = "String", DisplayOrder = 7, IsRequired = false },
                new PcSpecification { ProductId = amd7800X3D.Id, SpecKey = "Integrated Graphics", SpecValue = "No", DataType = "Boolean", DisplayOrder = 8, IsRequired = false }
            };

            var intelSpecs = new List<PcSpecification>
            {
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "Socket", SpecValue = "LGA1700", DataType = "String", DisplayOrder = 1, IsRequired = true },
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "Cores", SpecValue = "24", DataType = "Number", DisplayOrder = 2, IsRequired = true },
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "Threads", SpecValue = "32", DataType = "Number", DisplayOrder = 3, IsRequired = true },
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "TDP", SpecValue = "125W", DataType = "String", DisplayOrder = 4, IsRequired = true },
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "Generation", SpecValue = "Intel 14th Gen", DataType = "String", DisplayOrder = 5, IsRequired = false },
                new PcSpecification { ProductId = intel14900K.Id, SpecKey = "Integrated Graphics", SpecValue = "Yes", DataType = "Boolean", DisplayOrder = 6, IsRequired = false }
            };

            context.PcSpecifications.AddRange(amdSpecs);
            context.PcSpecifications.AddRange(intelSpecs);
            await context.SaveChangesAsync();

            // Create GPU Products
            var rtx4090 = new Product
            {
                ProductName = "NVIDIA GeForce RTX 4090",
                SKU = "GPU-NV-RTX4090",
                Slug = "nvidia-geforce-rtx-4090",
                Quantity = 10,
                Price = 1599.99m,
                Discount = 0m,
                TotalSold = 0,
                Description = "24GB GDDR6X flagship graphics card for 4K gaming",
                Image = Rtx4090Image,
                Size = DefaultSize,
                Color = DefaultColor,
                AvailableSizes = DefaultSize,
                AvailableColors = DefaultColor,
                DeliverableZones = DefaultDeliverableZones,
                Material = null,
                CategoryId = gpuCategory.CategoryId,
                SubCategoryId = null,
                Variants = [CreateDefaultVariant("GPU-NV-RTX4090", 10)]
            };

            context.Products.Add(rtx4090);
            await context.SaveChangesAsync();

            var gpuSpecs = new List<PcSpecification>
            {
                new PcSpecification { ProductId = rtx4090.Id, SpecKey = "VRAM", SpecValue = "24GB", DataType = "String", DisplayOrder = 1, IsRequired = true },
                new PcSpecification { ProductId = rtx4090.Id, SpecKey = "Memory Type", SpecValue = "GDDR6X", DataType = "String", DisplayOrder = 2, IsRequired = true },
                new PcSpecification { ProductId = rtx4090.Id, SpecKey = "TDP", SpecValue = "450W", DataType = "String", DisplayOrder = 3, IsRequired = true },
                new PcSpecification { ProductId = rtx4090.Id, SpecKey = "Interface", SpecValue = "PCIe 4.0", DataType = "String", DisplayOrder = 4, IsRequired = true }
            };

            context.PcSpecifications.AddRange(gpuSpecs);
            await context.SaveChangesAsync();

            // ---- Expand the catalog with representative products per category ----
            var extraProducts = new List<Product>
            {
                // CPUs
                MakeProduct("AMD Ryzen 5 7600X", "CPU-AMD-7600X", "amd-ryzen-5-7600x", 229.99m, 30, "6-core gaming processor with 3D V-Cache", cpuCategory.CategoryId, CpuImage),
                MakeProduct("AMD Ryzen 9 7950X", "CPU-AMD-7950X", "amd-ryzen-9-7950x", 699.99m, 12, "16-core flagship for creators and gamers", cpuCategory.CategoryId, CpuImage),
                MakeProduct("Intel Core i5-14600K", "CPU-INT-14600K", "intel-core-i5-14600k", 319.99m, 28, "14-core balanced processor", cpuCategory.CategoryId, CpuImage),
                MakeProduct("Intel Core i7-14700K", "CPU-INT-14700K", "intel-core-i7-14700k", 409.99m, 20, "20-core high-performance processor", cpuCategory.CategoryId, CpuImage),
                // GPUs
                MakeProduct("NVIDIA GeForce RTX 4080 SUPER", "GPU-NV-RTX4080S", "nvidia-rtx-4080-super", 999.99m, 14, "16GB GDDR6X graphics card for 4K gaming", gpuCategory.CategoryId, GpuImage),
                MakeProduct("NVIDIA GeForce RTX 4070 Ti", "GPU-NV-RTX4070TI", "nvidia-rtx-4070-ti", 799.99m, 18, "12GB GDDR6X graphics card", gpuCategory.CategoryId, GpuImage),
                MakeProduct("AMD Radeon RX 7900 XTX", "GPU-AMD-7900XTX", "amd-radeon-rx-7900-xtx", 949.99m, 16, "24GB GDDR6 graphics card", gpuCategory.CategoryId, GpuImage),
                MakeProduct("AMD Radeon RX 7800 XT", "GPU-AMD-7800XT", "amd-radeon-rx-7800-xt", 499.99m, 22, "16GB GDDR6 graphics card", gpuCategory.CategoryId, GpuImage),
                // RAM
                MakeProduct("Corsair Vengeance 32GB DDR5", "RAM-COR-32D5", "corsair-vengeance-32gb-ddr5", 119.99m, 40, "2x16GB DDR5-6000 memory kit", ramCategory.CategoryId, RamImage),
                MakeProduct("G.Skill Trident Z5 64GB DDR5", "RAM-GSK-64D5", "gskill-trident-z5-64gb-ddr5", 219.99m, 25, "2x32GB DDR5-6400 memory kit", ramCategory.CategoryId, RamImage),
                MakeProduct("Kingston Fury 16GB DDR4", "RAM-KIN-16D4", "kingston-fury-16gb-ddr4", 39.99m, 60, "2x8GB DDR4-3200 memory kit", ramCategory.CategoryId, RamImage),
                MakeProduct("Crucial Ballistix 32GB DDR4", "RAM-CRU-32D4", "crucial-ballistix-32gb-ddr4", 89.99m, 35, "2x16GB DDR4-3600 memory kit", ramCategory.CategoryId, RamImage),
                // Motherboards
                MakeProduct("ASUS ROG STRIX B650-E", "MB-ASU-B650E", "asus-rog-strix-b650-e", 259.99m, 18, "AM5 ATX motherboard for Ryzen 7000", motherboardCategory.CategoryId, MotherboardImage),
                MakeProduct("MSI MAG Z790 TOMAHAWK", "MB-MSI-Z790", "msi-mag-z790-tomahawk", 289.99m, 16, "LGA1700 ATX motherboard for Intel 13/14th Gen", motherboardCategory.CategoryId, MotherboardImage),
                MakeProduct("Gigabyte B550 AORUS", "MB-GIG-B550", "gigabyte-b550-aorus", 169.99m, 22, "AM4 ATX motherboard", motherboardCategory.CategoryId, MotherboardImage),
                MakeProduct("ASRock B760M Steel Legend", "MB-ASR-B760M", "asrock-b760m-steel-legend", 149.99m, 24, "LGA1700 mATX motherboard", motherboardCategory.CategoryId, MotherboardImage),
                // PSU
                MakeProduct("Corsair RM850x 850W", "PSU-COR-850", "corsair-rm850x-850w", 139.99m, 30, "80+ Gold fully modular power supply", psuCategory.CategoryId, PsuImage),
                MakeProduct("Seasonic Focus GX-750", "PSU-SEA-750", "seasonic-focus-gx-750", 119.99m, 28, "80+ Gold modular power supply", psuCategory.CategoryId, PsuImage),
                MakeProduct("EVGA 1000 GQ", "PSU-EVG-1000", "evga-1000-gq", 159.99m, 20, "80+ Gold 1000W power supply", psuCategory.CategoryId, PsuImage),
                // Storage
                MakeProduct("Samsung 990 PRO 2TB NVMe", "ST-SAM-990P2T", "samsung-990-pro-2tb-nvme", 179.99m, 40, "PCIe 4.0 NVMe SSD 2TB", storageCategory.CategoryId, StorageImage),
                MakeProduct("WD Black SN850X 1TB", "ST-WD-SN850X1T", "wd-black-sn850x-1tb", 99.99m, 50, "PCIe 4.0 NVMe SSD 1TB", storageCategory.CategoryId, StorageImage),
                MakeProduct("Crucial MX500 1TB SATA", "ST-CRU-MX500", "crucial-mx500-1tb-sata", 79.99m, 45, "2.5\" SATA SSD 1TB", storageCategory.CategoryId, StorageImage),
                MakeProduct("Seagate BarraCuda 4TB HDD", "ST-SEA-4THDD", "seagate-barracuda-4tb-hdd", 89.99m, 30, "7200RPM desktop hard drive 4TB", storageCategory.CategoryId, StorageImage),
                // Cooling
                MakeProduct("Noctua NH-D15", "COO-NOCT-D15", "noctua-nh-d15", 109.99m, 25, "Dual-tower air CPU cooler", coolingCategory.CategoryId, CoolingImage),
                MakeProduct("Cooler Master Hyper 212", "COO-CM-212", "cooler-master-hyper-212", 44.99m, 40, "Single-tower air CPU cooler", coolingCategory.CategoryId, CoolingImage),
                MakeProduct("Corsair iCUE H150i AIO", "COO-COR-H150I", "corsair-icue-h150i-aio", 189.99m, 18, "360mm liquid CPU cooler", coolingCategory.CategoryId, CoolingImage),
                MakeProduct("Arctic Liquid Freezer II 280", "COO-ARC-280", "arctic-liquid-freezer-ii-280", 119.99m, 22, "280mm liquid CPU cooler", coolingCategory.CategoryId, CoolingImage),
                // Cases
                MakeProduct("Lian Li O11 Dynamic", "CASE-LIAN-O11", "lian-li-o11-dynamic", 149.99m, 20, "Tempered glass ATX mid-tower", caseCategory.CategoryId, CaseImage),
                MakeProduct("NZXT H7 Flow", "CASE-NZXT-H7", "nzxt-h7-flow", 129.99m, 22, "High-airflow ATX mid-tower", caseCategory.CategoryId, CaseImage),
                MakeProduct("Fractal North", "CASE-FRA-NORTH", "fractal-north", 139.99m, 18, "Wood-accent ATX mid-tower", caseCategory.CategoryId, CaseImage),
                MakeProduct("Cooler Master NR200", "CASE-CM-NR200", "cooler-master-nr200", 99.99m, 26, "Compact mini-ITX tower", caseCategory.CategoryId, CaseImage),
            };

            context.Products.AddRange(extraProducts);
            await context.SaveChangesAsync();

            // Backfill real product photos from the bundled image assets.
            await EnsureProductsFromImagesAsync(context, contentRootPath);

            Console.WriteLine("PC components seeded successfully!");
        }

        private static async Task EnsurePcProductsArePurchasableAsync(AppDbContext context)
        {
            var pcCategoryIds = await context.Categories
                .Where(category => PcCategorySlugs.Contains(category.Slug))
                .Select(category => category.CategoryId)
                .ToListAsync();

            if (pcCategoryIds.Count == 0)
            {
                return;
            }

            var products = await context.Products
                .Include(product => product.Variants)
                .Include(product => product.Category)
                .Where(product => pcCategoryIds.Contains(product.CategoryId))
                .ToListAsync();

            var changed = false;
            foreach (var product in products)
            {
                if (product.Variants.Count == 0)
                {
                    product.Variants.Add(CreateDefaultVariant(product.SKU, product.Quantity));
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(product.AvailableSizes))
                {
                    product.AvailableSizes = DefaultSize;
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(product.AvailableColors))
                {
                    product.AvailableColors = DefaultColor;
                    changed = true;
                }

                if (ProductOptionParser.ParseDeliveryCodes(product.DeliverableZones).Count == 0)
                {
                    product.DeliverableZones = DefaultDeliverableZones;
                    changed = true;
                }

                // Assign a category illustration when the product has no real image.
                if (IsPlaceholderImage(product.Image))
                {
                    product.Image = CategoryImage(product.Category?.Slug);
                    changed = true;
                }
            }

            if (changed)
            {
                await context.SaveChangesAsync();
                Console.WriteLine("PC component products repaired with default variants and delivery pincodes.");
            }
        }

        private static ProductVariant CreateDefaultVariant(string sku, int quantity) =>
            new()
            {
                SKU = $"{sku}-STD",
                Size = DefaultSize,
                Color = DefaultColor,
                Quantity = quantity
            };

        private static Product MakeProduct(
            string name, string sku, string slug, decimal price, int qty, string desc,
            int categoryId, string image) =>
            new()
            {
                ProductName = name,
                SKU = sku,
                Slug = slug,
                Quantity = qty,
                Price = price,
                Discount = 0m,
                TotalSold = 0,
                Description = desc,
                Image = image,
                Size = DefaultSize,
                Color = DefaultColor,
                AvailableSizes = DefaultSize,
                AvailableColors = DefaultColor,
                DeliverableZones = DefaultDeliverableZones,
                Material = null,
                CategoryId = categoryId,
                SubCategoryId = null,
                Variants = [CreateDefaultVariant(sku, qty)]
            };

        private static string? GetLocalProductImage(string sku) =>
            sku switch
            {
                "CPU-AMD-7800X3D" => AmdRyzen7800X3DImage,
                "CPU-INT-14900K" => IntelCoreI914900KImage,
                "GPU-NV-RTX4090" => Rtx4090Image,
                _ => null
            };

        /// <summary>Ensures the expanded catalog exists (idempotent by SKU). Safe to call on every startup.</summary>
        private static async Task EnsureExtraProductsAsync(AppDbContext context)
        {
            var categoryIds = await context.Categories.ToDictionaryAsync(c => c.Slug.ToLowerInvariant(), c => c.CategoryId);
            var existingSkus = new HashSet<string>(await context.Products.Select(p => p.SKU).ToListAsync());

            var extras = new List<Product>
            {
                MakeProduct("AMD Ryzen 5 7600X", "CPU-AMD-7600X", "amd-ryzen-5-7600x", 229.99m, 30, "6-core gaming processor with 3D V-Cache", categoryIds["cpu"], CpuImage),
                MakeProduct("AMD Ryzen 9 7950X", "CPU-AMD-7950X", "amd-ryzen-9-7950x", 699.99m, 12, "16-core flagship for creators and gamers", categoryIds["cpu"], CpuImage),
                MakeProduct("Intel Core i5-14600K", "CPU-INT-14600K", "intel-core-i5-14600k", 319.99m, 28, "14-core balanced processor", categoryIds["cpu"], CpuImage),
                MakeProduct("Intel Core i7-14700K", "CPU-INT-14700K", "intel-core-i7-14700k", 409.99m, 20, "20-core high-performance processor", categoryIds["cpu"], CpuImage),
                MakeProduct("NVIDIA GeForce RTX 4080 SUPER", "GPU-NV-RTX4080S", "nvidia-rtx-4080-super", 999.99m, 14, "16GB GDDR6X graphics card for 4K gaming", categoryIds["gpu"], GpuImage),
                MakeProduct("NVIDIA GeForce RTX 4070 Ti", "GPU-NV-RTX4070TI", "nvidia-rtx-4070-ti", 799.99m, 18, "12GB GDDR6X graphics card", categoryIds["gpu"], GpuImage),
                MakeProduct("AMD Radeon RX 7900 XTX", "GPU-AMD-7900XTX", "amd-radeon-rx-7900-xtx", 949.99m, 16, "24GB GDDR6 graphics card", categoryIds["gpu"], GpuImage),
                MakeProduct("AMD Radeon RX 7800 XT", "GPU-AMD-7800XT", "amd-radeon-rx-7800-xt", 499.99m, 22, "16GB GDDR6 graphics card", categoryIds["gpu"], GpuImage),
                MakeProduct("Corsair Vengeance 32GB DDR5", "RAM-COR-32D5", "corsair-vengeance-32gb-ddr5", 119.99m, 40, "2x16GB DDR5-6000 memory kit", categoryIds["ram"], RamImage),
                MakeProduct("G.Skill Trident Z5 64GB DDR5", "RAM-GSK-64D5", "gskill-trident-z5-64gb-ddr5", 219.99m, 25, "2x32GB DDR5-6400 memory kit", categoryIds["ram"], RamImage),
                MakeProduct("Kingston Fury 16GB DDR4", "RAM-KIN-16D4", "kingston-fury-16gb-ddr4", 39.99m, 60, "2x8GB DDR4-3200 memory kit", categoryIds["ram"], RamImage),
                MakeProduct("Crucial Ballistix 32GB DDR4", "RAM-CRU-32D4", "crucial-ballistix-32gb-ddr4", 89.99m, 35, "2x16GB DDR4-3600 memory kit", categoryIds["ram"], RamImage),
                MakeProduct("ASUS ROG STRIX B650-E", "MB-ASU-B650E", "asus-rog-strix-b650-e", 259.99m, 18, "AM5 ATX motherboard for Ryzen 7000", categoryIds["motherboard"], MotherboardImage),
                MakeProduct("MSI MAG Z790 TOMAHAWK", "MB-MSI-Z790", "msi-mag-z790-tomahawk", 289.99m, 16, "LGA1700 ATX motherboard for Intel 13/14th Gen", categoryIds["motherboard"], MotherboardImage),
                MakeProduct("Gigabyte B550 AORUS", "MB-GIG-B550", "gigabyte-b550-aorus", 169.99m, 22, "AM4 ATX motherboard", categoryIds["motherboard"], MotherboardImage),
                MakeProduct("ASRock B760M Steel Legend", "MB-ASR-B760M", "asrock-b760m-steel-legend", 149.99m, 24, "LGA1700 mATX motherboard", categoryIds["motherboard"], MotherboardImage),
                MakeProduct("Corsair RM850x 850W", "PSU-COR-850", "corsair-rm850x-850w", 139.99m, 30, "80+ Gold fully modular power supply", categoryIds["psu"], PsuImage),
                MakeProduct("Seasonic Focus GX-750", "PSU-SEA-750", "seasonic-focus-gx-750", 119.99m, 28, "80+ Gold modular power supply", categoryIds["psu"], PsuImage),
                MakeProduct("EVGA 1000 GQ", "PSU-EVG-1000", "evga-1000-gq", 159.99m, 20, "80+ Gold 1000W power supply", categoryIds["psu"], PsuImage),
                MakeProduct("Samsung 990 PRO 2TB NVMe", "ST-SAM-990P2T", "samsung-990-pro-2tb-nvme", 179.99m, 40, "PCIe 4.0 NVMe SSD 2TB", categoryIds["storage"], StorageImage),
                MakeProduct("WD Black SN850X 1TB", "ST-WD-SN850X1T", "wd-black-sn850x-1tb", 99.99m, 50, "PCIe 4.0 NVMe SSD 1TB", categoryIds["storage"], StorageImage),
                MakeProduct("Crucial MX500 1TB SATA", "ST-CRU-MX500", "crucial-mx500-1tb-sata", 79.99m, 45, "2.5\" SATA SSD 1TB", categoryIds["storage"], StorageImage),
                MakeProduct("Seagate BarraCuda 4TB HDD", "ST-SEA-4THDD", "seagate-barracuda-4tb-hdd", 89.99m, 30, "7200RPM desktop hard drive 4TB", categoryIds["storage"], StorageImage),
                MakeProduct("Noctua NH-D15", "COO-NOCT-D15", "noctua-nh-d15", 109.99m, 25, "Dual-tower air CPU cooler", categoryIds["cooling"], CoolingImage),
                MakeProduct("Cooler Master Hyper 212", "COO-CM-212", "cooler-master-hyper-212", 44.99m, 40, "Single-tower air CPU cooler", categoryIds["cooling"], CoolingImage),
                MakeProduct("Corsair iCUE H150i AIO", "COO-COR-H150I", "corsair-icue-h150i-aio", 189.99m, 18, "360mm liquid CPU cooler", categoryIds["cooling"], CoolingImage),
                MakeProduct("Arctic Liquid Freezer II 280", "COO-ARC-280", "arctic-liquid-freezer-ii-280", 119.99m, 22, "280mm liquid CPU cooler", categoryIds["cooling"], CoolingImage),
                MakeProduct("Lian Li O11 Dynamic", "CASE-LIAN-O11", "lian-li-o11-dynamic", 149.99m, 20, "Tempered glass ATX mid-tower", categoryIds["pc-case"], CaseImage),
                MakeProduct("NZXT H7 Flow", "CASE-NZXT-H7", "nzxt-h7-flow", 129.99m, 22, "High-airflow ATX mid-tower", categoryIds["pc-case"], CaseImage),
                MakeProduct("Fractal North", "CASE-FRA-NORTH", "fractal-north", 139.99m, 18, "Wood-accent ATX mid-tower", categoryIds["pc-case"], CaseImage),
                MakeProduct("Cooler Master NR200", "CASE-CM-NR200", "cooler-master-nr200", 99.99m, 26, "Compact mini-ITX tower", categoryIds["pc-case"], CaseImage),
            };

            var missing = extras.Where(p => !existingSkus.Contains(p.SKU)).ToList();
            if (missing.Count == 0)
            {
                return;
            }

            context.Products.AddRange(missing);
            await context.SaveChangesAsync();
            Console.WriteLine($"Added {missing.Count} additional PC component products.");
        }

        private static string CategoryImage(string? slug) =>
            slug?.ToLowerInvariant() switch
            {
                "cpu" => CpuImage,
                "gpu" => GpuImage,
                "ram" => RamImage,
                "motherboard" => MotherboardImage,
                "psu" => PsuImage,
                "storage" => StorageImage,
                "cooling" => CoolingImage,
                "pc-case" => CaseImage,
                _ => PlaceholderImage
            };

        private static bool IsPlaceholderImage(string? image) =>
            string.IsNullOrWhiteSpace(image) ||
            image.Contains("placeholder", StringComparison.OrdinalIgnoreCase) ||
            image.Contains("res.cloudinary.com/demo", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Ensures the extended category set (laptops, monitors, peripherals, etc.) exists.
        /// Idempotent — never duplicates the original 8 PC categories.
        /// </summary>
        private static async Task EnsureCategoriesExistAsync(AppDbContext context)
        {
            var newCategories = new (string Name, string Slug, string Description)[]
            {
                ("Laptops", "laptop", "Notebooks y laptops para trabajo y gaming"),
                ("Monitores", "monitor", "Pantallas y monitores"),
                ("Teclados", "keyboard", "Teclados mecánicos y de membrana"),
                ("Mouses", "mouse", "Ratones y mouses gaming"),
                ("Auriculares", "headset", "Headsets y auriculares"),
                ("Webcams", "webcam", "Cámaras web"),
                ("Sillas Gamer", "chair", "Sillas ergonómicas para gaming"),
                ("Redes", "networking", "Routers, switches y redes"),
                ("PCs Gamer", "gaming-pc", "Computadoras y PCs prearmados"),
            };

            var existing = new HashSet<string>(await context.Categories.Select(c => c.Slug).ToListAsync());
            var order = await context.Categories.CountAsync() + 1;
            foreach (var (name, slug, desc) in newCategories)
            {
                if (existing.Contains(slug))
                {
                    continue;
                }

                context.Categories.Add(new Category
                {
                    CategoryName = name,
                    Slug = slug,
                    Description = desc,
                    ImageUrl = null,
                    DisplayOrder = order++,
                    IsActive = true,
                    ParentCategoryId = null
                });
            }

            await context.SaveChangesAsync();
        }

        /// <summary>
        /// Regenerates the product catalog from the real images bundled in
        /// wwwroot/uploads/products. Each image file becomes (or updates) a product so the
        /// storefront shows the actual product photos instead of placeholders.
        /// Idempotent — safe to run on every startup.
        /// </summary>
        private static async Task EnsureProductsFromImagesAsync(AppDbContext context, string? contentRootPath)
        {
            if (string.IsNullOrWhiteSpace(contentRootPath))
            {
                return;
            }

            var uploadsDir = Path.Combine(contentRootPath, "wwwroot", "uploads", "products");
            if (!Directory.Exists(uploadsDir))
            {
                return;
            }

            var categories = await context.Categories
                .ToDictionaryAsync(c => c.Slug.ToLowerInvariant(), c => c.CategoryId);

            var products = await context.Products.ToListAsync();
            var bySlug = products.ToDictionary(p => p.Slug, StringComparer.OrdinalIgnoreCase);

            var extRank = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                [".jpg"] = 0, [".jpeg"] = 1, [".png"] = 2, [".webp"] = 3
            };

            // Collapse duplicate shots: a file named "product-2.jpg" that shares its base
            // ("product") with another file is treated as the same product, so we don't
            // create two listings for one item.
            var allBases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var raw in Directory.GetFiles(uploadsDir))
            {
                allBases.Add(Path.GetFileNameWithoutExtension(raw).ToLowerInvariant());
            }

            var files = Directory.GetFiles(uploadsDir)
                .Select(f => new FileInfo(f))
                .Where(f => extRank.ContainsKey(f.Extension))
                .Where(f => !f.Name.StartsWith("test-", StringComparison.OrdinalIgnoreCase)
                            && !f.Name.StartsWith("_tt_tmp", StringComparison.OrdinalIgnoreCase)
                            && !f.Name.Equals("wd_big.jpg", StringComparison.OrdinalIgnoreCase))
                .Select(f =>
                {
                    var baseName = Path.GetFileNameWithoutExtension(f.Name).ToLowerInvariant();
                    var match = Regex.Match(baseName, @"^(.+)-(\d+)$");
                    var canonical = match.Success && allBases.Contains(match.Groups[1].Value)
                        ? match.Groups[1].Value
                        : baseName;
                    return new { File = f, Canonical = canonical };
                })
                .GroupBy(x => x.Canonical)
                .Select(g => g.OrderBy(x => extRank[x.File.Extension]).First())
                .ToList();

            var toAdd = new List<Product>();
            var updated = 0;

            foreach (var item in files)
            {
                var file = item.File;
                var slug = item.Canonical;
                var imageUrl = "/uploads/products/" + file.Name;
                var categorySlug = InferCategorySlug(slug);
                var categoryId = categories.TryGetValue(categorySlug, out var id) ? id : categories["pc-case"];

                if (bySlug.TryGetValue(slug, out var existing))
                {
                    var current = existing.Image ?? string.Empty;
                    var hasReal = current.Contains("uploads/products", StringComparison.OrdinalIgnoreCase);
                    var isPlaceholder = string.IsNullOrWhiteSpace(current)
                                        || current.Contains("product-images", StringComparison.OrdinalIgnoreCase)
                                        || current.Contains("placeholder", StringComparison.OrdinalIgnoreCase);

                    if (!hasReal && isPlaceholder)
                    {
                        existing.Image = imageUrl;
                        updated++;
                    }

                    continue;
                }

                var name = HumanizeName(slug);
                toAdd.Add(MakeProduct(
                    name,
                    SlugToSku(slug),
                    slug,
                    DefaultPriceFor(categorySlug),
                    25,
                    $"{name} — disponible en Urbaniq Perú.",
                    categoryId,
                    imageUrl));
            }

            if (toAdd.Count > 0)
            {
                context.Products.AddRange(toAdd);
            }

            if (toAdd.Count > 0 || updated > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"Product catalog backfilled from images: {toAdd.Count} created, {updated} photos updated.");
            }
        }

        private static bool ContainsAny(string s, params string[] parts) =>
            parts.Any(p => s.Contains(p, StringComparison.OrdinalIgnoreCase));

        private static string InferCategorySlug(string s)
        {
            if (ContainsAny(s, "router", "repetidor", "switch", "hub-usb"))
            {
                return "networking";
            }

            if (s.StartsWith("laptop") || ContainsAny(s, "lenovo-ideapad", "lenovo-thinkbook", "hp-victus", "acer-nitro", "asus-vivobook"))
            {
                return "laptop";
            }

            if (s.StartsWith("pc-") || s.Contains("all-in-one"))
            {
                return "gaming-pc";
            }

            if (s.StartsWith("silla"))
            {
                return "chair";
            }

            if (s.StartsWith("monitor") || ContainsAny(s, "aoc-", "dell-ultrasharp", "lg-", "samsung-odyssey"))
            {
                return "monitor";
            }

            if (ContainsAny(s, "teclado", "keychron", "hyperx-alloy", "razer-blackwidow", "logitech-g413", "logitech-g213", "redragon-kumara", "corsair-k70"))
            {
                return "keyboard";
            }

            if (s.StartsWith("mouse") || ContainsAny(s, "logitech-g203", "logitech-g502", "logitech-g305", "logitech-gpro", "logitech-g-pro", "razer-deathadder", "razer-viper", "razer-cobra", "redragon-m711", "game-pro", "corsair-harpoon"))
            {
                return "mouse";
            }

            if (s.StartsWith("headset") || ContainsAny(s, "hyperx-cloud", "razer-blackshark"))
            {
                return "headset";
            }

            if (s.StartsWith("webcam"))
            {
                return "webcam";
            }

            if (ContainsAny(s, "procesador", "amd-ryzen", "intel-core"))
            {
                return "cpu";
            }

            if (ContainsAny(s, "tarjeta-de-video", "nvidia", "amd-radeon", "asus-dual", "pny"))
            {
                return "gpu";
            }

            if (ContainsAny(s, "memoria-ram", "corsair-vengeance", "gskill", "kingston-fury", "ram-"))
            {
                return "ram";
            }

            if (s.StartsWith("placa-madre") || ContainsAny(s, "asus-prime", "asus-tuf-b", "msi-mag", "gigabyte", "b650", "b760", "b550", "b660"))
            {
                return "motherboard";
            }

            if (s.StartsWith("fuente") || ContainsAny(s, "evga-supernova", "seasonic", "corsair-rm", "corsair-cv", "asus-tuf-gaming"))
            {
                return "psu";
            }

            if (ContainsAny(s, "ssd-", "wd-", "samsung-990", "seagate", "crucial", "kingston-fury-renegade"))
            {
                return "storage";
            }

            if (ContainsAny(s, "disipador", "cooler-master-hyper", "cooler-master-masterliquid", "noctua", "arctic", "corsair-icue", "nzxt-kraken"))
            {
                return "cooling";
            }

            if (s.StartsWith("gabinete") || ContainsAny(s, "nzxt-h", "lian-li", "cooler-master-masterbox", "fractal", "antec", "thermaltake", "corsair-4000d"))
            {
                return "pc-case";
            }

            return "pc-case";
        }

        private static string HumanizeName(string slug)
        {
            var acronyms = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "rtx", "ddr", "nvme", "gb", "tb", "ssd", "amd", "intel", "gpu", "cpu",
                "wifi", "usb", "rgb", "ti", "oled", "fhd", "qhd", "rx", "gt", "pro",
                "ax", "hp", "id", "2k", "4k", "x3d", "plus", "cv"
            };

            var words = slug.Split('-')
                .Select(p => p.Length <= 2 || acronyms.Contains(p)
                    ? p.ToUpperInvariant()
                    : char.ToUpperInvariant(p[0]) + p.Substring(1));

            return string.Join(" ", words);
        }

        private static decimal DefaultPriceFor(string categorySlug) =>
            categorySlug switch
            {
                "cpu" => 650m,
                "gpu" => 1500m,
                "ram" => 180m,
                "motherboard" => 500m,
                "psu" => 350m,
                "storage" => 250m,
                "cooling" => 200m,
                "pc-case" => 300m,
                "laptop" => 2800m,
                "monitor" => 900m,
                "keyboard" => 250m,
                "mouse" => 150m,
                "headset" => 200m,
                "webcam" => 180m,
                "chair" => 600m,
                "networking" => 220m,
                "gaming-pc" => 3500m,
                _ => 300m
            };

        private static string SlugToSku(string slug)
        {
            var sku = new string(slug.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
            return sku.Length > 40 ? sku.Substring(0, 40) : sku;
        }

        private static async Task EnsureDemoOffersAsync(AppDbContext context)
        {
            var all = await context.Products
                .Where(p => p.Price > 0)
                .OrderBy(p => p.ProductName)
                .ToListAsync();

            if (all.Count == 0) return;

            var pcts = new[] { 10m, 15m, 20m, 25m, 30m };
            int cursor = 0;
            int changed = 0;

            for (int idx = 0; idx < all.Count; idx += 3)
            {
                var product = all[idx];
                if (product.Discount != 0m) continue;

                var pct = pcts[cursor % pcts.Length];
                cursor++;
                product.Discount = Math.Round(product.Price * pct / 100m, 2);
                if (product.Discount > product.Price)
                    product.Discount = Math.Round(product.Price / 2m, 2);

                changed++;
            }

            if (changed > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"Demo offers applied: {changed} productos con descuento (10-30%).");
            }
        }
    }
}
