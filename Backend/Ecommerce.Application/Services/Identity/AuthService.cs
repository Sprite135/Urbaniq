using AutoMapper;
using Ecommerce.Application.DTOs.Identity;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Interfaces.Identity;
using Ecommerce.Application.Interfaces.Sms;
using Ecommerce.Application.Interfaces.Cart;
using Ecommerce.Application.Interfaces.Notifications;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Ecommerce.Application.Services.Identity
{
    public class AuthService : IAuthService
    {
        private const int PhoneOtpMaxAttempts = 3;
        private const int PhoneOtpExpiryMinutes = 10;
        private const int PhoneOtpLockoutMinutes = 60;
        private const string PhoneOtpLockoutMessage = "Sorry, Number of attempts exhausted please try again after 1 hr.";

        private readonly IRepository<User> _userRepo;
        private readonly IRepository<RefreshToken> _refreshTokenRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly JwtSettings _jwtSettings;
        private readonly IEmailSender _emailSender;
        private readonly EmailSettings _emailSettings;
        private readonly ISmsSender _smsSender;
        private readonly ILogger<AuthService> _logger;
        private readonly IHostEnvironment _environment;
        private readonly ICartService _cartService;
        private readonly INotificationService _notificationService;

        public AuthService(
            IRepository<User> userRepo,
            IRepository<RefreshToken> refreshTokenRepo,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            IOptions<JwtSettings> jwtSettings,
            IEmailSender emailSender,
            IOptions<EmailSettings> emailSettings,
            ISmsSender smsSender,
            ILogger<AuthService> logger,
            IHostEnvironment environment,
            ICartService cartService,
            INotificationService notificationService)
        {
            _userRepo = userRepo;
            _refreshTokenRepo = refreshTokenRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _jwtSettings = jwtSettings.Value;
            _emailSender = emailSender;
            _emailSettings = emailSettings.Value;
            _smsSender = smsSender;
            _logger = logger;
            _environment = environment;
            _cartService = cartService;
            _notificationService = notificationService;
        }

        public async Task<UserResponseDto> RegisterAsync(RegisterRequestDto registerDto, string role = "User")
        {
            var emailToCheck = registerDto.Email.ToLower().Trim();

            if (await _userRepo.Query().AnyAsync(u => u.Email.ToLower().Trim() == emailToCheck))
            {
                _logger.LogInformation("Registration rejected because the email already exists.");
                throw new ArgumentException("Email already exists");
            }

            if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var parsedRole))
                throw new ArgumentException($"Invalid role: {role}");

            var user = _mapper.Map<User>(registerDto);
            user.Email = emailToCheck; // Save as normalized lowercase
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);
            user.UserId = Guid.NewGuid();
            user.Role = parsedRole;

            // Generate an email verification token so the new account can confirm its address.
            var verificationToken = CreateUrlSafeToken();
            user.IsEmailVerified = false;
            user.EmailVerificationTokenHash = ComputeSha256Hash(verificationToken);
            user.EmailVerificationTokenExpiresUtc = DateTime.UtcNow.AddHours(24);

            await _userRepo.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            // Best-effort transactional emails: a failure to send must not roll back the registration.
            try
            {
                var verifyUrl = BuildEmailVerificationUrl(user.Email, verificationToken);
                await _notificationService.SendEmailVerificationEmailAsync(user.Email, user.Name, verifyUrl);
                await _notificationService.SendWelcomeEmailAsync(user.Email, user.Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Auth] Failed to send welcome/verification email to {Email}", user.Email);
            }

            return _mapper.Map<UserResponseDto>(user);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto loginDto, string? sessionId = null)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == loginDto.Email.ToLower());
            if (user == null)
                throw new ArgumentException("Invalid email or password");

            if (user.IsBlocked)
                throw new UnauthorizedAccessException("Your account has been blocked. Please contact support.");

            if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                throw new ArgumentException("Invalid email or password");

            // Enforce email verification in production (kept permissive in Development so local testing is not blocked).
            if (!_environment.IsDevelopment() && !user.IsEmailVerified)
                throw new UnauthorizedAccessException("Please verify your email address before logging in.");

            return await GenerateAuthResponseAsync(user, sessionId: sessionId);
        }

        public async Task RequestPhoneOtpAsync(RequestPhoneOtpRequestDto dto)
        {
            var phoneNumber = NormalizePhoneNumber(dto.PhoneNumber);
            var normalizedEmail = NormalizeOptionalEmail(dto.Email);
            var user = await ResolvePhoneUserAsync(phoneNumber, normalizedEmail);

            if (user.PhoneOtpLockedUntilUtc > DateTime.UtcNow)
                throw new InvalidOperationException(PhoneOtpLockoutMessage);

            var otpCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            user.PhoneOtpHash = ComputeSha256Hash(otpCode);
            user.PhoneOtpExpiresUtc = DateTime.UtcNow.AddMinutes(PhoneOtpExpiryMinutes);
            user.PhoneOtpFailedAttempts = 0;
            user.PhoneOtpLockedUntilUtc = null;

            await ApplyProfileDraftAsync(user, dto.Name, normalizedEmail);

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            await _smsSender.SendSmsAsync(phoneNumber, $"Your Urbaniq OTP is: {otpCode}. It is valid for {PhoneOtpExpiryMinutes} minutes.");
        }

        public async Task<AuthResponseDto> VerifyPhoneOtpAsync(VerifyPhoneOtpRequestDto dto, string? sessionId = null)
        {
            var phoneNumber = NormalizePhoneNumber(dto.PhoneNumber);
            var normalizedEmail = NormalizeOptionalEmail(dto.Email);
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);

            if (user == null)
                throw new ArgumentException("Please request a new OTP.");

            if (user.IsBlocked)
                throw new UnauthorizedAccessException("Your account has been blocked. Please contact support.");

            if (user.PhoneOtpLockedUntilUtc > DateTime.UtcNow)
                throw new InvalidOperationException(PhoneOtpLockoutMessage);

            if (user.PhoneOtpHash == null || user.PhoneOtpExpiresUtc < DateTime.UtcNow)
                throw new ArgumentException("Invalid or expired OTP.");

            var incomingHash = ComputeSha256Hash(dto.Code);
            if (user.PhoneOtpHash != incomingHash)
            {
                user.PhoneOtpFailedAttempts++;

                if (user.PhoneOtpFailedAttempts >= PhoneOtpMaxAttempts)
                {
                    user.PhoneOtpLockedUntilUtc = DateTime.UtcNow.AddMinutes(PhoneOtpLockoutMinutes);
                    user.PhoneOtpHash = null;
                    user.PhoneOtpExpiresUtc = null;
                    _userRepo.Update(user);
                    await _unitOfWork.SaveChangesAsync();
                    throw new InvalidOperationException(PhoneOtpLockoutMessage);
                }

                _userRepo.Update(user);
                await _unitOfWork.SaveChangesAsync();
                var attemptsLeft = PhoneOtpMaxAttempts - user.PhoneOtpFailedAttempts;
                throw new ArgumentException($"Invalid OTP. You have {attemptsLeft} attempt(s) remaining.");
            }

            await ApplyProfileDraftAsync(user, dto.Name, normalizedEmail);
            user.IsPhoneNumberVerified = true;
            user.PhoneOtpHash = null;
            user.PhoneOtpExpiresUtc = null;
            user.PhoneOtpFailedAttempts = 0;
            user.PhoneOtpLockedUntilUtc = null;

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            return await GenerateAuthResponseAsync(user, sessionId: sessionId);
        }

        public async Task SendEmailVerificationAsync(Guid userId, SendEmailVerificationRequestDto dto)
        {
            var normalizedEmail = dto.Email.ToLower().Trim();
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new ArgumentException("User not found.");

            var emailOwner = await _userRepo.Query()
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail && u.UserId != userId);

            if (emailOwner != null)
                throw new ArgumentException("Email already exists");

            user.Email = normalizedEmail;
            user.IsEmailVerified = false;

            var token = CreateUrlSafeToken();
            user.EmailVerificationTokenHash = ComputeSha256Hash(token);
            user.EmailVerificationTokenExpiresUtc = DateTime.UtcNow.AddHours(24);

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            var verifyUrl = BuildEmailVerificationUrl(normalizedEmail, token);
            var htmlBody = BuildEmailVerificationHtml(user.Name, verifyUrl);

            await _emailSender.SendAsync(normalizedEmail, "Verify your Urbaniq email address", htmlBody);
            _logger.LogInformation("[Auth] Email verification link sent to {Email}", normalizedEmail);
        }

        public async Task VerifyEmailAsync(VerifyEmailRequestDto dto)
        {
            var normalizedEmail = dto.Email.ToLower().Trim();
            var incomingHash = ComputeSha256Hash(dto.Token);
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null ||
                user.EmailVerificationTokenHash == null ||
                user.EmailVerificationTokenHash != incomingHash ||
                user.EmailVerificationTokenExpiresUtc < DateTime.UtcNow)
            {
                throw new ArgumentException("Invalid or expired email verification link.");
            }

            user.IsEmailVerified = true;
            user.EmailVerificationTokenHash = null;
            user.EmailVerificationTokenExpiresUtc = null;

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────
        // Forgot Password – generates a 6-digit OTP and emails it
        // ─────────────────────────────────────────────────────────────
        public async Task ForgotPasswordAsync(ForgotPasswordRequestDto dto)
        {
            var email = dto.Email.ToLower().Trim();
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == email);

            // Always return success to prevent email enumeration attacks
            if (user == null)
            {
                _logger.LogWarning("[Auth] Password reset requested for non-existent email: {Email}", email);
                return;
            }

            // Generate a 6-digit numeric code
            var otpCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            // Store the SHA-256 hash of the 6-digit code
            var codeHash = ComputeSha256Hash(otpCode);
            user.PasswordResetTokenHash = codeHash;
            user.PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(15); // 15 mins for OTP

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            // Use the new notification service
            var resetLink = $"https://urbaniq.com/reset-password?email={email}&code={otpCode}";
            await _notificationService.SendPasswordResetEmailAsync(email, user.Name, resetLink);
            _logger.LogInformation("[Auth] Password reset email sent to {Email}", email);
        }

        // ─────────────────────────────────────────────────────────────
        // Verify OTP – checks if the code is correct without resetting yet
        // ─────────────────────────────────────────────────────────────
        public async Task<bool> VerifyOtpAsync(VerifyOtpRequestDto dto)
        {
            var email = dto.Email.ToLower().Trim();
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || user.PasswordResetTokenHash == null) return false;

            var incomingHash = ComputeSha256Hash(dto.Code);
            var isValid = user.PasswordResetTokenHash == incomingHash && 
                          user.PasswordResetTokenExpiresUtc > DateTime.UtcNow;

            return isValid;
        }

        // ─────────────────────────────────────────────────────────────
        // Reset Password – validates OTP code and updates password
        // ─────────────────────────────────────────────────────────────
        public async Task ResetPasswordAsync(ResetPasswordRequestDto dto)
        {
            var email = dto.Email.ToLower().Trim();
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
                throw new ArgumentException("Invalid or expired verification code.");

            // Verify the code hash matches
            var incomingHash = ComputeSha256Hash(dto.Code);
            if (user.PasswordResetTokenHash == null || user.PasswordResetTokenHash != incomingHash)
                throw new ArgumentException("Invalid or expired verification code.");

            // Verify the code hasn't expired
            if (user.PasswordResetTokenExpiresUtc == null || user.PasswordResetTokenExpiresUtc < DateTime.UtcNow)
                throw new ArgumentException("Verification code has expired. Please request a new one.");

            // Update the password with BCrypt hash
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

            // Clear the OTP fields so it can't be reused
            user.PasswordResetTokenHash = null;
            user.PasswordResetTokenExpiresUtc = null;

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("[Auth] Password successfully reset for {Email}", email);
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
        {
            var storedToken = await _refreshTokenRepo.Query()
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (storedToken == null)
                throw new UnauthorizedAccessException("Invalid refresh token");

            // Reuse detection: if token was already revoked, an attacker is replaying a stolen token
            if (storedToken.IsRevoked)
            {
                await RevokeTokenFamilyAsync(storedToken.TokenFamily);
                throw new UnauthorizedAccessException(
                    "Refresh token reuse detected. All sessions for this token family have been revoked for security.");
            }

            if (storedToken.ExpiresAt < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Refresh token has expired");

            storedToken.IsRevoked = true;
            _refreshTokenRepo.Update(storedToken);
            await _unitOfWork.SaveChangesAsync();

            return await GenerateAuthResponseAsync(storedToken.User, storedToken.TokenFamily);
        }

        public async Task RevokeRefreshTokenAsync(string refreshToken)
        {
            var storedToken = await _refreshTokenRepo.Query()
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

            if (storedToken != null)
            {
                await RevokeTokenFamilyAsync(storedToken.TokenFamily);
            }
        }

        public async Task<UserResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                throw new ArgumentException("User not found");

            user.Name = dto.Name;
            user.Age = dto.Age;

            var normalizedEmail = NormalizeOptionalEmail(dto.Email);
            if (normalizedEmail != null && user.Email != normalizedEmail)
            {
                // Verify email uniqueness
                var emailExists = await _userRepo.Query().AnyAsync(u => u.Email == normalizedEmail && u.UserId != userId);
                if (emailExists)
                    throw new ArgumentException("Email already in use by another account");

                user.Email = normalizedEmail;
                user.IsEmailVerified = false;
            }

            _userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<UserResponseDto>(user);
        }

        public async Task<UserResponseDto> GetCurrentUserAsync(Guid userId)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                throw new ArgumentException("User not found");

            return _mapper.Map<UserResponseDto>(user);
        }

        // ─────────────────────────────────────────────────────────────
        // Private helpers
        // ─────────────────────────────────────────────────────────────

        /// <summary>Computes a SHA-256 hash of the given input string.</summary>
        private static string ComputeSha256Hash(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(bytes);
        }

        /// <summary>Builds a professional HTML email for the 6-digit verification code.</summary>
        private static string BuildOtpEmailHtml(string userName, string otpCode)
        {
            return $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;'>
                    <h1 style='color: white; margin: 0; font-size: 28px;'>Urbaniq</h1>
                </div>
                <div style='background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;'>
                    <h2 style='color: #1f2937; margin-top: 0;'>Verify Your Identity</h2>
                    <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>
                        Hi <strong>{userName}</strong>,
                    </p>
                    <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>
                        For your security, we have sent a verification code to your email. Please use the code below to complete your password reset. 
                        This code will expire in <strong>15 minutes</strong>.
                    </p>
                    <div style='text-align: center; margin: 40px 0;'>
                        <div style='background: #f3f4f6; border-radius: 12px; padding: 20px; display: inline-block; border: 2px dashed #667eea;'>
                            <span style='font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1f2937;'>{otpCode}</span>
                        </div>
                    </div>
                    <p style='color: #9ca3af; font-size: 14px; line-height: 1.6;'>
                        If you didn't request a password reset, you can safely ignore this email. 
                        Your password will remain unchanged.
                    </p>
                    <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                    <p style='color: #9ca3af; font-size: 12px; text-align: center;'>
                        &copy; {DateTime.UtcNow.Year} Urbaniq. All rights reserved.
                    </p>
                </div>
            </div>";
        }

        private async Task RevokeTokenFamilyAsync(Guid tokenFamily)
        {
            var familyTokens = await _refreshTokenRepo.Query()
                .Where(rt => rt.TokenFamily == tokenFamily && !rt.IsRevoked)
                .ToListAsync();

            foreach (var token in familyTokens)
            {
                token.IsRevoked = true;
                _refreshTokenRepo.Update(token);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        private async Task<AuthResponseDto> GenerateAuthResponseAsync(User user, Guid? existingFamily = null, string? sessionId = null)
        {
            var tokenFamily = existingFamily ?? Guid.NewGuid();
            var accessToken = CreateAccessToken(user);
            var refreshToken = await CreateRefreshTokenAsync(user.UserId, tokenFamily);

            // Merge guest cart into user cart after successful login
            if (!string.IsNullOrEmpty(sessionId))
            {
                try
                {
                    await _cartService.MergeCartAsync(sessionId, user.UserId);
                }
                catch (Exception ex)
                {
                    // Log but don't fail the login if cart merge fails
                }
            }

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                User = _mapper.Map<UserResponseDto>(user)
            };
        }

        private string CreateAccessToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new(ClaimTypes.Email, user.Email),
                new(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                signingCredentials: credentials,
                expires: DateTime.UtcNow.AddMinutes(15)
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private async Task<User> ResolvePhoneUserAsync(string phoneNumber, string? normalizedEmail)
        {
            var user = await _userRepo.Query().FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);
            if (user != null)
                return user;

            if (!string.IsNullOrWhiteSpace(normalizedEmail))
            {
                var emailUser = await _userRepo.Query().FirstOrDefaultAsync(u => u.Email == normalizedEmail);
                if (emailUser != null)
                {
                    if (emailUser.PhoneNumber != null && emailUser.PhoneNumber != phoneNumber)
                        throw new ArgumentException("Email already exists");

                    emailUser.PhoneNumber = phoneNumber;
                    return emailUser;
                }
            }

            var newUser = new User
            {
                UserId = Guid.NewGuid(),
                Name = "Urbaniq Customer",
                Email = CreatePhonePlaceholderEmail(phoneNumber),
                PhoneNumber = phoneNumber,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(CreateUrlSafeToken()),
                Role = UserRole.User,
                IsBlocked = false,
                IsEmailVerified = false,
                IsPhoneNumberVerified = false
            };

            await _userRepo.AddAsync(newUser);
            await _unitOfWork.SaveChangesAsync();
            return newUser;
        }

        private async Task ApplyProfileDraftAsync(User user, string? name, string? normalizedEmail)
        {
            if (!string.IsNullOrWhiteSpace(name))
                user.Name = name.Trim();

            if (string.IsNullOrWhiteSpace(normalizedEmail))
                return;

            var emailOwner = await _userRepo.Query()
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail && u.UserId != user.UserId);

            if (emailOwner != null)
                throw new ArgumentException("Email already exists");

            if (user.Email != normalizedEmail)
            {
                user.Email = normalizedEmail;
                user.IsEmailVerified = false;
            }
        }

        private string BuildEmailVerificationUrl(string email, string token)
        {
            var frontendUrl = string.IsNullOrWhiteSpace(_emailSettings.FrontendUrl)
                ? "http://localhost:5173"
                : _emailSettings.FrontendUrl.TrimEnd('/');

            return $"{frontendUrl}/verify-email?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        }

        private static string BuildEmailVerificationHtml(string userName, string verifyUrl)
        {
            return $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;'>
                <h1 style='margin: 0 0 16px; color: #111827;'>Verify your Urbaniq email</h1>
                <p style='color: #374151; font-size: 16px; line-height: 1.6;'>Hi <strong>{userName}</strong>,</p>
                <p style='color: #374151; font-size: 16px; line-height: 1.6;'>
                    Click the secure authentication link below to verify your email address.
                    This link expires in 24 hours.
                </p>
                <p style='margin: 28px 0;'>
                    <a href='{verifyUrl}' style='background: #000000; color: #d4a72c; padding: 14px 28px; text-decoration: none; font-weight: 700; display: inline-block;'>
                        Verify Email Address
                    </a>
                </p>
                <p style='color: #6b7280; font-size: 13px;'>If you did not request this, you can ignore this email.</p>
            </div>";
        }

        private string BuildWelcomeEmailHtml(string userName)
        {
            var frontendUrl = string.IsNullOrWhiteSpace(_emailSettings.FrontendUrl)
                ? "http://localhost:5173"
                : _emailSettings.FrontendUrl.TrimEnd('/');
            return $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;'>
                <div style='background: linear-gradient(135deg, #d7b46a 0%, #9d731e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;'>
                    <h1 style='color: #ffffff; margin: 0; font-size: 28px;'>Welcome to Urbaniq</h1>
                </div>
                <div style='background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;'>
                    <p style='color: #374151; font-size: 16px; line-height: 1.6;'>Hi <strong>{userName}</strong>,</p>
                    <p style='color: #374151; font-size: 16px; line-height: 1.6;'>
                        Thanks for joining Urbaniq! Your account is ready. Discover the latest tech, exclusive deals
                        and a premium shopping experience crafted for you.
                    </p>
                    <p style='margin: 28px 0;'>
                        <a href='{frontendUrl}' style='background: #111827; color: #d7b46a; padding: 14px 28px; text-decoration: none; font-weight: 700; display: inline-block;'>
                            Start shopping
                        </a>
                    </p>
                    <p style='color: #6b7280; font-size: 13px;'>If you have any questions, just reply to this email.</p>
                </div>
            </div>";
        }

        /// <summary>
        /// Normalizes a phone number to E.164 format (+91XXXXXXXXXX).
        /// Accepts raw 10-digit input or numbers already prefixed with country code.
        /// </summary>
        private static string NormalizePhoneNumber(string phoneNumber)
        {
            var digitsOnly = new string(phoneNumber.Where(char.IsDigit).ToArray());

            // If already includes country code (e.g., 519876543210), ensure + prefix
            if (digitsOnly.Length == 12 && digitsOnly.StartsWith("51"))
                return $"+{digitsOnly}";

            // Standard 9/10-digit Peruvian mobile number — prepend +51
            if (digitsOnly.Length == 9 || digitsOnly.Length == 10)
                return $"+51{digitsOnly}";

            // Fallback: return with + prefix for any other international format
            return $"+{digitsOnly}";
        }

        private static string? NormalizeOptionalEmail(string? email)
        {
            return string.IsNullOrWhiteSpace(email) ? null : email.ToLower().Trim();
        }

        private static string CreatePhonePlaceholderEmail(string phoneNumber)
        {
            return $"{phoneNumber}@mobile.urbaniq.local";
        }

        private static string CreateUrlSafeToken()
        {
            return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64))
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static string MaskPhoneNumber(string phoneNumber)
        {
            return phoneNumber.Length <= 4 ? "****" : phoneNumber[^4..];
        }

        private async Task<string> CreateRefreshTokenAsync(Guid userId, Guid tokenFamily)
        {
            var tokenBytes = RandomNumberGenerator.GetBytes(64);
            var tokenString = Convert.ToBase64String(tokenBytes);

            var refreshToken = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = tokenString,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false,
                TokenFamily = tokenFamily
            };

            await _refreshTokenRepo.AddAsync(refreshToken);
            await _unitOfWork.SaveChangesAsync();
            return tokenString;
        }
    }
}
