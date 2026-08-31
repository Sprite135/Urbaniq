using Ecommerce.Application.DTOs.Cart;
using Ecommerce.Application.Interfaces.Cart;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Asp.Versioning;

namespace Ecommerce.Api.Controllers.Cart
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        public CartController(ICartService cartService) => _cartService = cartService;

        private Guid? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
            return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : null;
        }

        private string? GetSessionId()
        {
            return Request.Cookies["guest_cart_id"] ?? Request.Headers["X-Guest-Cart-Id"].FirstOrDefault();
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var userId = GetUserId();
            var sessionId = userId.HasValue ? null : GetSessionId() ?? Guid.NewGuid().ToString();
            
            var result = await _cartService.AddToCartAsync(userId, sessionId, dto);
            
            if (!userId.HasValue && string.IsNullOrEmpty(Request.Cookies["guest_cart_id"]))
            {
                Response.Cookies.Append("guest_cart_id", sessionId, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddDays(30),
                    IsEssential = true
                });
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = GetUserId();
            var sessionId = userId.HasValue ? null : GetSessionId();
            return Ok(await _cartService.GetCartAsync(userId, sessionId));
        }

        [HttpDelete("{cartItemId:guid}")]
        public async Task<IActionResult> RemoveItem([FromRoute] Guid cartItemId)
        {
            var userId = GetUserId();
            var sessionId = userId.HasValue ? null : GetSessionId();
            var success = await _cartService.RemoveFromCartAsync(userId, sessionId, cartItemId);
            return success ? Ok(new { message = "Item removed" }) : NotFound(new { message = "Item not found in cart" });
        }

        [HttpPut("decrease/{cartItemId:guid}")]
        public async Task<IActionResult> DecreaseQuantity([FromRoute] Guid cartItemId, [FromQuery][Range(1, int.MaxValue)] int delta = 1)
        {
            var userId = GetUserId();
            var sessionId = userId.HasValue ? null : GetSessionId();
            if (!ModelState.IsValid) return BadRequest(new { message = "Delta must be a positive integer (>= 1)" });
            var success = await _cartService.DecreaseQuantityAsync(userId, sessionId, cartItemId, delta);
            return success ? Ok(new { message = "Quantity decreased" }) : BadRequest(new { message = "Cannot decrease quantity" });
        }

        [HttpPut("increase/{cartItemId:guid}")]
        public async Task<IActionResult> IncreaseQuantity([FromRoute] Guid cartItemId, [FromQuery][Range(1, int.MaxValue)] int delta = 1)
        {
            var userId = GetUserId();
            var sessionId = userId.HasValue ? null : GetSessionId();
            if (!ModelState.IsValid) return BadRequest(new { message = "Delta must be a positive integer (>= 1)" });
            var success = await _cartService.IncreaseQuantityAsync(userId, sessionId, cartItemId, delta);
            return success ? Ok(new { message = "Quantity increased" }) : BadRequest(new { message = "Cannot increase quantity" });
        }
    }
}