using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ecommerce.IntegrationTests.Fixtures;
using FluentAssertions;

namespace Ecommerce.IntegrationTests.Controllers;

/// <summary>
/// Integration tests for AuthController — tests the full HTTP pipeline
/// from request → middleware → controller → service → database → response.
/// </summary>
public class AuthControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebAppFactory _factory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthControllerTests(CustomWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ==================== Registration Tests ====================

    [Fact]
    public async Task Register_ValidUser_Returns200()
    {
        // Arrange
        var request = new
        {
            name = "Integration User",
            email = $"integration_{Guid.NewGuid():N}@gmail.com", // Unique email per test run
            password = "Password123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/Auth/register", request);

        // Assert
        var content = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, "Response Body: " + content);
        content.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        // Arrange — register a user first
        var email = $"duplicate_{Guid.NewGuid():N}@gmail.com";
        var request = new { name = "First User", email, password = "Password123!" };

        await _client.PostAsJsonAsync("/api/v1/Auth/register", request);

        // Act — try to register again with the same email
        var duplicateRequest = new { name = "Second User", email, password = "Password456!" };
        var response = await _client.PostAsJsonAsync("/api/v1/Auth/register", duplicateRequest);

        // Assert — should be rejected
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ==================== Login Tests ====================

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokens()
    {
        // Arrange — create a user first
        var email = $"login_{Guid.NewGuid():N}@gmail.com";
        await _client.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Login User", email, password = "Password123!"
        });

        await _factory.VerifyEmailAsync(email);
        // Act — login with the same credentials
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "Password123!"
        });

        var content = await loginResponse.Content.ReadAsStringAsync();
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK, "Response Body: " + content);
        var json = JsonSerializer.Deserialize<JsonElement>(content, _jsonOptions);

        json.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        json.GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns400()
    {
        // Arrange — create a user
        var email = $"wrongpass_{Guid.NewGuid():N}@gmail.com";
        await _client.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Wrong Pass User", email, password = "CorrectPassword123!"
        });

        // Act — login with wrong password
        var response = await _client.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "WrongPassword999!"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ==================== Authorization Tests ====================

    [Fact]
    public async Task Login_UnverifiedEmail_Returns401()
    {
        var email = $"unverified_{Guid.NewGuid():N}@gmail.com";
        await _client.PostAsJsonAsync("/api/v1/Auth/register", new
        {
            name = "Unverified User", email, password = "Password123!"
        });
        var response = await _client.PostAsJsonAsync("/api/v1/Auth/login", new
        {
            email, password = "Password123!"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PlaceOrder_NoToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/Order/place-order", new
        {
            addressId = Guid.NewGuid(), transactionId = "anonymous", paymentMethod = "cod"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProtectedEndpoint_NoToken_Returns401()
    {
        // Act — call a protected endpoint without any JWT token
        var response = await _client.GetAsync("/api/v1/Order/user-orders");

        // Assert — must be rejected with 401 Unauthorized
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
