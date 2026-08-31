using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    /// <summary>
    /// EF Core configuration for the PcSpecification entity.
    /// Configures dynamic specifications for PC components with composite indexing.
    /// </summary>
    public class PcSpecificationConfiguration : IEntityTypeConfiguration<PcSpecification>
    {
        public void Configure(EntityTypeBuilder<PcSpecification> builder)
        {
            builder.HasKey(p => p.Id);

            // SpecKey - required, max 100 chars (e.g., "Socket", "Cores", "TDP")
            builder.Property(p => p.SpecKey)
                .IsRequired()
                .HasMaxLength(100);

            // SpecValue - required, max 500 chars (e.g., "AM5", "8", "120W")
            builder.Property(p => p.SpecValue)
                .IsRequired()
                .HasMaxLength(500);

            // DataType - for validation and UI rendering
            builder.Property(p => p.DataType)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue("String");

            // Composite unique index: one product can't have duplicate spec keys
            builder.HasIndex(p => new { p.ProductId, p.SpecKey })
                .IsUnique()
                .HasDatabaseName("IX_PcSpecifications_ProductId_SpecKey");

            // Index for filtering by spec key across all products
            builder.HasIndex(p => p.SpecKey)
                .HasDatabaseName("IX_PcSpecifications_SpecKey");

            // Index for filtering by spec value (useful for compatibility checks)
            builder.HasIndex(p => p.SpecValue)
                .HasDatabaseName("IX_PcSpecifications_SpecValue");

            // Relationship with Product
            builder.HasOne(p => p.Product)
                .WithMany(p => p.Specifications)
                .HasForeignKey(p => p.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
