using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Domain.Common;

namespace Ecommerce.Application.Interfaces.Coupons
{
    public interface IAutoCouponService
    {
        Task<AutoCouponRuleResponseDto> CreateAutoCouponRuleAsync(CreateAutoCouponRuleDto dto);
        Task<PagedResult<AutoCouponRuleResponseDto>> GetAllAutoCouponRulesAsync(int pageNumber = 1, int pageSize = 10);
        Task<AutoCouponRuleResponseDto?> UpdateAutoCouponRuleAsync(int ruleId, CreateAutoCouponRuleDto dto);
        Task<bool> DeleteAutoCouponRuleAsync(int ruleId);
        Task<string?> GenerateCouponForUserAsync(int ruleId, Guid userId);
        Task<string?> CheckAndGenerateFirstPurchaseCouponAsync(Guid userId);
        Task<string?> CheckAndGenerateBirthdayCouponAsync(Guid userId);
        Task<string?> CheckAndGenerateReferralCouponAsync(Guid referrerId, Guid referredUserId);
    }
}