using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ecommerce.IntegrationTests.Fixtures;
using FluentAssertions;

namespace Ecommerce.IntegrationTests.Controllers;

/// <summary>
/// Integration tests for ProductController — tests admin authorization,
/// public product retrieval, and role-based access enforcement.
/// </summary>
public class ProductControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebAppFactory _factory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ProductControllerTests(CustomWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    /// <summary>
    /// Helper method to register a user and return their JWT access token.
    /// </summary>
    private async Task<string> GetUserTokenAsync(string role = "User")
    {
        var email = $"product_test_{Guid.NewGuid():N}@gmail.com";

        // Register
        await _client.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Product Tester",
            email,
            password = "Password123!"
        });

        await _factory.VerifyEmailAsync(email);
        // Login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "Password123!"
        });

        var content = await loginResponse.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(content, _jsonOptions);
        return json.GetProperty("accessToken").GetString()!;
    }

    // ==================== Public Endpoint Tests ====================

    [Fact]
    public async Task GetAllProducts_Returns200()
    {
        // Act — public endpoint, no auth needed
        var response = await _client.GetAsync("/api/v1/Product/All");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ==================== Authorization Tests ====================

    [Fact]
    public async Task AddProduct_NoAuth_Returns401()
    {
        // Act — try to add product without a token
        var content = new MultipartFormDataContent
        {
            { new StringContent("Test Product"), "ProductName" },
            { new StringContent("999"), "Price" },
            { new StringContent("10"), "Quantity" }
        };

        var response = await _client.PostAsync("/api/v1/Product/Add", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AddProduct_AsRegularUser_Returns403()
    {
        // Arrange — get a regular User token (not Admin)
        var token = await GetUserTokenAsync();

        var content = new MultipartFormDataContent
        {
            { new StringContent("User Product"), "ProductName" },
            { new StringContent("999"), "Price" },
            { new StringContent("10"), "Quantity" },
            { new StringContent("0"), "Discount" },
            { new StringContent("Test description"), "Description" },
            { new StringContent("M"), "Size" },
            { new StringContent("Black"), "Color" },
            { new StringContent("1"), "CategoryId" }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/Product/Add")
        {
            Content = content
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert — regular users cannot add products
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ==================== Health Check ====================

    [Fact]
    public async Task HealthCheck_Returns200()
    {
        // Act
        var response = await _client.GetAsync("/health");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK, "Because the health check failed with content: " + content);
    }
}
