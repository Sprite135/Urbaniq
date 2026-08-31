using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Interfaces.Coupons
{
    public interface ICouponService
    {
        Task<CouponResponseDto> ValidateCouponAsync(ValidateCouponDto dto);
        Task<PagedResult<CouponResponseDto>> GetAllCouponsAsync(int pageNumber = 1, int pageSize = 10, bool? isActive = null);
        Task<CouponResponseDto?> GetCouponByCodeAsync(string code);
        Task<CouponResponseDto> CreateCouponAsync(CreateCouponDto dto);
        Task<CouponResponseDto?> UpdateCouponAsync(int couponId, UpdateCouponDto dto);
        Task<bool> DeleteCouponAsync(int couponId);
        Task RecordCouponUsageAsync(int couponId, Guid userId, Guid orderId, decimal discountAmount);
        Task<CouponPerformanceDto> GetCouponPerformanceAsync();
        Task<List<CouponAnalyticsDto>> GetCouponAnalyticsAsync(int couponId);
        Task<List<CouponResponseDto>> GetAvailableCouponsForUserAsync(Guid userId, decimal cartTotal);
        Task<List<CouponUser>> GetUserCouponHistoryAsync(Guid userId);
    }
}