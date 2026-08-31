using Microsoft.EntityFrameworkCore;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<PcSpecification> PcSpecifications { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<WishList> WishLists { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<CouponCategory> CouponCategories { get; set; }
        public DbSet<CouponProduct> CouponProducts { get; set; }
        public DbSet<CouponUser> CouponUsers { get; set; }
        public DbSet<CouponExcludedProduct> CouponExcludedProducts { get; set; }
        public DbSet<AutoCouponRule> AutoCouponRules { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply all IEntityTypeConfiguration classes from this assembly
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

            // Composite keys for many-to-many
            modelBuilder.Entity<CouponCategory>()
                .HasKey(cc => new { cc.CouponId, cc.CategoryId });

            modelBuilder.Entity<CouponProduct>()
                .HasKey(cp => new { cp.CouponId, cp.ProductId });

            modelBuilder.Entity<CouponUser>()
                .HasKey(cu => new { cu.CouponId, cu.UserId, cu.OrderId });

            modelBuilder.Entity<CouponExcludedProduct>()
                .HasKey(cep => new { cep.CouponId, cep.ProductId });

            modelBuilder.Entity<AutoCouponRule>()
                .HasKey(ar => ar.RuleId);

            // Performance Indexes
            modelBuilder.Entity<Product>()
                .HasIndex(p => new { p.CategoryId, p.SubCategoryId });
            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Slug);
            modelBuilder.Entity<Product>()
                .HasIndex(p => new { p.TotalSold, p.CreatedAtUtc });

            modelBuilder.Entity<Category>()
                .HasIndex(c => c.Slug);
        }

        // Override SaveChanges to handle soft delete automatically
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            foreach (var entry in ChangeTracker.Entries<ISoftDeletable>())
            {
                if (entry.State == EntityState.Deleted)
                {
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedAt = DateTime.UtcNow;
                }
            }
            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
