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

        public SitemapController(
            IRepository<Product> productRepo,
            IRepository<Category> categoryRepo,
            IConfiguration configuration)
        {
            _productRepo = productRepo;
            _categoryRepo = categoryRepo;
            _configuration = configuration;
        }

        [HttpGet("sitemap.xml")]
        [Produces("application/xml")]
        public async Task<IActionResult> GetSitemap()
        {
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://urbaniq.com";
            
            var sitemap = new XDocument(new XElement("urlset", new XAttribute("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")));

            // Static pages
            var staticPages = new[]
            {
                "",
                "/catalog",
                "/about",
                "/contact",
                "/faq"
            };

            foreach (var page in staticPages)
            {
                sitemap.Root!.Add(new XElement("url",
                    new XElement("loc", $"{baseUrl}{page}"),
                    new XElement("changefreq", "weekly"),
                    new XElement("priority", page == "" ? "1.0" : "0.8")
                ));
            }

            // Products
            var products = await _productRepo.Query()
                .Where(p => !p.IsDeleted)
                .Select(p => new { p.Slug, p.UpdatedAtUtc })
                .ToListAsync();

            foreach (var product in products)
            {
                sitemap.Root!.Add(new XElement("url",
                    new XElement("loc", $"{baseUrl}/product/{product.Slug}"),
                    new XElement("lastmod", product.UpdatedAtUtc?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd")),
                    new XElement("changefreq", "daily"),
                    new XElement("priority", "0.7")
                ));
            }

            // Categories
            var categories = await _categoryRepo.Query()
                .Where(c => !c.IsDeleted)
                .Select(c => new { c.Slug })
                .ToListAsync();

            foreach (var category in categories)
            {
                sitemap.Root!.Add(new XElement("url",
                    new XElement("loc", $"{baseUrl}/catalog?category={category.Slug}"),
                    new XElement("changefreq", "weekly"),
                    new XElement("priority", "0.6")
                ));
            }

            return Content(sitemap.ToString(), "application/xml");
        }

        [HttpGet("robots.txt")]
        [Produces("text/plain")]
        public IActionResult GetRobotsTxt()
        {
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "https://urbaniq.com";
            
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
    }
}