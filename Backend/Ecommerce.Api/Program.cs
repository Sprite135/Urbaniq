using Asp.Versioning;
using Ecommerce.Api.Mapping;
using Ecommerce.Api.Middleware;
using Ecommerce.Application;
using Ecommerce.Application.Common.Settings;
using Ecommerce.Infrastructure;
using Ecommerce.Infrastructure.Data;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net.Sockets;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// ===================== Logging =====================
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// ===================== Settings =====================
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
builder.Services.Configure<RazorPaySettings>(builder.Configuration.GetSection("RazorPaySettings"));
    builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection("StripeSettings"));
    builder.Services.Configure<ShippingSettings>(builder.Configuration.GetSection("ShippingSettings"));
    builder.Services.Configure<MerchantPaymentSettings>(builder.Configuration.GetSection("MerchantPaymentSettings"));

// ===================== Clean Architecture Layer Registrations =====================
builder.Services.AddApplication();                              // Application layer — services, validators
builder.Services.AddInfrastructure(builder.Configuration);      // Infrastructure — DbContext, repos, UoW, external services

// ===================== AutoMapper =====================
builder.Services.AddAutoMapper(cfg => cfg.AddMaps(typeof(MappingProfile).Assembly));

// ===================== FluentValidation =====================
builder.Services.AddFluentValidationAutoValidation()
    .AddFluentValidationClientsideAdapters();

// ===================== Caching (Redis/Memory) =====================
builder.Services.AddMemoryCache(); // Keep for internal ASP.NET features

var redisConnectionString = builder.Configuration.GetConnectionString("Redis");

// Detect placeholder values that should not be used as actual connection strings.
// In local dev, appsettings.json contains "SET_VIA_USER_SECRETS_OR_ENV_VAR" as a placeholder.
// StackExchange.Redis would hang for ~5s per operation trying to connect to this invalid host.
var isRedisConfigured = !string.IsNullOrWhiteSpace(redisConnectionString)
    && !redisConnectionString.StartsWith("SET_VIA", StringComparison.OrdinalIgnoreCase);

if (isRedisConfigured &&
    builder.Environment.IsDevelopment() &&
    IsLocalhostEndpoint(redisConnectionString!) &&
    !await CanConnectToRedisAsync(redisConnectionString!))
{
    isRedisConfigured = false;
}

if (!isRedisConfigured)
{
    // Fallback to in-memory IDistributedCache for local dev without Redis
    builder.Services.AddDistributedMemoryCache();
}
else
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = "Ecommerce_";
    });
}

// ===================== Authentication =====================
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>();
var hasValidJwtKey = jwtSettings != null &&
    !string.IsNullOrWhiteSpace(jwtSettings.Key) &&
    System.Text.Encoding.UTF8.GetByteCount(jwtSettings.Key) >= 32;

if (!hasValidJwtKey && builder.Environment.IsEnvironment("Testing"))
{
    builder.Configuration["Jwt:Key"] = "IntegrationTestsJwtSigningKey_32BytesMin_2026";
    builder.Configuration["Jwt:Issuer"] ??= "https://localhost:5000";
    builder.Configuration["Jwt:Audience"] ??= "https://localhost:5000";
    jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>();
    hasValidJwtKey = jwtSettings != null &&
        !string.IsNullOrWhiteSpace(jwtSettings.Key) &&
        System.Text.Encoding.UTF8.GetByteCount(jwtSettings.Key) >= 32;
}

// Now register the fully resolved settings into DI so AuthService gets the right key!
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

if (!hasValidJwtKey)
{
    throw new Exception("JWT Settings are missing or invalid in configuration.");
}
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    var resolvedJwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>();
    if (resolvedJwtSettings == null ||
        string.IsNullOrWhiteSpace(resolvedJwtSettings.Key) ||
        Encoding.UTF8.GetByteCount(resolvedJwtSettings.Key) < 32)
    {
        throw new Exception("JWT Settings are missing or invalid in configuration.");
    }

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = resolvedJwtSettings.Issuer,
        ValidAudience = resolvedJwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(resolvedJwtSettings.Key))
    };
});

// ===================== Authorization =====================
builder.Services.AddAuthorization();

// ===================== CORS =====================
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ===================== Forwarded Headers (proxy/TLS termination) =====================
// Trust X-Forwarded-* from the edge proxy (nginx) so client IP and scheme are correct.
// This is required for per-IP rate limiting and secure cookies to work behind a reverse proxy.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ===================== Rate Limiting =====================
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("LoginPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var path = context.Request.Path.Value ?? "/";
        if (!path.StartsWith("/api"))
        {
            return RateLimitPartition.GetNoLimiter("static");
        }
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ===================== API Versioning =====================
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// ===================== Response Compression =====================
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});

// ===================== Health Checks =====================
var healthChecks = builder.Services.AddHealthChecks();

