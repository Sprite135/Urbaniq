using System.Net;
using System.Net.Http.Json;
using Ecommerce.Application.Common.Settings;
using Ecommerce.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace Ecommerce.IntegrationTests.Controllers;

public class PaymentConfigurationTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;

    public PaymentConfigurationTests(CustomWebAppFactory factory)
    {
        _client = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ShippingSettings:LimaMetropolitanaFee"] = "12",
                ["ShippingSettings:ProvinceFee"] = "25",
                ["ShippingSettings:FreeShippingThreshold"] = "500"
            }))).CreateClient();
    }

    [Fact]
    public async Task ShippingConfig_IsPublicAndReturnsServerFees()
    {
        var response = await _client.GetAsync("/api/v1/Payment/shipping-config");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<ShippingSettings>();
        settings.Should().NotBeNull();
        settings!.LimaMetropolitanaFee.Should().Be(12);
        settings.ProvinceFee.Should().Be(25);
        settings.FreeShippingThreshold.Should().Be(500);
    }
}
