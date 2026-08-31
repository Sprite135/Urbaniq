using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    public class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
    {
        public void Configure(EntityTypeBuilder<CartItem> builder)
        {
            builder.HasKey(ci => ci.Id);
            builder.Property(ci => ci.SelectedSize).IsRequired().HasMaxLength(20);
            builder.Property(ci => ci.SelectedColor).IsRequired().HasMaxLength(50);
            builder.Property(ci => ci.DeliveryCode).HasMaxLength(10);
            builder.HasIndex(ci => new { ci.CartId, ci.ProductVariantId }).IsUnique();
            builder.HasOne(ci => ci.Cart).WithMany(c => c.CartItems).HasForeignKey(ci => ci.CartId);
            builder.HasOne(ci => ci.Product).WithMany(p => p.CartItems).HasForeignKey(ci => ci.ProductId);
            builder.HasOne(ci => ci.ProductVariant).WithMany(v => v.CartItems).HasForeignKey(ci => ci.ProductVariantId).OnDelete(DeleteBehavior.NoAction);
        }
    }
}
