using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    /// <summary>
    /// EF Core configuration for the Product entity.
    /// Configured for a D2C men's clothing platform with clothing-specific
    /// attributes, decimal pricing, and unique SKU/Slug indexes.
    /// </summary>
    public class ProductConfiguration : IEntityTypeConfiguration<Product>
    {
        public void Configure(EntityTypeBuilder<Product> builder)
        {
            builder.HasKey(p => p.Id);

            // Product name — display name of the garment
            builder.Property(p => p.ProductName)
                .IsRequired()
                .HasMaxLength(200);

            // SKU — unique inventory identifier (e.g., "TS-BLK-M-001")
            builder.Property(p => p.SKU)
                .IsRequired()
                .HasMaxLength(50);

            // Slug — unique URL-friendly identifier for frontend routing
            builder.Property(p => p.Slug)
                .IsRequired()
                .HasMaxLength(250);

            // Pricing — decimal(18,2) for currency precision
            builder.Property(p => p.Price)
                .HasColumnType("decimal(18,2)");

            builder.Property(p => p.Discount)
                .HasColumnType("decimal(18,2)");

            // Clothing-specific attributes
            builder.Property(p => p.Size)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(p => p.Color)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(p => p.AvailableSizes)
                .IsRequired()
                .HasMaxLength(300);

            builder.Property(p => p.AvailableColors)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(p => p.DeliverableZones)
                .IsRequired()
                .HasMaxLength(2000);

            builder.Property(p => p.Material)
                .HasMaxLength(100);

            builder.Property(p => p.Description)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(p => p.Image)
                .IsRequired();

            // Soft delete global query filter — excluded products won't appear in normal queries
            builder.HasQueryFilter(p => !p.IsDeleted);

            // Unique indexes for inventory and URL routing
            builder.HasIndex(p => p.SKU).IsUnique();
            builder.HasIndex(p => p.Slug).IsUnique();

            // Category relationship — each product belongs to one leaf category
            builder.HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId);

            builder.HasMany(p => p.ProductImages)
                .WithOne(pi => pi.Product)
                .HasForeignKey(pi => pi.ProductId);

            builder.HasMany(p => p.Variants)
                .WithOne(v => v.Product)
                .HasForeignKey(v => v.ProductId);
        }
    }
}
