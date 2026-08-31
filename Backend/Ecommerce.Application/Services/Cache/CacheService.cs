using Ecommerce.Application.Interfaces.Cache;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Ecommerce.Application.Services.Cache
{
    public class CacheService : ICacheService
    {
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
            var value = await _cache.GetStringAsync(key);
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
            await _cache.SetStringAsync(key, serialized, options);
        }

        public async Task RemoveAsync(string key)
        {
            await _cache.RemoveAsync(key);
        }

        public async Task RemoveByPrefixAsync(string prefix)
        {
            // Note: IDistributedCache doesn't support prefix-based removal natively
            // In production with Redis, you'd use KEYS command or scan
            // For now, this is a placeholder - in a real app you'd maintain a set of keys
            // or use a Redis-specific implementation
        }
    }
}