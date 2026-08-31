namespace Ecommerce.Application.DTOs.Coupons
{
    public class UpdateCouponDto
    {
        public int? DiscountType { get; set; }
        public decimal? Value { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUses { get; set; }
        public int? MaxUsesPerUser { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool? IsActive { get; set; }
        public List<int>? ApplicableCategoryIds { get; set; }
        public List<Guid>? ApplicableProductIds { get; set; }
        
        // Additional settings for BuyXGetY
        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }

        // Combination rules
        public bool? CanCombine { get; set; }

        // Excluded products
        public List<Guid>? ExcludedProductIds { get; set; }
    }
}