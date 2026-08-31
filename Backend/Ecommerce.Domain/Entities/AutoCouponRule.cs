using System;
using System.ComponentModel.DataAnnotations;
using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Domain.Entities
{
    public enum AutoCouponTriggerType
    {
        FirstPurchase = 1,
        CartAbandonment = 2,
        Referral = 3,
        Birthday = 4,
        SpecialEvent = 5,
        MinimumPurchase = 6
    }

    public class AutoCouponRule : ISoftDeletable
    {
        public int RuleId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public AutoCouponTriggerType TriggerType { get; set; }
        
        // Coupon template settings
        public string CouponPrefix { get; set; }
        public CouponDiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUses { get; set; }
        public int? MaxUsesPerUser { get; set; }
        public int ValidityDays { get; set; } = 30; // Days from generation
        
        // Trigger-specific settings
        public decimal? MinimumPurchaseAmount { get; set; } // For MinimumPurchase trigger
        public DateTime? EventStartDate { get; set; } // For SpecialEvent trigger
        public DateTime? EventEndDate { get; set; } // For SpecialEvent trigger
        
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}