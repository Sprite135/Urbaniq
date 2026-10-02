using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Application.Interfaces.Payment;
using Ecommerce.Application.Interfaces.Notifications;
using Ecommerce.Application.DTOs.Payment;
using Ecommerce.Domain.Common;
using Ecommerce.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Ecommerce.Api;

namespace Ecommerce.IntegrationTests.Fixtures;

/// <summary>
/// Custom WebApplicationFactory that replaces the real SQL Server database
/// with an EF Core In-Memory database, and mocks external services
/// (Cloudinary, Stripe) so tests run without any cloud dependencies.
/// </summary>
public class CustomWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"EcommerceTestDb_{Guid.NewGuid():N}";
    public Mock<INotificationService> Notifications { get; } = new();

    public async Task VerifyEmailAsync(string email)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(u => u.Email == email);
        user.IsEmailVerified = true;
        await context.SaveChangesAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configurationBuilder) =>
        {
            configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Integration tests need a deterministic but valid signing key
                // because the default placeholder is intentionally not production-usable.
                ["Jwt:Key"] = "IntegrationTestsJwtSigningKey_32BytesMin_2026",
                ["Jwt:Issuer"] = "https://localhost:5000",
                ["Jwt:Audience"] = "https://localhost:5000"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            var notifications = services.SingleOrDefault(d => d.ServiceType == typeof(INotificationService));
            if (notifications != null) services.Remove(notifications);
            services.AddScoped(_ => Notifications.Object);
            // ===== Remove the real SQL Server DbContext registration =====
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor != null) services.Remove(dbDescriptor);

            // Remove the real DbContext service itself
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AppDbContext));
            if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);

            // ===== Replace with In-Memory Database =====
            services.AddDbContext<AppDbContext>(options =>
            {
                // Reuse one in-memory store per factory instance so multi-request
                // scenarios (register -> login, duplicate checks) share state.
                options.UseInMemoryDatabase(_databaseName);
                // InMemory has no transaction support; SQL Server retains real transactions.
                options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
            });

            // ===== Mock Cloudinary — returns a fake image URL instead of uploading =====
            var cloudImageMock = new Mock<ICloudImageService>();
            cloudImageMock
                .Setup(s => s.UploadImageAsync(It.IsAny<Microsoft.AspNetCore.Http.IFormFile>()))
                .ReturnsAsync("https://test-cloudinary.com/fake-image.jpg");

            // Remove real Cloudinary service and replace with mock
            var cloudDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ICloudImageService));
            if (cloudDescriptor != null) services.Remove(cloudDescriptor);
            services.AddScoped(_ => cloudImageMock.Object);

            // ===== Mock Stripe — returns a fake PaymentIntent instead of calling Stripe API =====
            var stripeMock = new Mock<IPaymentGatewayService>();
            stripeMock
                .Setup(s => s.CreatePaymentIntentAsync(It.IsAny<decimal>()))
                .ReturnsAsync(new ApiResponse<PaymentIntentResponseDto>
                {
                    StatusCode = 200,
                    Message = "Payment Intent created",
                    Data = new PaymentIntentResponseDto
                    {
                        ClientSecret = "pi_test_secret_mock_12345",
                        PaymentIntentId = "pi_test_mock_12345"
                    }
                });
            stripeMock
                .Setup(s => s.VerifyPaymentAsync(It.IsAny<string>()))
                .ReturnsAsync(new ApiResponse<PaymentVerificationResponseDto>
                {
                    StatusCode = 200,
                    Message = "Payment verified successfully",
                    Data = new PaymentVerificationResponseDto
                    {
                        Status = "succeeded",
                        IsSuccessful = true
                    }
                });

            // Remove real Stripe service and replace with mock
            var stripeDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IPaymentGatewayService));
            if (stripeDescriptor != null) services.Remove(stripeDescriptor);
            services.AddScoped(_ => stripeMock.Object);

            // ===== Replace Redis with In-Memory Distributed Cache =====
            var redisDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(Microsoft.Extensions.Caching.Distributed.IDistributedCache));
            if (redisDescriptor != null) services.Remove(redisDescriptor);
            services.AddDistributedMemoryCache();

            // ===== Remove the Health Check for SQL Server (not available in tests) =====
            var healthCheckDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckService));
            // Health checks will use in-memory DB automatically
        });

        // Use test-specific configuration
        builder.UseEnvironment("Testing");
    }
}
