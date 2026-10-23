using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    /// <summary>
    /// EF Core configuration for OrderItem entity.
    /// Configures decimal precision for pricing columns to match Product pricing.
    /// </summary>
    public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
    {
        public void Configure(EntityTypeBuilder<OrderItem> builder)
        {
            builder.HasKey(oi => oi.OrderItemId);

            // Decimal precision for currency fields — matches Product.Price column type
            builder.Property(oi => oi.UnitPrice).HasColumnType("decimal(18,2)");
            builder.Property(oi => oi.TotalPrice).HasColumnType("decimal(18,2)");
            builder.Property(oi => oi.SelectedSize).IsRequired().HasMaxLength(20);
            builder.Property(oi => oi.SelectedColor).IsRequired().HasMaxLength(50);

            builder.HasOne(oi => oi.Order).WithMany(o => o.OrderItems).HasForeignKey(oi => oi.OrderId);
            // Product data is snapshotted on the line item. Keep the live relation optional
            // so a soft-deleted product never hides historical order lines.
            builder.HasOne(oi => oi.Product).WithMany().HasForeignKey(oi => oi.ProductId).IsRequired(false);
            builder.HasOne(oi => oi.ProductVariant).WithMany(v => v.OrderItems).HasForeignKey(oi => oi.ProductVariantId).IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        }
    }
}
