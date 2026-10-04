"""Recompute every derived number the page states, from inputs/*.json, and write recompute_out.json; check_page.mjs compares
the page's JavaScript with it. Run: python3 recompute.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); I = lambda n: json.load(open(os.path.join(H, 'inputs', n)))
eng = I('engines.json')['queries']; vo = I('vec_ooc.json'); enc = I('encodings.json'); an = I('anatomy.json'); lab = I('lab.json'); rs = I('remote_small.json'); asof = I('ml_asof.json')
out = {}
five = ['per_model', 'daily', 'country_plan', 'top_users', 'monthly_chats']
r = [eng[k]['pg'][0] / eng[k]['duck'][0] for k in five]; out['speedup_default'] = [round(min(r)), round(max(r))]
r1 = [eng[k]['pg_1'][0] / eng[k]['duck_1'][0] for k in five]; out['speedup_one'] = [round(min(r1)), round(max(r1))]
out['sum_ratio_pg1_duck1'] = round(eng['sum']['pg_1'][0] / vo['duck_sum_1'][0])
out['all_agree'] = all(eng[k]['agree'] for k in eng)
E = {(c['col'], c['order']): c for c in enc['cols']}
out['id_delta_x'] = round(E[('id', 'time')]['sizes']['PLAIN|none'] / E[('id', 'time')]['sizes']['DELTA_BINARY_PACKED|none'])
out['created_at_delta_x'] = round(E[('created_at', 'time')]['sizes']['PLAIN|none'] / E[('created_at', 'time')]['sizes']['DELTA_BINARY_PACKED|none'])
out['role_dict_time'] = E[('role', 'time')]['sizes']['DICT|none']; out['role_dict_sorted'] = E[('role', 'sorted')]['sizes']['DICT|none']
# BigQuery logical bytes for case 6 at 10M rows: STRING = 2 + UTF-8 length, INT64 = 8 (data type sizes page)
cnt = {r[0]: r[1] for r in lab['answers']['all']}
b = sum(n * (2 + len(m)) for m, n in cnt.items()) + 10_000_000 * 8
out['bq_bytes_10M'] = b; out['bq_usd_10M'] = round(b / 2**40 * 6.25, 6); out['bq_usd_1B'] = round(b * 100 / 2**40 * 6.25, 4)
out['sf_usd_per_refresh'] = round(60 / 3600 * 1 * 3, 4); out['rs_usd_per_refresh_8rpu'] = round(60 / 3600 * 8 * 0.375, 4)
# pruning animation: bytes a reader needs, from the footer (first read = last 256 KiB, as DuckDB did over HTTP)
rgs = an['full']['row_groups_detail']; FOOT = 262144
day = lambda g: not (g['created_at_max'] < '2026-03-01 00:00:00' or g['created_at_min'] >= '2026-03-02 00:00:00')
chat = lambda g: not (int(g['chat_id_max']) < 424242 or int(g['chat_id_min']) > 424242)
out['prune_day_on'] = FOOT + sum(g['created_at_bytes'] + g['tokens_bytes'] for g in rgs if day(g)); out['prune_day_rgs'] = sum(map(day, rgs))
out['prune_day_off'] = FOOT + sum(g['created_at_bytes'] + g['tokens_bytes'] for g in rgs)
out['prune_chat_on'] = FOOT + sum(g['chat_id_bytes'] + g['tokens_bytes'] for g in rgs if chat(g)); out['prune_chat_rgs'] = sum(map(chat, rgs))
out['prune_chat_off'] = FOOT + sum(g['chat_id_bytes'] + g['tokens_bytes'] for g in rgs)
out['measured_day'] = an['full']['counted']['day']['bytes_read']; out['measured_chat'] = an['full']['counted']['chat']['bytes_read']
sf = rs['small_files']; out['small_slowdown_10000'] = round(sf['10000']['ms'] / sf['1']['ms']); out['small_bloat_pct'] = round(100 * (sf['10000']['bytes'] / sf['1']['bytes'] - 1), 1)
out['http_one_day_pct'] = round(100 * rs['http']['one_day']['bytes'] / rs['file_bytes'], 2)
out['asof_leaked'] = asof['leaked']; out['asof_check'] = asof['naive_pro'] - asof['asof_pro'] == asof['leaked']
out['ooc_spill_mb'] = round(vo['out_of_core']['runs']['300MB']['peak_temp_bytes'] / 1e6)
json.dump(out, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1); print(json.dumps(out, indent=1))
