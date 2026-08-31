namespace Ecommerce.Application.DTOs.Coupons
{
    public class CouponResponseDto
    {
        public int CouponId { get; set; }
        public string Code { get; set; }
        public int DiscountType { get; set; }
        public decimal Value { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUses { get; set; }
        public int? MaxUsesPerUser { get; set; }
        public int UsesCount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<int> ApplicableCategoryIds { get; set; } = new();
        public List<Guid> ApplicableProductIds { get; set; } = new();
        public List<Guid> ExcludedProductIds { get; set; } = new();

        // Additional discount settings
        public int? BuyQuantity { get; set; }
        public int? GetQuantity { get; set; }
        public bool CanCombine { get; set; }

        // Computed fields for validation response
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public decimal DiscountAmount { get; set; }
    }
}