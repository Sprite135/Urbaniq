using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Application.Interfaces.Coupons;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Asp.Versioning;

namespace Ecommerce.Api.Controllers.Coupons
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion("1.0")]
    public class CouponController : ControllerBase
    {
        private readonly ICouponService _couponService;
        public CouponController(ICouponService couponService) => _couponService = couponService;

        [HttpPost("validate-coupon")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateCoupon([FromBody] ValidateCouponDto dto)
        {
            var result = await _couponService.ValidateCouponAsync(dto);
            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] bool? isActive = null)
        {
            var result = await _couponService.GetAllCouponsAsync(pageNumber, pageSize, isActive);
            return Ok(result);
        }

        [HttpGet("{code:regex(^(?!validate$|validate-coupon$).{{1,50}}$)}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByCode(string code)
        {
            var coupon = await _couponService.GetCouponByCodeAsync(code);
            return coupon == null ? NotFound(new { message = "Cupón no encontrado" }) : Ok(coupon);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateCouponDto dto)
        {
            try
            {
                var coupon = await _couponService.CreateCouponAsync(dto);
                return Ok(coupon);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{couponId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int couponId, [FromBody] UpdateCouponDto dto)
        {
            var coupon = await _couponService.UpdateCouponAsync(couponId, dto);
            return coupon == null ? NotFound(new { message = "Cupón no encontrado" }) : Ok(coupon);
        }

        [HttpDelete("{couponId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int couponId)
        {
            var success = await _couponService.DeleteCouponAsync(couponId);
            return success ? Ok(new { message = "Cupón eliminado" }) : NotFound(new { message = "Cupón no encontrado" });
        }

        [HttpGet("analytics/performance")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPerformance()
        {
            var performance = await _couponService.GetCouponPerformanceAsync();
            return Ok(performance);
        }

        [HttpGet("{couponId:int}/analytics")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetCouponAnalytics(int couponId)
        {
            var analytics = await _couponService.GetCouponAnalyticsAsync(couponId);
            return analytics.Any() ? Ok(analytics.First()) : NotFound(new { message = "Cupón no encontrado" });
        }

        [HttpGet("available")]
        [Authorize]
        public async Task<IActionResult> GetAvailableCoupons([FromQuery] decimal cartTotal = 0)
        {
            // Get current user ID from token
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var coupons = await _couponService.GetAvailableCouponsForUserAsync(userId, cartTotal);
            return Ok(coupons);
        }

        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetUserCouponHistory()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var history = await _couponService.GetUserCouponHistoryAsync(userId);
            return Ok(history);
        }
    }
}