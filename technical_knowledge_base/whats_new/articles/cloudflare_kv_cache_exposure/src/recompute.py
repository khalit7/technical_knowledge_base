"""Recompute every number the page's pool-check widget shows, from the post's numbers and SGLang's own length rule.

  python3 recompute.py      (writes inputs/recompute.json; mk_article.py ships it to the page as window.ARTICLE.recompute,
                             and check_page.mjs compares the widget's JavaScript with it)

Inputs (all integers, so no rounding questions):
  context window 1,048,576 tokens and prefill KV pool 681,280 tokens as launched (the post, "What happened");
  the pool after the fix is "about 2.04 million tokens" (the post, "Immediate remediation"): 2,040,000 is used here;
  SGLang's length rule at v0.5.19 (the last release without the fix): max_req_len = min(context_len - 1, pool - 1)
  (tp_worker.py, get_worker_info, L543-556), the scheduler's limit is max_req_len - 5, and a prompt is rejected when
  len(prompt) >= that limit (managers/utils.py, validate_input_length, L219);
  page size 64 tokens: illustrative, the value issue #30233 reported for a GLM-5.2 deployment (Cloudflare does not say its own).
On the rejection path before the fix the prompt is replaced by a one-token placeholder (schedule_batch.py,
set_finish_with_abort, L1941-1946), so prefill writes 1 token and decode attends over the whole reservation.
"""
import json, os

CTX, POOL_LAUNCH, POOL_FIXED, PAGE = 1048576, 681280, 2040000, 64


def limit(ctx, pool):
    return min(ctx - 1, pool - 1) - 5


def path(L, pool, fixed_engine, ctx=CTX, page=PAGE):
    lim = limit(ctx, pool)
    reserved = -(-L // page)
    if L < lim:
        return dict(route='normal', http=200, reserved=reserved, written_tokens=L, written_pages=reserved, stale_tokens=0, own_share=1.0)
    if fixed_engine:
        return dict(route='rejected, retired before handoff', http=400, reserved=0, written_tokens=0, written_pages=0, stale_tokens=0, own_share=None)
    return dict(route='rejected, handed off anyway', http=200, reserved=reserved, written_tokens=1, written_pages=1, stale_tokens=L - 1, own_share=1 / L)


out = {'ctx': CTX, 'pool_launch': POOL_LAUNCH, 'pool_fixed': POOL_FIXED, 'page': PAGE,
       'limit_launch': limit(CTX, POOL_LAUNCH), 'limit_fixed': limit(CTX, POOL_FIXED),
       'pool_over_ctx_launch': POOL_LAUNCH / CTX, 'pool_over_ctx_fixed': POOL_FIXED / CTX, 'cases': []}
for L in (500000, 681273, 681274, 700000, 1000000):
    for pool in ('launch', 'fixed'):
        for fe in (False, True):
            out['cases'].append(dict(L=L, pool=pool, fixed_engine=fe, **path(L, POOL_LAUNCH if pool == 'launch' else POOL_FIXED, fe)))
os.makedirs(os.path.join(os.path.dirname(__file__), 'inputs'), exist_ok=True)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'recompute.json'), 'w'), indent=1)
print('limit as launched', out['limit_launch'], '; after the fix', out['limit_fixed'], '; pool/context', round(out['pool_over_ctx_launch'], 4), round(out['pool_over_ctx_fixed'], 4))
for c in out['cases']:
    if c['pool'] == 'launch' and not c['fixed_engine']: print(c['L'], c['route'], c['reserved'], c['stale_tokens'])
