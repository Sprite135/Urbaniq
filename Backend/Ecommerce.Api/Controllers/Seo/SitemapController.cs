using Microsoft.AspNetCore.Mvc;
using System.Xml.Linq;
using Ecommerce.Domain.Interfaces;
using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers.Seo
{
    [ApiController]
    [Route("")]
    public class SitemapController : ControllerBase
    {
        private readonly IRepository<Product> _productRepo;
        private readonly IRepository<Category> _categoryRepo;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SitemapController> _logger;

        public SitemapController(
            IRepository<Product> productRepo,
            IRepository<Category> categoryRepo,
            IConfiguration configuration,
            ILogger<SitemapController> logger)
        {
            _productRepo = productRepo;
            _categoryRepo = categoryRepo;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("sitemap.xml")]
        [Produces("application/xml")]
        public async Task<IActionResult> GetSitemap()
        {
            XNamespace sitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
            var baseUrl = GetBaseUrl();
            var sitemap = new XDocument(new XElement(sitemapNamespace + "urlset"));

            // Static pages
            var staticPages = new[]
            {
                "",
                "/catalog",
                "/help"
            };

            foreach (var page in staticPages)
            {
                sitemap.Root!.Add(new XElement(sitemapNamespace + "url",
                    new XElement(sitemapNamespace + "loc", $"{baseUrl}{page}"),
                    new XElement(sitemapNamespace + "changefreq", "weekly"),
                    new XElement(sitemapNamespace + "priority", page == "" ? "1.0" : "0.8")
                ));
            }

            // Keep the public sitemap available if a catalog query temporarily fails.
            try
            {
                var products = await _productRepo.Query()
                    .Where(p => !p.IsDeleted)
                    .Select(p => new { p.Slug, p.UpdatedAtUtc })
                    .ToListAsync(HttpContext.RequestAborted);

                foreach (var product in products.Where(p => !string.IsNullOrWhiteSpace(p.Slug)))
                {
                    sitemap.Root!.Add(new XElement(sitemapNamespace + "url",
                        new XElement(sitemapNamespace + "loc", $"{baseUrl}/product/{Uri.EscapeDataString(product.Slug!)}"),
                        new XElement(sitemapNamespace + "lastmod", product.UpdatedAtUtc?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd")),
                        new XElement(sitemapNamespace + "changefreq", "daily"),
                        new XElement(sitemapNamespace + "priority", "0.7")
                    ));
                }

                var categories = await _categoryRepo.Query()
                    .Where(c => c.IsActive)
                    .Select(c => new { c.Slug })
                    .ToListAsync(HttpContext.RequestAborted);

                foreach (var category in categories.Where(c => !string.IsNullOrWhiteSpace(c.Slug)))
                {
                    sitemap.Root!.Add(new XElement(sitemapNamespace + "url",
                        new XElement(sitemapNamespace + "loc", $"{baseUrl}/catalog?category={Uri.EscapeDataString(category.Slug!)}"),
                        new XElement(sitemapNamespace + "changefreq", "weekly"),
                        new XElement(sitemapNamespace + "priority", "0.6")
                    ));
                }
            }
            catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Could not add catalog URLs to the sitemap; returning public pages only.");
            }

            return Content(sitemap.ToString(SaveOptions.DisableFormatting), "application/xml");
        }

        [HttpGet("robots.txt")]
        [Produces("text/plain")]
        public IActionResult GetRobotsTxt()
        {
            var baseUrl = GetBaseUrl();
            
            var robotsTxt = $@"User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /cart/
Disallow: /checkout/
Disallow: /account/

Sitemap: {baseUrl}/sitemap.xml";

            return Content(robotsTxt, "text/plain");
        }

        private string GetBaseUrl()
        {
            var configuredBaseUrl = _configuration["AppSettings:BaseUrl"]?.TrimEnd('/');
            var requestBaseUrl = $"{Request.Scheme}://{Request.Host}";
            var requestIsLocal = Uri.TryCreate(requestBaseUrl, UriKind.Absolute, out var requestUri) && requestUri.IsLoopback;

            if (Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var configuredUri) &&
                (configuredUri.Scheme == Uri.UriSchemeHttp || configuredUri.Scheme == Uri.UriSchemeHttps) &&
                (!configuredUri.IsLoopback || requestIsLocal))
            {
                return configuredBaseUrl!;
            }

            return requestBaseUrl;
        }
    }
}
