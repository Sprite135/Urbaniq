using System;
using System.ComponentModel.DataAnnotations;
using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Domain.Entities
{
    public enum CouponDiscountType
    {
        Percentage = 1,
        FixedAmount = 2,
        FreeShipping = 3,
        BuyXGetY = 4
    }

    public class Coupon : ISoftDeletable
    {
        public int CouponId { get; set; }
        public string Code { get; set; }
        public CouponDiscountType DiscountType { get; set; }
        public decimal Value { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUses { get; set; }
        public int UsesCount { get; set; } = 0;
        public int? MaxUsesPerUser { get; set; }
        
        // Additional discount settings
        public int? BuyQuantity { get; set; } // For BuyXGetY
        public int? GetQuantity { get; set; } // For BuyXGetY
        public bool CanCombine { get; set; } = false; // Can be combined with other coupons
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public virtual ICollection<CouponCategory> CouponCategories { get; set; } = new List<CouponCategory>();
        public virtual ICollection<CouponProduct> CouponProducts { get; set; } = new List<CouponProduct>();
        public virtual ICollection<CouponUser> CouponUsers { get; set; } = new List<CouponUser>();
        public virtual ICollection<CouponExcludedProduct> CouponExcludedProducts { get; set; } = new List<CouponExcludedProduct>();
    }

    public class CouponExcludedProduct
    {
        public int CouponId { get; set; }
        public Guid ProductId { get; set; }
        public virtual Coupon Coupon { get; set; } = null!;
        public virtual Product Product { get; set; } = null!;
    }

    public class CouponCategory
    {
        public int CouponId { get; set; }
        public int CategoryId { get; set; }
        public virtual Coupon Coupon { get; set; } = null!;
        public virtual Category Category { get; set; } = null!;
    }

    public class CouponProduct
    {
        public int CouponId { get; set; }
        public Guid ProductId { get; set; }
        public virtual Coupon Coupon { get; set; } = null!;
        public virtual Product Product { get; set; } = null!;
    }

    public class CouponUser
    {
        public int CouponId { get; set; }
        public Guid UserId { get; set; }
        public DateTime UsedAt { get; set; } = DateTime.UtcNow;
        public Guid OrderId { get; set; }
        public decimal DiscountAmount { get; set; }
        
        public virtual Coupon Coupon { get; set; } = null!;
    }
}