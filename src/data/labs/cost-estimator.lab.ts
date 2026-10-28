import type { Lab } from './types';

export const lab: Lab = {
  id: 'cost-estimator',
  title: 'Estimate a monthly model bill',
  level: 'basic',
  minutes: 10,
  lesson: 'cost/cost-levers',
  goal: 'A model bill is requests times tokens times a price, with output tokens priced separately and cached input tokens discounted. Write the estimate, then see what prompt caching saves. All prices here are examples, not real quotes; check your provider for current prices.',
  steps: [
    'Write monthly_cost: price the input tokens and the output tokens separately. Prices are in dollars per million tokens.',
    'A cache_hit_rate share of the input tokens is served from the cache and costs price_in times (1 - cache_discount). The rest cost the full input price.',
    'Write caching_savings: the dollars per month saved by caching, compared with the same traffic with no cache hits.',
  ],
  starter: `def monthly_cost(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m,
                 cache_hit_rate=0.0, cache_discount=0.9):
    # requests: calls per month. input_tokens, output_tokens: per call.
    # Prices are example dollars per million tokens. cache_hit_rate is a share from 0 to 1 of the
    # input tokens served from the cache, which cost price_in * (1 - cache_discount).
    # Raise ValueError if cache_hit_rate is below 0 or above 1.
    # TODO
    ...

def caching_savings(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m,
                    cache_hit_rate, cache_discount=0.9):
    # Dollars per month saved compared with no cache hits at all.
    # TODO
    ...

# Example prices: 3 dollars per million input tokens, 15 per million output tokens.
print(monthly_cost(1000, 1000, 500, 3, 15))
`,
  solution: `def monthly_cost(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m,
                 cache_hit_rate=0.0, cache_discount=0.9):
    if not 0 <= cache_hit_rate <= 1:
        raise ValueError("cache_hit_rate must be between 0 and 1")
    cached_price = price_in_per_m * (1 - cache_discount)
    input_price = (1 - cache_hit_rate) * price_in_per_m + cache_hit_rate * cached_price
    per_call = (input_tokens * input_price + output_tokens * price_out_per_m) / 1_000_000
    return requests * per_call

def caching_savings(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m,
                    cache_hit_rate, cache_discount=0.9):
    without = monthly_cost(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m, 0.0, cache_discount)
    with_cache = monthly_cost(requests, input_tokens, output_tokens, price_in_per_m, price_out_per_m, cache_hit_rate, cache_discount)
    return without - with_cache

# Example prices: 3 dollars per million input tokens, 15 per million output tokens.
print(monthly_cost(1000, 1000, 500, 3, 15))
`,
  tests: `
def _close(a, b):
    return abs(a - b) < 1e-9

check("1,000 calls of 1,000 tokens in and 500 out cost 10.50 at 3 and 15 per million",
      lambda: _close(monthly_cost(1000, 1000, 500, 3, 15), 10.5))

def _output_separate():
    base = monthly_cost(1000, 1000, 500, 3, 15)
    doubled = monthly_cost(1000, 1000, 500, 3, 30)
    assert _close(doubled - base, 7.5), "doubling the output price should add only the output part (7.50), got " + str(doubled - base)
check("output tokens are priced separately from input tokens", _output_separate)

def _scales():
    assert _close(monthly_cost(2000, 1000, 500, 3, 15), 2 * monthly_cost(1000, 1000, 500, 3, 15))
    assert _close(monthly_cost(0, 1000, 500, 3, 15), 0.0)
check("the bill scales with the number of requests, and zero requests cost nothing", _scales)

def _full_hits():
    # All input cached at a 90% discount: input drops from 3.00 to 0.30, output stays 7.50.
    assert _close(monthly_cost(1000, 1000, 500, 3, 15, cache_hit_rate=1.0, cache_discount=0.9), 7.8)
check("a hit rate of 1 prices all input at the cached price", _full_hits)

def _half_hits():
    # Input: half at 3, half at 0.30 = 1.65. Plus output 7.50.
    assert _close(monthly_cost(1000, 1000, 500, 3, 15, cache_hit_rate=0.5, cache_discount=0.9), 9.15)
check("a hit rate of 0.5 prices half the input at the cached price", _half_hits)

def _no_hits_no_change():
    assert _close(monthly_cost(1000, 1000, 500, 3, 15, cache_hit_rate=0.0, cache_discount=0.9), 10.5)
    assert _close(monthly_cost(1000, 1000, 500, 3, 15, cache_hit_rate=1.0, cache_discount=0.0), 10.5), "no discount means no saving"
check("no hits, or no discount, means no change", _no_hits_no_change)

def _bad_rate():
    for bad in (-0.1, 1.5):
        try:
            monthly_cost(1000, 1000, 500, 3, 15, cache_hit_rate=bad)
            assert False, "a hit rate of " + str(bad) + " should raise ValueError"
        except ValueError:
            pass
check("a cache hit rate outside 0 to 1 raises ValueError", _bad_rate)

def _savings():
    assert _close(caching_savings(1000, 1000, 500, 3, 15, cache_hit_rate=1.0), 2.7), "10.50 down to 7.80 saves 2.70"
    assert _close(caching_savings(1000, 1000, 500, 3, 15, cache_hit_rate=0.0), 0.0)
check("caching_savings is the difference between no caching and the given hit rate", _savings)
`,
  hints: [
    'Per call: input_tokens times the input price plus output_tokens times the output price, divided by 1,000,000. Multiply by requests.',
    'The effective input price is (1 - hit_rate) * price_in + hit_rate * price_in * (1 - cache_discount).',
    'caching_savings is monthly_cost with a hit rate of 0 minus monthly_cost with the given hit rate.',
  ],
};
