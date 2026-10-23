using Ecommerce.Domain.Enums;

namespace Ecommerce.Domain.Entities
{
    public class User
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = null!;
        public int? Age { get; set; }
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public UserRole Role { get; set; } = UserRole.User;
        public bool IsBlocked { get; set; } = false;
        public bool IsPhoneNumberVerified { get; set; }
        public bool IsEmailVerified { get; set; }
        public int SessionVersion { get; set; }

        // --- Password Reset ---
        /// <summary>SHA-256 hash of the one-time reset token. Never store the raw token.</summary>
        public string? PasswordResetTokenHash { get; set; }
        /// <summary>UTC expiry for the reset token (1 hour window).</summary>
        public DateTime? PasswordResetTokenExpiresUtc { get; set; }
        public int PasswordResetFailedAttempts { get; set; }
        public DateTime? PasswordResetLockedUntilUtc { get; set; }

        // --- Phone Sign-In ---
        public string? PhoneOtpHash { get; set; }
        public DateTime? PhoneOtpExpiresUtc { get; set; }
        public int PhoneOtpFailedAttempts { get; set; }
        public DateTime? PhoneOtpLockedUntilUtc { get; set; }

        // --- Email Verification ---
        public string? EmailVerificationTokenHash { get; set; }
        public DateTime? EmailVerificationTokenExpiresUtc { get; set; }

        // Navigation Properties
        public List<Order> Orders { get; set; } = new();
        public Cart? Cart { get; set; }
        public ICollection<Address> Addresses { get; set; } = new List<Address>();
    }
}
