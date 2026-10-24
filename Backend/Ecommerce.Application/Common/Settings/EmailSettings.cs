namespace Ecommerce.Application.Common.Settings
{
    /// <summary>
    /// Strongly-typed settings for the SMTP email provider, bound from appsettings.json.
    /// All values should be provided via environment variables or secrets in production.
    /// </summary>
    public class EmailSettings
    {
        public string Host { get; set; } = default!;
        public int Port { get; set; } = 587;
        public string Username { get; set; } = default!;
        public string Password { get; set; } = default!;
        public string FromAddress { get; set; } = default!;
        public string FromName { get; set; } = "Urbaniq";
        /// <summary>Base URL of the React frontend (e.g. http://localhost:3000).</summary>
        public string FrontendUrl { get; set; } = "http://localhost:3000";
        /// <summary>
        /// When enabled, unverified accounts cannot sign in or place orders outside Development.
        /// Verification emails can still be sent when this access requirement is disabled.
        /// </summary>
        public bool RequireVerificationForAccess { get; set; } = true;
    }
}
