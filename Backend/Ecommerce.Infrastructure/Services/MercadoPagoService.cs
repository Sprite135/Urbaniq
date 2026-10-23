using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Application.Interfaces.Payment;
using Microsoft.Extensions.Options;

namespace Ecommerce.Infrastructure.Services;

public sealed class MercadoPagoService : IMercadoPagoService
{
    private readonly HttpClient _httpClient;
    private readonly MercadoPagoSettings _settings;

    public MercadoPagoService(HttpClient httpClient, IOptions<MercadoPagoSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        var validToken = _settings.AccessToken.StartsWith("APP_USR-", StringComparison.Ordinal) ||
                         _settings.AccessToken.StartsWith("TEST-", StringComparison.Ordinal);
        IsConfigured = validToken;
        IsWebhookConfigured = validToken && !string.IsNullOrWhiteSpace(_settings.WebhookSecret) &&
                              !_settings.WebhookSecret.Contains("SET_VIA", StringComparison.OrdinalIgnoreCase);
        IsYapeSandboxConfigured = validToken && _settings.SandboxMode &&
                                  _settings.PublicKey.StartsWith("APP_USR-", StringComparison.Ordinal);
    }

    public bool IsConfigured { get; }
    public bool IsWebhookConfigured { get; }
    public bool IsYapeSandboxConfigured { get; }
    public string PublicKey => IsYapeSandboxConfigured ? _settings.PublicKey : string.Empty;

    public async Task<MercadoPagoCheckoutResponseDto> CreateCheckoutAsync(decimal amount, Guid orderId, Uri applicationBaseUri)
    {
        EnsureConfigured();
        var orderUrl = new Uri(applicationBaseUri, $"orders/{orderId}").ToString();
        var notificationUrl = new Uri(applicationBaseUri, "api/v1/Payment/mercadopago/webhook").ToString();
        var payload = new
        {
            items = new[] { new { id = orderId.ToString(), title = $"Pedido Urbaniq {orderId:N}", quantity = 1, currency_id = "PEN", unit_price = amount } },
            external_reference = orderId.ToString(),
            back_urls = new { success = $"{orderUrl}?payment=approved", pending = $"{orderUrl}?payment=pending", failure = $"{orderUrl}?payment=failure" },
            auto_return = "approved",
            notification_url = notificationUrl,
            statement_descriptor = "URBANIQ"
        };

        using var request = CreateRequest(HttpMethod.Post, "checkout/preferences", payload, $"mp-preference-{orderId}");
        using var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo crear el checkout ({(int)response.StatusCode}).");
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        return new MercadoPagoCheckoutResponseDto
        {
            PreferenceId = root.GetProperty("id").GetString() ?? throw new InvalidOperationException("Mercado Pago no devolvió el ID de preferencia."),
            CheckoutUrl = root.GetProperty("init_point").GetString() ?? throw new InvalidOperationException("Mercado Pago no devolvió la URL de pago.")
        };
    }

