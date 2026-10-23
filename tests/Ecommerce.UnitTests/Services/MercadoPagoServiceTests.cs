using System.Net;
using System.Text;
using System.Text.Json;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace Ecommerce.UnitTests.Services;

public sealed class MercadoPagoServiceTests
{
    [Fact]
    public void YapeSandbox_RequiresExplicitSandboxMode()
    {
        var service = CreateService(new MercadoPagoSettings
        {
            AccessToken = "APP_USR-test-token",
            PublicKey = "APP_USR-public-key",
            SandboxMode = false
        });

        service.IsYapeSandboxConfigured.Should().BeFalse();
        service.PublicKey.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateYapePayment_UsesSandboxIdentityAndValidatesResponse()
    {
        HttpRequestMessage? captured = null;
        string? body = null;
        var orderId = Guid.NewGuid();
        var handler = new StubHandler(async request =>
        {
            captured = request;
            body = await request.Content!.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = new StringContent($$"""
                    {"id":"ORDPE01TEST","status":"processed","status_detail":"accredited","external_reference":"{{orderId}}","total_paid_amount":"250.00","currency":"PEN"}
                    """, Encoding.UTF8, "application/json")
            };
        });
        var service = CreateService(new MercadoPagoSettings
        {
            AccessToken = "APP_USR-test-access-token",
            PublicKey = "APP_USR-public-key",
            SandboxMode = true
        }, handler);

        var result = await service.CreateYapePaymentAsync("yape-token", 250m, orderId, "111111111");

        result.Status.Should().Be("approved");
        result.ExternalReference.Should().Be(orderId.ToString());
        result.PaymentId.Should().Be("ORDPE01TEST");
        captured!.RequestUri!.ToString().Should().Be("https://api.mercadopago.com/v1/orders");
        captured.Headers.Authorization!.Scheme.Should().Be("Bearer");
        captured.Headers.GetValues("X-Idempotency-Key").Single().Should().Be($"yape-sandbox-{orderId}");
        using var payload = JsonDocument.Parse(body!);
        payload.RootElement.GetProperty("processing_mode").GetString().Should().Be("automatic");
        payload.RootElement.GetProperty("transactions").GetProperty("payments")[0]
            .GetProperty("payment_method").GetProperty("id").GetString().Should().Be("yape");
        payload.RootElement.GetProperty("payer").GetProperty("email").GetString()
            .Should().Be("test_user_pe@testuser.com");
    }

    [Fact]
    public async Task CreateCheckout_InSandbox_ReturnsSandboxCheckoutUrl()
    {
        var handler = new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent("""
                {
                  "id":"PREF-TEST",
                  "init_point":"https://www.mercadopago.com.pe/checkout/prod",
                  "sandbox_init_point":"https://sandbox.mercadopago.com.pe/checkout/test"
                }
                """, Encoding.UTF8, "application/json")
        }));
        var service = CreateService(new MercadoPagoSettings
        {
            AccessToken = "APP_USR-test-access-token",
            PublicKey = "APP_USR-public-key",
            SandboxMode = true
        }, handler);

        var result = await service.CreateCheckoutAsync(99.90m, Guid.NewGuid(), new Uri("https://urbaniq.example/"));

        service.IsSandboxMode.Should().BeTrue();
        result.PreferenceId.Should().Be("PREF-TEST");
        result.CheckoutUrl.Should().Be("https://sandbox.mercadopago.com.pe/checkout/test");
    }

    [Fact]
    public async Task Refund_OrderPayment_UsesOrdersApiAndItsTransactionId()
    {
        var requests = new List<(HttpMethod Method, string Path, string Body)>();
        var handler = new StubHandler(async request =>
        {
            var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync();
            requests.Add((request.Method, request.RequestUri!.AbsolutePath, body));
            return request.Method == HttpMethod.Get
                ? new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"transactions":{"payments":[{"id":"PAYPE01TEST"}]}}""", Encoding.UTF8, "application/json")
                }
                : new HttpResponseMessage(HttpStatusCode.Created);
        });
        var service = CreateService(new MercadoPagoSettings
        {
            AccessToken = "APP_USR-test-access-token",
            PublicKey = "APP_USR-public-key",
            SandboxMode = true
        }, handler);

        await service.RefundAsync("ORDPE01TEST", 125.50m, "refund-key");

        requests.Should().HaveCount(2);
        requests[0].Should().Match<(HttpMethod Method, string Path, string Body)>(r =>
            r.Method == HttpMethod.Get && r.Path == "/v1/orders/ORDPE01TEST");
        requests[1].Method.Should().Be(HttpMethod.Post);
        requests[1].Path.Should().Be("/v1/orders/ORDPE01TEST/refund");
        using var payload = JsonDocument.Parse(requests[1].Body);
        payload.RootElement.GetProperty("transactions")[0].GetProperty("id").GetString().Should().Be("PAYPE01TEST");
        payload.RootElement.GetProperty("transactions")[0].GetProperty("amount").GetString().Should().Be("125.50");
    }

    private static MercadoPagoService CreateService(MercadoPagoSettings settings, HttpMessageHandler? handler = null)
    {
        var client = new HttpClient(handler ?? new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK))))
        {
            BaseAddress = new Uri("https://api.mercadopago.com/")
        };
        return new MercadoPagoService(client, Options.Create(settings));
    }

    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request);
    }
}
