using Ecommerce.Application.Interfaces.Cache;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Ecommerce.Application.Services.Cache
{
    public class CacheService : ICacheService
    {
        private const string PrefixRegistryKey = "__urbaniq_cache_prefixes";
        private readonly IDistributedCache _cache;
        private readonly DistributedCacheEntryOptions _defaultOptions;

        public CacheService(IDistributedCache cache)
        {
            _cache = cache;
            _defaultOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
                SlidingExpiration = TimeSpan.FromMinutes(10)
            };
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var value = await _cache.GetStringAsync(await ResolveKeyAsync(key));
            if (string.IsNullOrEmpty(value))
                return default;

            try
            {
                return JsonSerializer.Deserialize<T>(value);
            }
            catch
            {
                return default;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            var options = expiry.HasValue
                ? new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = expiry }
                : _defaultOptions;

            var serialized = JsonSerializer.Serialize(value);
            await _cache.SetStringAsync(await ResolveKeyAsync(key), serialized, options);
        }

        public async Task RemoveAsync(string key)
        {
            await _cache.RemoveAsync(await ResolveKeyAsync(key));
        }

        public async Task RemoveByPrefixAsync(string prefix)
        {
            if (string.IsNullOrWhiteSpace(prefix)) throw new ArgumentException("Cache prefix is required.", nameof(prefix));
            var prefixes = await GetPrefixesAsync();
            if (!prefixes.Contains(prefix, StringComparer.Ordinal))
            {
                prefixes.Add(prefix);
                await _cache.SetStringAsync(PrefixRegistryKey, JsonSerializer.Serialize(prefixes));
            }
            // Versioned invalidation works with Redis, distributed memory, multiple instances,
            // and after restarts without using Redis KEYS/SCAN.
            await _cache.SetStringAsync(VersionKey(prefix), Guid.NewGuid().ToString("N"));
        }

        private async Task<string> ResolveKeyAsync(string key)
        {
            var parts = new List<string> { key };
            foreach (var prefix in (await GetPrefixesAsync()).Where(prefix => key.StartsWith(prefix, StringComparison.Ordinal)).OrderBy(x => x, StringComparer.Ordinal))
            {
                var version = await _cache.GetStringAsync(VersionKey(prefix)) ?? "0";
                parts.Add($"{prefix}:{version}");
            }
            return string.Join("|", parts);
        }

        private async Task<List<string>> GetPrefixesAsync()
        {
            var json = await _cache.GetStringAsync(PrefixRegistryKey);
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try { return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>(); }
            catch (JsonException) { return new List<string>(); }
        }

        private static string VersionKey(string prefix) => $"__urbaniq_cache_version:{prefix}";
    }
}
