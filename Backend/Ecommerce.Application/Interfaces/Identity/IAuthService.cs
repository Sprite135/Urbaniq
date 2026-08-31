using Ecommerce.Application.DTOs.Identity;

namespace Ecommerce.Application.Interfaces.Identity
{
    /// <summary>
    /// Handles user authentication operations: registration, login, token management,
    /// and the full forgot-password / reset-password flow.
    /// </summary>
    public interface IAuthService
    {
        Task<UserResponseDto> RegisterAsync(RegisterRequestDto registerDto, string role = "User");
        Task<AuthResponseDto> LoginAsync(LoginRequestDto loginDto, string? sessionId = null);
        Task RequestPhoneOtpAsync(RequestPhoneOtpRequestDto dto);
        Task<AuthResponseDto> VerifyPhoneOtpAsync(VerifyPhoneOtpRequestDto dto, string? sessionId = null);
        Task SendEmailVerificationAsync(Guid userId, SendEmailVerificationRequestDto dto);
        Task VerifyEmailAsync(VerifyEmailRequestDto dto);
        Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
        Task RevokeRefreshTokenAsync(string refreshToken);


        /// <summary>Generates a 6-digit verification code, stores its hash, and emails it to the user.</summary>
        Task ForgotPasswordAsync(ForgotPasswordRequestDto dto);

        /// <summary>Checks if the provided 6-digit code is valid for the user.</summary>
        Task<bool> VerifyOtpAsync(VerifyOtpRequestDto dto);

        /// <summary>Validates the 6-digit code and updates the user's password.</summary>
        Task ResetPasswordAsync(ResetPasswordRequestDto dto);

        /// <summary>Updates the user's profile information. Returns updated user.</summary>
        Task<UserResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto);

        /// <summary>Gets the current user's profile.</summary>
        Task<UserResponseDto> GetCurrentUserAsync(Guid userId);
    }
}
