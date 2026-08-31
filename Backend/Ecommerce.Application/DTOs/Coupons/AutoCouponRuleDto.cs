using System.ComponentModel.DataAnnotations;

namespace Ecommerce.Application.DTOs.Coupons
{
    public class CreateAutoCouponRuleDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        [Range(1, 6)]
        public int TriggerType { get; set; } // 1-6 corresponding to AutoCouponTriggerType

        [Required]
        [StringLength(10)]
        public string CouponPrefix { get; set; }

        [Required]
        [Range(1, 2)]
        public int DiscountType { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MinOrderAmount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUses { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsesPerUser { get; set; }

        [Range(1, 365)]
        public int ValidityDays { get; set; } = 30;

        [Range(0, double.MaxValue)]
        public decimal? MinimumPurchaseAmount { get; set; }

        public DateTime? EventStartDate { get; set; }

        public DateTime? EventEndDate { get; set; }
    }

    public class AutoCouponRuleResponseDto
    {
        public int RuleId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int TriggerType { get; set; }
        public string CouponPrefix { get; set; }
        public int DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUses { get; set; }
        public int? MaxUsesPerUser { get; set; }
        public int ValidityDays { get; set; }
        public decimal? MinimumPurchaseAmount { get; set; }
        public DateTime? EventStartDate { get; set; }
        public DateTime? EventEndDate { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int GeneratedCouponsCount { get; set; }
    }
}