using Ecommerce.Application.Common.ProductOptions;
using FluentAssertions;

namespace Ecommerce.UnitTests.Common;

public class ProductOptionParserTests
{
    [Fact]
    public void ParseDeliveryCodes_NormalizesDigitsAndRemovesDuplicates()
    {
        var result = ProductOptionParser.ParseDeliveryCodes("150106, 673 002, 150106, invalid, 12");

        result.Should().Equal("150106", "673002");
    }

    [Fact]
    public void ParseDeliveryCodes_EmptyOrNull_ReturnsEmpty()
    {
        ProductOptionParser.ParseDeliveryCodes(null).Should().BeEmpty();
        ProductOptionParser.ParseDeliveryCodes("   ").Should().BeEmpty();
    }

    [Fact]
    public void NormalizeDeliveryCodes_FormatsUniqueSixDigitCodes()
    {
        var normalized = ProductOptionParser.NormalizeDeliveryCodes("150106,150106, 150103");

        normalized.Should().Be("150106, 150103");
    }

    [Fact]
    public void ParseOptionList_IsCaseInsensitiveForDuplicates()
    {
        var result = ProductOptionParser.ParseOptionList("Red, red, Blue");

        result.Should().Equal("Red", "Blue");
    }

    [Fact]
    public void NormalizeOptionCsv_JoinsDistinctOptions()
    {
        var normalized = ProductOptionParser.NormalizeOptionCsv("S, M, S");

        normalized.Should().Be("S, M");
    }
}
