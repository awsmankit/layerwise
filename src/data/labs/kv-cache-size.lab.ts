import type { Lab } from './types';

export const lab: Lab = {
  id: 'kv-cache-size',
  title: 'How much memory does the KV cache need?',
  level: 'basic',
  minutes: 12,
  lesson: 'serving/kv-cache-and-memory',
  goal: 'The weights are a fixed cost, but the KV cache grows with every token and every user, so it decides how many requests one GPU can serve. Turn the lesson\'s formula into code and answer the question a platform engineer gets asked: how many users fit?',
  steps: [
    'kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per_value) is 2 (a key and a value) x layers x KV heads x head dimension x bytes per value.',
    'kv_cache_bytes(per_token, tokens, users) is the per-token size times context length times concurrent users.',
    'max_users(gpu_gb, weights_gb, per_token, context_tokens, overhead_gb=0) is how many full-context users fit in what is left after the weights and the overhead. Use 1 GB = 1,000,000,000 bytes, as the lesson\'s calculator does. If nothing is left, the answer is 0.',
  ],
  starter: `def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per_value):
    # TODO: keys and values, for every layer and every KV head
    ...

def kv_cache_bytes(per_token, tokens, users):
    # TODO
    ...

def max_users(gpu_gb, weights_gb, per_token, context_tokens, overhead_gb=0):
    # TODO: whole users only
    ...

# An 8B-class model: 32 layers, 8 KV heads of size 128, cache stored in 16 bits (2 bytes)
per_token = kv_bytes_per_token(32, 8, 128, 2)
print(per_token, "bytes per token")
print(kv_cache_bytes(per_token, 8192, 8), "bytes for 8 users at 8,192 tokens")
`,
  solution: `def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per_value):
    return 2 * layers * kv_heads * head_dim * bytes_per_value

def kv_cache_bytes(per_token, tokens, users):
    return per_token * tokens * users

def max_users(gpu_gb, weights_gb, per_token, context_tokens, overhead_gb=0):
    free_bytes = (gpu_gb - weights_gb - overhead_gb) * 1e9
    if free_bytes <= 0:
        return 0
    return int(free_bytes // (per_token * context_tokens))

# An 8B-class model: 32 layers, 8 KV heads of size 128, cache stored in 16 bits (2 bytes)
per_token = kv_bytes_per_token(32, 8, 128, 2)
print(per_token, "bytes per token")
print(kv_cache_bytes(per_token, 8192, 8), "bytes for 8 users at 8,192 tokens")
`,
  tests: `
check("the 8B-class model needs 131,072 bytes (128 KiB) of cache per token", lambda: kv_bytes_per_token(32, 8, 128, 2) == 131072)
check("storing the cache in 8 bits halves it", lambda: kv_bytes_per_token(32, 8, 128, 1) == 65536)
check("the 70B-class model (80 layers, 8 KV heads) needs 327,680 bytes per token", lambda: kv_bytes_per_token(80, 8, 128, 2) == 327680)
check("grouped-query attention helps: 8 KV heads instead of 32 gives a cache 4 times smaller", lambda: kv_bytes_per_token(32, 32, 128, 2) == 4 * kv_bytes_per_token(32, 8, 128, 2))
check("8 users at 8,192 tokens need 8,589,934,592 bytes (8.59 GB)", lambda: kv_cache_bytes(131072, 8192, 8) == 8589934592)
check("the cache grows with users: double the users, double the cache", lambda: kv_cache_bytes(131072, 4096, 6) == 2 * kv_cache_bytes(131072, 4096, 3))
check("a 24 GB GPU with 16 GB of weights fits 7 users at 8,192 tokens", lambda: max_users(24, 16, 131072, 8192) == 7)
check("2 GB of overhead cuts that to 5 users", lambda: max_users(24, 16, 131072, 8192, overhead_gb=2) == 5)
check("an 80 GB GPU fits 59 users", lambda: max_users(80, 16, 131072, 8192) == 59)
check("weights that do not fit leave no users, not a negative number", lambda: max_users(24, 30, 131072, 8192) == 0)
check("the answer is a whole number of users", lambda: isinstance(max_users(24, 16, 131072, 8192), int))
`,
  hints: [
    'The formula is on the lesson page: 2 x layers x KV heads x head dimension x bytes per value.',
    'Free memory for the cache is gpu_gb - weights_gb - overhead_gb. Convert it to bytes with * 1e9.',
    'Divide the free bytes by the cache one user needs (per_token * context_tokens), and round down with //. Return 0 if free memory is zero or negative.',
  ],
};
