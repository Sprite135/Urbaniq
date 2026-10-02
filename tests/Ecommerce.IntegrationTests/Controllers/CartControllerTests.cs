using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ecommerce.IntegrationTests.Fixtures;
using FluentAssertions;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Domain.Enums;
using Moq;

namespace Ecommerce.IntegrationTests.Controllers;

/// <summary>
/// Integration tests for CartController — tests authenticated cart operations
/// and authorization enforcement through the full HTTP pipeline.
/// </summary>
public class CartControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebAppFactory _factory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public CartControllerTests(CustomWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    /// <summary>
    /// Helper: Registers a user, logs in, and returns their JWT access token.
    /// </summary>
    private async Task<string> GetAuthTokenAsync(bool admin = false, CustomWebAppFactory? factory = null)
    {
        var authFactory = factory ?? _factory;
        using var authClient = authFactory.CreateClient();
        var email = $"cart_test_{Guid.NewGuid():N}@gmail.com";

        var registration = await authClient.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Cart Tester", email, password = "Password123!"
        });

        registration.StatusCode.Should().Be(HttpStatusCode.OK, await registration.Content.ReadAsStringAsync());
        await authFactory.VerifyEmailAsync(email);
        if (admin)
        {
            using var scope = authFactory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == email);
            user.Role = UserRole.Admin;
            await db.SaveChangesAsync();
        }
        var loginResponse = await authClient.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "Password123!"
        });

        var content = await loginResponse.Content.ReadAsStringAsync();
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK, content);
        var json = JsonSerializer.Deserialize<JsonElement>(content, _jsonOptions);
        return json.GetProperty("accessToken").GetString()!;
    }

    // ==================== Cart Tests ====================

    [Fact]
    public async Task Checkout_Yape_ProofRequiresStaffConfirmationAndTracksDelivery()
    {
        // Isolate the complete two-account workflow from the shared login rate-limit window.
        using var factory = new CustomWebAppFactory();
        using var customer = factory.CreateClient();
        customer.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await GetAuthTokenAsync(factory: factory));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await db.Products.Include(p => p.Variants).FirstAsync(p => p.Variants.Any(v => v.Quantity > 0));
        var variant = product.Variants.First(v => v.Quantity > 0);
        var originalStock = variant.Quantity;

        var addressResponse = await customer.PostAsJsonAsync("/api/v1/Address/add", new
        {
            fullName = "Yape Tester", phoneNumber = "999111222", department = "Lima",
            province = "Lima", district = "Miraflores", postalCode = "150122",
            houseName = "Test 123", place = "Lima", reference = "Test reference", landMark = "Test landmark"
        });
        addressResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var address = await addressResponse.Content.ReadFromJsonAsync<JsonElement>();
        var addressId = address.GetProperty("data").GetProperty("addressId").GetGuid();
        (await customer.PostAsJsonAsync("/api/v1/Cart/add", new
        {
            productId = product.Id, productVariantId = variant.Id, quantity = 1
        })).StatusCode.Should().Be(HttpStatusCode.OK);
        var placedResponse = await customer.PostAsJsonAsync("/api/v1/Order/place-order", new
        {
            addressId, transactionId = $"YAPE_{Guid.NewGuid():N}", paymentMethod = "yape"
        });
        placedResponse.StatusCode.Should().Be(HttpStatusCode.OK, await placedResponse.Content.ReadAsStringAsync());
        var placed = await placedResponse.Content.ReadFromJsonAsync<JsonElement>();
        var orderId = placed.GetProperty("orderId").GetGuid();
        var detail = await customer.GetFromJsonAsync<OrderDetailsResponseDto>($"/api/v1/Order/{orderId}");
        detail!.PaymentMethod.Should().Be("yape");
        detail.IsPaid.Should().BeFalse();
        detail.OrderStatus.Should().Be("Pending");
        detail.TotalPrice.Should().Be(product.Price - product.Discount);
        factory.Notifications.Verify(n => n.SendOrderConfirmationEmailAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.Is<OrderDetailsResponseDto>(o => o.OrderId == orderId)), Times.Once);
        await db.Entry(variant).ReloadAsync();
        variant.Quantity.Should().Be(originalStock - 1);
        var cart = await customer.GetFromJsonAsync<JsonElement>("/api/v1/Cart");
        cart.GetProperty("items").GetArrayLength().Should().Be(0);

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "file", "test-receipt.pdf");
        var uploaded = await customer.PostAsync("/api/v1/Payment/upload-voucher", form);
        uploaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var upload = await uploaded.Content.ReadFromJsonAsync<JsonElement>();
        var url = upload.GetProperty("url").GetString()!;
        var storage = scope.ServiceProvider.GetRequiredService<Ecommerce.Api.Services.PaymentReceiptStorage>();
        try
        {
            (await customer.PostAsJsonAsync($"/api/v1/Order/{orderId}/voucher", new { url, approvalCode = "123456" }))
                .StatusCode.Should().Be(HttpStatusCode.OK);
            detail = await customer.GetFromJsonAsync<OrderDetailsResponseDto>($"/api/v1/Order/{orderId}");
            detail!.PaymentReceiptUrl.Should().Be(url);
            detail.PaymentApprovalCode.Should().Be("123456");
            detail.IsPaid.Should().BeFalse();
            detail.OrderStatus.Should().Be("Pending");
            (await customer.PostAsync($"/api/v1/Order/{orderId}/mark-paid", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);

            using var staff = factory.CreateClient();
            staff.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await GetAuthTokenAsync(admin: true, factory: factory));
            (await staff.PostAsync($"/api/v1/Order/{orderId}/mark-paid", null)).StatusCode.Should().Be(HttpStatusCode.OK);
            (await staff.PostAsync($"/api/v1/Order/{orderId}/mark-paid", null)).StatusCode.Should().Be(HttpStatusCode.OK);
            detail = await customer.GetFromJsonAsync<OrderDetailsResponseDto>($"/api/v1/Order/{orderId}");
            detail!.IsPaid.Should().BeTrue();
            detail.OrderStatus.Should().Be("Processing");
            foreach (var status in new[] { "Shipped", "Delivered" })
            {
                (await staff.PutAsJsonAsync($"/api/v1/Order/change-status/{orderId}", new { status })).StatusCode.Should().Be(HttpStatusCode.OK);
                detail = await customer.GetFromJsonAsync<OrderDetailsResponseDto>($"/api/v1/Order/{orderId}");
                detail!.OrderStatus.Should().Be(status);
                detail.IsPaid.Should().BeTrue();
                factory.Notifications.Verify(n => n.SendOrderStatusUpdateEmailAsync(
                    It.IsAny<string>(), It.IsAny<string>(), orderId.ToString(), status), Times.Once);
            }
            await db.Entry(variant).ReloadAsync();
            variant.Quantity.Should().Be(originalStock - 1);
        }
        finally
        {
            File.Delete(Path.Combine(storage.DirectoryPath, Path.GetFileName(url)));
        }
    }

    [Fact]
    public async Task PaymentVoucher_UploadStoresAndServesExactFile()
    {
        var token = await GetAuthTokenAsync();
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBfQAAAAASUVORK5CYII=");
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "receipt.png");

        var response = await client.PostAsync("/api/v1/Payment/upload-voucher", form);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var url = result.GetProperty("url").GetString()!;
        var storedName = url["/uploads/payments/".Length..];
        Guid.TryParseExact(Path.GetFileNameWithoutExtension(storedName), "D", out _).Should().BeTrue();

        using var scope = _factory.Services.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<Ecommerce.Api.Services.PaymentReceiptStorage>();
        var path = Path.Combine(storage.DirectoryPath, storedName);
        try
        {
            (await File.ReadAllBytesAsync(path)).Should().Equal(bytes);
            var download = await client.GetAsync(url);
            download.StatusCode.Should().Be(HttpStatusCode.OK);
            (await download.Content.ReadAsByteArrayAsync()).Should().Equal(bytes);
            download.Headers.CacheControl!.NoStore.Should().BeTrue();
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task PaymentVoucher_RejectsAnonymousUpload()
    {
        using var client = _factory.CreateClient();
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(new byte[] { 1 }), "file", "receipt.png");
        var response = await client.PostAsync("/api/v1/Payment/upload-voucher", form);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Checkout_CashOnDelivery_CancelRestoresStockOnlyOnce()
    {
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await db.Products.Include(p => p.Variants).FirstAsync(p => p.Variants.Any(v => v.Quantity >= 2));
        var variant = product.Variants.First(v => v.Quantity >= 2);
        var originalStock = variant.Quantity;

        var addressResponse = await _client.PostAsJsonAsync("/api/v1/Address/add", new
        {
            fullName = "Checkout Tester", phoneNumber = "999111222", department = "Lima",
            province = "Lima", district = "Miraflores", postalCode = "150122",
            houseName = "Test 123", place = "Lima", reference = "Test reference", landMark = "Test landmark"
        });
        addressResponse.StatusCode.Should().Be(HttpStatusCode.OK, await addressResponse.Content.ReadAsStringAsync());
        var address = await addressResponse.Content.ReadFromJsonAsync<JsonElement>();
        var addressId = address.GetProperty("data").GetProperty("addressId").GetGuid();

        var cartResponse = await _client.PostAsJsonAsync("/api/v1/Cart/add", new
        {
            productId = product.Id, productVariantId = variant.Id, quantity = 2
        });
        cartResponse.StatusCode.Should().Be(HttpStatusCode.OK, await cartResponse.Content.ReadAsStringAsync());

        var orderResponse = await _client.PostAsJsonAsync("/api/v1/Order/place-order", new
        {
            addressId, transactionId = $"COD_{Guid.NewGuid():N}", paymentMethod = "cod"
        });
        orderResponse.StatusCode.Should().Be(HttpStatusCode.OK, await orderResponse.Content.ReadAsStringAsync());
        var placed = await orderResponse.Content.ReadFromJsonAsync<JsonElement>();
        var orderId = placed.GetProperty("orderId").GetGuid();
        var order = await db.Orders.SingleAsync(o => o.OrderId == orderId);
        order.TotalPrice.Should().Be(2 * (product.Price - product.Discount));
        order.IsPaid.Should().BeFalse();
        await db.Entry(variant).ReloadAsync();
        variant.Quantity.Should().Be(originalStock - 2);

        var emptyCart = await _client.GetFromJsonAsync<JsonElement>("/api/v1/Cart");
        emptyCart.GetProperty("items").GetArrayLength().Should().Be(0);

        var detailResponse = await _client.GetAsync($"/api/v1/Order/{orderId}");
        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var cancelResponse = await _client.PostAsJsonAsync($"/api/v1/Order/{orderId}/cancel", new
        {
            reason = "Integration test cancellation"
        });
        cancelResponse.StatusCode.Should().Be(HttpStatusCode.OK, await cancelResponse.Content.ReadAsStringAsync());
        await db.Entry(variant).ReloadAsync();
        variant.Quantity.Should().Be(originalStock);

        var repeatResponse = await _client.PostAsJsonAsync($"/api/v1/Order/{orderId}/cancel", new
        {
            reason = "Repeat cancellation must not increase stock"
        });
        repeatResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await db.Entry(variant).ReloadAsync();
        variant.Quantity.Should().Be(originalStock);
    }

    [Fact]
    public async Task GetCart_AuthenticatedUser_Returns200()
    {
        // Arrange — get a valid token
        var token = await GetAuthTokenAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/Cart");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert — empty cart should still return 200
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetCart_Guest_Returns200()
    {
        // Act — no token
        var response = await _client.GetAsync("/api/v1/Cart");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AddToCart_InvalidProduct_Returns400()
    {
        // Arrange — get a valid token
        var token = await GetAuthTokenAsync();

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/Cart/Add")
        {
            Content = JsonContent.Create(new
            {
                productId = Guid.NewGuid(), // Non-existent product
                quantity = 1
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert — should fail because product doesn't exist
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
