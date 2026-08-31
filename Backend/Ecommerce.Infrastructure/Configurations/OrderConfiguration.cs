using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    /// <summary>
    /// EF Core configuration for the Order entity.
    /// Configures decimal precision for TotalPrice to match Product pricing.
    /// </summary>
    public class OrderConfiguration : IEntityTypeConfiguration<Order>
    {
        public void Configure(EntityTypeBuilder<Order> builder)
        {
            builder.HasKey(o => o.OrderId);

            // Decimal precision for order total and shipping cost
            builder.Property(o => o.TotalPrice).HasColumnType("decimal(18,2)");
            builder.Property(o => o.ShippingCost).HasColumnType("decimal(18,2)");
            builder.Property(o => o.PaymentReceiptUrl).HasMaxLength(500);
            builder.Property(o => o.PaymentApprovalCode).HasMaxLength(32);

            builder.Property(o => o.TransactionId).IsRequired().HasMaxLength(100);
            builder.Property(o => o.PaymentMethod).IsRequired().HasMaxLength(30);
            builder.Property(o => o.CancellationReason).HasMaxLength(500);
            builder.Property(o => o.ReturnReason).HasMaxLength(500);
            builder.Property(o => o.ReplacementReason).HasMaxLength(500);
            builder.HasIndex(o => o.TransactionId).IsUnique();
            builder.HasOne(o => o.User).WithMany(u => u.Orders).HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(o => o.Address).WithMany(a => a.Orders).HasForeignKey(o => o.AddressId).OnDelete(DeleteBehavior.Restrict);
        }
    }
}
