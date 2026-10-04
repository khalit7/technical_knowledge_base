"""Extra run for pg_lab.py: the outbox relay with batch size 1 (one transaction per event) instead of 10.
uv run --no-project --python 3.12 --with pgserver --with "psycopg[binary]" python pg_lab_batch1.py OUT.json"""
import sys, json, time, functools, multiprocessing as mp
import pg_lab as L

def relay1(seed, p_crash, stop_at): return L.relay(seed, p_crash, stop_at, batch=1)

def exp(seed, n=500, p=0.05):
    L.setup_orders(); ctx = mp.get_context('spawn')
    pc = L.run_supervised(ctx, L.producer, lambda k: (seed * 100 + k, 'outbox', n, p))
    stop_at = time.time() + 120
    rc = L.run_supervised(ctx, relay1, lambda k: (seed * 100 + 50 + k, p, stop_at))
    ev = L.sql('SELECT event_id, order_id FROM events', db='brokerdb', fetch=True)
    orders = {r[0] for r in L.sql('SELECT id FROM orders', fetch=True)}
    d = len({r[0] for r in ev})
    r = {'mode': 'outbox_batch1', 'seed': seed, 'producer_crashes': pc, 'relay_crashes': rc, 'orders_saved': len(orders),
         'events_in_broker': len(ev), 'distinct_events': d, 'duplicate_events': len(ev) - d,
         'lost_events': len(orders - {r[1] for r in ev})}
    print(r, flush=True); return r

if __name__ == '__main__':
    B, dd, data = L.start_server()
    try:
        L.sql('CREATE DATABASE maildb'); L.sql('CREATE DATABASE brokerdb')
        out = [exp(s) for s in (1, 2, 3)]
    finally:
        L.stop_server(B, dd, data)
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
