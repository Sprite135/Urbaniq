using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.Helpers;
using FluentAssertions;

namespace Ecommerce.UnitTests.Helpers;

public class DeliveryHelperTests
{
    [Theory]
    [InlineData("Lima", "Lima", DeliveryHelper.LimaMetropolitana)]
    [InlineData("Callao", "Callao", DeliveryHelper.LimaMetropolitana)]
    [InlineData(" lima ", " callao ", DeliveryHelper.LimaMetropolitana)]
    [InlineData("Lima", "Huaral", DeliveryHelper.Provincias)]
    [InlineData("Arequipa", "Arequipa", DeliveryHelper.Provincias)]
    public void ResolveZone_ClassifiesDeliveryArea(string department, string province, string expected)
        => DeliveryHelper.ResolveZone(department, province).Should().Be(expected);

    [Fact]
    public void CalculateShippingCost_AppliesConfiguredFeesAndFreeShippingThreshold()
    {
        var settings = new ShippingSettings { LimaMetropolitanaFee = 12, ProvinceFee = 25, FreeShippingThreshold = 500 };
        DeliveryHelper.CalculateShippingCost(DeliveryHelper.LimaMetropolitana, 200, settings).Should().Be(12);
        DeliveryHelper.CalculateShippingCost(DeliveryHelper.Provincias, 200, settings).Should().Be(25);
        DeliveryHelper.CalculateShippingCost(DeliveryHelper.Provincias, 500, settings).Should().Be(0);
    }
}