    public async Task<MercadoPagoPaymentDto> GetPaymentAsync(string paymentId)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Get, $"v1/payments/{Uri.EscapeDataString(paymentId)}");
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo verificar el pago ({(int)response.StatusCode}).");
        var payment = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new MercadoPagoPaymentDto
        {
            PaymentId = payment.GetProperty("id").ToString(),
            Status = payment.GetProperty("status").GetString() ?? string.Empty,
            ExternalReference = payment.TryGetProperty("external_reference", out var reference) ? reference.GetString() ?? string.Empty : string.Empty,
            TransactionAmount = payment.GetProperty("transaction_amount").GetDecimal(),
            CurrencyId = payment.GetProperty("currency_id").GetString() ?? string.Empty
        };
    }

    public async Task<MercadoPagoPaymentDto> CreateYapePaymentAsync(string token, decimal amount, Guid orderId, string phoneNumber)
    {
        if (!IsYapeSandboxConfigured)
            throw new InvalidOperationException("Yape sandbox no está configurado.");
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Mercado Pago no devolvió un token de Yape.", nameof(token));
        if (string.IsNullOrWhiteSpace(phoneNumber) || phoneNumber.Length != 9 || !phoneNumber.All(char.IsDigit))
            throw new ArgumentException("El número Yape debe contener 9 dígitos.", nameof(phoneNumber));

        var amountText = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var payload = new
        {
            type = "online",
            external_reference = orderId.ToString(),
            processing_mode = "automatic",
            total_amount = amountText,
            payer = new
            {
                email = "test_user_pe@testuser.com",
                entity_type = "individual",
                phone = new { area_code = "51", number = phoneNumber }
            },
            config = new { location = new { state_id = "PE-LIM" } },
            transactions = new
            {
                payments = new[]
                {
                    new
                    {
                        amount = amountText,
                        payment_method = new { id = "yape", type = "debit_card", token }
                    }
                }
            }
        };
        using var request = CreateRequest(HttpMethod.Post, "v1/orders", payload, $"yape-sandbox-{orderId}");
        using var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo procesar el Yape de prueba ({(int)response.StatusCode}).");
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var status = root.GetProperty("status").GetString() ?? string.Empty;
        var statusDetail = root.GetProperty("status_detail").GetString() ?? string.Empty;
        var approved = string.Equals(status, "processed", StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(statusDetail, "accredited", StringComparison.OrdinalIgnoreCase);
        return new MercadoPagoPaymentDto
        {
            PaymentId = root.GetProperty("id").ToString(),
            Status = approved ? "approved" : status,
            ExternalReference = root.TryGetProperty("external_reference", out var reference) ? reference.GetString() ?? string.Empty : string.Empty,
            TransactionAmount = ReadDecimal(root.GetProperty("total_paid_amount")),
            CurrencyId = root.GetProperty("currency").GetString() ?? string.Empty
        };
    }

    public async Task RefundAsync(string paymentId, decimal amount, string idempotencyKey)
    {
        EnsureConfigured();
        var escapedId = Uri.EscapeDataString(paymentId);
        if (paymentId.StartsWith("ORD", StringComparison.OrdinalIgnoreCase))
        {
            using var orderRequest = CreateRequest(HttpMethod.Get, $"v1/orders/{escapedId}");
            using var orderResponse = await _httpClient.SendAsync(orderRequest);
            if (!orderResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mercado Pago no pudo consultar la orden antes del reembolso ({(int)orderResponse.StatusCode}).");

            var order = await orderResponse.Content.ReadFromJsonAsync<JsonElement>();
            var transactionId = order.GetProperty("transactions").GetProperty("payments")[0].GetProperty("id").ToString();
            var orderPayload = new
            {
                transactions = new[]
                {
                    new { id = transactionId, amount = amount.ToString("0.00", CultureInfo.InvariantCulture) }
                }
            };
            using var orderRefundRequest = CreateRequest(HttpMethod.Post, $"v1/orders/{escapedId}/refund", orderPayload, idempotencyKey);
            using var orderRefundResponse = await _httpClient.SendAsync(orderRefundRequest);
            if (!orderRefundResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mercado Pago no pudo reembolsar la orden ({(int)orderRefundResponse.StatusCode}).");
            return;
        }

        using var request = CreateRequest(HttpMethod.Post, $"v1/payments/{escapedId}/refunds", new { amount }, idempotencyKey);
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Mercado Pago no pudo reembolsar el pago ({(int)response.StatusCode}).");
    }

    public bool ValidateWebhookSignature(string signature, string requestId, string dataId)
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookSecret) || string.IsNullOrWhiteSpace(signature) ||
            string.IsNullOrWhiteSpace(requestId) || string.IsNullOrWhiteSpace(dataId)) return false;
        var parts = signature.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2)).Where(part => part.Length == 2)
            .ToDictionary(part => part[0], part => part[1], StringComparer.OrdinalIgnoreCase);
        if (!parts.TryGetValue("ts", out var timestamp) || !parts.TryGetValue("v1", out var received)) return false;
        var manifest = $"id:{dataId.ToLowerInvariant()};request-id:{requestId};ts:{timestamp};";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.WebhookSecret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();
        return expected.Length == received.Length && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(received.ToLowerInvariant()));
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, object? body = null, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.AccessToken);
        if (!string.IsNullOrWhiteSpace(idempotencyKey)) request.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        if (body != null) request.Content = JsonContent.Create(body);
        return request;
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured) throw new InvalidOperationException("Mercado Pago no está configurado.");
    }

    private static decimal ReadDecimal(JsonElement element) =>
        element.ValueKind == JsonValueKind.String
            ? decimal.Parse(element.GetString()!, CultureInfo.InvariantCulture)
            : element.GetDecimal();
}
