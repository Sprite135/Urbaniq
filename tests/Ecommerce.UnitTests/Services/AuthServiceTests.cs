using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using AutoMapper;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.DTOs.Identity;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Interfaces.Sms;
using Ecommerce.Application.Interfaces.Cart;
using Ecommerce.Application.Interfaces.Notifications;
using Ecommerce.Application.Services.Identity;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

/// <summary>
/// Unit tests for AuthService — covers registration, login, JWT generation,
/// refresh token rotation, and reuse detection security flows.
/// </summary>
public class AuthServiceTests
{
    private readonly Mock<IRepository<User>> _userRepoMock;
    private readonly Mock<IRepository<RefreshToken>> _refreshTokenRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<IEmailSender> _emailSenderMock;
    private readonly Mock<ISmsSender> _smsSenderMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly Mock<IHostEnvironment> _environmentMock;
    private readonly Mock<ICartService> _cartServiceMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly IOptions<JwtSettings> _jwtOptions;
    private readonly IOptions<EmailSettings> _emailOptions;
    private readonly AuthService _sut; // System Under Test

    public AuthServiceTests()
    {
        _userRepoMock = new Mock<IRepository<User>>();
        _refreshTokenRepoMock = new Mock<IRepository<RefreshToken>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();
        _emailSenderMock = new Mock<IEmailSender>();
        _smsSenderMock = new Mock<ISmsSender>();
        _loggerMock = new Mock<ILogger<AuthService>>();
        _environmentMock = new Mock<IHostEnvironment>();
        _cartServiceMock = new Mock<ICartService>();
        _notificationServiceMock = new Mock<INotificationService>();

        // Configure JWT settings for token generation tests
        _jwtOptions = Options.Create(new JwtSettings
        {
            Key = "SuperSecretTestKeyThatIsAtLeast32CharsLong!!",
            Issuer = "https://test-issuer.com",
            Audience = "https://test-audience.com"
        });
        _emailOptions = Options.Create(new EmailSettings
        {
            Host = "localhost",
            Port = 25,
            Username = "test",
            Password = "test",
            FromAddress = "noreply@test.com",
            FromName = "Test",
            FrontendUrl = "https://test.local"
        });

        _sut = new AuthService(
            _userRepoMock.Object,
            _refreshTokenRepoMock.Object,
            _unitOfWorkMock.Object,
            _mapperMock.Object,
            _jwtOptions,
            _emailSenderMock.Object,
            _emailOptions,
            _smsSenderMock.Object,
            _loggerMock.Object,
            _environmentMock.Object,
            _cartServiceMock.Object,
            _notificationServiceMock.Object);
    }

    // ==================== Registration Tests ====================

    [Fact]
    public async Task RegisterAsync_ValidDto_CreatesUserAndReturnsResponse()
    {
        // Arrange
        var dto = new RegisterRequestDto { Name = "John", Email = "john@test.com", Password = "Pass123!" };
        var user = new User { UserId = Guid.NewGuid(), Name = "John", Email = "john@test.com", Role = UserRole.User };
        var responseDto = new UserResponseDto();

        // Mock empty user list (no duplicates)
        var emptyUsers = new List<User>().AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(emptyUsers);
        _mapperMock.Setup(m => m.Map<User>(dto)).Returns(user);
        _mapperMock.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(responseDto);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.RegisterAsync(dto);

        // Assert
        result.Should().NotBeNull();
        _userRepoMock.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsArgumentException()
    {
        // Arrange — user with same email already exists
        var existingUser = new User { UserId = Guid.NewGuid(), Email = "john@test.com" };
        var users = new List<User> { existingUser }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        var dto = new RegisterRequestDto { Name = "John", Email = "john@test.com", Password = "Pass123!" };

        // Act & Assert
        var act = () => _sut.RegisterAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Email already exists");
    }

    [Fact]
    public async Task RegisterAsync_InvalidRole_ThrowsArgumentException()
    {
        // Arrange
        var emptyUsers = new List<User>().AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(emptyUsers);

        var dto = new RegisterRequestDto { Name = "John", Email = "john@test.com", Password = "Pass123!" };

        // Act & Assert — passing an invalid role string
        var act = () => _sut.RegisterAsync(dto, "SuperAdmin");
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid role: SuperAdmin");
    }

    [Fact]
    public async Task RegisterAsync_HashesPassword_NotStoredPlaintext()
    {
        // Arrange
        var dto = new RegisterRequestDto { Name = "John", Email = "john@test.com", Password = "PlainText123" };
        var user = new User { UserId = Guid.NewGuid(), Name = "John", Email = "john@test.com" };

        var emptyUsers = new List<User>().AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(emptyUsers);
        _mapperMock.Setup(m => m.Map<User>(dto)).Returns(user);
        _mapperMock.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(new UserResponseDto());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.RegisterAsync(dto);

        // Assert — password hash must not equal the plaintext password
        _userRepoMock.Verify(r => r.AddAsync(It.Is<User>(u =>
            u.PasswordHash != "PlainText123" && !string.IsNullOrEmpty(u.PasswordHash)
        )), Times.Once);
    }

    // ==================== Login Tests ====================

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Pass123!");
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "John", Email = "john@test.com",
            PasswordHash = hashedPassword, Role = UserRole.User, IsBlocked = false
        };

