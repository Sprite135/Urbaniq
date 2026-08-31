using AutoMapper;
using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Application.Interfaces.Coupons;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Coupons
{
    public class CouponService : ICouponService
    {
        private readonly IRepository<Coupon> _couponRepo;
        private readonly IRepository<CouponCategory> _couponCategoryRepo;
        private readonly IRepository<CouponProduct> _couponProductRepo;
        private readonly IRepository<CouponUser> _couponUserRepo;
        private readonly IRepository<Category> _categoryRepo;
        private readonly IRepository<Product> _productRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public CouponService(
            IRepository<Coupon> couponRepo,
            IRepository<CouponCategory> couponCategoryRepo,
            IRepository<CouponProduct> couponProductRepo,
            IRepository<CouponUser> couponUserRepo,
            IRepository<Category> categoryRepo,
            IRepository<Product> productRepo,
            IUnitOfWork unitOfWork,
            IMapper mapper)
        {
            _couponRepo = couponRepo;
            _couponCategoryRepo = couponCategoryRepo;
            _couponProductRepo = couponProductRepo;
            _couponUserRepo = couponUserRepo;
            _categoryRepo = categoryRepo;
            _productRepo = productRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<CouponResponseDto> ValidateCouponAsync(ValidateCouponDto dto)
        {
            var code = dto.Code.Trim().ToUpperInvariant();
            var now = DateTime.UtcNow;

            var coupon = await _couponRepo.Query()
                .Include(c => c.CouponCategories)
                .Include(c => c.CouponProducts)
                .FirstOrDefaultAsync(c => c.Code == code && !c.IsDeleted);

            if (coupon == null)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón no encontrado" };
            }

            if (!coupon.IsActive)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón inactivo" };
            }

            if (coupon.StartDate > now)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón no ha iniciado su vigencia" };
            }

            if (coupon.EndDate < now)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón expirado" };
            }

            if (coupon.MaxUses.HasValue && coupon.UsesCount >= coupon.MaxUses.Value)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón agotado (alcanzó máximo de usos)" };
            }

            if (coupon.MinOrderAmount.HasValue && dto.CartTotal < coupon.MinOrderAmount.Value)
            {
                return new CouponResponseDto { IsValid = false, ErrorMessage = $"El monto mínimo para este cupón es S/ {coupon.MinOrderAmount.Value:N2}" };
            }

            // Validate applicable categories
            if (coupon.CouponCategories.Any() && dto.CategoryIds != null && dto.CategoryIds.Any())
            {
                var hasMatchingCategory = coupon.CouponCategories.Any(cc => dto.CategoryIds.Contains(cc.CategoryId));
                if (!hasMatchingCategory)
                {
                    return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón no aplicable a las categorías del carrito" };
                }
            }

            // Validate applicable products
            if (coupon.CouponProducts.Any() && dto.ProductIds != null && dto.ProductIds.Any())
            {
                var hasMatchingProduct = coupon.CouponProducts.Any(cp => dto.ProductIds.Contains(cp.ProductId));
                if (!hasMatchingProduct)
                {
                    return new CouponResponseDto { IsValid = false, ErrorMessage = "Cupón no aplicable a los productos del carrito" };
                }
            }

            // Validate user usage limit
            if (coupon.MaxUsesPerUser.HasValue && dto.UserId.HasValue)
            {
                var userUsageCount = await _couponUserRepo.Query()
                    .CountAsync(cu => cu.CouponId == coupon.CouponId && cu.UserId == dto.UserId.Value);
                
                if (userUsageCount >= coupon.MaxUsesPerUser.Value)
                {
                    return new CouponResponseDto { IsValid = false, ErrorMessage = $"Has alcanzado el límite de usos para este cupón ({coupon.MaxUsesPerUser.Value} usos por usuario)" };
                }
            }

            // Calculate discount amount
            decimal discountAmount = 0;
            if (coupon.DiscountType == CouponDiscountType.Percentage)
            {
                discountAmount = dto.CartTotal * coupon.Value / 100m;
            }
            else // FixedAmount
            {
                discountAmount = coupon.Value;
            }

            // Cap discount at cart total
            if (discountAmount > dto.CartTotal)
                discountAmount = dto.CartTotal;

            return new CouponResponseDto
            {
                CouponId = coupon.CouponId,
                Code = coupon.Code,
                DiscountType = (int)coupon.DiscountType,
                Value = coupon.Value,
                MinOrderAmount = coupon.MinOrderAmount,
                MaxUses = coupon.MaxUses,
                MaxUsesPerUser = coupon.MaxUsesPerUser,
                UsesCount = coupon.UsesCount,
                StartDate = coupon.StartDate,
                EndDate = coupon.EndDate,
                IsActive = coupon.IsActive,
                CreatedAt = coupon.CreatedAt,
                ApplicableCategoryIds = coupon.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                ApplicableProductIds = coupon.CouponProducts.Select(cp => cp.ProductId).ToList(),
                IsValid = true,
                DiscountAmount = Math.Round(discountAmount, 2)
            };
        }

        public async Task<PagedResult<CouponResponseDto>> GetAllCouponsAsync(int pageNumber = 1, int pageSize = 10, bool? isActive = null)
        {
            var query = _couponRepo.Query()
                .Where(c => !c.IsDeleted);

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            query = query.OrderByDescending(c => c.CreatedAt);

            var totalCount = await query.CountAsync();
            var coupons = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = coupons.Select(c => new CouponResponseDto
            {
                CouponId = c.CouponId,
                Code = c.Code,
                DiscountType = (int)c.DiscountType,
                Value = c.Value,
                MinOrderAmount = c.MinOrderAmount,
                MaxUses = c.MaxUses,
                MaxUsesPerUser = c.MaxUsesPerUser,
                UsesCount = c.UsesCount,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                ApplicableCategoryIds = c.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                ApplicableProductIds = c.CouponProducts.Select(cp => cp.ProductId).ToList(),
                IsValid = c.IsActive && c.StartDate <= DateTime.UtcNow && c.EndDate >= DateTime.UtcNow &&
                          (!c.MaxUses.HasValue || c.UsesCount < c.MaxUses.Value)
            }).ToList();

            return new PagedResult<CouponResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<CouponResponseDto?> GetCouponByCodeAsync(string code)
        {
            var coupon = await _couponRepo.Query()
                .Include(c => c.CouponCategories)
                .Include(c => c.CouponProducts)
                .FirstOrDefaultAsync(c => c.Code == code.ToUpperInvariant() && !c.IsDeleted);

            if (coupon == null) return null;

            return new CouponResponseDto
            {
                CouponId = coupon.CouponId,
                Code = coupon.Code,
                DiscountType = (int)coupon.DiscountType,
                Value = coupon.Value,
                MinOrderAmount = coupon.MinOrderAmount,
                MaxUses = coupon.MaxUses,
                MaxUsesPerUser = coupon.MaxUsesPerUser,
                UsesCount = coupon.UsesCount,
                StartDate = coupon.StartDate,
                EndDate = coupon.EndDate,
                IsActive = coupon.IsActive,
                CreatedAt = coupon.CreatedAt,
                ApplicableCategoryIds = coupon.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                ApplicableProductIds = coupon.CouponProducts.Select(cp => cp.ProductId).ToList(),
                IsValid = coupon.IsActive && coupon.StartDate <= DateTime.UtcNow && coupon.EndDate >= DateTime.UtcNow &&
                          (!coupon.MaxUses.HasValue || coupon.UsesCount < coupon.MaxUses.Value)
            };
        }

        public async Task<CouponResponseDto> CreateCouponAsync(CreateCouponDto dto)
        {
            if (await _couponRepo.Query().AnyAsync(c => c.Code == dto.Code.ToUpperInvariant() && !c.IsDeleted))
                throw new ArgumentException("Ya existe un cupón con ese código");

            var coupon = new Coupon
            {
                Code = dto.Code.ToUpperInvariant(),
                DiscountType = (CouponDiscountType)dto.DiscountType,
                Value = dto.Value,
                MinOrderAmount = dto.MinOrderAmount,
                MaxUses = dto.MaxUses,
                MaxUsesPerUser = dto.MaxUsesPerUser,
                StartDate = dto.StartDate ?? DateTime.UtcNow,
                EndDate = dto.EndDate ?? DateTime.UtcNow.AddYears(1),
                IsActive = true
            };

            // Add categories
            if (dto.ApplicableCategoryIds != null && dto.ApplicableCategoryIds.Any())
            {
                foreach (var catId in dto.ApplicableCategoryIds)
                {
                    coupon.CouponCategories.Add(new CouponCategory { Coupon = coupon, CategoryId = catId });
                }
            }

            // Add products
            if (dto.ApplicableProductIds != null && dto.ApplicableProductIds.Any())
            {
                foreach (var prodId in dto.ApplicableProductIds)
                {
                    coupon.CouponProducts.Add(new CouponProduct { Coupon = coupon, ProductId = prodId });
                }
            }

            await _couponRepo.AddAsync(coupon);
            await _unitOfWork.SaveChangesAsync();

            return new CouponResponseDto
            {
                CouponId = coupon.CouponId,
                Code = coupon.Code,
                DiscountType = (int)coupon.DiscountType,
                Value = coupon.Value,
                MinOrderAmount = coupon.MinOrderAmount,
                MaxUses = coupon.MaxUses,
                MaxUsesPerUser = coupon.MaxUsesPerUser,
                UsesCount = coupon.UsesCount,
                StartDate = coupon.StartDate,
                EndDate = coupon.EndDate,
                IsActive = coupon.IsActive,
                CreatedAt = coupon.CreatedAt,
                ApplicableCategoryIds = coupon.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                ApplicableProductIds = coupon.CouponProducts.Select(cp => cp.ProductId).ToList(),
                IsValid = true
            };
        }

        public async Task<CouponResponseDto?> UpdateCouponAsync(int couponId, UpdateCouponDto dto)
        {
            var coupon = await _couponRepo.Query()
                .Include(c => c.CouponCategories)
                .Include(c => c.CouponProducts)
                .FirstOrDefaultAsync(c => c.CouponId == couponId && !c.IsDeleted);

            if (coupon == null) return null;

            if (dto.DiscountType.HasValue)
                coupon.DiscountType = (CouponDiscountType)dto.DiscountType.Value;

            if (dto.Value.HasValue)
                coupon.Value = dto.Value.Value;

            if (dto.MinOrderAmount.HasValue)
                coupon.MinOrderAmount = dto.MinOrderAmount;

            if (dto.MaxUses.HasValue)
                coupon.MaxUses = dto.MaxUses;

            if (dto.MaxUsesPerUser.HasValue)
                coupon.MaxUsesPerUser = dto.MaxUsesPerUser;

            if (dto.StartDate.HasValue)
                coupon.StartDate = dto.StartDate.Value;

            if (dto.EndDate.HasValue)
                coupon.EndDate = dto.EndDate.Value;

            if (dto.IsActive.HasValue)
                coupon.IsActive = dto.IsActive.Value;

            // Update categories
            if (dto.ApplicableCategoryIds != null)
            {
                coupon.CouponCategories.Clear();
                foreach (var catId in dto.ApplicableCategoryIds)
                {
                    coupon.CouponCategories.Add(new CouponCategory { CouponId = coupon.CouponId, CategoryId = catId });
                }
            }

            // Update products
            if (dto.ApplicableProductIds != null)
            {
                coupon.CouponProducts.Clear();
                foreach (var prodId in dto.ApplicableProductIds)
                {
                    coupon.CouponProducts.Add(new CouponProduct { CouponId = coupon.CouponId, ProductId = prodId });
                }
            }

            _couponRepo.Update(coupon);
            await _unitOfWork.SaveChangesAsync();

            return new CouponResponseDto
            {
                CouponId = coupon.CouponId,
                Code = coupon.Code,
                DiscountType = (int)coupon.DiscountType,
                Value = coupon.Value,
                MinOrderAmount = coupon.MinOrderAmount,
                MaxUses = coupon.MaxUses,
                MaxUsesPerUser = coupon.MaxUsesPerUser,
                UsesCount = coupon.UsesCount,
                StartDate = coupon.StartDate,
                EndDate = coupon.EndDate,
                IsActive = coupon.IsActive,
                CreatedAt = coupon.CreatedAt,
                ApplicableCategoryIds = coupon.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                ApplicableProductIds = coupon.CouponProducts.Select(cp => cp.ProductId).ToList(),
                IsValid = coupon.IsActive && coupon.StartDate <= DateTime.UtcNow && coupon.EndDate >= DateTime.UtcNow &&
                          (!coupon.MaxUses.HasValue || coupon.UsesCount < coupon.MaxUses.Value)
            };
        }

        public async Task<bool> DeleteCouponAsync(int couponId)
        {
            var coupon = await _couponRepo.Query().FirstOrDefaultAsync(c => c.CouponId == couponId && !c.IsDeleted);
            if (coupon == null) return false;

            coupon.IsDeleted = true;
            coupon.DeletedAt = DateTime.UtcNow;
            _couponRepo.Update(coupon);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task RecordCouponUsageAsync(int couponId, Guid userId, Guid orderId, decimal discountAmount)
        {
            var coupon = await _couponRepo.Query().FirstOrDefaultAsync(c => c.CouponId == couponId && !c.IsDeleted);
            if (coupon == null) return;

            // Increment global usage count
            coupon.UsesCount++;
            _couponRepo.Update(coupon);

            // Record user-specific usage
            var couponUser = new CouponUser
            {
                CouponId = couponId,
                UserId = userId,
                OrderId = orderId,
                UsedAt = DateTime.UtcNow,
                DiscountAmount = discountAmount
            };
            await _couponUserRepo.AddAsync(couponUser);

            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<CouponPerformanceDto> GetCouponPerformanceAsync()
        {
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);
            var sevenDaysAgo = now.AddDays(-7);

            var allCoupons = await _couponRepo.Query()
                .Include(c => c.CouponUsers)
                .Where(c => !c.IsDeleted)
                .ToListAsync();

            var activeCoupons = allCoupons.Count(c => c.IsActive && c.StartDate <= now && c.EndDate >= now);
            var usedCoupons = allCoupons.Count(c => c.UsesCount > 0);

            var totalDiscountAllTime = allCoupons.Sum(c => 
                c.CouponUsers.Sum(cu => cu.DiscountAmount));

            // Top performing coupons
            var topPerforming = allCoupons
                .Where(c => c.UsesCount > 0)
                .Select(c => new CouponAnalyticsDto
                {
                    CouponId = c.CouponId,
                    Code = c.Code,
                    TotalDiscountGiven = c.CouponUsers.Sum(cu => cu.DiscountAmount),
                    TotalUses = c.UsesCount,
                    UniqueUsers = c.CouponUsers.Select(cu => cu.UserId).Distinct().Count(),
                    AverageOrderValue = c.CouponUsers.Any() ? c.CouponUsers.Average(cu => cu.DiscountAmount * 5) : 0, // Approximate
                    TotalRevenueGenerated = c.CouponUsers.Sum(cu => cu.DiscountAmount * 4), // Approximate revenue
                    ConversionRate = c.MaxUses.HasValue ? (double)c.UsesCount / c.MaxUses.Value * 100 : 0,
                    CreatedAt = c.CreatedAt,
                    LastUsedAt = c.CouponUsers.Any() ? c.CouponUsers.Max(cu => cu.UsedAt) : null
                })
                .OrderByDescending(c => c.TotalUses)
                .Take(10)
                .ToList();

            // Usage by day (last 7 days)
            var usageByDay = Enumerable.Range(0, 7)
                .Select(i => {
                    var date = now.AddDays(-i);
                    return new CouponUsageByPeriodDto
                    {
                        Period = date.ToString("ddd"),
                        UsesCount = allCoupons.Sum(c => c.CouponUsers.Count(cu => 
                            cu.UsedAt.Date == date.Date)),
                        TotalDiscount = allCoupons.Sum(c => c.CouponUsers
                            .Where(cu => cu.UsedAt.Date == date.Date)
                            .Sum(cu => cu.DiscountAmount))
                    };
                })
                .Reverse()
                .ToList();

            // Usage by week (last 4 weeks)
            var usageByWeek = Enumerable.Range(0, 4)
                .Select(i => {
                    var weekStart = now.AddDays(-(i * 7));
                    var weekEnd = weekStart.AddDays(7);
                    return new CouponUsageByPeriodDto
                    {
                        Period = $"Semana {4 - i}",
                        UsesCount = allCoupons.Sum(c => c.CouponUsers.Count(cu => 
                            cu.UsedAt >= weekStart && cu.UsedAt < weekEnd)),
                        TotalDiscount = allCoupons.Sum(c => c.CouponUsers
                            .Where(cu => cu.UsedAt >= weekStart && cu.UsedAt < weekEnd)
                            .Sum(cu => cu.DiscountAmount))
                    };
                })
                .Reverse()
                .ToList();

            // Usage by month (last 6 months)
            var usageByMonth = Enumerable.Range(0, 6)
                .Select(i => {
                    var month = now.AddMonths(-i);
                    return new CouponUsageByPeriodDto
                    {
                        Period = month.ToString("MMM"),
                        UsesCount = allCoupons.Sum(c => c.CouponUsers.Count(cu => 
                            cu.UsedAt.Month == month.Month && cu.UsedAt.Year == month.Year)),
                        TotalDiscount = allCoupons.Sum(c => c.CouponUsers
                            .Where(cu => cu.UsedAt.Month == month.Month && cu.UsedAt.Year == month.Year)
                            .Sum(cu => cu.DiscountAmount))
                    };
                })
                .Reverse()
                .ToList();

            return new CouponPerformanceDto
            {
                TopPerformingCoupons = topPerforming,
                UsageByDay = usageByDay,
                UsageByWeek = usageByWeek,
                UsageByMonth = usageByMonth,
                TotalDiscountGivenAllTime = totalDiscountAllTime,
                TotalCouponsActive = activeCoupons,
                TotalCouponsUsed = usedCoupons
            };
        }

        public async Task<List<CouponAnalyticsDto>> GetCouponAnalyticsAsync(int couponId)
        {
            var coupon = await _couponRepo.Query()
                .Include(c => c.CouponUsers)
                .FirstOrDefaultAsync(c => c.CouponId == couponId && !c.IsDeleted);

            if (coupon == null)
                return new List<CouponAnalyticsDto>();

            var analytics = new CouponAnalyticsDto
            {
                CouponId = coupon.CouponId,
                Code = coupon.Code,
                TotalDiscountGiven = coupon.CouponUsers.Sum(cu => cu.DiscountAmount),
                TotalUses = coupon.UsesCount,
                UniqueUsers = coupon.CouponUsers.Select(cu => cu.UserId).Distinct().Count(),
                AverageOrderValue = coupon.CouponUsers.Any() ? coupon.CouponUsers.Average(cu => cu.DiscountAmount * 5) : 0,
                TotalRevenueGenerated = coupon.CouponUsers.Sum(cu => cu.DiscountAmount * 4),
                ConversionRate = coupon.MaxUses.HasValue ? (double)coupon.UsesCount / coupon.MaxUses.Value * 100 : 0,
                CreatedAt = coupon.CreatedAt,
                LastUsedAt = coupon.CouponUsers.Any() ? coupon.CouponUsers.Max(cu => cu.UsedAt) : null
            };

            return new List<CouponAnalyticsDto> { analytics };
        }

        public async Task<List<CouponResponseDto>> GetAvailableCouponsForUserAsync(Guid userId, decimal cartTotal)
        {
            var now = DateTime.UtcNow;
            var userCouponHistory = await _couponUserRepo.Query()
                .Where(cu => cu.UserId == userId)
                .Select(cu => cu.CouponId)
                .ToListAsync();

            var availableCoupons = await _couponRepo.Query()
                .Include(c => c.CouponCategories)
                .Include(c => c.CouponProducts)
                .Where(c => !c.IsDeleted 
                    && c.IsActive 
                    && c.StartDate <= now 
                    && c.EndDate >= now
                    && (!c.MaxUses.HasValue || c.UsesCount < c.MaxUses.Value)
                    && !userCouponHistory.Contains(c.CouponId)) // User hasn't used this coupon
                .ToListAsync();

            // Filter by user usage limit
            var availableForUser = new List<CouponResponseDto>();
            foreach (var coupon in availableCoupons)
            {
                if (coupon.MaxUsesPerUser.HasValue)
                {
                    var userUsageCount = await _couponUserRepo.Query()
                        .CountAsync(cu => cu.CouponId == coupon.CouponId && cu.UserId == userId);
                    
                    if (userUsageCount >= coupon.MaxUsesPerUser.Value)
                        continue;
                }

                // Check minimum order amount
                if (coupon.MinOrderAmount.HasValue && cartTotal < coupon.MinOrderAmount.Value)
                    continue;

                availableForUser.Add(new CouponResponseDto
                {
                    CouponId = coupon.CouponId,
                    Code = coupon.Code,
                    DiscountType = (int)coupon.DiscountType,
                    Value = coupon.Value,
                    MinOrderAmount = coupon.MinOrderAmount,
                    MaxUses = coupon.MaxUses,
                    MaxUsesPerUser = coupon.MaxUsesPerUser,
                    UsesCount = coupon.UsesCount,
                    StartDate = coupon.StartDate,
                    EndDate = coupon.EndDate,
                    IsActive = coupon.IsActive,
                    CreatedAt = coupon.CreatedAt,
                    ApplicableCategoryIds = coupon.CouponCategories.Select(cc => cc.CategoryId).ToList(),
                    ApplicableProductIds = coupon.CouponProducts.Select(cp => cp.ProductId).ToList(),
                    IsValid = true,
                    DiscountAmount = 0 // Will be calculated when applied
                });
            }

            return availableForUser;
        }

        public async Task<List<CouponUser>> GetUserCouponHistoryAsync(Guid userId)
        {
            return await _couponUserRepo.Query()
                .Include(cu => cu.Coupon)
                .Where(cu => cu.UserId == userId)
                .OrderByDescending(cu => cu.UsedAt)
                .ToListAsync();
        }
    }
}