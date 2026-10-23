using Ecommerce.Application.DTOs.Identity;
using Ecommerce.Application.Interfaces.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Asp.Versioning;
using System.Security.Claims;

namespace Ecommerce.Api.Controllers.Identity
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        public AuthController(IAuthService authService) => _authService = authService;

        private bool IsTrustedSessionOrigin()
        {
            var origin = Request.Headers.Origin.ToString();
            var configured = HttpContext.RequestServices.GetRequiredService<IConfiguration>().GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
            return origin == $"{Request.Scheme}://{Request.Host}" || configured.Contains(origin, StringComparer.OrdinalIgnoreCase);
        }

        private IActionResult BrowserSession(AuthResponseDto auth)
        {
            Response.Cookies.Append("urbaniq.refresh", auth.RefreshToken, new CookieOptions
            {
                HttpOnly = true, Secure = Request.IsHttps, Path = "/api",
                SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });
            auth.RefreshToken = ""; // Refresh credentials must never be accessible to browser JavaScript.
            return Ok(auth);
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid registration data." });
            var user = await _authService.RegisterAsync(dto);
            return Ok(new { message = "Registration successful", data = user });
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid login data." });
            var sessionId = Request.Cookies["guest_cart_id"] ?? Request.Headers["X-Guest-Cart-Id"].FirstOrDefault();
            var auth = await _authService.LoginAsync(dto, sessionId);
            return BrowserSession(auth);
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("phone-otp/request")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestPhoneOtp([FromBody] RequestPhoneOtpRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Mobile number is required." });
            await _authService.RequestPhoneOtpAsync(dto);
            return Ok(new { message = "OTP has been sent to your mobile number." });
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("phone-otp/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyPhoneOtp([FromBody] VerifyPhoneOtpRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid OTP data." });
            var sessionId = Request.Cookies["guest_cart_id"] ?? Request.Headers["X-Guest-Cart-Id"].FirstOrDefault();
            var auth = await _authService.VerifyPhoneOtpAsync(dto, sessionId);
            return BrowserSession(auth);
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("email-verification/send")]
        [Authorize]
        public async Task<IActionResult> SendEmailVerification([FromBody] SendEmailVerificationRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Email is required." });
            
            try
            {
                var userId = GetCurrentUserId();
                await _authService.SendEmailVerificationAsync(userId, dto);
                return Ok(new { message = "Verification link has been sent to your email." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return BadRequest(new { message = "Failed to send verification email. Please check that your email address is correct and try again." });
            }
        }

        [HttpPost("email-verification/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid email verification data." });
            await _authService.VerifyEmailAsync(dto);
            return Ok(new { message = "Email address verified successfully." });
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Refresh token is required." });
            if (!IsTrustedSessionOrigin()) return StatusCode(403);
            var token = Request.Cookies["urbaniq.refresh"];
            if (string.IsNullOrWhiteSpace(token)) return Unauthorized();
            var auth = await _authService.RefreshTokenAsync(token);
            return BrowserSession(auth);
        }

        [HttpPost("revoke-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Refresh token is required." });
            if (!IsTrustedSessionOrigin()) return StatusCode(403);
            var token = Request.Cookies["urbaniq.refresh"];
            if (!string.IsNullOrWhiteSpace(token)) await _authService.RevokeRefreshTokenAsync(token);
            Response.Cookies.Delete("urbaniq.refresh", new CookieOptions { Path = "/api", Secure = Request.IsHttps, SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax });
            return Ok(new { message = "Token revoked successfully." });
        }

        /// <summary>
        /// Sends a 6-digit verification code if the account exists.
        /// Always returns 200 to prevent email enumeration.
        /// </summary>
        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Email is required." });
            await _authService.ForgotPasswordAsync(dto);
            return Ok(new { message = "If an account exists with this email, a 6-digit verification code has been sent." });
        }

        /// <summary>
        /// Verifies the 6-digit OTP code before proceeding to password reset.
        /// </summary>
        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid data." });
            var isValid = await _authService.VerifyOtpAsync(dto);
            if (!isValid)
                return BadRequest(new { message = "Invalid or expired verification code." });

            return Ok(new { message = "Code verified successfully." });
        }

        /// <summary>
        /// Validates the 6-digit code and updates the user's password.
        /// </summary>
        [HttpPost("reset-password")]
        [EnableRateLimiting("LoginPolicy")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid reset data." });
            
            try
            {
                await _authService.ResetPasswordAsync(dto);
                return Ok(new { message = "Password has been reset successfully. You can now log in with your new password." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Invalid profile data." });
            
            try
            {
                var userId = GetCurrentUserId();
                var user = await _authService.UpdateProfileAsync(userId, dto);
                return Ok(new { message = "Profile updated successfully.", data = user });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = GetCurrentUserId();
                var user = await _authService.GetCurrentUserAsync(userId);
                return Ok(new { data = user });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        private Guid GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("User id not found in token");

            return userId;
        }
    }
}
