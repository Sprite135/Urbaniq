using Ecommerce.Application.DTOs.Payment;

namespace Ecommerce.Application.Interfaces.Payment;

public interface IMercadoPagoService
{
    bool IsConfigured { get; }
    bool IsWebhookConfigured { get; }
    bool IsYapeSandboxConfigured { get; }
    string PublicKey { get; }
    Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(decimal amount, Guid orderId, Uri applicationBaseUri);
    Task<MercadoPagoPaymentDto> CreateYapePaymentAsync(string token, decimal amount, Guid orderId, string phoneNumber);
    Task<MercadoPagoPaymentDto> GetPaymentAsync(string paymentId);
    Task RefundAsync(string paymentId, decimal amount, string idempotencyKey);
    bool ValidateWebhookSignature(string signature, string requestId, string dataId);
}
