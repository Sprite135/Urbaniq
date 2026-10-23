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
        public DbSet<OutboxEmail> OutboxEmails { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply all IEntityTypeConfiguration classes from this assembly
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
            modelBuilder.Entity<Product>().Property<byte[]>("RowVersion").IsRowVersion();
            modelBuilder.Entity<ProductVariant>().Property<byte[]>("RowVersion").IsRowVersion();
            modelBuilder.Entity<User>().Property<byte[]>("RowVersion").IsRowVersion();
            modelBuilder.Entity<Order>().HasIndex(o => o.PaymentIntentId).IsUnique().HasFilter("[PaymentIntentId] IS NOT NULL");
            modelBuilder.Entity<Order>().Property(o => o.PaymentIntentId).HasMaxLength(100);
            modelBuilder.Entity<Order>().Property(o => o.RefundedAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().Property(o => o.RefundTargetAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().Property(o => o.CouponDiscount).HasPrecision(18, 2);
            modelBuilder.Entity<Order>().HasIndex(o => new { o.OrderStatus, o.PaymentDueAtUtc });
            modelBuilder.Entity<OutboxEmail>().HasIndex(e => new { e.SentAtUtc, e.NextAttemptAtUtc });
            modelBuilder.Entity<OutboxEmail>().Property(e => e.Recipient).HasMaxLength(320);
            modelBuilder.Entity<OutboxEmail>().Property(e => e.Subject).HasMaxLength(500);
            modelBuilder.Entity<AuditLog>().HasIndex(e => new { e.EntityId, e.AtUtc });

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
            modelBuilder.Entity<AutoCouponRule>().Property(ar => ar.DiscountValue).HasPrecision(18, 2);
            modelBuilder.Entity<AutoCouponRule>().Property(ar => ar.MinOrderAmount).HasPrecision(18, 2);
            modelBuilder.Entity<AutoCouponRule>().Property(ar => ar.MinimumPurchaseAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Coupon>().Property(c => c.Value).HasPrecision(18, 2);
            modelBuilder.Entity<Coupon>().Property(c => c.MinOrderAmount).HasPrecision(18, 2);
            modelBuilder.Entity<CouponUser>().Property(cu => cu.DiscountAmount).HasPrecision(18, 2);

            // Dependents of a soft-deleted product must use the same visibility rule.
            // Historical order lines are intentionally excluded because they store product
            // snapshots and their live Product relation is optional.
            modelBuilder.Entity<CartItem>().HasQueryFilter(ci => !ci.Product.IsDeleted);
            modelBuilder.Entity<CouponExcludedProduct>().HasQueryFilter(cp => !cp.Product.IsDeleted);
            modelBuilder.Entity<CouponProduct>().HasQueryFilter(cp => !cp.Product.IsDeleted);
            modelBuilder.Entity<PcSpecification>().HasQueryFilter(ps => !ps.Product.IsDeleted);
            modelBuilder.Entity<ProductImage>().HasQueryFilter(pi => !pi.Product.IsDeleted);
            modelBuilder.Entity<ProductVariant>().HasQueryFilter(pv => !pv.Product.IsDeleted);
            modelBuilder.Entity<Review>().HasQueryFilter(r => !r.IsDeleted && !r.Product.IsDeleted);
            modelBuilder.Entity<WishList>().HasQueryFilter(w => !w.Product.IsDeleted);

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
            ChangeTracker.DetectChanges();
            var auditedFields = new HashSet<string> { "OrderStatus", "IsPaid", "RefundedAmount", "Quantity", "Price", "Discount", "IsBlocked", "TrackingNumber", "StockRestored", "ReturnDecisionReason" };
            var audits = ChangeTracker.Entries().Where(e => e.State == EntityState.Modified &&
                (e.Entity is Order or Product or ProductVariant or User)).Select(e => new AuditLog
            {
                Actor = Ecommerce.Domain.Common.AuditActor.Current.Value ?? "system",
                Entity = e.Metadata.ClrType.Name,
                EntityId = string.Join(",", e.Properties.Where(p => p.Metadata.IsPrimaryKey()).Select(p => p.CurrentValue)),
                ChangesJson = System.Text.Json.JsonSerializer.Serialize(e.Properties.Where(p => p.IsModified && auditedFields.Contains(p.Metadata.Name))
                    .ToDictionary(p => p.Metadata.Name, p => new { Before = p.OriginalValue, After = p.CurrentValue }))
            }).Where(a => a.ChangesJson != "{}").ToList();
            AuditLogs.AddRange(audits);
            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
