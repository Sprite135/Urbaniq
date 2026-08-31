using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Domain.Common;

namespace Ecommerce.Application.Interfaces.Payment
{
    /// <summary>
    /// Abstracts payment gateway operations.
    /// Re-designed for Stripe integration (creates PaymentIntent, returns client_secret).
    /// </summary>
    public interface IPaymentGatewayService
    {
        /// <summary>
        /// Indicates whether the gateway is properly configured with valid credentials.
        /// When false, card payments cannot be processed/verified.
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Creates a payment intent with the specified amount.
        /// Amount must be in decimal (currency major units like USD/INR), which the gateway 
        /// will convert to the smallest unit (e.g., cents/paise) internally.
        /// Returns the client_secret required by the frontend to confirm the payment.
        /// </summary>
        Task<ApiResponse<PaymentIntentResponseDto>> CreatePaymentIntentAsync(decimal amount);

        /// <summary>
        /// Verifies a payment's status using its PaymentIntent ID.
        /// Used by the frontend/backend to confirm if payment succeeded.
        /// </summary>
        Task<ApiResponse<PaymentVerificationResponseDto>> VerifyPaymentAsync(string paymentIntentId);
    }
}