        var users = new List<User> { user }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        // Mock refresh token save
        var emptyTokens = new List<RefreshToken>().AsQueryable().BuildMock();
        _refreshTokenRepoMock.Setup(r => r.Query()).Returns(emptyTokens);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var dto = new LoginRequestDto { Email = "john@test.com", Password = "Pass123!" };

        // Act
        var result = await _sut.LoginAsync(dto);

        // Assert — must return valid tokens
        result.Should().NotBeNull();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task LoginAsync_InvalidEmail_ThrowsArgumentException()
    {
        // Arrange — no users in the database
        var emptyUsers = new List<User>().AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(emptyUsers);

        var dto = new LoginRequestDto { Email = "nonexistent@test.com", Password = "Pass123!" };

        // Act & Assert
        var act = () => _sut.LoginAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid email or password");
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ThrowsArgumentException()
    {
        // Arrange — user exists but password is wrong
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("CorrectPassword");
        var user = new User
        {
            UserId = Guid.NewGuid(), Email = "john@test.com",
            PasswordHash = hashedPassword, IsBlocked = false
        };

        var users = new List<User> { user }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        var dto = new LoginRequestDto { Email = "john@test.com", Password = "WrongPassword" };

        // Act & Assert
        var act = () => _sut.LoginAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Invalid email or password");
    }

    [Fact]
    public async Task LoginAsync_BlockedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange — user account is blocked by admin
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Pass123!");
        var user = new User
        {
            UserId = Guid.NewGuid(), Email = "john@test.com",
            PasswordHash = hashedPassword, IsBlocked = true
        };

        var users = new List<User> { user }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        var dto = new LoginRequestDto { Email = "john@test.com", Password = "Pass123!" };

        // Act & Assert
        var act = () => _sut.LoginAsync(dto);
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*blocked*");
    }

    // ==================== Refresh Token Tests ====================

    [Fact]
    public async Task RefreshTokenAsync_RevokedToken_RevokesEntireFamily()
    {
        // Arrange — simulate a stolen token being replayed
        var tokenFamily = Guid.NewGuid();
        var revokedToken = new RefreshToken
        {
            Id = Guid.NewGuid(), Token = "stolen-token", IsRevoked = true,
            TokenFamily = tokenFamily, ExpiresAt = DateTime.UtcNow.AddDays(7),
            User = new User { UserId = Guid.NewGuid(), Email = "john@test.com", Role = UserRole.User }
        };

        var tokens = new List<RefreshToken> { revokedToken }.AsQueryable().BuildMock();
        _refreshTokenRepoMock.Setup(r => r.Query()).Returns(tokens);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act & Assert — reuse detection must revoke the entire family
        var act = () => _sut.RefreshTokenAsync("stolen-token");
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*reuse detected*");
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange — token has expired
        var expiredToken = new RefreshToken
        {
            Id = Guid.NewGuid(), Token = "expired-token", IsRevoked = false,
            TokenFamily = Guid.NewGuid(), ExpiresAt = DateTime.UtcNow.AddDays(-1),
            User = new User { UserId = Guid.NewGuid(), Email = "john@test.com", Role = UserRole.User }
        };

        var tokens = new List<RefreshToken> { expiredToken }.AsQueryable().BuildMock();
        _refreshTokenRepoMock.Setup(r => r.Query()).Returns(tokens);

        // Act & Assert
        var act = () => _sut.RefreshTokenAsync("expired-token");
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*expired*");
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange — token doesn't exist
        var emptyTokens = new List<RefreshToken>().AsQueryable().BuildMock();
        _refreshTokenRepoMock.Setup(r => r.Query()).Returns(emptyTokens);

        // Act & Assert
        var act = () => _sut.RefreshTokenAsync("nonexistent-token");
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid refresh token");
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_ValidToken_RevokesTokenFamily()
    {
        // Arrange
        var tokenFamily = Guid.NewGuid();
        var activeToken = new RefreshToken
        {
            Id = Guid.NewGuid(), Token = "active-token", IsRevoked = false,
            TokenFamily = tokenFamily, ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        // Setup for finding the token
        var tokens = new List<RefreshToken> { activeToken }.AsQueryable().BuildMock();
        _refreshTokenRepoMock.Setup(r => r.Query()).Returns(tokens);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.RevokeRefreshTokenAsync("active-token");

        // Assert — SaveChanges must be called to persist the revocation
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.AtLeastOnce);
    }

    // ==================== Password Reset Tests ====================

    [Fact]
    public async Task ForgotPasswordAsync_UnknownEmail_DoesNotSendMail()
    {
        var emptyUsers = new List<User>().AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(emptyUsers);

        await _sut.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "missing@test.com" });

