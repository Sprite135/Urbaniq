using System.Net;
using System.Xml.Linq;
using Ecommerce.IntegrationTests.Fixtures;
using Xunit;

namespace Ecommerce.IntegrationTests.Controllers;

public class SitemapControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;

    public SitemapControllerTests(CustomWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetSitemap_ReturnsNamespacedXmlWithOnlyExistingPublicPages()
    {
        var response = await _client.GetAsync("/sitemap.xml");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);

        var document = XDocument.Parse(await response.Content.ReadAsStringAsync());
        XNamespace sitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

        Assert.Equal(sitemapNamespace + "urlset", document.Root?.Name);
        Assert.Contains(document.Root!.Elements(sitemapNamespace + "url"), entry =>
            ((string?)entry.Element(sitemapNamespace + "loc"))?.EndsWith("/help", StringComparison.OrdinalIgnoreCase) == true);
        Assert.DoesNotContain(document.Root.Elements(sitemapNamespace + "url"), entry =>
            ((string?)entry.Element(sitemapNamespace + "loc"))?.EndsWith("/faq", StringComparison.OrdinalIgnoreCase) == true);
    }

    [Fact]
    public async Task GetSitemap_UsesRequestHostWhenConfiguredBaseUrlIsLocal()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/sitemap.xml");
        request.Headers.Host = "shop.example";

        var response = await _client.SendAsync(request);
        var document = XDocument.Parse(await response.Content.ReadAsStringAsync());
        XNamespace sitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(document.Root!.Elements(sitemapNamespace + "url"), entry =>
            ((string?)entry.Element(sitemapNamespace + "loc"))?.StartsWith("http://shop.example/", StringComparison.OrdinalIgnoreCase) == true);
    }
}
