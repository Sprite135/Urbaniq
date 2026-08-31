using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ecommerce.Infrastructure.Configurations
{
    public class AddressConfiguration : IEntityTypeConfiguration<Address>
    {
        public void Configure(EntityTypeBuilder<Address> builder)
        {
            builder.HasKey(a => a.AddressId);
            builder.Property(a => a.FullName).IsRequired().HasMaxLength(100);
            builder.Property(a => a.PhoneNumber).IsRequired().HasMaxLength(15);
            builder.Property(a => a.PostalCode).HasMaxLength(10);
            builder.Property(a => a.Department).HasMaxLength(100);
            builder.Property(a => a.Province).HasMaxLength(100);
            builder.Property(a => a.District).HasMaxLength(100);
            builder.Property(a => a.DeliveryZone).HasMaxLength(50);
            builder.Property(a => a.HouseName).IsRequired().HasMaxLength(200);
            builder.Property(a => a.Place).IsRequired().HasMaxLength(100);
            builder.Property(a => a.Reference).IsRequired().HasMaxLength(100);
            builder.Property(a => a.LandMark).IsRequired().HasMaxLength(200);
            builder.HasQueryFilter(a => !a.IsDeleted);
            builder.HasOne(a => a.User).WithMany(u => u.Addresses).HasForeignKey(a => a.UserId);
        }
    }
}
