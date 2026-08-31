namespace Ecommerce.Application.DTOs.Coupons
{
    public class CouponAnalyticsDto
    {
        public int CouponId { get; set; }
        public string Code { get; set; }
        public decimal TotalDiscountGiven { get; set; }
        public int TotalUses { get; set; }
        public int UniqueUsers { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal TotalRevenueGenerated { get; set; }
        public double ConversionRate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
    }

    public class CouponUsageByPeriodDto
    {
        public string Period { get; set; }
        public int UsesCount { get; set; }
        public decimal TotalDiscount { get; set; }
    }

    public class CouponPerformanceDto
    {
        public List<CouponAnalyticsDto> TopPerformingCoupons { get; set; }
        public List<CouponUsageByPeriodDto> UsageByDay { get; set; }
        public List<CouponUsageByPeriodDto> UsageByWeek { get; set; }
        public List<CouponUsageByPeriodDto> UsageByMonth { get; set; }
        public decimal TotalDiscountGivenAllTime { get; set; }
        public int TotalCouponsActive { get; set; }
        public int TotalCouponsUsed { get; set; }
    }
}