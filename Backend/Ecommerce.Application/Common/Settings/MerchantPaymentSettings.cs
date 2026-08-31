namespace Ecommerce.Application.Common.Settings
{
    /// <summary>
    /// Merchant offline-payment details (Yape / Plin). These are shown at checkout so the
    /// customer can scan the merchant's QR and pay, then upload proof. There is no API
    /// integration — confirmation is manual (admin marks the order paid).
    /// </summary>
    public class MerchantPaymentSettings
    {
        public MerchantOfflineMethod Yape { get; set; } = new();
        public MerchantOfflineMethod Plin { get; set; } = new();
    }

    public class MerchantOfflineMethod
    {
        /// <summary>Merchant phone number associated with the Yape/Plin account.</summary>
        public string Phone { get; set; } = string.Empty;

        /// <summary>Account owner name shown to the customer.</summary>
        public string OwnerName { get; set; } = string.Empty;

        /// <summary>URL of the merchant's static QR image (served from wwwroot).</summary>
        public string QrImageUrl { get; set; } = string.Empty;
    }
}
