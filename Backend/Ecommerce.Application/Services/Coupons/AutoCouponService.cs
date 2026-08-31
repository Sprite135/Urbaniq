using AutoMapper;
using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Application.Interfaces.Coupons;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Coupons
{
    public class AutoCouponService : IAutoCouponService
    {
        private readonly IRepository<AutoCouponRule> _autoCouponRuleRepo;
        private readonly IRepository<Coupon> _couponRepo;
        private readonly IRepository<CouponUser> _couponUserRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICouponService _couponService;

        public AutoCouponService(
            IRepository<AutoCouponRule> autoCouponRuleRepo,
            IRepository<Coupon> couponRepo,
            IRepository<CouponUser> couponUserRepo,
            IRepository<User> userRepo,
            IUnitOfWork unitOfWork,
            ICouponService couponService)
        {
            _autoCouponRuleRepo = autoCouponRuleRepo;
            _couponRepo = couponRepo;
            _couponUserRepo = couponUserRepo;
            _userRepo = userRepo;
            _unitOfWork = unitOfWork;
            _couponService = couponService;
        }

        public async Task<AutoCouponRuleResponseDto> CreateAutoCouponRuleAsync(CreateAutoCouponRuleDto dto)
        {
            var rule = new AutoCouponRule
            {
                Name = dto.Name,
                Description = dto.Description,
                TriggerType = (AutoCouponTriggerType)dto.TriggerType,
                CouponPrefix = dto.CouponPrefix.ToUpperInvariant(),
                DiscountType = (CouponDiscountType)dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxUses = dto.MaxUses,
                MaxUsesPerUser = dto.MaxUsesPerUser,
                ValidityDays = dto.ValidityDays,
                MinimumPurchaseAmount = dto.MinimumPurchaseAmount,
                EventStartDate = dto.EventStartDate,
                EventEndDate = dto.EventEndDate,
                IsActive = true
            };

            await _autoCouponRuleRepo.AddAsync(rule);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(rule, 0);
        }

        public async Task<PagedResult<AutoCouponRuleResponseDto>> GetAllAutoCouponRulesAsync(int pageNumber = 1, int pageSize = 10)
        {
            var query = _autoCouponRuleRepo.Query()
                .Where(r => !r.IsDeleted);

            var totalCount = await query.CountAsync();
            var rules = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<AutoCouponRuleResponseDto>();
            foreach (var rule in rules)
            {
                var generatedCount = await _couponRepo.Query()
                    .CountAsync(c => c.Code.StartsWith(rule.CouponPrefix) && !c.IsDeleted);
                items.Add(MapToDto(rule, generatedCount));
            }

            return new PagedResult<AutoCouponRuleResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<AutoCouponRuleResponseDto?> UpdateAutoCouponRuleAsync(int ruleId, CreateAutoCouponRuleDto dto)
        {
            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.RuleId == ruleId && !r.IsDeleted);

            if (rule == null) return null;

            rule.Name = dto.Name;
            rule.Description = dto.Description;
            rule.TriggerType = (AutoCouponTriggerType)dto.TriggerType;
            rule.CouponPrefix = dto.CouponPrefix.ToUpperInvariant();
            rule.DiscountType = (CouponDiscountType)dto.DiscountType;
            rule.DiscountValue = dto.DiscountValue;
            rule.MinOrderAmount = dto.MinOrderAmount;
            rule.MaxUses = dto.MaxUses;
            rule.MaxUsesPerUser = dto.MaxUsesPerUser;
            rule.ValidityDays = dto.ValidityDays;
            rule.MinimumPurchaseAmount = dto.MinimumPurchaseAmount;
            rule.EventStartDate = dto.EventStartDate;
            rule.EventEndDate = dto.EventEndDate;
            rule.UpdatedAt = DateTime.UtcNow;

            _autoCouponRuleRepo.Update(rule);
            await _unitOfWork.SaveChangesAsync();

            var generatedCount = await _couponRepo.Query()
                .CountAsync(c => c.Code.StartsWith(rule.CouponPrefix) && !c.IsDeleted);

            return MapToDto(rule, generatedCount);
        }

        public async Task<bool> DeleteAutoCouponRuleAsync(int ruleId)
        {
            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.RuleId == ruleId && !r.IsDeleted);

            if (rule == null) return false;

            rule.IsDeleted = true;
            rule.DeletedAt = DateTime.UtcNow;
            _autoCouponRuleRepo.Update(rule);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<string?> GenerateCouponForUserAsync(int ruleId, Guid userId)
        {
            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.RuleId == ruleId && !r.IsDeleted && r.IsActive);

            if (rule == null) return null;

            // Check if user already has a coupon from this rule
            var existingCoupon = await _couponRepo.Query()
                .FirstOrDefaultAsync(c => c.Code.StartsWith(rule.CouponPrefix) && 
                    !c.IsDeleted && 
                    c.CouponUsers.Any(cu => cu.UserId == userId));

            if (existingCoupon != null) return existingCoupon.Code;

            // Generate unique coupon code
            var uniqueCode = await GenerateUniqueCouponCodeAsync(rule.CouponPrefix);

            var coupon = new Coupon
            {
                Code = uniqueCode,
                DiscountType = rule.DiscountType,
                Value = rule.DiscountValue,
                MinOrderAmount = rule.MinOrderAmount,
                MaxUses = rule.MaxUses,
                MaxUsesPerUser = rule.MaxUsesPerUser,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(rule.ValidityDays),
                IsActive = true
            };

            await _couponRepo.AddAsync(coupon);
            await _unitOfWork.SaveChangesAsync();

            return coupon.Code;
        }

        public async Task<string?> CheckAndGenerateFirstPurchaseCouponAsync(Guid userId)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return null;

            // Check if user has already made a purchase
            // This would require checking order history - for now we'll assume they haven't

            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.TriggerType == AutoCouponTriggerType.FirstPurchase && 
                    !r.IsDeleted && 
                    r.IsActive);

            if (rule == null) return null;

            return await GenerateCouponForUserAsync(rule.RuleId, userId);
        }

        public async Task<string?> CheckAndGenerateBirthdayCouponAsync(Guid userId)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return null;

            // Check if it's user's birthday (assuming user has DateOfBirth field)
            // For now, we'll skip this check

            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.TriggerType == AutoCouponTriggerType.Birthday && 
                    !r.IsDeleted && 
                    r.IsActive);

            if (rule == null) return null;

            // Check if user already received birthday coupon this year
            var thisYear = DateTime.UtcNow.Year;
            var existingBirthdayCoupon = await _couponRepo.Query()
                .Where(c => c.Code.StartsWith(rule.CouponPrefix) && 
                    !c.IsDeleted && 
                    c.CouponUsers.Any(cu => cu.UserId == userId && cu.UsedAt.Year == thisYear))
                .AnyAsync();

            if (existingBirthdayCoupon) return null;

            return await GenerateCouponForUserAsync(rule.RuleId, userId);
        }

        public async Task<string?> CheckAndGenerateReferralCouponAsync(Guid referrerId, Guid referredUserId)
        {
            var rule = await _autoCouponRuleRepo.Query()
                .FirstOrDefaultAsync(r => r.TriggerType == AutoCouponTriggerType.Referral && 
                    !r.IsDeleted && 
                    r.IsActive);

            if (rule == null) return null;

            // Generate coupon for referrer
            return await GenerateCouponForUserAsync(rule.RuleId, referrerId);
        }

        private async Task<string> GenerateUniqueCouponCodeAsync(string prefix)
        {
            var random = new Random();
            string code;
            int attempts = 0;
            const int maxAttempts = 100;

            do
            {
                var suffix = random.Next(100000, 999999).ToString();
                code = $"{prefix}{suffix}";
                attempts++;

                if (attempts >= maxAttempts)
                {
                    throw new InvalidOperationException("No se pudo generar un código único después de múltiples intentos");
                }
            }
            while (await _couponRepo.Query().AnyAsync(c => c.Code == code && !c.IsDeleted));

            return code;
        }

        private AutoCouponRuleResponseDto MapToDto(AutoCouponRule rule, int generatedCount)
        {
            return new AutoCouponRuleResponseDto
            {
                RuleId = rule.RuleId,
                Name = rule.Name,
                Description = rule.Description,
                TriggerType = (int)rule.TriggerType,
                CouponPrefix = rule.CouponPrefix,
                DiscountType = (int)rule.DiscountType,
                DiscountValue = rule.DiscountValue,
                MinOrderAmount = rule.MinOrderAmount,
                MaxUses = rule.MaxUses,
                MaxUsesPerUser = rule.MaxUsesPerUser,
                ValidityDays = rule.ValidityDays,
                MinimumPurchaseAmount = rule.MinimumPurchaseAmount,
                EventStartDate = rule.EventStartDate,
                EventEndDate = rule.EventEndDate,
                IsActive = rule.IsActive,
                CreatedAt = rule.CreatedAt,
                GeneratedCouponsCount = generatedCount
            };
        }
    }
}