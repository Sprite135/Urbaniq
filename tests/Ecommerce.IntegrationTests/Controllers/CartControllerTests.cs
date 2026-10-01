using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ecommerce.IntegrationTests.Fixtures;
using FluentAssertions;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
    private async Task<string> GetAuthTokenAsync()
    {
        var email = $"cart_test_{Guid.NewGuid():N}@gmail.com";

        await _client.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Cart Tester", email, password = "Password123!"
        });

        await _factory.VerifyEmailAsync(email);
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "Password123!"
        });

        var content = await loginResponse.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(content, _jsonOptions);
        return json.GetProperty("accessToken").GetString()!;
    }

    // ==================== Cart Tests ====================

    [Fact]
    public async Task Checkout_CashOnDelivery_CreatesOrderAndClearsCart()
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
