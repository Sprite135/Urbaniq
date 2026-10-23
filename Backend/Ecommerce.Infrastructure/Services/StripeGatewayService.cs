using Ecommerce.Application.Interfaces.Payment;
using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Domain.Common;
using Microsoft.Extensions.Configuration;
using Stripe;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Ecommerce.Infrastructure.Services
{
    /// <summary>
    /// Stripe implementation of IPaymentGatewayService — infrastructure concern.
    /// Handles communicating with the Stripe API using Stripe.net.
    /// </summary>
    public class StripeGatewayService : IPaymentGatewayService
    {
        public bool IsConfigured { get; }

        public StripeGatewayService(IConfiguration configuration)
        {
            var secretKey = configuration["StripeSettings:SecretKey"];
            IsConfigured = !string.IsNullOrWhiteSpace(secretKey) &&
                           secretKey.StartsWith("sk_", StringComparison.Ordinal);
            if (IsConfigured)
            {
                StripeConfiguration.ApiKey = secretKey;
            }
        }

        public async Task<ApiResponse<PaymentIntentResponseDto>> CreatePaymentIntentAsync(decimal amount)
        {
            if (!IsConfigured)
            {
                return new ApiResponse<PaymentIntentResponseDto>
                {
                    StatusCode = 503,
                    Message = "Stripe is not configured."
                };
            }

            try
            {
                // Stripe expects amounts in the smallest currency unit (e.g., cents or paise)
                long amountInSmallestUnit = (long)decimal.Round(amount * 100, 0, MidpointRounding.AwayFromZero);

                var options = new PaymentIntentCreateOptions
                {
                    Amount = amountInSmallestUnit,
                    Currency = "pen",
                    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                    {
                        Enabled = true,
                    },
                };

                var service = new PaymentIntentService();
                PaymentIntent intent = await service.CreateAsync(options);

                return new ApiResponse<PaymentIntentResponseDto>
                {
                    StatusCode = 200,
                    Message = "Payment Intent created",
                    Data = new PaymentIntentResponseDto
                    {
                        ClientSecret = intent.ClientSecret,
                        PaymentIntentId = intent.Id
                    }
                };
            }
            catch (StripeException ex)
            {
                return new ApiResponse<PaymentIntentResponseDto>
                {
                    StatusCode = 500,
                    Message = $"Stripe error: {ex.StripeError.Message}"
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse<PaymentIntentResponseDto>
                {
                    StatusCode = 500,
                    Message = $"Failed to create Stripe payment intent: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<PaymentVerificationResponseDto>> VerifyPaymentAsync(string paymentIntentId)
        {
            if (!IsConfigured)
            {
                return new ApiResponse<PaymentVerificationResponseDto>
                {
                    StatusCode = 503,
                    Message = "Stripe is not configured."
                };
            }

            try
            {
                var service = new PaymentIntentService();
                PaymentIntent intent = await service.GetAsync(paymentIntentId);
                var isSuccessful = intent.Status == "succeeded";

                if (isSuccessful)
                {
                    return new ApiResponse<PaymentVerificationResponseDto>
                    {
                        StatusCode = 200,
                        Message = "Payment verified successfully",
                        Data = new PaymentVerificationResponseDto
                        {
                            Status = intent.Status,
                            IsSuccessful = true,
                            AmountReceived = intent.AmountReceived,
                            Currency = intent.Currency
                        }
                    };
                }
                else
                {
                    return new ApiResponse<PaymentVerificationResponseDto>
                    {
                        StatusCode = 400,
                        Message = $"Payment verification failed. Status: {intent.Status}",
                        Data = new PaymentVerificationResponseDto
                        {
                            Status = intent.Status,
                            IsSuccessful = false
                        }
                    };
                }
            }
            catch (StripeException ex)
            {
                return new ApiResponse<PaymentVerificationResponseDto> { StatusCode = 500, Message = $"Stripe error: {ex.StripeError.Message}" };
            }
            catch (Exception ex)
            {
                return new ApiResponse<PaymentVerificationResponseDto> { StatusCode = 500, Message = $"Verification error: {ex.Message}" };
            }
        }

        public async Task<ApiResponse<PaymentIntentResponseDto>> CreateOrderPaymentIntentAsync(decimal amount, Guid orderId, Guid userId)
        {
            if (!IsConfigured) throw new InvalidOperationException("Los pagos con tarjeta no están configurados.");
            var intent = await new PaymentIntentService().CreateAsync(new PaymentIntentCreateOptions
            {
                Amount = (long)decimal.Round(amount * 100, 0, MidpointRounding.AwayFromZero), Currency = "pen",
                PaymentMethodTypes = new List<string> { "card" },
                Metadata = new Dictionary<string, string> { ["order_id"] = orderId.ToString(), ["user_id"] = userId.ToString() }
            }, new RequestOptions { IdempotencyKey = $"order-{orderId}" });
            return new ApiResponse<PaymentIntentResponseDto> { StatusCode = 200,
                Data = new PaymentIntentResponseDto { ClientSecret = intent.ClientSecret, PaymentIntentId = intent.Id } };
        }

        public async Task CancelPaymentAsync(string paymentIntentId)
        {
            var service = new PaymentIntentService();
            var intent = await service.GetAsync(paymentIntentId);
            if (intent.Status == "canceled") return;
            if (intent.Status == "succeeded") throw new InvalidOperationException("El pago ya fue cobrado y debe reembolsarse.");
            await service.CancelAsync(paymentIntentId, new PaymentIntentCancelOptions(),
                new RequestOptions { IdempotencyKey = $"cancel-{paymentIntentId}" });
        }

        public async Task<string> RefundAsync(string paymentIntentId, decimal amount, string idempotencyKey)
        {
            var refund = await new RefundService().CreateAsync(new RefundCreateOptions
            { PaymentIntent = paymentIntentId, Amount = (long)decimal.Round(amount * 100, 0, MidpointRounding.AwayFromZero) },
                new RequestOptions { IdempotencyKey = idempotencyKey });
            if (refund.Status != "succeeded") throw new InvalidOperationException("El reembolso está pendiente en la pasarela. Vuelve a consultar antes de confirmarlo.");
            return refund.Id;
        }
    }
}
