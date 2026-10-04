"""Recompute every number the page's JavaScript shows, independently of the JavaScript, and print JSON.
check_page.mjs compares this with what the page computes. Run from src/: python3 recompute.py (stdlib only)."""
import base64, hashlib, hmac, json, os
H = os.path.dirname(os.path.abspath(__file__))
ex = json.load(open(os.path.join(H, 'inputs', 'exchanges.json')))
pg = json.load(open(os.path.join(H, 'inputs', 'pagination_pg.json')))
deep = pg['results'][-1]
w = ex['webhook']
sig = 'v1,' + base64.b64encode(hmac.new(w['secret'].encode(), f"{w['id']}.{w['timestamp']}.{w['payload']}".encode(), hashlib.sha256).digest()).decode()
def body(k): return json.loads(ex[k]['response'].split('\r\n\r\n', 1)[1])
out = {
    'deep_off': round(deep['offset']['ms']), 'deep_ks': deep['keyset']['ms'],
    'ratio': round(deep['offset']['ms'] / deep['keyset']['ms']),
    'webhook_sig_matches_capture': sig == w['signature'],
    'webhook_sig': sig,
    # credits as the captures show them: first message 1000 -> 990, the retry still 990
    'credits_after_first': body('msg_first')['credits_left'], 'credits_after_retry': body('msg_retry')['credits_left'],
    'replayed_header': 'idempotent-replayed: true' in ex['msg_retry']['response'],
    'statuses': {k: int(ex[k]['response'].split(' ', 2)[1]) for k in ['msg_nokey', 'msg_first', 'msg_retry', 'msg_mismatch', 'msg_concurrent', 'rate_limited']},
    # animation end states (charged credits): before = two charges, after = one, in every scenario
    'idem_charged': {'lost': {'before': 20, 'after': 10}, 'conc': {'before': 20, 'after': 10}, 'diff': {'before': 20, 'after': 10}},
    # drift animation (8 chats H..A newest first, pages of 3, X inserted after page 1, G deleted after page 2):
    # offset pages are positions 0-2, 3-5, 6-8 of the current list: H G F | F E D | B A -> 8 shown, F twice, C never;
    # rows read = offset + returned: 3 + (3+3) + (6+2) = 17. Keyset: H G F | E D C | B A, reads only returned rows 3+3+2 = 8
    'drift': {'off': {'shown': 8, 'dups': 1, 'miss': 1, 'read': 3 + 6 + 8}, 'ks': {'shown': 8, 'dups': 0, 'miss': 0, 'read': 3 + 3 + 2}},
    'timing': ex['timing'],
}
print(json.dumps(out, indent=1))
