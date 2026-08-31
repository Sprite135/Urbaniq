using System.ComponentModel.DataAnnotations;

namespace Ecommerce.Application.DTOs.Coupons
{
    public class CreateCouponDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [Range(1, 4)]
        public int DiscountType { get; set; } // 1 = Percentage, 2 = FixedAmount, 3 = FreeShipping, 4 = BuyXGetY

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Value { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MinOrderAmount { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUses { get; set; }

        [Range(1, int.MaxValue)]
        public int? MaxUsesPerUser { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public List<int>? ApplicableCategoryIds { get; set; }

        public List<Guid>? ApplicableProductIds { get; set; }

        // Additional settings for BuyXGetY
        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }

        // Combination rules
        public bool CanCombine { get; set; } = false;

        // Excluded products
        public List<Guid>? ExcludedProductIds { get; set; }
    }
}