        _emailSenderMock.Verify(
            e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task ForgotPasswordAsync_KnownEmail_SendsOtpAndStoresHash()
    {
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "Jane", Email = "jane@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPass123!")
        };
        var users = new List<User> { user }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        string? emailBody = null;
        _emailSenderMock
            .Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string, string>((_, _, body) => emailBody = body)
            .Returns(Task.CompletedTask);

        await _sut.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "jane@test.com" });

        emailBody.Should().NotBeNullOrWhiteSpace();
        var otp = Regex.Match(emailBody!, @"\b(\d{6})\b").Groups[1].Value;
        otp.Should().MatchRegex(@"^\d{6}$");
        user.PasswordResetTokenHash.Should().Be(ComputeSha256Hash(otp));
        user.PasswordResetTokenExpiresUtc.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task VerifyOtpAsync_ValidCode_ReturnsTrue()
    {
        const string otp = "123456";
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "Jane", Email = "jane@test.com",
            PasswordResetTokenHash = ComputeSha256Hash(otp),
            PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(10)
        };
        _userRepoMock.Setup(r => r.Query()).Returns(new List<User> { user }.AsQueryable().BuildMock());

        var result = await _sut.VerifyOtpAsync(new VerifyOtpRequestDto { Email = "jane@test.com", Code = otp });

        result.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyOtpAsync_ExpiredCode_ReturnsFalse()
    {
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "Jane", Email = "jane@test.com",
            PasswordResetTokenHash = ComputeSha256Hash("123456"),
            PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(-1)
        };
        _userRepoMock.Setup(r => r.Query()).Returns(new List<User> { user }.AsQueryable().BuildMock());

        var result = await _sut.VerifyOtpAsync(new VerifyOtpRequestDto { Email = "jane@test.com", Code = "123456" });

        result.Should().BeFalse();
    }

    [Fact]
    public async Task ResetPasswordAsync_ValidOtp_UpdatesPasswordAndClearsToken()
    {
        const string otp = "654321";
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "Jane", Email = "jane@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPass123!"),
            PasswordResetTokenHash = ComputeSha256Hash(otp),
            PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(10)
        };
        _userRepoMock.Setup(r => r.Query()).Returns(new List<User> { user }.AsQueryable().BuildMock());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        await _sut.ResetPasswordAsync(new ResetPasswordRequestDto
        {
            Email = "jane@test.com",
            Code = otp,
            NewPassword = "NewPass123!"
        });

        BCrypt.Net.BCrypt.Verify("NewPass123!", user.PasswordHash).Should().BeTrue();
        user.PasswordResetTokenHash.Should().BeNull();
        user.PasswordResetTokenExpiresUtc.Should().BeNull();
    }

    [Fact]
    public async Task ResetPasswordAsync_InvalidOtp_ThrowsArgumentException()
    {
        var user = new User
        {
            UserId = Guid.NewGuid(), Name = "Jane", Email = "jane@test.com",
            PasswordResetTokenHash = ComputeSha256Hash("111111"),
            PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(10)
        };
        _userRepoMock.Setup(r => r.Query()).Returns(new List<User> { user }.AsQueryable().BuildMock());

        var act = () => _sut.ResetPasswordAsync(new ResetPasswordRequestDto
        {
            Email = "jane@test.com",
            Code = "999999",
            NewPassword = "NewPass123!"
        });

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Invalid or expired*");
    }

    private static string ComputeSha256Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToBase64String(bytes);
    }
}
