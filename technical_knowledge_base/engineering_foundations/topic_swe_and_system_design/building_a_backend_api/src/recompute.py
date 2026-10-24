"""Recompute every number the page shows, independently of its JavaScript, and print JSON.
check_page.mjs compares the page's calculators and its prose with this. Run from src/: python3 recompute.py (stdlib only).
Inputs: inputs/exchanges.json (chat API captures, 2026-10-04) and inputs/service_runs.json (run_experiments.py, 2026-10-24)."""
import json, os, statistics
H = os.path.dirname(os.path.abspath(__file__))
ex = json.load(open(os.path.join(H, 'inputs', 'exchanges.json')))
sr = json.load(open(os.path.join(H, 'inputs', 'service_runs.json')))
st = sr['styles']


def fmt(x):  # the page's thousands format for whole milliseconds
    return f"{round(x):,}"


# section 5, derived: Little's law at the root's busy hour (231.5 model calls a second: only the message request calls the model;
# Capacity planning's correction of 2026-10-24 replaced 1,157 x 10 = 11,570 with 2,315), and N+1 round trips
RATE, BORROW_S, BORROWS = 231.5, 0.001, 2
hold = {'held_10s': round(RATE * 10), 'released': round(RATE * BORROW_S * BORROWS, 1)}
n1 = {str(r): {'many': round(21 * r, 3), 'one': r} for r in [0.056, 0.5, 2, 8]}

# section 6, measured
pd = sorted(r['recv_ms'] for r in st['plain_def']['requests'])
workers = sorted((sum(1 for r in st['async_blocking_4_workers']['requests'] if r['worker'] == w) for w in range(1, 5)), reverse=True)
styles = {
    'blocking_wall': fmt(st['async_blocking']['wall_ms']), 'blocking_p50': fmt(st['async_blocking']['p50_ms']),
    'fair_queue_median_s': round(statistics.median([(i + 1) * 0.5 for i in range(50)]), 2),
    'await_wall': fmt(st['async_await']['wall_ms']),
    'def_40th': fmt(pd[39]), 'def_last10': [fmt(pd[40]), fmt(pd[49])], 'def_wall': fmt(st['plain_def']['wall_ms']),
    'w4_wall': fmt(st['async_blocking_4_workers']['wall_ms']), 'w4_split': workers,
}
s0, s1 = sr['shutdown']
c0 = s0['clients']
shutdown = {'refused_ms': fmt(c0['new_connection_after_sigterm']['sent_ms']), 'slow_200_ms': fmt(c0['slow_request']['done_ms']),
            'slow_result': c0['slow_request']['result'], 'bg_done_ms': fmt([e['ms'] for e in s0['server_events'] if e['ev'] == 'job: background work done'][0]),
            'exit_ms': fmt(s0['exit_ms']), 'keep_result': c0['keepalive_after_sigterm']['result'],
            'timeout_slow_result': s1['clients']['slow_request']['result'],
            'timeout_cancel_log': [l['log'] for l in s1['uvicorn_log'] if 'Cancel' in l['log']][0].split('ERROR:')[1].strip()}
out = {
    'hold': hold, 'n1': n1, 'styles': styles, 'bg': sr['bg'], 'shutdown': shutdown,
    'settings': [l['model_name'] for l in sr['settings']['layers']], 'secret_repr': sr['settings']['secret_repr'],
    'trace_order': sr['trace']['order'], 'timing': ex['timing'],
    'credits_after_first': json.loads(ex['msg_first']['response'].split('\r\n\r\n', 1)[1])['credits_left'],
}
# strings that must appear verbatim in the page's static text (prose numbers checked against the runs)
out['prose'] = [styles['blocking_wall'] + ' ms', styles['blocking_p50'] + ' ms', styles['await_wall'] + ' ms',
                styles['def_last10'][0] + ' to ' + styles['def_last10'][1] + ' ms', styles['w4_wall'] + ' ms',
                ', '.join(map(str, workers[:3])) + ' and ' + str(workers[3]),
                f"{sr['bg']['/inline']} ms", f"{sr['bg']['/bg']} ms", f"{sr['bg']['bg_done_after_response_ms']} ms",
                shutdown['refused_ms'] + ' ms', shutdown['slow_200_ms'] + ' ms', shutdown['bg_done_ms'] + ' ms', shutdown['exit_ms'] + ' ms',
                shutdown['timeout_cancel_log'], sr['settings']['secret_repr'],
                f"p50 {ex['timing']['health']['p50_ms']} ms", f"p50 {ex['timing']['get_chat']['p50_ms']} ms",
                f"{hold['held_10s']:,}", str(hold['released']), f"about {styles['fair_queue_median_s']} s"]
print(json.dumps(out, indent=1))