if (!builder.Environment.IsEnvironment("Testing"))
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(connectionString))
    {
        healthChecks.AddSqlServer(connectionString);
    }
}

// ===================== Controllers & Swagger =====================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHostedService<Ecommerce.Api.HostedServices.AutoShipBackgroundService>();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Urbaniq E-commerce API", 
        Version = "v1.0",
        Description = "API completa para plataforma de e-commerce Urbaniq - Gestión de productos, órdenes, cupones, usuarios y más.",
        Contact = new OpenApiContact
        {
            Name = "Urbaniq Support",
            Email = "support@urbaniq.com"
        }
    });
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "Ecommerce.Api.xml"));
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token from /api/v1.0/Auth/login"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ===================== Forwarded Headers =====================
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | 
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    // Clear the restricted proxy list so it trusts the Docker Compose Nginx container's IP
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// ===================== Middleware Pipeline =====================
app.UseForwardedHeaders();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    app.UseHsts();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseResponseCompression();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// ===================== API Routes (PRIORITY) =====================
app.MapControllers();
app.MapHealthChecks("/health");

// ===================== Static Files & SPA =====================
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        ctx.Context.Response.Headers.Pragma = "no-cache";
    }
});

// ===================== Serve Frontend SPA =====================
var frontendDistPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "Frontend", "dist"));
var hasFrontendDist = Directory.Exists(frontendDistPath);

if (app.Environment.IsDevelopment() && !hasFrontendDist)
{
    // Proxy non-API, non-Swagger, non-health requests to Vite dev server in development
    app.MapWhen(context => 
        !context.Request.Path.StartsWithSegments("/api") && 
        !context.Request.Path.StartsWithSegments("/swagger") && 
        !context.Request.Path.StartsWithSegments("/health") &&
        !context.Request.Path.StartsWithSegments("/seed-pc-components"), 
        spaApp =>
        {
            spaApp.Run(async context =>
            {
                var viteServer = "http://localhost:5173";
                var targetUri = new Uri($"{viteServer}{context.Request.Path}{context.Request.QueryString}");
                
                using var client = new HttpClient();
                using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);
                
                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase)) continue;
                    request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                }
                
                if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
                {
                    request.Content = new StreamContent(context.Request.Body);
                }
                
                try
                {
                    using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                    context.Response.StatusCode = (int)response.StatusCode;
                    
                    foreach (var header in response.Headers)
                    {
                        context.Response.Headers[header.Key] = header.Value.ToArray();
                    }
                    foreach (var header in response.Content.Headers)
                    {
                        context.Response.Headers[header.Key] = header.Value.ToArray();
                    }
                    
                    context.Response.Headers.Remove("transfer-encoding");
                    await response.Content.CopyToAsync(context.Response.Body);
                }
                catch (HttpRequestException)
                {
                    context.Response.StatusCode = StatusCodes.Status502BadGateway;
                    context.Response.ContentType = "text/html";
                    await context.Response.WriteAsync("<html><body><h3>Vite development server is not running on port 5173.</h3><p>Please run <code>npm run dev</code> in the <b>Frontend</b> folder.</p></body></html>");
                }
            });
        });
}
else
{
    if (hasFrontendDist)
    {
        app.UseDefaultFiles(new DefaultFilesOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendDistPath)
        });
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendDistPath),
            OnPrepareResponse = ctx =>
            {
                ctx.Context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
                ctx.Context.Response.Headers.Pragma = "no-cache";
            }
        });
    }
    else
    {
        app.UseDefaultFiles();
        app.UseStaticFiles();
    }

    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = hasFrontendDist
            ? new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendDistPath)
            : null,
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
            ctx.Context.Response.Headers.Pragma = "no-cache";
        }
    });
}

// ===================== Database Seeding =====================
// Seeds the configured admin account (idempotent; reads AdminSettings). Skips if not configured.
await DbSeeder.SeedAdminAsync(app.Services);
if (app.Environment.IsDevelopment())
{
    await DbSeeder.SeedPcComponentsAsync(app.Services);
}

app.Run();

static bool IsLocalhostEndpoint(string connectionString)
{
    var endpoint = connectionString.Split(',', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
    var host = endpoint.Split(':', 2)[0].Trim('[', ']');

    return host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
        host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
        host.Equals("::1", StringComparison.OrdinalIgnoreCase);
}

static async Task<bool> CanConnectToRedisAsync(string connectionString)
{
    var endpoint = connectionString.Split(',', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
    var parts = endpoint.Split(':', 2);
    var host = parts[0].Trim('[', ']');
    var port = parts.Length > 1 && int.TryParse(parts[1], out var parsedPort) ? parsedPort : 6379;

    try
    {
        using var client = new TcpClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));
        await client.ConnectAsync(host, port, timeout.Token);
        return client.Connected;
    }
    catch
    {
        return false;
    }
}

public partial class Program { }
