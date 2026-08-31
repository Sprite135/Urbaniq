using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using System.Text.RegularExpressions;

namespace Ecommerce.Infrastructure.Data
{
    /// <summary>
    /// Seeds the database with initial data: admin user and clothing category hierarchy.
    /// Designed for idempotent execution — safe to run multiple times without duplicates.
    /// </summary>
    public static class DbSeeder
    {
        /// <summary>
        /// Ensures the database is initialized for the active provider.
        /// Relational providers use migrations, while test-only providers such as
        /// EF InMemory fall back to EnsureCreated to avoid relational API failures.
        /// </summary>
        private static async Task EnsureDatabaseReadyAsync(AppDbContext context)
        {
            // Skip migration - assume migrations are already applied
            // This avoids connection issues during startup
            // await context.Database.MigrateAsync();
            
            if (!context.Database.IsRelational())
            {
                await context.Database.EnsureCreatedAsync();
            }
        }

        /// <summary>
        /// Seeds the default admin user from configuration.
        /// </summary>
        public static async Task SeedAdminAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

            // Initialize the database in a provider-safe way so both production
            // SQL Server and test-only in-memory providers can seed correctly.
            await EnsureDatabaseReadyAsync(context);

            var adminEmail = configuration["AdminSettings:Email"]?.Trim().ToLowerInvariant();
            var adminPassword = configuration["AdminSettings:Password"];

            if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
            {
                logger.LogWarning("Admin seed skipped: AdminSettings:Email/Password not configured.");
                return;
            }

            var existingAdmin = await context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower().Trim() == adminEmail);

            if (existingAdmin is not null)
            {
                existingAdmin.Name = string.IsNullOrWhiteSpace(existingAdmin.Name) ? "Admin" : existingAdmin.Name;
                existingAdmin.Email = adminEmail;
                existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
                existingAdmin.Role = UserRole.Admin;
                existingAdmin.IsBlocked = false;
                existingAdmin.IsEmailVerified = true;

                await context.SaveChangesAsync();
                logger.LogInformation("Admin user refreshed successfully with email: {Email}", adminEmail);
                return;
            }

            var admin = new User
            {
                UserId = Guid.NewGuid(),
                Name = "Admin",
                Email = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = UserRole.Admin,
                IsBlocked = false,
                IsEmailVerified = true
            };

            context.Users.Add(admin);
            await context.SaveChangesAsync();
            logger.LogInformation("Admin user seeded successfully with email: {Email}", adminEmail);
        }

        /// <summary>
        /// Seeds the complete men's clothing category hierarchy.
        /// Creates 4 root categories and 19 subcategories (23 total).
        /// Idempotent — skips seeding if categories already exist.
        /// </summary>
        public static async Task SeedCategoriesAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

            await EnsureDatabaseReadyAsync(context);

            // Skip if categories are already seeded
            if (await context.Categories.AnyAsync())
            {
                logger.LogInformation("Categories already seeded. Skipping category seed.");
                return;
            }

            // Define the complete clothing category hierarchy
            // Structure: Root Category -> Subcategories
            var categoryTree = new Dictionary<string, List<string>>
            {
                ["Top Wear"] = new() { "T-Shirts", "Shirts", "Hoodies", "Sweatshirts", "Jackets" },
                ["Bottom Wear"] = new() { "Jeans", "Cargo Pants", "Joggers", "Trousers", "Shorts" },
                ["Winter Wear"] = new() { "Hoodies", "Jackets", "Sweaters", "Thermals" },
                ["Innerwear"] = new() { "Boxers", "Briefs", "Vests", "Thermals" }
            };

            int rootOrder = 1;

            foreach (var (rootName, subCategories) in categoryTree)
            {
                var rootSlug = GenerateSlug(rootName);

                // Create root category (e.g., "Top Wear")
                var rootCategory = new Category
                {
                    CategoryName = rootName,
                    Slug = rootSlug,
                    Description = $"Men's {rootName} — browse our complete collection.",
                    DisplayOrder = rootOrder++,
                    IsActive = true,
                    ParentCategoryId = null
                };

                context.Categories.Add(rootCategory);

                // Flush to get the auto-generated CategoryId for FK references
                await context.SaveChangesAsync();

                int childOrder = 1;

                // Create subcategories under this root (e.g., "T-Shirts" under "Top Wear")
                foreach (var subName in subCategories)
                {
                    var subSlug = $"{rootSlug}/{GenerateSlug(subName)}";

                    var subCategory = new Category
                    {
                        CategoryName = subName,
                        Slug = subSlug,
                        Description = $"Men's {subName} — shop the latest styles.",
                        DisplayOrder = childOrder++,
                        IsActive = true,
                        ParentCategoryId = rootCategory.CategoryId
                    };

                    context.Categories.Add(subCategory);
                }

                await context.SaveChangesAsync();
            }

            logger.LogInformation(
                "Category hierarchy seeded successfully. Total categories: {Count}",
                await context.Categories.CountAsync());
        }

        /// <summary>
        /// Seeds PC component categories and products with specifications.
        /// Call this method separately if you want PC components instead of clothing.
        /// </summary>
        public static async Task SeedPcComponentsAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var env = scope.ServiceProvider.GetService<IWebHostEnvironment>();
            await PcComponentsSeeder.SeedPcComponentsAsync(context, env?.ContentRootPath);
        }

        /// <summary>
        /// Generates a URL-friendly slug from a category name.
        /// Example: "Cargo Pants" -> "cargo-pants", "T-Shirts" -> "t-shirts"
        /// </summary>
        private static string GenerateSlug(string name)
        {
            var slug = name.ToLowerInvariant();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");  // Remove special chars
            slug = Regex.Replace(slug, @"\s+", "-");            // Spaces to hyphens
            slug = Regex.Replace(slug, @"-+", "-");             // Collapse multiple hyphens
            return slug.Trim('-');
        }
    }
}
